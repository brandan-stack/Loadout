import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

const dbAny = prisma as any;

export async function POST(request: NextRequest) {
  try {
    // Read reset token from httpOnly cookie (never exposed in URL or response body)
    const token = request.cookies.get("_loadout_reset")?.value;
    const { password } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }
    if (!password || String(password).length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
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

    const passwordHash = await bcrypt.hash(String(password), 10);
    await dbAny.appUser.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
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
