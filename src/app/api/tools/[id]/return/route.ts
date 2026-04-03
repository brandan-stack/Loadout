import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const dbAny = prisma as any;

// POST /api/tools/[id]/return — mark the active checkout as returned
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: toolId } = await params;
    const userId = request.headers.get("x-user-id")!;
    const role = request.headers.get("x-user-role")!;

    const checkout = await dbAny.toolCheckout.findFirst({
      where: { toolId, returnedAt: null },
    });
    if (!checkout) {
      return NextResponse.json({ error: "Tool is not currently checked out" }, { status: 400 });
    }

    // Only the person who checked it out, or an admin, can return it
    if (role === "TECH" && checkout.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await dbAny.toolCheckout.update({
      where: { id: checkout.id },
      data: { returnedAt: new Date() },
      include: { user: { select: { id: true, name: true } } },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Return error:", err);
    return NextResponse.json({ error: "Failed to return tool" }, { status: 500 });
  }
}
