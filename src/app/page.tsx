import { Prisma } from "@prisma/client";
import { ArrowRightLeft, BriefcaseBusiness, PackagePlus, ScanLine } from "lucide-react";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard/Dashboard";
import type {
  ActionStripItem,
  CommandDecisionItem,
  ContextRiskItem,
  HealthStatItem,
  Tone,
} from "@/components/dashboard/types";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getReorderRecommendationSnapshot } from "@/lib/reorder/suggestion-service";
import type { ReorderRecommendation } from "@/lib/reorder/types";

type DashboardInventorySnapshotRow = {
  totalItems: number | bigint;
  criticalCount: number | bigint;
  warningCount: number | bigint;
};

type OpenJobWithParts = {
  id: string;
  jobNumber: string;
  customer: string;
  updatedAt: Date;
  parts: Array<{
    id: string;
    quantity: number;
    item: {
      id: string;
      name: string;
      quantityOnHand: number;
      preferredSupplier: {
        id: string;
        name: string;
        leadTimeD: number;
      } | null;
    };
  }>;
};

type JobImpact = {
  total: number;
  jobs: Array<{ id: string; jobNumber: string; customer: string }>;
};

type ItemDecisionSignals = {
  weeklyUsageCount: number;
  lastReorderDate: Date | null;
};

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const jobScope =
    session.role === "TECH"
      ? { organizationId: session.organizationId, technicianId: session.userId }
      : { organizationId: session.organizationId };

  const passwordRecoveryConfigured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_FROM && (!process.env.SMTP_USER || process.env.SMTP_PASS)
  );

  const [inventorySnapshotRows, openJobsCount, reorderSnapshot, openJobs] = await Promise.all([
    prisma.$queryRaw<DashboardInventorySnapshotRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "totalItems",
        COUNT(*) FILTER (
          WHERE item."quantityOnHand" <= item."lowStockRedThreshold"
        )::int AS "criticalCount",
        COUNT(*) FILTER (
          WHERE item."quantityOnHand" > item."lowStockRedThreshold"
            AND item."quantityOnHand" <= item."lowStockAmberThreshold"
        )::int AS "warningCount"
      FROM "Item" item
      WHERE item."organizationId" = ${session.organizationId}
    `),
    prisma.job.count({
      where: { ...jobScope, status: "OPEN" },
    }),
    getReorderRecommendationSnapshot(session.organizationId, 8),
    prisma.job.findMany({
      where: { ...jobScope, status: "OPEN" },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        jobNumber: true,
        customer: true,
        updatedAt: true,
        parts: {
          select: {
            id: true,
            quantity: true,
            item: {
              select: {
                id: true,
                name: true,
                quantityOnHand: true,
                preferredSupplier: {
                  select: {
                    id: true,
                    name: true,
                    leadTimeD: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const inventorySnapshot = inventorySnapshotRows[0];
  const totalItems = Number(inventorySnapshot?.totalItems ?? 0);
  const criticalCount = Number(inventorySnapshot?.criticalCount ?? 0);
  const warningCount = Number(inventorySnapshot?.warningCount ?? 0);
  const lowStockCount = criticalCount + warningCount;
  const inventoryHealth =
    totalItems === 0
      ? 100
      : Math.max(12, Math.round(((totalItems - lowStockCount) / totalItems) * 100));

  const recommendationItemIds = reorderSnapshot.recommendations.map((recommendation) => recommendation.itemId);
  const recentTransactions =
    recommendationItemIds.length > 0
      ? await prisma.inventoryTransaction.findMany({
          where: { itemId: { in: recommendationItemIds } },
          orderBy: { createdAt: "desc" },
          select: {
            itemId: true,
            type: true,
            createdAt: true,
          },
        })
      : [];

  const jobImpacts = buildJobImpacts(openJobs, reorderSnapshot.recommendations);
  const itemSignals = buildItemDecisionSignals(recentTransactions);
  const jobsAtRisk = buildJobsAtRisk(openJobs, reorderSnapshot.recommendations);
  const allDecisions = buildCommandDecisions(reorderSnapshot.recommendations, jobImpacts, itemSignals);
  const commandActions = allDecisions.slice(0, 3);
  const workQueueItems = allDecisions.slice(3, 7);
  const atRiskJobsCount = jobsAtRisk.length;
  const supportingLine = buildSupportingLine(commandActions);
  const criticalActionCount = allDecisions.filter((decision) => decision.isCritical).length;
  const heroTitle = buildHeroTitle({ criticalActionCount });

  const primaryAction =
    commandActions[0] != null
      ? {
          label: `Reorder Critical (${formatCompact(criticalActionCount)})`,
          href: criticalActionCount > 0 ? "/reorder?priority=urgent" : commandActions[0].actionHref,
        }
      : { label: `Reorder Critical (${formatCompact(criticalActionCount)})`, href: "/reorder?priority=urgent" };

  const summaryItems = [
    {
      label: "Actionable critical",
      value: formatCompact(criticalActionCount),
      tone: (criticalActionCount > 0 ? "rose" : "emerald") as Tone,
    },
    { label: "Jobs at risk", value: formatCompact(atRiskJobsCount), tone: (atRiskJobsCount > 0 ? "amber" : "emerald") as Tone },
  ];

  const healthStats: HealthStatItem[] = [
    {
      label: "Inventory Health",
      value: `${inventoryHealth}%`,
      detail: lowStockCount > 0 ? `${formatCompact(lowStockCount)} stock alerts active` : "Inventory is stable",
      tone: lowStockCount > 0 ? "amber" : "emerald",
    },
    {
      label: "Total Critical",
      value: formatCompact(criticalCount),
      detail: criticalCount > 0 ? "Immediate reorder decisions" : "No critical stockouts",
      tone: criticalCount > 0 ? "rose" : "emerald",
    },
    {
      label: "Jobs at Risk",
      value: formatCompact(atRiskJobsCount),
      detail: atRiskJobsCount > 0 ? "Blocked or exposed by parts" : "No jobs blocked by stock",
      tone: atRiskJobsCount > 0 ? "amber" : "emerald",
    },
    {
      label: "Active Jobs",
      value: formatCompact(openJobsCount),
      detail: session.role === "TECH" ? "Assigned to you" : "Currently open field work",
      tone: openJobsCount > 0 ? "indigo" : "sky",
    },
  ];

  const actionStripItems: ActionStripItem[] = [
    { label: "Scan", href: "/scan", icon: ScanLine, tone: "emerald" },
    { label: "Add Item", href: "/items", icon: PackagePlus, tone: "sky" },
    { label: "Move Stock", href: "/locations", icon: ArrowRightLeft, tone: "amber" },
    { label: "New Job", href: "/jobs", icon: BriefcaseBusiness, tone: "indigo" },
  ];

  return (
    <Dashboard
      organizationName={session.organizationName}
      heroTitle={heroTitle}
      summaryItems={summaryItems}
      supportingLine={supportingLine}
      primaryAction={primaryAction}
      secondaryAction={{ label: "Open Action Queue", href: "/reorder" }}
      commandActions={commandActions}
      healthStats={healthStats}
      actionStripItems={actionStripItems}
      workQueueItems={workQueueItems}
      jobsAtRisk={jobsAtRisk}
      analyticsNote={
        passwordRecoveryConfigured
          ? undefined
          : "Password recovery email setup is still required before forgot-password can be used in production."
      }
    />
  );
}

function buildJobImpacts(jobs: OpenJobWithParts[], recommendations: ReorderRecommendation[]) {
  const recommendationMap = new Map(recommendations.map((recommendation) => [recommendation.itemId, recommendation]));
  const impacts = new Map<string, JobImpact>();

  for (const job of jobs) {
    for (const part of job.parts) {
      const recommendation = recommendationMap.get(part.item.id);
      const isShortForJob = part.item.quantityOnHand < part.quantity;
      const isRisky = recommendation != null || isShortForJob;

      if (!isRisky) {
        continue;
      }

      const existing = impacts.get(part.item.id) ?? { total: 0, jobs: [] };
      existing.total += 1;
      existing.jobs.push({ id: job.id, jobNumber: job.jobNumber, customer: job.customer });
      impacts.set(part.item.id, existing);
    }
  }

  return impacts;
}

function buildJobsAtRisk(jobs: OpenJobWithParts[], recommendations: ReorderRecommendation[]): ContextRiskItem[] {
  const recommendationMap = new Map(recommendations.map((recommendation) => [recommendation.itemId, recommendation]));
  const items: ContextRiskItem[] = [];

  for (const job of jobs) {
    const riskyParts = job.parts
      .map((part) => {
        const recommendation = recommendationMap.get(part.item.id);
        const shortage = Math.max(part.quantity - part.item.quantityOnHand, 0);
        const priority = recommendation?.priority ?? (shortage > 0 ? "high" : null);

        if (!priority) {
          return null;
        }

        const tone = priorityToTone(priority);
        const leadTimeDays = recommendation?.leadTimeDays ?? part.item.preferredSupplier?.leadTimeD ?? 7;

        return {
          itemName: part.item.name,
          tone,
          stockLabel:
            shortage > 0
              ? `${formatCompact(shortage)} short against job`
              : `${formatCompact(part.item.quantityOnHand)} on hand`,
          leadTimeLabel: `${leadTimeDays}d lead`,
          detail:
            recommendation?.reason ??
            `${part.item.name} is below the quantity needed for this job (${formatCompact(part.quantity)} required).`,
          statusLabel: priority === "urgent" ? "Blocked" : "At risk",
        };
      })
      .filter((part): part is NonNullable<typeof part> => part !== null)
      .sort((left, right) => toneRank(left.tone) - toneRank(right.tone));

    if (riskyParts.length === 0) {
      continue;
    }

    const primaryRisk = riskyParts[0];
    items.push({
      id: job.id,
      jobNumber: job.jobNumber,
      customer: job.customer,
      blockedBy: primaryRisk.itemName,
      detail: primaryRisk.detail,
      statusLabel: primaryRisk.statusLabel,
      updatedLabel: formatRelativeTime(job.updatedAt),
      stockLabel: primaryRisk.stockLabel,
      leadTimeLabel: primaryRisk.leadTimeLabel,
      tone: primaryRisk.tone,
      href: `/jobs/${job.id}`,
    });
  }

  return items.sort((left, right) => toneRank(left.tone) - toneRank(right.tone)).slice(0, 5);
}

function buildItemDecisionSignals(transactions: Array<{ itemId: string; type: string; createdAt: Date }>) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const signals = new Map<string, ItemDecisionSignals>();

  for (const transaction of transactions) {
    const current = signals.get(transaction.itemId) ?? {
      weeklyUsageCount: 0,
      lastReorderDate: null,
    };

    if (transaction.type === "use" && transaction.createdAt.getTime() >= sevenDaysAgo) {
      current.weeklyUsageCount += 1;
    }

    if (current.lastReorderDate == null && transaction.type === "add") {
      current.lastReorderDate = transaction.createdAt;
    }

    signals.set(transaction.itemId, current);
  }

  return signals;
}

function buildCommandDecisions(
  recommendations: ReorderRecommendation[],
  jobImpacts: Map<string, JobImpact>,
  itemSignals: Map<string, ItemDecisionSignals>
): CommandDecisionItem[] {
  return recommendations.map((recommendation) => {
    const tone = priorityToTone(recommendation.priority);
    const impact = jobImpacts.get(recommendation.itemId);
    const primaryJob = impact?.jobs[0];
    const itemSignal = itemSignals.get(recommendation.itemId);
    const useAllocate = recommendation.currentQuantity > 0 && (impact?.total ?? 0) > 0;

    return {
      id: recommendation.itemId,
      name: recommendation.name,
      tone,
      isCritical: recommendation.priority === "urgent",
      statusLabel: priorityToLabel(recommendation.priority),
      stockLabel: `${formatCompact(recommendation.currentQuantity)} on hand / min ${formatCompact(recommendation.minQuantity)}`,
      leadTimeLabel: `${recommendation.leadTimeDays}d lead time`,
      jobImpactLabel:
        impact != null && impact.total > 0
          ? `${formatCompact(impact.total)} ${impact.total === 1 ? "job" : "jobs"} exposed`
          : "Low impact - no active jobs",
      jobImpactCount: impact?.total ?? 0,
      impactLine: buildImpactLine({
        primaryJob,
        jobImpactCount: impact?.total ?? 0,
        weeklyUsageCount: itemSignal?.weeklyUsageCount ?? 0,
        lastReorderDate: itemSignal?.lastReorderDate ?? null,
        leadTimeDays: recommendation.leadTimeDays,
        isCritical: recommendation.priority === "urgent",
      }),
      detail:
        impact != null && primaryJob != null
          ? `${recommendation.reason}. ${primaryJob.jobNumber} for ${primaryJob.customer} is exposed.`
          : recommendation.reason,
      supplierLabel: recommendation.preferredSupplier?.name ?? "No supplier assigned",
      actionLabel: useAllocate ? "Allocate Stock" : "Reorder Now",
      actionHref: useAllocate && primaryJob != null ? `/jobs/${primaryJob.id}` : `/reorder?item=${recommendation.itemId}`,
      detailHref: `/items?item=${recommendation.itemId}`,
    };
  });
}

function buildImpactLine({
  primaryJob,
  jobImpactCount,
  weeklyUsageCount,
  lastReorderDate,
  leadTimeDays,
  isCritical,
}: {
  primaryJob?: { id: string; jobNumber: string; customer: string };
  jobImpactCount: number;
  weeklyUsageCount: number;
  lastReorderDate: Date | null;
  leadTimeDays: number;
  isCritical: boolean;
}) {
  if (jobImpactCount > 1) {
    return `Affects ${formatCompact(jobImpactCount)} open jobs.`;
  }

  if (primaryJob != null) {
    return leadTimeDays <= 2
      ? `Will impact ${primaryJob.jobNumber} within ${leadTimeDays} days.`
      : `Will block ${primaryJob.jobNumber} without stock coverage.`;
  }

  if (weeklyUsageCount > 0) {
    return weeklyUsageCount >= 3
      ? `Used ${formatCompact(weeklyUsageCount)} times this week.`
      : "Recently consumed - monitor usage.";
  }

  if (isCritical && leadTimeDays <= 2) {
    return `Will impact field work within ${leadTimeDays} days.`;
  }

  if (lastReorderDate != null) {
    return `Last reordered ${formatRelativeTime(lastReorderDate)}.`;
  }

  return null;
}

function buildSupportingLine(actions: CommandDecisionItem[]) {
  const preventedDelays = actions.reduce((count, action) => count + action.jobImpactCount, 0);

  if (preventedDelays <= 0) {
    return "No jobs are currently blocked. Field work is clear.";
  }

  return `${formatCompact(preventedDelays)} ${preventedDelays === 1 ? "job delay" : "job delays"} can be prevented from this queue.`;
}

function buildHeroTitle({
  criticalActionCount,
}: {
  criticalActionCount: number;
}) {
  return `${formatCompact(criticalActionCount)} critical ${criticalActionCount === 1 ? "item needs" : "items need"} action now.`;
}

function priorityToTone(priority: ReorderRecommendation["priority"] | "high"): Tone {
  if (priority === "urgent") {
    return "rose";
  }

  if (priority === "high") {
    return "amber";
  }

  if (priority === "medium") {
    return "sky";
  }

  return "emerald";
}

function priorityToLabel(priority: ReorderRecommendation["priority"]) {
  if (priority === "urgent") {
    return "Critical";
  }

  if (priority === "high") {
    return "Warning";
  }

  if (priority === "medium") {
    return "Watch";
  }

  return "Stable";
}

function toneRank(tone: Tone) {
  if (tone === "rose") {
    return 0;
  }

  if (tone === "amber") {
    return 1;
  }

  if (tone === "indigo") {
    return 2;
  }

  if (tone === "sky") {
    return 3;
  }

  return 4;
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatRelativeTime(date: Date) {
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return formatter.format(diffDays, "day");
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}