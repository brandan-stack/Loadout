import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRequestContext } from "@/lib/request-context";
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
  try {
    const auth = requireRequestContext(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { id, variantId } = await params;
    const body = await req.json();
    const parsed = UpdateVariantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await dbAny.itemVariant.findFirst({
      where: {
        id: variantId,
        itemId: id,
        organizationId: auth.context.organizationId,
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
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
  } catch (error) {
    console.error("Variant PATCH error:", error);
    return NextResponse.json({ error: "Failed to update variant" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const auth = requireRequestContext(_req);
    if (!auth.ok) {
      return auth.response;
    }

    const { id, variantId } = await params;
    const existing = await dbAny.itemVariant.findFirst({
      where: {
        id: variantId,
        itemId: id,
        organizationId: auth.context.organizationId,
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }
    await dbAny.itemVariant.delete({ where: { id: variantId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Variant DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete variant" }, { status: 500 });
  }
}
