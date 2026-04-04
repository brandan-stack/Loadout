import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emailSchema, passwordSchema } from "@/lib/auth-credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";

const dbAny = prisma as any;

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: emailSchema,
  role: z.enum(["SUPER_ADMIN", "OFFICE", "TECH"]),
  password: passwordSchema,
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
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await dbAny.appUser.create({
      data: { name: data.name, email: data.email, role: data.role, passwordHash, pinHash: "" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid user data" }, { status: 400 });
    }
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }
    console.error("Users POST error:", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
