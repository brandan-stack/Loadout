import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/features/settings-service";
import { requirePageAccess } from "@/lib/permissions";
import { ToolsPageClient } from "@/components/tools/tools-page-client";

const dbAny = prisma as any;

export default async function ToolsPage() {
  const access = await requirePageAccess("canViewTools");
  const settings = await getSettings(access.organizationId);

  if (!settings.enableToolsModule) {
    redirect("/");
  }

  const canManageAllPersonalTools = access.canManageCompanyTools || access.canManageUsers;
  const canViewCompanyToolWorkspace = access.canViewCompanyTools || access.canManageCompanyTools;
  const canViewSignouts =
    canViewCompanyToolWorkspace ||
    access.canRequestCompanyTools ||
    access.canCheckoutCompanyTools ||
    access.canReturnCompanyTools ||
    access.canAcceptToolReturns;

  const [personalTools, companyTools, signouts, users] = await Promise.all([
    access.canViewOwnTools || canManageAllPersonalTools
      ? dbAny.tool.findMany({
          where: {
            organizationId: access.organizationId,
            type: "PERSONAL",
            archived: false,
            ...(canManageAllPersonalTools ? {} : { ownerId: access.userId }),
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
    canViewCompanyToolWorkspace
      ? dbAny.tool.findMany({
          where: {
            organizationId: access.organizationId,
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
            organizationId: access.organizationId,
            tool: { type: "COMPANY" },
            ...(canViewCompanyToolWorkspace || access.canAcceptToolReturns || access.canManageCompanyTools
              ? {}
              : {
                  OR: [{ holderUserId: access.userId }, { requestedByUserId: access.userId }],
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
    access.canCheckoutCompanyTools || access.canManageCompanyTools
      ? dbAny.appUser.findMany({
          where: { organizationId: access.organizationId },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : [],
  ]);

  return (
    <ToolsPageClient
      currentUserId={access.userId}
      financialVisibilityMode={access.financialVisibilityMode}
      workflowConfig={{
        requireReturnAcceptance: settings.requireToolReturnAcceptance,
        allowOfflineCompanyToolFlows: settings.allowOfflineCompanyToolFlows,
      }}
      permissions={{
        canViewOwnTools: access.canViewOwnTools,
        canAddOwnTools: access.canAddOwnTools,
        canEditOwnTools: access.canEditOwnTools,
        canViewCompanyTools: access.canViewCompanyTools,
        canRequestCompanyTools: access.canRequestCompanyTools,
        canCheckoutCompanyTools: access.canCheckoutCompanyTools,
        canReturnCompanyTools: access.canReturnCompanyTools,
        canAcceptToolReturns: access.canAcceptToolReturns,
        canManageCompanyTools: access.canManageCompanyTools,
      }}
      initialPersonalTools={personalTools.map((tool: any) => ({
        ...tool,
        manufacturer: tool.manufacturer ?? undefined,
        modelNumber: tool.modelNumber ?? undefined,
        serialNumber: tool.serialNumber ?? undefined,
        category: tool.category ?? undefined,
        notes: tool.notes ?? undefined,
        photoUrl: tool.photoUrl ?? undefined,
        defaultLocation: tool.defaultLocation ?? undefined,
        cost: tool.cost ?? undefined,
        owner: tool.owner ?? undefined,
        updatedAt: tool.updatedAt.toISOString(),
      }))}
      initialCompanyTools={companyTools.map((tool: any) => ({
        ...tool,
        assetTag: tool.assetTag ?? undefined,
        manufacturer: tool.manufacturer ?? undefined,
        modelNumber: tool.modelNumber ?? undefined,
        serialNumber: tool.serialNumber ?? undefined,
        category: tool.category ?? undefined,
        cost: tool.cost ?? undefined,
        replacementValue: tool.replacementValue ?? undefined,
        defaultLocation: tool.defaultLocation ?? undefined,
        notes: tool.notes ?? undefined,
        photoUrl: tool.photoUrl ?? undefined,
        assignedUser: tool.assignedUser ?? undefined,
        lastTransactionAt: tool.lastTransactionAt?.toISOString(),
        updatedAt: tool.updatedAt.toISOString(),
      }))}
      initialSignouts={signouts.map((transaction: any) => ({
        ...transaction,
        notes: transaction.notes ?? undefined,
        issueReported: transaction.issueReported ?? undefined,
        requestedAt: transaction.requestedAt.toISOString(),
        checkedOutAt: transaction.checkedOutAt?.toISOString(),
        dueBackAt: transaction.dueBackAt?.toISOString(),
        returnRequestedAt: transaction.returnRequestedAt?.toISOString(),
        returnedAt: transaction.returnedAt?.toISOString(),
        acceptedAt: transaction.acceptedAt?.toISOString(),
      }))}
      initialUsers={users}
    />
  );
}