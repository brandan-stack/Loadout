import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRequestContext } from "@/lib/request-context";

const dbAny = prisma as any;

// POST /api/tools/[id]/checkout — tech signs out a shop tool
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: toolId } = await params;
    const auth = requireRequestContext(request);
    if (!auth.ok) {
      return auth.response;
    }

    const tool = await dbAny.tool.findFirst({
      where: { id: toolId, organizationId: auth.context.organizationId },
    });
    if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    if (tool.type !== "SHOP") {
      return NextResponse.json({ error: "Only shop tools can be signed out" }, { status: 400 });
    }

    // Check if already checked out
    const existing = await dbAny.toolCheckout.findFirst({
      where: { toolId, returnedAt: null },
    });
    if (existing) {
      return NextResponse.json({ error: "Tool is already checked out" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const checkout = await dbAny.toolCheckout.create({
      data: { toolId, userId: auth.context.userId, notes: body.notes ?? null },
      include: { user: { select: { id: true, name: true } } },
    });
    return NextResponse.json(checkout, { status: 201 });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Failed to check out tool" }, { status: 500 });
  }
}
