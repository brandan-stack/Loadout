import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserAccess } from "@/lib/permissions";

const dbAny = prisma as any;

const updateToolSchema = z.object({
  scope: z.enum(["PERSONAL", "COMPANY"]).optional(),
  assetTag: z.string().optional().nullable(),
  name: z.string().min(1).optional(),
  manufacturer: z.string().optional().nullable(),
  modelNumber: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  cost: z.number().min(0).optional(),
  replacementValue: z.number().min(0).optional().nullable(),
  condition: z.string().optional().nullable(),
  defaultLocation: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  assignedUserId: z.string().optional().nullable(),
});

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function canManageTool(access: any, tool: any) {
  if (tool.type === "COMPANY") {
    return access.canManageCompanyTools;
  }
  if (access.canManageCompanyTools || access.canManageUsers) {
    return true;
  }
  return tool.ownerId === access.userId && access.canEditOwnTools;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireUserAccess(request);
    if (!access.ok) {
      return access.response;
    }

    const { id } = await params;
    const tool = await dbAny.tool.findFirst({
      where: { id, organizationId: access.access.organizationId },
      include: {
        owner: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true } },
      },
    });
    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    if (tool.type === "PERSONAL") {
      const canViewPersonal = tool.ownerId === access.access.userId || access.access.canManageCompanyTools || access.access.canManageUsers || access.access.canViewOwnTools;
      if (!canViewPersonal) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (tool.type === "COMPANY" && !(access.access.canViewCompanyTools || access.access.canManageCompanyTools)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(tool);
  } catch (error) {
    console.error("Tool GET by id error:", error);
    return NextResponse.json({ error: "Failed to fetch tool" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireUserAccess(request);
    if (!access.ok) {
      return access.response;
    }

    const { id } = await params;
    const existing = await dbAny.tool.findFirst({
      where: { id, organizationId: access.access.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    if (!canManageTool(access.access, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await request.json();
    const data = updateToolSchema.parse({
      ...rawBody,
      assetTag: rawBody?.assetTag === undefined ? undefined : normalizeOptionalText(rawBody.assetTag),
      name: typeof rawBody?.name === "string" ? rawBody.name.trim() : rawBody?.name,
      manufacturer: rawBody?.manufacturer === undefined ? undefined : normalizeOptionalText(rawBody.manufacturer),
      modelNumber: rawBody?.modelNumber === undefined ? undefined : normalizeOptionalText(rawBody.modelNumber),
      serialNumber: rawBody?.serialNumber === undefined ? undefined : normalizeOptionalText(rawBody.serialNumber),
      category: rawBody?.category === undefined ? undefined : normalizeOptionalText(rawBody.category),
      condition: rawBody?.condition === undefined ? undefined : normalizeOptionalText(rawBody.condition),
      defaultLocation: rawBody?.defaultLocation === undefined ? undefined : normalizeOptionalText(rawBody.defaultLocation),
      notes: rawBody?.notes === undefined ? undefined : normalizeOptionalText(rawBody.notes),
      photoUrl: rawBody?.photoUrl === undefined ? undefined : normalizeOptionalText(rawBody.photoUrl),
      ownerId: rawBody?.ownerId === undefined ? undefined : normalizeOptionalText(rawBody.ownerId),
      assignedUserId: rawBody?.assignedUserId === undefined ? undefined : normalizeOptionalText(rawBody.assignedUserId),
    });

    if (data.ownerId) {
      const owner = await dbAny.appUser.findFirst({
        where: { id: data.ownerId, organizationId: access.access.organizationId },
        select: { id: true },
      });
      if (!owner) {
        return NextResponse.json({ error: "Owner not found" }, { status: 404 });
      }
    }

    if (data.assignedUserId) {
      const assignedUser = await dbAny.appUser.findFirst({
        where: { id: data.assignedUserId, organizationId: access.access.organizationId },
        select: { id: true },
      });
      if (!assignedUser) {
        return NextResponse.json({ error: "Assigned user not found" }, { status: 404 });
      }
    }

    const updated = await dbAny.tool.update({
      where: { id },
      data: {
        ...(data.scope ? { type: data.scope } : {}),
        ...(data.assetTag !== undefined ? { assetTag: data.assetTag } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.manufacturer !== undefined ? { manufacturer: data.manufacturer } : {}),
        ...(data.modelNumber !== undefined ? { modelNumber: data.modelNumber } : {}),
        ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.cost !== undefined ? { cost: data.cost } : {}),
        ...(data.replacementValue !== undefined ? { replacementValue: data.replacementValue } : {}),
        ...(data.condition !== undefined ? { condition: data.condition ?? "Good" } : {}),
        ...(data.defaultLocation !== undefined ? { defaultLocation: data.defaultLocation } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.photoUrl !== undefined ? { photoUrl: data.photoUrl } : {}),
        ...(data.ownerId !== undefined ? { ownerId: data.ownerId } : {}),
        ...(data.assignedUserId !== undefined ? { assignedUserId: data.assignedUserId } : {}),
        ...(existing.type === "COMPANY" ? { lastTransactionAt: new Date() } : {}),
      },
      include: {
        owner: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid tool data" }, { status: 400 });
    }
    console.error("Tool PUT error:", error);
    return NextResponse.json({ error: "Failed to update tool" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireUserAccess(request);
    if (!access.ok) {
      return access.response;
    }

    const { id } = await params;
    const existing = await dbAny.tool.findFirst({
      where: { id, organizationId: access.access.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    if (!canManageTool(access.access, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbAny.tool.update({
      where: { id },
      data: { archived: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tool DELETE error:", error);
    return NextResponse.json({ error: "Failed to archive tool" }, { status: 500 });
  }
}
