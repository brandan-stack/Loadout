import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const dbAny = prisma as any;

const toolSchema = z.object({
  name: z.string().min(1, "Tool name is required"),
  manufacturer: z.string().optional(),
  partNumber: z.string().optional(),
  modelNumber: z.string().optional(),
  supplier: z.string().optional(),
  cost: z.number().min(0).default(0),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
  type: z.enum(["SHOP", "PERSONAL"]).default("SHOP"),
});

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get("x-user-role");
    const userId = request.headers.get("x-user-id");

    // Techs see: all SHOP tools + their own PERSONAL tools
    // Admins/Office see: everything
    const where =
      role === "TECH"
        ? { OR: [{ type: "SHOP" }, { type: "PERSONAL", ownerId: userId }] }
        : {};

    const tools = await dbAny.tool.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: {
        owner: { select: { id: true, name: true } },
        checkouts: {
          where: { returnedAt: null },
          include: { user: { select: { id: true, name: true } } },
          take: 1,
        },
      },
    });
    return NextResponse.json(tools);
  } catch (error) {
    console.error("Tool GET error:", error);
    return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const role = request.headers.get("x-user-role");
    const body = await request.json();
    const data = toolSchema.parse(body);

    // Personal tools: set owner to requesting user (unless admin overrides)
    const ownerId = data.type === "PERSONAL" ? (body.ownerId ?? userId) : null;

    // Only admins/office can create SHOP tools
    if (data.type === "SHOP" && role === "TECH") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cost visible only to admins/office — strip from tech
    const cost = role === "TECH" ? 0 : data.cost;

    const tool = await dbAny.tool.create({
      data: { ...data, cost, ownerId },
      include: {
        owner: { select: { id: true, name: true } },
        checkouts: { where: { returnedAt: null }, take: 1 },
      },
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

