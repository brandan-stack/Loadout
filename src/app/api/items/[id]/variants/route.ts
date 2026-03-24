import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const dbAny = prisma as any;

const CreateVariantSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  quantityOnHand: z.number().int().min(0).default(0),
  attributes: z.record(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const variants = await dbAny.itemVariant.findMany({
    where: { itemId: id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(variants);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = CreateVariantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = await dbAny.item.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const variant = await dbAny.itemVariant.create({
    data: {
      itemId: id,
      name: parsed.data.name,
      sku: parsed.data.sku,
      quantityOnHand: parsed.data.quantityOnHand,
      attributes: JSON.stringify(parsed.data.attributes ?? {}),
    },
  });
  return NextResponse.json(variant, { status: 201 });
}
