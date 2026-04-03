import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const dbAny = prisma as any;

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const trimmedEmail = String(email ?? "").toLowerCase().trim();

    if (!trimmedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await dbAny.appUser.findUnique({ where: { email: trimmedEmail } });

    // Always return success to avoid leaking which emails are registered
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const token = generateToken();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await dbAny.appUser.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    // Return the token so it can be used directly (no email server configured)
    return NextResponse.json({ ok: true, token });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
