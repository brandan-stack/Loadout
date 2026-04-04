import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, COOKIE_NAME, MAX_AGE } from "@/lib/auth";
import { normalizeEmail } from "@/lib/auth-credentials";
import { checkRateLimit } from "@/lib/rateLimit";
import bcrypt from "bcryptjs";

// Allow 10 login attempts per 15-minute window per IP
const LOGIN_RATE_LIMIT = { maxRequests: 10, windowMs: 15 * 60 * 1000 };
// Hard cap on input length to prevent DoS payloads
const MAX_FIELD_LENGTH = 320;

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const rl = checkRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const email = String(body.email ?? "").slice(0, MAX_FIELD_LENGTH);
    const password = String(body.password ?? "").slice(0, MAX_FIELD_LENGTH);

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const dbAny = prisma as any;
    const user = await dbAny.appUser.findUnique({ where: { email: normalizeEmail(email) } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await signToken({ userId: user.id, name: user.name, role: user.role });

    const res = NextResponse.json({ ok: true, role: user.role, name: user.name });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: MAX_AGE,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
