// src/app/api/suppliers/route.ts - Supplier CRUD API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const supplierSchema = z.object({
  name: z.string().min(1, "Name required"),
  contact: z.string().optional(),
  leadTimeD: z.number().min(0).default(7),
  notes: z.string().optional(),
});

type SupplierInput = z.infer<typeof supplierSchema>;

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Supplier GET error:", error);
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = supplierSchema.parse(body);

    const supplier = await prisma.supplier.create({
      data,
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Supplier POST error:", error);
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}
