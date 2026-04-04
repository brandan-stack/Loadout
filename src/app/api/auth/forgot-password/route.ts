import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidEmail } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";

const dbAny = prisma as any;

// Allow 5 requests per hour per IP
const FORGOT_RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 60 * 1000 };

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest) {
  try {
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

    const user = await dbAny.appUser.findUnique({ where: { email: trimmedEmail } });

    if (user) {
      const token = generateToken();
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await dbAny.appUser.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      });

      // Store token in a short-lived httpOnly cookie so it is never exposed in
      // the response body (avoids leaking it via browser network logs / server logs).
      const res = NextResponse.json({ ok: true });
      res.cookies.set("_loadout_reset", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3600,
        path: "/reset-password",
      });
      return res;
    }

    // Always return ok to avoid leaking which emails are registered.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
