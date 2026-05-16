// src/app/api/suppliers/[id]/route.ts - Individual supplier CRUD

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRequestContext } from "@/lib/request-context";
import { normalizeSupplierEmailContacts } from "@/lib/supplier-contacts";
import { z } from "zod";

const supplierUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  contact: z.string().optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  leadTimeD: z.number().min(0).optional(),
  isPreferred: z.boolean().optional(),
  isFastest: z.boolean().optional(),
  emailContacts: z.array(
    z.object({
      label: z.string().min(1, "Contact position is required"),
      email: z.string().email("Enter a valid supplier email"),
    })
  ).optional(),
  notes: z.string().optional(),
  archived: z.boolean().optional(),
});

type SupplierUpdate = z.infer<typeof supplierUpdateSchema>;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireRequestContext(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    const supplier = await prisma.supplier.findFirst({
      where: { id, organizationId: auth.context.organizationId },
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
    const auth = requireRequestContext(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    const body = await req.json();
    const data = supplierUpdateSchema.parse(body);
    const emailContacts = data.emailContacts ? normalizeSupplierEmailContacts(data.emailContacts) : undefined;

    const existing = await prisma.supplier.findFirst({
      where: { id, organizationId: auth.context.organizationId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.contact !== undefined ? { contact: data.contact.trim() || null } : {}),
        ...(data.website !== undefined ? { website: data.website.trim() || null } : {}),
        ...(data.leadTimeD !== undefined ? { leadTimeD: data.leadTimeD } : {}),
        ...(data.isPreferred !== undefined ? { isPreferred: data.isPreferred } : {}),
        ...(data.isFastest !== undefined ? { isFastest: data.isFastest } : {}),
        ...(emailContacts !== undefined ? { emailContacts } : {}),
        ...(data.notes !== undefined ? { notes: data.notes.trim() || null } : {}),
        ...(data.archived !== undefined ? { archived: data.archived } : {}),
      },
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
    const auth = requireRequestContext(req);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    const existing = await prisma.supplier.findFirst({
      where: { id, organizationId: auth.context.organizationId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }
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
