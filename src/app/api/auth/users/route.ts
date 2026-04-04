import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const dbAny = prisma as any;

// Returns user names and IDs for authenticated callers (e.g. technician dropdowns in job forms).
export async function GET() {
  try {
    const users = await dbAny.appUser.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
