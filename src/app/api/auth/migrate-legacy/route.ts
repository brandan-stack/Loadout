import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, COOKIE_NAME, MAX_AGE } from "@/lib/auth";
import { emailSchema, passwordSchema } from "@/lib/auth-credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

const dbAny = prisma as any;

const migrateSchema = z.object({
  name: z.string().trim().min(1, "Current account name is required"),
  pin: z.string().length(4).regex(/^\d{4}$/),
  email: emailSchema,
  password: passwordSchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = migrateSchema.parse(body);

    const user = await dbAny.appUser.findFirst({
      where: {
        name: data.name,
        pinHash: { not: "" },
        OR: [
          { email: null },
          { email: "" },
          { passwordHash: null },
          { passwordHash: "" },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
    if (!user || !user.pinHash) {
      return NextResponse.json({ error: "Invalid legacy account credentials" }, { status: 401 });
    }

    const validPin = await bcrypt.compare(data.pin, user.pinHash);
    if (!validPin) {
      return NextResponse.json({ error: "Invalid legacy account credentials" }, { status: 401 });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const updatedUser = await dbAny.appUser.update({
      where: { id: user.id },
      data: {
        email: data.email,
        passwordHash,
        pinHash: "",
      },
    });

    const token = await signToken({ userId: updatedUser.id, name: updatedUser.name, role: updatedUser.role });
    const response = NextResponse.json({ ok: true, migrated: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: MAX_AGE,
      path: "/",
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid migration data" }, { status: 400 });
    }
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }

    console.error("Legacy auth migration error:", error);
    return NextResponse.json({ error: "Failed to upgrade legacy account" }, { status: 500 });
  }
}