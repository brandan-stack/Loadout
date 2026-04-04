import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, COOKIE_NAME, MAX_AGE } from "@/lib/auth";
import { isValidEmail } from "@/lib/validation";
import bcrypt from "bcryptjs";

const dbAny = prisma as any;

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();
    const trimmedName = String(name ?? "").trim();
    const trimmedEmail = String(email ?? "").toLowerCase().trim();

    if (!trimmedName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    // Basic email format validation (non-backtracking)
    if (!isValidEmail(trimmedEmail)) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
    }
    if (!password || String(password).length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await dbAny.appUser.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await dbAny.appUser.create({
      data: { name: trimmedName, email: trimmedEmail, role: "TECH", passwordHash },
    });

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
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
