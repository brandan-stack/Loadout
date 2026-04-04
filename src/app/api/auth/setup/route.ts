import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, COOKIE_NAME, MAX_AGE } from "@/lib/auth";
import { isValidEmail } from "@/lib/validation";
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

    const { name, email, password } = await request.json();
    const trimmedEmail = String(email ?? "").toLowerCase().trim();
    const trimmedName = String(name ?? "").trim();
    if (!trimmedName || !trimmedEmail || !password || String(password).length < 8) {
      return NextResponse.json(
        { error: "Name, valid email, and password (min 8 characters) required" },
        { status: 400 }
      );
    }
    if (!isValidEmail(trimmedEmail)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await dbAny.appUser.create({
      data: { name: trimmedName, email: trimmedEmail, role: "SUPER_ADMIN", passwordHash },
    });

    const token = await signToken({ userId: user.id, name: user.name, role: user.role });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error("Setup error:", err);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}
