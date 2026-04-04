import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRequestContext } from "@/lib/request-context";
import { z } from "zod";

const dbAny = prisma as any;

const toolUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  manufacturer: z.string().optional(),
  partNumber: z.string().optional(),
  modelNumber: z.string().optional(),
  supplier: z.string().optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional().nullable(),
  type: z.enum(["SHOP", "PERSONAL"]).optional(),
  ownerId: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = requireRequestContext(req);
    if (!auth.ok) {
      return auth.response;
    }

    const tool = await dbAny.tool.findFirst({
      where: { id, organizationId: auth.context.organizationId },
      include: {
        owner: { select: { id: true, name: true } },
        checkouts: {
          where: { returnedAt: null },
          include: { user: { select: { id: true, name: true } } },
          take: 1,
        },
      },
    });
    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    // Techs can only see their own PERSONAL tools + all SHOP tools
    if (auth.context.role === "TECH" && tool.type === "PERSONAL" && tool.ownerId !== auth.context.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Strip cost from techs
    if (auth.context.role === "TECH") {
      const { cost: _cost, ...rest } = tool;
      return NextResponse.json({ ...rest, cost: undefined });
    }
    return NextResponse.json(tool);
  } catch (error) {
    console.error("Tool GET by id error:", error);
    return NextResponse.json({ error: "Failed to fetch tool" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = requireRequestContext(req);
    if (!auth.ok) {
      return auth.response;
    }

    const existing = await dbAny.tool.findFirst({
      where: { id, organizationId: auth.context.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    // TECH can only edit their own PERSONAL tools
    if (auth.context.role === "TECH") {
      if (existing.type !== "PERSONAL" || existing.ownerId !== auth.context.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await req.json();
    const data = toolUpdateSchema.parse(body);

    // TECH cannot change cost, type, or ownerId
    if (auth.context.role === "TECH") {
      delete (data as Record<string, unknown>).cost;
      delete (data as Record<string, unknown>).type;
      delete (data as Record<string, unknown>).ownerId;
    }

    if (data.ownerId) {
      const owner = await dbAny.appUser.findFirst({
        where: { id: data.ownerId, organizationId: auth.context.organizationId },
        select: { id: true },
      });
      if (!owner) {
        return NextResponse.json({ error: "Owner not found" }, { status: 404 });
      }
    }

    const tool = await dbAny.tool.update({
      where: { id },
      data,
      include: {
        owner: { select: { id: true, name: true } },
        checkouts: { where: { returnedAt: null }, take: 1, include: { user: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(tool);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Tool PUT error:", error);
    return NextResponse.json({ error: "Failed to update tool" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = requireRequestContext(req);
    if (!auth.ok) {
      return auth.response;
    }

    const existing = await dbAny.tool.findFirst({
      where: { id, organizationId: auth.context.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    // TECH can only delete their own PERSONAL tools
    if (auth.context.role === "TECH") {
      if (existing.type !== "PERSONAL" || existing.ownerId !== auth.context.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await dbAny.tool.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tool DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete tool" }, { status: 500 });
  }
}
