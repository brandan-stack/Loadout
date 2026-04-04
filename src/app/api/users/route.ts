import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { checkPasswordStrength } from "@/lib/validation";

const dbAny = prisma as any;

interface CreatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["SUPER_ADMIN", "OFFICE", "TECH"]),
  password: z.string().min(8),
});

export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const users = await dbAny.appUser.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (err) {
    console.error("Users GET error:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const data = createSchema.parse(body);
    const pwCheck = checkPasswordStrength(data.password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.message }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    let user: CreatedUser;
    try {
      user = await dbAny.appUser.create({
        data: { name: data.name.trim(), email: data.email.toLowerCase().trim(), role: data.role, passwordHash },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
    } catch (createErr: unknown) {
      const code = (createErr as { code?: string })?.code;
      if (code === "P2002") {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }
      throw createErr;
    }
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error("Users POST error:", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
