// src/app/api/suppliers/[id]/route.ts - Individual supplier CRUD

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const supplierUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  contact: z.string().optional(),
  leadTimeD: z.number().min(0).optional(),
  notes: z.string().optional(),
  archived: z.boolean().optional(),
});

type SupplierUpdate = z.infer<typeof supplierUpdateSchema>;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }
    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Supplier GET error:", error);
    return NextResponse.json({ error: "Failed to fetch supplier" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = supplierUpdateSchema.parse(body);

    const supplier = await prisma.supplier.update({
      where: { id },
      data,
    });

    return NextResponse.json(supplier);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0]?.message || "Invalid supplier data";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Supplier PUT error:", error);
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Soft delete
    await prisma.supplier.update({
      where: { id },
      data: { archived: true },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Supplier DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
  }
}
