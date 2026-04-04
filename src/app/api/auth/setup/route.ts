import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, COOKIE_NAME, MAX_AGE } from "@/lib/auth";
import { emailSchema, passwordSchema } from "@/lib/auth-credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

const dbAny = prisma as any;
const setupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: emailSchema,
  password: passwordSchema,
});

// GET — check if setup is required (no users exist)
export async function GET() {
  try {
    const count = await dbAny.appUser.count();
    const legacyMigrationRequired =
      count > 0
        ? (await dbAny.appUser.count({
            where: {
              OR: [
                { email: null },
                { email: "" },
                { passwordHash: null },
                { passwordHash: "" },
              ],
            },
          })) > 0
        : false;

    return NextResponse.json({ required: count === 0, legacyMigrationRequired });
  } catch {
    return NextResponse.json({ required: true, legacyMigrationRequired: false });
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
    const data = setupSchema.parse(body);

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await dbAny.appUser.create({
      data: {
        name: data.name,
        email: data.email,
        role: "SUPER_ADMIN",
        passwordHash,
        pinHash: "",
      },
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
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid setup data" }, { status: 400 });
    }
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }
    console.error("Setup error:", err);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}
