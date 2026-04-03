import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const dbAny = prisma as any;

// Public endpoint — returns user names + IDs only (no PINs or sensitive data)
export async function GET() {
  try {
    const users = await dbAny.appUser.findMany({
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
