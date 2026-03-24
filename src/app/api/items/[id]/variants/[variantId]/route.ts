import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const dbAny = prisma as any;

const UpdateVariantSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().nullable().optional(),
  quantityOnHand: z.number().int().min(0).optional(),
  attributes: z.record(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const { variantId } = await params;
  const body = await req.json();
  const parsed = UpdateVariantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.sku !== undefined) updateData.sku = parsed.data.sku;
  if (parsed.data.quantityOnHand !== undefined)
    updateData.quantityOnHand = parsed.data.quantityOnHand;
  if (parsed.data.attributes !== undefined)
    updateData.attributes = JSON.stringify(parsed.data.attributes);

  const variant = await dbAny.itemVariant.update({
    where: { id: variantId },
    data: updateData,
  });
  return NextResponse.json(variant);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const { variantId } = await params;
  await dbAny.itemVariant.delete({ where: { id: variantId } });
  return new NextResponse(null, { status: 204 });
}
