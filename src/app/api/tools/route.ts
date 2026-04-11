import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserAccess } from "@/lib/permissions";

const dbAny = prisma as any;

const createToolSchema = z.object({
  scope: z.enum(["PERSONAL", "COMPANY"]),
  assetTag: z.string().optional(),
  name: z.string().min(1, "Tool name is required"),
  manufacturer: z.string().optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  category: z.string().optional(),
  cost: z.number().min(0).optional(),
  replacementValue: z.number().min(0).optional(),
  condition: z.string().optional(),
  defaultLocation: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
  ownerId: z.string().optional(),
  assignedUserId: z.string().optional(),
});

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireUserAccess(request);
    if (!access.ok) {
      return access.response;
    }

    if (!access.access.canViewTools) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const canManageAllPersonalTools = access.access.canManageCompanyTools || access.access.canManageUsers;
    const canViewCompanyWorkspace = access.access.canViewCompanyTools || access.access.canManageCompanyTools;
    const canViewSignouts =
      canViewCompanyWorkspace ||
      access.access.canRequestCompanyTools ||
      access.access.canCheckoutCompanyTools ||
      access.access.canReturnCompanyTools ||
      access.access.canAcceptToolReturns;

    const [personalTools, companyTools, signouts, users] = await Promise.all([
      access.access.canViewOwnTools || canManageAllPersonalTools
        ? dbAny.tool.findMany({
            where: {
              organizationId: access.access.organizationId,
              type: "PERSONAL",
              archived: false,
              ...(canManageAllPersonalTools ? {} : { ownerId: access.access.userId }),
            },
            orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              manufacturer: true,
              modelNumber: true,
              serialNumber: true,
              category: true,
              cost: true,
              condition: true,
              notes: true,
              photoUrl: true,
              defaultLocation: true,
              updatedAt: true,
              owner: { select: { id: true, name: true } },
            },
          })
        : [],
      canViewCompanyWorkspace
        ? dbAny.tool.findMany({
            where: {
              organizationId: access.access.organizationId,
              type: "COMPANY",
              archived: false,
            },
            orderBy: [{ currentStatus: "asc" }, { updatedAt: "desc" }, { name: "asc" }],
            select: {
              id: true,
              assetTag: true,
              name: true,
              manufacturer: true,
              modelNumber: true,
              serialNumber: true,
              category: true,
              cost: true,
              replacementValue: true,
              condition: true,
              currentStatus: true,
              defaultLocation: true,
              notes: true,
              photoUrl: true,
              lastTransactionAt: true,
              updatedAt: true,
              assignedUser: { select: { id: true, name: true } },
            },
          })
        : [],
      canViewSignouts
        ? dbAny.toolTransaction.findMany({
            where: {
              organizationId: access.access.organizationId,
              tool: { type: "COMPANY" },
              ...(canViewCompanyWorkspace || access.access.canAcceptToolReturns || access.access.canManageCompanyTools
                ? {}
                : {
                    OR: [{ holderUserId: access.access.userId }, { requestedByUserId: access.access.userId }],
                  }),
            },
            orderBy: [{ updatedAt: "desc" }, { requestedAt: "desc" }],
            take: 80,
            select: {
              id: true,
              status: true,
              transactionType: true,
              requestedAt: true,
              checkedOutAt: true,
              dueBackAt: true,
              returnRequestedAt: true,
              returnedAt: true,
              acceptedAt: true,
              notes: true,
              issueReported: true,
              syncStatus: true,
              holderUser: { select: { id: true, name: true } },
              requestedByUser: { select: { id: true, name: true } },
              approvedByUser: { select: { id: true, name: true } },
              acceptedByUser: { select: { id: true, name: true } },
              tool: { select: { id: true, name: true, assetTag: true, currentStatus: true } },
            },
          })
        : [],
      access.access.canCheckoutCompanyTools || access.access.canManageCompanyTools
        ? dbAny.appUser.findMany({
            where: { organizationId: access.access.organizationId },
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          })
        : [],
    ]);

    return NextResponse.json({ personalTools, companyTools, signouts, users });
  } catch (error) {
    console.error("Tool GET error:", error);
    return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireUserAccess(request);
    if (!access.ok) {
      return access.response;
    }

    if (!access.access.canViewTools) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await request.json();
    const parsed = createToolSchema.parse({
      ...rawBody,
      assetTag: normalizeOptionalText(rawBody?.assetTag),
      name: typeof rawBody?.name === "string" ? rawBody.name.trim() : rawBody?.name,
      manufacturer: normalizeOptionalText(rawBody?.manufacturer),
      modelNumber: normalizeOptionalText(rawBody?.modelNumber),
      serialNumber: normalizeOptionalText(rawBody?.serialNumber),
      category: normalizeOptionalText(rawBody?.category),
      condition: normalizeOptionalText(rawBody?.condition),
      defaultLocation: normalizeOptionalText(rawBody?.defaultLocation),
      notes: normalizeOptionalText(rawBody?.notes),
      photoUrl: normalizeOptionalText(rawBody?.photoUrl),
      ownerId: normalizeOptionalText(rawBody?.ownerId),
      assignedUserId: normalizeOptionalText(rawBody?.assignedUserId),
    });

    if (parsed.scope === "PERSONAL" && !access.access.canAddOwnTools) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (parsed.scope === "COMPANY" && !access.access.canManageCompanyTools) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ownerId = parsed.scope === "PERSONAL" ? parsed.ownerId ?? access.access.userId : null;
    const assignedUserId = parsed.scope === "COMPANY" ? parsed.assignedUserId ?? null : null;

    if (ownerId) {
      const owner = await dbAny.appUser.findFirst({
        where: { id: ownerId, organizationId: access.access.organizationId },
        select: { id: true },
      });
      if (!owner) {
        return NextResponse.json({ error: "Owner not found" }, { status: 404 });
      }
    }

    if (assignedUserId) {
      const assignedUser = await dbAny.appUser.findFirst({
        where: { id: assignedUserId, organizationId: access.access.organizationId },
        select: { id: true },
      });
      if (!assignedUser) {
        return NextResponse.json({ error: "Assigned user not found" }, { status: 404 });
      }
    }

    const tool = await dbAny.tool.create({
      data: {
        organizationId: access.access.organizationId,
        type: parsed.scope,
        assetTag: parsed.scope === "COMPANY" ? parsed.assetTag : null,
        name: parsed.name,
        manufacturer: parsed.manufacturer,
        modelNumber: parsed.modelNumber,
        serialNumber: parsed.serialNumber,
        category: parsed.category,
        cost: parsed.cost ?? 0,
        replacementValue: parsed.scope === "COMPANY" ? parsed.replacementValue ?? null : null,
        condition: parsed.condition ?? "Good",
        currentStatus: parsed.scope === "COMPANY" ? (assignedUserId ? "Assigned" : "Available") : "Available",
        defaultLocation: parsed.defaultLocation,
        notes: parsed.notes,
        photoUrl: parsed.photoUrl,
        ownerId,
        assignedUserId,
        lastTransactionAt: parsed.scope === "COMPANY" ? new Date() : null,
      },
      include: {
        owner: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(tool, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid tool data" }, { status: 400 });
    }
    console.error("Tool POST error:", error);
    return NextResponse.json({ error: "Failed to create tool" }, { status: 500 });
  }
}

