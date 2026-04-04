import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkPasswordStrength } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";

const dbAny = prisma as any;

// Allow 5 reset attempts per hour per IP
const RESET_RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 60 * 1000 };

export async function POST(request: NextRequest) {
  try {
    // Rate-limit by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const rl = checkRateLimit(`reset:${ip}`, RESET_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Please try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    // Read reset token from httpOnly cookie (never exposed in URL or response body)
    const token = request.cookies.get("_loadout_reset")?.value;
    const body = await request.json();
    const password = String(body.password ?? "").slice(0, 320);

    if (!token) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    const pwCheck = checkPasswordStrength(password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.message }, { status: 400 });
    }

    const user = await dbAny.appUser.findFirst({
      where: { resetToken: String(token) },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) <= new Date()) {
      return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await dbAny.appUser.update({
      where: { id: user.id },
      data: { passwordHash, pinHash: "", resetToken: null, resetTokenExpiry: null },
    });

    const res = NextResponse.json({ ok: true });
    // Clear the reset cookie — use path "/" to ensure it's removed regardless of origin path
    res.cookies.set("_loadout_reset", "", { maxAge: 0, path: "/" });
    return res;
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
