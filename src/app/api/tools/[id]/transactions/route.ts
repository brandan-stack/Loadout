import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/features/settings-service";
import { requireUserAccess } from "@/lib/permissions";

const dbAny = prisma as any;

const transactionSchema = z.object({
  action: z.enum(["request", "assign", "checkout", "return", "accept_return"]),
  holderUserId: z.string().optional(),
  dueBackAt: z.string().optional(),
  notes: z.string().optional(),
  issueReported: z.string().optional(),
  clientRequestId: z.string().optional(),
  submittedOfflineAt: z.string().optional(),
});

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function appendNotes(existing: string | null | undefined, next: string | undefined) {
  if (!next) {
    return existing ?? null;
  }
  return [existing, next].filter(Boolean).join("\n\n");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireUserAccess(request);
    if (!access.ok) {
      return access.response;
    }

    const { id } = await params;
    const body = transactionSchema.parse(await request.json());
    const settings = await getSettings(access.access.organizationId);

    const result = await dbAny.$transaction(async (tx: any) => {
      if (body.clientRequestId) {
        const existingByRequest = await tx.toolTransaction.findUnique({
          where: { clientRequestId: body.clientRequestId },
        });
        if (existingByRequest) {
          return existingByRequest;
        }
      }

      const tool = await tx.tool.findFirst({
        where: { id, organizationId: access.access.organizationId, type: "COMPANY", archived: false },
      });
      if (!tool) {
        throw new Error("Tool not found");
      }

      const activeTransaction = await tx.toolTransaction.findFirst({
        where: {
          toolId: tool.id,
          status: { in: ["Requested", "Assigned", "Checked Out", "Overdue", "Return Pending"] },
        },
        orderBy: { updatedAt: "desc" },
      });

      const now = new Date();
      const dueBackAt = body.dueBackAt ? new Date(body.dueBackAt) : undefined;
      const submittedOfflineAt = body.submittedOfflineAt ? new Date(body.submittedOfflineAt) : undefined;
      const nextNote = normalizeOptionalText(body.notes);
      const nextIssue = normalizeOptionalText(body.issueReported);
      const commonData = {
        clientRequestId: body.clientRequestId,
        submittedOfflineAt,
        syncStatus: body.clientRequestId && submittedOfflineAt ? "queued_sync" : "synced",
      };

      if (body.action === "request") {
        if (!access.access.canRequestCompanyTools) {
          throw new Error("Forbidden");
        }
        if (!["Available", "Returned"].includes(tool.currentStatus)) {
          return NextResponse.json({ error: "Tool is not available to request" }, { status: 409 });
        }

        const transaction = await tx.toolTransaction.create({
          data: {
            organizationId: access.access.organizationId,
            toolId: tool.id,
            holderUserId: access.access.userId,
            requestedByUserId: access.access.userId,
            status: "Requested",
            transactionType: "request",
            requestedAt: now,
            dueBackAt,
            notes: nextNote,
            issueReported: nextIssue,
            ...commonData,
          },
        });

        await tx.tool.update({
          where: { id: tool.id },
          data: {
            currentStatus: "Requested",
            assignedUserId: access.access.userId,
            lastTransactionAt: now,
          },
        });

        return transaction;
      }

      if (body.action === "assign") {
        if (!access.access.canManageCompanyTools) {
          throw new Error("Forbidden");
        }

        const holderUserId = normalizeOptionalText(body.holderUserId);
        if (!holderUserId) {
          return NextResponse.json({ error: "Select a user to assign the tool to" }, { status: 400 });
        }

        const assignedUser = await tx.appUser.findFirst({
          where: { id: holderUserId, organizationId: access.access.organizationId },
          select: { id: true },
        });
        if (!assignedUser) {
          return NextResponse.json({ error: "Assigned user not found" }, { status: 404 });
        }

        const transaction = activeTransaction
          ? await tx.toolTransaction.update({
              where: { id: activeTransaction.id },
              data: {
                holderUserId,
                approvedByUserId: access.access.userId,
                status: "Assigned",
                transactionType: "assign",
                dueBackAt,
                notes: appendNotes(activeTransaction.notes, nextNote),
                updatedAt: now,
              },
            })
          : await tx.toolTransaction.create({
              data: {
                organizationId: access.access.organizationId,
                toolId: tool.id,
                holderUserId,
                requestedByUserId: access.access.userId,
                approvedByUserId: access.access.userId,
                status: "Assigned",
                transactionType: "assign",
                requestedAt: now,
                dueBackAt,
                notes: nextNote,
                issueReported: nextIssue,
                ...commonData,
              },
            });

        await tx.tool.update({
          where: { id: tool.id },
          data: {
            currentStatus: "Assigned",
            assignedUserId: holderUserId,
            lastTransactionAt: now,
          },
        });

        return transaction;
      }

      if (body.action === "checkout") {
        if (!(access.access.canCheckoutCompanyTools || access.access.canManageCompanyTools)) {
          throw new Error("Forbidden");
        }
        if (activeTransaction && activeTransaction.status === "Return Pending") {
          return NextResponse.json({ error: "Return acceptance is still pending" }, { status: 409 });
        }

        const holderUserId = normalizeOptionalText(body.holderUserId) ?? activeTransaction?.holderUserId ?? access.access.userId;
        const checkoutUser = await tx.appUser.findFirst({
          where: { id: holderUserId, organizationId: access.access.organizationId },
          select: { id: true },
        });
        if (!checkoutUser) {
          return NextResponse.json({ error: "Checkout user not found" }, { status: 404 });
        }

        const transaction = activeTransaction
          ? await tx.toolTransaction.update({
              where: { id: activeTransaction.id },
              data: {
                holderUserId,
                approvedByUserId: access.access.userId,
                checkedOutAt: now,
                dueBackAt,
                status: "Checked Out",
                transactionType: "checkout",
                notes: appendNotes(activeTransaction.notes, nextNote),
                updatedAt: now,
              },
            })
          : await tx.toolTransaction.create({
              data: {
                organizationId: access.access.organizationId,
                toolId: tool.id,
                holderUserId,
                requestedByUserId: holderUserId,
                approvedByUserId: access.access.userId,
                status: "Checked Out",
                transactionType: "checkout",
                requestedAt: now,
                checkedOutAt: now,
                dueBackAt,
                notes: nextNote,
                issueReported: nextIssue,
                ...commonData,
              },
            });

        await tx.tool.update({
          where: { id: tool.id },
          data: {
            currentStatus: "Checked Out",
            assignedUserId: holderUserId,
            lastTransactionAt: now,
          },
        });

        return transaction;
      }

      if (body.action === "return") {
        if (!access.access.canReturnCompanyTools) {
          throw new Error("Forbidden");
        }
        if (!activeTransaction || !["Assigned", "Checked Out", "Overdue"].includes(activeTransaction.status)) {
          return NextResponse.json({ error: "There is no active checkout to return" }, { status: 409 });
        }
        if (activeTransaction.holderUserId && activeTransaction.holderUserId !== access.access.userId && !(access.access.canManageCompanyTools || access.access.canAcceptToolReturns)) {
          throw new Error("Forbidden");
        }

        const requiresAcceptance = settings.requireToolReturnAcceptance;
        const transaction = await tx.toolTransaction.update({
          where: { id: activeTransaction.id },
          data: {
            returnRequestedAt: now,
            returnedAt: now,
            status: requiresAcceptance ? "Return Pending" : "Returned",
            transactionType: "return",
            notes: appendNotes(activeTransaction.notes, nextNote),
            issueReported: nextIssue ?? activeTransaction.issueReported,
            acceptedByUserId: requiresAcceptance ? activeTransaction.acceptedByUserId : access.access.userId,
            acceptedAt: requiresAcceptance ? activeTransaction.acceptedAt : now,
            updatedAt: now,
          },
        });

        await tx.tool.update({
          where: { id: tool.id },
          data: {
            currentStatus: requiresAcceptance ? "Return Pending" : "Available",
            assignedUserId: requiresAcceptance ? tool.assignedUserId : null,
            lastTransactionAt: now,
          },
        });

        return transaction;
      }

      if (!(access.access.canAcceptToolReturns || access.access.canManageCompanyTools)) {
        throw new Error("Forbidden");
      }
      if (!activeTransaction || activeTransaction.status !== "Return Pending") {
        return NextResponse.json({ error: "No pending return to accept" }, { status: 409 });
      }

      const transaction = await tx.toolTransaction.update({
        where: { id: activeTransaction.id },
        data: {
          status: "Returned",
          acceptedAt: now,
          acceptedByUserId: access.access.userId,
          notes: appendNotes(activeTransaction.notes, nextNote),
          updatedAt: now,
        },
      });

      await tx.tool.update({
        where: { id: tool.id },
        data: {
          currentStatus: "Available",
          assignedUserId: null,
          lastTransactionAt: now,
        },
      });

      return transaction;
    });

    if (result instanceof NextResponse) {
      return result;
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid tool transaction" }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error("Tool transaction error:", error);
    return NextResponse.json({ error: "Failed to save tool transaction" }, { status: 500 });
  }
}