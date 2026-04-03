import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, COOKIE_NAME, MAX_AGE } from "@/lib/auth";
import bcrypt from "bcryptjs";

const dbAny = prisma as any;

// GET — check if setup is required (no users exist)
export async function GET() {
  try {
    const count = await dbAny.appUser.count();
    return NextResponse.json({ required: count === 0 });
  } catch {
    return NextResponse.json({ required: true });
  }
}

// POST — create the first Super Admin (only works when no users exist)
export async function POST(request: NextRequest) {
  try {
    const count = await dbAny.appUser.count();
    if (count > 0) {
      return NextResponse.json({ error: "Setup already complete" }, { status: 403 });
    }

    const { name, pin } = await request.json();
    if (!name || !pin || String(pin).length !== 4) {
      return NextResponse.json({ error: "Name and 4-digit PIN required" }, { status: 400 });
    }

    const pinHash = await bcrypt.hash(String(pin), 10);
    const user = await dbAny.appUser.create({
      data: { name: String(name).trim(), role: "SUPER_ADMIN", pinHash },
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
