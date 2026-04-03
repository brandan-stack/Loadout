import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

const dbAny = prisma as any;

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Reset token is required" }, { status: 400 });
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

    if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
      return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    await dbAny.appUser.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
