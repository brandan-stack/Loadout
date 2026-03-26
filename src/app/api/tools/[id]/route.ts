import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tool = await dbAny.tool.findUnique({ where: { id } });
    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
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
    const body = await req.json();
    const data = toolUpdateSchema.parse(body);

    const tool = await dbAny.tool.update({
      where: { id },
      data,
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

    await dbAny.tool.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tool DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete tool" }, { status: 500 });
  }
}
