import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const dbAny = prisma as any;

const toolSchema = z.object({
  name: z.string().min(1, "Tool name is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  partNumber: z.string().min(1, "Part number is required"),
  modelNumber: z.string().min(1, "Model number is required"),
  supplier: z.string().min(1, "Supplier is required"),
  cost: z.number().min(0, "Cost must be 0 or greater"),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const tools = await dbAny.tool.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tools);
  } catch (error) {
    console.error("Tool GET error:", error);
    return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = toolSchema.parse(body);

    const tool = await dbAny.tool.create({
      data,
    });

    return NextResponse.json(tool, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Tool POST error:", error);
    return NextResponse.json({ error: "Failed to create tool" }, { status: 500 });
  }
}
