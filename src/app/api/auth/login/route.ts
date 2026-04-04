import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, COOKIE_NAME, MAX_AGE } from "@/lib/auth";
import { normalizeEmail } from "@/lib/auth-credentials";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (typeof email !== "string" || typeof password !== "string") {
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
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
