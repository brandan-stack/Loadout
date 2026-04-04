import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRequestContext } from "@/lib/request-context";

const dbAny = prisma as any;

// POST /api/tools/[id]/return — mark the active checkout as returned
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

    const checkout = await dbAny.toolCheckout.findFirst({
      where: {
        toolId,
        returnedAt: null,
        tool: { organizationId: auth.context.organizationId },
      },
    });
    if (!checkout) {
      return NextResponse.json({ error: "Tool is not currently checked out" }, { status: 400 });
    }

    // Only the person who checked it out, or an admin, can return it
    if (auth.context.role === "TECH" && checkout.userId !== auth.context.userId) {
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
