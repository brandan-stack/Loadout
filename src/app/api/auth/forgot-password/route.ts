import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidEmail } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";
import { createPasswordResetTokenPair, getAppBaseUrl } from "@/lib/password-reset";
import { isPasswordRecoveryEmailConfigured, sendPasswordResetEmail } from "@/lib/server-email";

const dbAny = prisma as any;

// Allow 5 requests per hour per IP
const FORGOT_RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 60 * 1000 };

export async function POST(request: NextRequest) {
  try {
    if (!isPasswordRecoveryEmailConfigured()) {
      return NextResponse.json({ error: "Password recovery email is not configured" }, { status: 503 });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const rl = checkRateLimit(`forgot:${ip}`, FORGOT_RATE_LIMIT);
    if (!rl.allowed) {
      // Always return ok to avoid leaking rate-limit state (which would leak email existence)
      return NextResponse.json({ ok: true });
    }

    const body = await request.json();
    const trimmedEmail = String(body.email ?? "").toLowerCase().trim().slice(0, 320);

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const user = await dbAny.appUser.findUnique({
      where: { email: trimmedEmail },
      include: { organization: { select: { name: true } } },
    });

    if (user) {
      const { token, tokenHash } = createPasswordResetTokenPair();
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const resetUrl = `${getAppBaseUrl(request)}/reset-password?token=${encodeURIComponent(token)}`;

      await dbAny.appUser.update({
        where: { id: user.id },
        data: { resetToken: tokenHash, resetTokenExpiry: expiry },
      });

      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          organizationName: user.organization?.name,
          resetUrl,
        });
      } catch (mailError) {
        console.error("Password reset email send failed:", mailError);
        await dbAny.appUser.update({
          where: { id: user.id },
          data: { resetToken: null, resetTokenExpiry: null },
        });
      }
    }

    return NextResponse.json({ ok: true, emailSent: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
