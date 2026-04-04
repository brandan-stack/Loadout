import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emailSchema, passwordSchema } from "@/lib/auth-credentials";
import { requireRequestContext } from "@/lib/request-context";
import { z } from "zod";
import bcrypt from "bcryptjs";

const dbAny = prisma as any;

interface CreatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: emailSchema,
  role: z.enum(["SUPER_ADMIN", "OFFICE", "TECH"]),
  password: passwordSchema,
});

export async function GET(request: NextRequest) {
  const auth = requireRequestContext(request);
  if (!auth.ok) {
    return auth.response;
  }
  if (auth.context.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const users = await dbAny.appUser.findMany({
      where: { organizationId: auth.context.organizationId },
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
  const auth = requireRequestContext(request);
  if (!auth.ok) {
    return auth.response;
  }
  if (auth.context.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const data = createSchema.parse(body);
    const passwordHash = await bcrypt.hash(data.password, 10);
    let user: CreatedUser;
    try {
      user = await dbAny.appUser.create({
        data: {
          name: data.name,
          email: data.email,
          role: data.role,
          passwordHash,
          organizationId: auth.context.organizationId,
        },
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
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid user data" }, { status: 400 });
    }
    console.error("Users POST error:", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
