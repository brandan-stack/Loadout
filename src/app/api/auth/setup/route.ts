import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, COOKIE_NAME, MAX_AGE } from "@/lib/auth";
import { isValidEmail, checkPasswordStrength } from "@/lib/validation";
import bcrypt from "bcryptjs";

const dbAny = prisma as any;

// GET — check if setup is required (no users exist)
export async function GET() {
  try {
    const count = await dbAny.appUser.count();
    return NextResponse.json({ required: count === 0 });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

// POST — create the first Super Admin (only works when no users exist)
export async function POST(request: NextRequest) {
  try {
    const count = await dbAny.appUser.count();
    if (count > 0) {
      return NextResponse.json({ error: "Setup already complete" }, { status: 403 });
    }

    const body = await request.json();
    const trimmedName = String(body.name ?? "").trim().slice(0, 100);
    const trimmedEmail = String(body.email ?? "").toLowerCase().trim().slice(0, 320);
    const password = String(body.password ?? "").slice(0, 320);

    if (!trimmedName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!isValidEmail(trimmedEmail)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const pwCheck = checkPasswordStrength(password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.message }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await dbAny.appUser.create({
      data: { name: trimmedName, email: trimmedEmail, role: "SUPER_ADMIN", passwordHash },
    });

    const token = await signToken({ userId: user.id, name: user.name, role: user.role });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: MAX_AGE,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("Setup error:", err);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}
