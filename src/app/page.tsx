import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  Clock3,
  MapPin,
  Package,
  PackagePlus,
  ScanLine,
  Settings2,
  ShoppingCart,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getReorderRecommendations } from "@/lib/reorder/suggestion-service";
import type { ReorderRecommendation } from "@/lib/reorder/types";

type Severity = "critical" | "warning";
type Tone = "sky" | "emerald" | "amber" | "rose" | "indigo";

type DashboardActivity = {
  id: string;
  title: string;
  detail: string;
  timestamp: Date;
  href: string;
  icon: LucideIcon;
  tone: Tone;
};

type DashboardLowStockItem = {
  id: string;
  name: string;
  quantityOnHand: number;
  threshold: number;
  supplierName?: string | null;
  updatedAt: Date;
  severity: Severity;
};

type DashboardMetric = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: Tone;
};

type QuickAction = {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
};

type WorkspaceCard = {
  href: string;
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: Tone;
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
    process.env.SMTP_HOST &&
      process.env.SMTP_FROM &&
      (!process.env.SMTP_USER || process.env.SMTP_PASS)
  );

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    items,
    locationsCount,
    suppliersCount,
    openJobsCount,
    recentJobs,
    recentTransactions,
    stockMovementsThisWeek,
    reorderRecommendations,
  ] = await Promise.all([
    prisma.item.findMany({
      where: { organizationId: session.organizationId },
      select: {
        id: true,
        name: true,
        quantityOnHand: true,
        lowStockAmberThreshold: true,
        lowStockRedThreshold: true,
        updatedAt: true,
        preferredSupplier: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.location.count({
      where: { organizationId: session.organizationId, archived: false },
    }),
    prisma.supplier.count({
      where: { organizationId: session.organizationId, archived: false },
    }),
    prisma.job.count({
      where: { ...jobScope, status: "OPEN" },
    }),
    prisma.job.findMany({
      where: jobScope,
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        jobNumber: true,
        customer: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.inventoryTransaction.findMany({
      where: { item: { organizationId: session.organizationId } },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        quantity: true,
        notes: true,
        createdAt: true,
        item: { select: { id: true, name: true } },
      },
    }),
    prisma.inventoryTransaction.count({
      where: {
        item: { organizationId: session.organizationId },
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    getReorderRecommendations(session.organizationId),
  ]);

  const totalItems = items.length;
  const totalUnits = items.reduce((sum, item) => sum + item.quantityOnHand, 0);
  const criticalLowStock = items.filter(
    (item) => item.quantityOnHand <= item.lowStockRedThreshold
  );
  const warningLowStock = items.filter(
    (item) =>
      item.quantityOnHand > item.lowStockRedThreshold &&
      item.quantityOnHand <= item.lowStockAmberThreshold
  );
  const lowStockCount = criticalLowStock.length + warningLowStock.length;
  const inventoryHealth =
    totalItems === 0
      ? 100
      : Math.max(12, Math.round(((totalItems - lowStockCount) / totalItems) * 100));
  const supplierCoverage = items.filter((item) => item.preferredSupplier?.name).length;
  const urgentReorders = reorderRecommendations.filter((item) => item.priority === "urgent").length;
  const highReorders = reorderRecommendations.filter((item) => item.priority === "high").length;
  const actionQueueCount = urgentReorders + highReorders + criticalLowStock.length;

  const lowStockItems: DashboardLowStockItem[] = [...criticalLowStock, ...warningLowStock]
    .map((item) => ({
      id: item.id,
      name: item.name,
      quantityOnHand: item.quantityOnHand,
      threshold:
        item.quantityOnHand <= item.lowStockRedThreshold
          ? item.lowStockRedThreshold
          : item.lowStockAmberThreshold,
      supplierName: item.preferredSupplier?.name,
      updatedAt: item.updatedAt,
      severity: (item.quantityOnHand <= item.lowStockRedThreshold ? "critical" : "warning") as Severity,
    }))
    .sort((left, right) => {
      if (left.severity !== right.severity) {
        return left.severity === "critical" ? -1 : 1;
      }

      return left.quantityOnHand - right.quantityOnHand;
    });

  const activity: DashboardActivity[] = [
    ...recentTransactions.map<DashboardActivity>((transaction) => ({
      id: `transaction-${transaction.id}`,
      title: describeTransaction(transaction.type, transaction.quantity, transaction.item.name),
      detail: transaction.notes?.trim() || "Inventory movement captured",
      timestamp: transaction.createdAt,
      href: "/items",
      icon:
        transaction.type === "add"
          ? PackagePlus
          : transaction.type === "use"
            ? Package
            : ArrowRightLeft,
      tone: (
        transaction.type === "add"
          ? "sky"
          : transaction.type === "use"
            ? "amber"
            : "rose"
      ) as Tone,
    })),
    ...recentJobs.map<DashboardActivity>((job) => ({
      id: `job-${job.id}`,
      title: describeJob(job.jobNumber, job.customer, job.status),
      detail: job.status === "OPEN" ? "Active field work order" : `Status ${job.status.toLowerCase()}`,
      timestamp: job.updatedAt,
      href: `/jobs/${job.id}`,
      icon: BriefcaseBusiness,
      tone: (job.status === "OPEN" ? "indigo" : "emerald") as Tone,
    })),
  ]
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, 6);

  const primaryAction = getPrimaryAction({
    urgentReorders,
    criticalCount: criticalLowStock.length,
    openJobsCount,
  });

  const desktopMetrics: DashboardMetric[] = [
    {
      label: "Catalog",
      value: formatCompact(totalItems),
      hint: `${formatCompact(totalUnits)} units on hand`,
      icon: Boxes,
      tone: "sky",
    },
    {
      label: "Low Stock",
      value: formatCompact(lowStockCount),
      hint: `${formatCompact(criticalLowStock.length)} critical now`,
      icon: AlertTriangle,
      tone: lowStockCount > 0 ? "amber" : "emerald",
    },
    {
      label: "Open Jobs",
      value: formatCompact(openJobsCount),
      hint: session.role === "TECH" ? "Assigned to you" : "Live work orders",
      icon: BriefcaseBusiness,
      tone: openJobsCount > 0 ? "indigo" : "sky",
    },
    {
      label: "Locations",
      value: formatCompact(locationsCount),
      hint: "Active stock points",
      icon: MapPin,
      tone: "emerald",
    },
    {
      label: "Priority Queue",
      value: formatCompact(actionQueueCount),
      hint: `${formatCompact(urgentReorders + highReorders)} reorder decisions`,
      icon: ShoppingCart,
      tone: actionQueueCount > 0 ? "rose" : "sky",
    },
  ];

  const mobileMetrics = desktopMetrics.slice(0, 4);

  const quickActions: QuickAction[] = [
    { href: "/items", label: "Add Item", icon: PackagePlus, tone: "sky" },
    { href: "/jobs", label: "New Job", icon: BriefcaseBusiness, tone: "indigo" },
    { href: "/locations", label: "Move Stock", icon: ArrowRightLeft, tone: "amber" },
    { href: "/reorder", label: "Reorder", icon: ShoppingCart, tone: "rose" },
    { href: "/scan", label: "Scan", icon: ScanLine, tone: "emerald" },
  ];

  const workspaceCards: WorkspaceCard[] = [
    {
      href: "/jobs",
      title: "Jobs",
      value: formatCompact(openJobsCount),
      detail:
        recentJobs[0] != null
          ? `${recentJobs[0].jobNumber} for ${recentJobs[0].customer}`
          : "Create and track field work orders.",
      icon: BriefcaseBusiness,
      tone: "indigo",
    },
    {
      href: "/items",
      title: "Inventory",
      value: formatCompact(totalUnits),
      detail:
        totalItems > 0
          ? `${formatCompact(totalItems)} active catalog items`
          : "Start by adding your first stocked item.",
      icon: Boxes,
      tone: "sky",
    },
    {
      href: "/reports",
      title: "Reports",
      value: formatCompact(stockMovementsThisWeek),
      detail:
        stockMovementsThisWeek > 0
          ? `${formatCompact(stockMovementsThisWeek)} stock events logged this week`
          : "No stock events logged this week.",
      icon: BarChart3,
      tone: "emerald",
    },
    {
      href: "/suppliers",
      title: "Suppliers",
      value: formatCompact(suppliersCount),
      detail:
        suppliersCount > 0
          ? `${formatCompact(supplierCoverage)} items linked to suppliers`
          : "Add suppliers for better reorder control.",
      icon: Truck,
      tone: "amber",
    },
    {
      href: "/reorder",
      title: "Reorder",
      value: formatCompact(urgentReorders + highReorders),
      detail:
        reorderRecommendations[0] != null
          ? `${reorderRecommendations[0].name} needs the next decision`
          : "No active reorder queue right now.",
      icon: ShoppingCart,
      tone: "rose",
    },
    {
      href: "/settings",
      title: "Settings",
      value: formatCompact(locationsCount + suppliersCount),
      detail: "Workspace controls, defaults, and system setup.",
      icon: Settings2,
      tone: "indigo",
    },
  ];

  const heroTitle =
    urgentReorders > 0 || criticalLowStock.length > 0
      ? "Stock pressure is rising"
      : openJobsCount > 0
        ? "Field operations are active"
        : "Operations are steady";

  return (
    <main className="relative mx-auto w-full max-w-[1400px] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_24%),radial-gradient(circle_at_50%_35%,rgba(14,165,233,0.1),transparent_38%)]" />

      {!passwordRecoveryConfigured && (
        <div className="mb-5 rounded-[1.4rem] border border-amber-400/18 bg-amber-500/10 px-4 py-3.5 text-sm text-amber-50 shadow-[0_16px_40px_rgba(15,23,42,0.28)] backdrop-blur">
          Password recovery email setup is still required before forgot-password can be used in production.
        </div>
      )}

      <div className="md:hidden">
        <section className="panel-interactive dashboard-rise relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(165deg,rgba(10,21,39,0.96),rgba(3,7,18,0.99))] px-5 py-5 shadow-[0_34px_90px_rgba(2,6,23,0.62),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_24%),radial-gradient(circle_at_80%_16%,rgba(129,140,248,0.14),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/18 bg-sky-300/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-sky-50 shadow-[0_0_16px_rgba(56,189,248,0.08)]">
              <Sparkles className="h-3.5 w-3.5" />
              Field Overview
            </div>

            <div className="mt-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="dashboard-balance max-w-[8ch] text-[2.05rem] font-bold leading-[0.98] tracking-[-0.055em] text-white">
                  {heroTitle}
                </h1>
                <p className="dashboard-balance mt-3 max-w-[21rem] text-[0.93rem] leading-[1.72] text-slate-200/84">
                  {buildHeroSummary({
                    organizationName: session.organizationName,
                    inventoryHealth,
                    lowStockCount,
                    stockMovementsThisWeek,
                  })}
                </p>
              </div>

              <div className="shrink-0 rounded-[1.35rem] border border-white/12 bg-white/[0.08] px-3.5 py-3.5 text-right shadow-[0_18px_34px_rgba(2,6,23,0.34)] backdrop-blur-md">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-300/80">
                  Inventory Health
                </p>
                <p className="mt-1.5 text-[1.9rem] font-bold tracking-[-0.05em] text-white">
                  {inventoryHealth}%
                </p>
                <p className="mt-1 text-[0.72rem] font-medium text-slate-300/70">
                  {actionQueueCount > 0 ? `${actionQueueCount} decisions waiting` : "Ready for the day"}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2.5">
              <Link
                href={primaryAction.href}
                prefetch={false}
                className="inline-flex min-h-[2.85rem] items-center justify-center gap-2 rounded-[1rem] bg-[linear-gradient(135deg,#4f46e5_0%,#38bdf8_100%)] px-4 py-3 text-sm font-semibold tracking-[-0.01em] text-white shadow-[0_16px_32px_rgba(59,130,246,0.28),0_0_22px_rgba(56,189,248,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(59,130,246,0.34),0_0_28px_rgba(56,189,248,0.22)] active:scale-[0.97]"
              >
                {primaryAction.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/scan"
                prefetch={false}
                className="inline-flex min-h-[2.85rem] items-center justify-center gap-2 rounded-[1rem] border border-white/12 bg-white/[0.06] px-4 py-3 text-sm font-semibold tracking-[-0.01em] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 hover:bg-white/[0.1] active:scale-[0.97]"
              >
                <ScanLine className="h-4 w-4" />
                Scan
              </Link>
            </div>
          </div>
        </section>

        <section className="dashboard-rise dashboard-delay-1 mt-4 grid grid-cols-4 gap-2.5">
          {mobileMetrics.map((metric) => (
            <CompactMetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="dashboard-rise dashboard-delay-2 mt-4">
          <SectionHeading title="Quick Actions" detail="Fast paths for field work" />
          <div className="horizontal-scroll-row mt-3 flex gap-2 overflow-x-auto pb-1">
            {quickActions.map((action) => (
              <QuickActionChip key={action.label} action={action} />
            ))}
          </div>
        </section>

        <section className="dashboard-rise dashboard-delay-3 mt-4">
          <AttentionPanel
            lowStockItems={lowStockItems.slice(0, 4)}
            reorderRecommendations={reorderRecommendations.slice(0, 3)}
            criticalCount={criticalLowStock.length}
            warningCount={warningLowStock.length}
            compact
          />
        </section>

        <section className="dashboard-rise dashboard-delay-4 mt-4">
          <ActivityPanel activity={activity} compact />
        </section>

        <section className="dashboard-rise dashboard-delay-4 mt-4">
          <SectionHeading title="Core Workspaces" detail="Dive deeper only when you need it" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            {workspaceCards.map((card) => (
              <WorkspaceTile key={card.title} card={card} compact />
            ))}
          </div>
        </section>
      </div>

      <div className="hidden md:block">
        <section className="dashboard-rise dashboard-delay-1 grid gap-3 xl:grid-cols-5">
          {desktopMetrics.map((metric) => (
            <DesktopMetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.84fr)]">
          <div className="panel-interactive dashboard-rise dashboard-delay-2 relative overflow-hidden rounded-[2.1rem] border border-white/10 bg-[linear-gradient(145deg,rgba(10,21,39,0.97),rgba(2,6,23,0.99))] px-8 py-8 shadow-[0_42px_110px_rgba(2,6,23,0.68),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.14),transparent_24%),radial-gradient(circle_at_82%_16%,rgba(129,140,248,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%)]" />

            <div className="relative flex items-start justify-between gap-8">
              <div className="max-w-[44rem]">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/18 bg-sky-300/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-sky-50 shadow-[0_0_18px_rgba(56,189,248,0.08)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Operational Pulse
                </div>
                <h1 className="dashboard-balance mt-5 max-w-[11ch] text-[3.7rem] font-bold leading-[0.88] tracking-[-0.065em] text-white xl:text-[4.15rem]">
                  {heroTitle}
                </h1>
                <p className="dashboard-balance mt-5 max-w-[44rem] text-[1.03rem] leading-[1.95] text-slate-200/84">
                  {buildHeroSummary({
                    organizationName: session.organizationName,
                    inventoryHealth,
                    lowStockCount,
                    stockMovementsThisWeek,
                  })}
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    href={primaryAction.href}
                    prefetch={false}
                    className="inline-flex min-h-[3rem] items-center gap-2 rounded-[1rem] bg-[linear-gradient(135deg,#4f46e5_0%,#38bdf8_100%)] px-5 py-3 text-sm font-semibold tracking-[-0.01em] text-white shadow-[0_18px_36px_rgba(59,130,246,0.3),0_0_24px_rgba(56,189,248,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(59,130,246,0.36),0_0_28px_rgba(56,189,248,0.24)]"
                  >
                    {primaryAction.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/scan"
                    prefetch={false}
                    className="inline-flex min-h-[3rem] items-center gap-2 rounded-[1rem] border border-white/12 bg-white/[0.06] px-5 py-3 text-sm font-semibold tracking-[-0.01em] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 hover:bg-white/[0.1]"
                  >
                    <ScanLine className="h-4 w-4" />
                    Open scanner
                  </Link>
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-3">
                  <HeroSignal
                    title="Inventory Health"
                    value={`${inventoryHealth}%`}
                    detail={lowStockCount > 0 ? `${lowStockCount} stock alerts active` : "No low stock blockers"}
                    tone={lowStockCount > 0 ? "amber" : "emerald"}
                  />
                  <HeroSignal
                    title="Weekly Flow"
                    value={formatCompact(stockMovementsThisWeek)}
                    detail={stockMovementsThisWeek > 0 ? "Stock activity captured this week" : "No stock activity logged this week"}
                    tone="sky"
                  />
                  <HeroSignal
                    title="Supplier Links"
                    value={formatCompact(supplierCoverage)}
                    detail={suppliersCount > 0 ? `${suppliersCount} active suppliers configured` : "Supplier setup still open"}
                    tone="indigo"
                  />
                </div>
              </div>

              <div className="panel-interactive w-full max-w-[18rem] rounded-[1.7rem] border border-white/12 bg-white/[0.07] p-5 shadow-[0_24px_48px_rgba(2,6,23,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300/78">
                  Priority Queue
                </p>
                <p className="mt-4 text-4xl font-bold tracking-[-0.05em] text-white">
                  {formatCompact(actionQueueCount)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200/76">
                  {actionQueueCount > 0
                    ? `${criticalLowStock.length} critical stock issues and ${urgentReorders + highReorders} reorder decisions need review.`
                    : "No urgent blockers. The workspace is ready for normal flow."}
                </p>

                <div className="mt-5 space-y-3">
                  <FocusRow label="Critical stock" value={formatCompact(criticalLowStock.length)} tone="rose" />
                  <FocusRow label="Reorder queue" value={formatCompact(urgentReorders + highReorders)} tone="amber" />
                  <FocusRow label="Open jobs" value={formatCompact(openJobsCount)} tone="indigo" />
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-rise dashboard-delay-3 grid gap-5">
            <AttentionPanel
              lowStockItems={lowStockItems.slice(0, 4)}
              reorderRecommendations={reorderRecommendations.slice(0, 3)}
              criticalCount={criticalLowStock.length}
              warningCount={warningLowStock.length}
            />
            <ActivityPanel activity={activity} />
          </div>
        </section>

        <section className="dashboard-rise dashboard-delay-4 mt-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Core Workspaces</h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-300/78">
                Keep the live operating picture front and center, then move into the right workspace.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {workspaceCards.map((card) => (
              <WorkspaceTile key={card.title} card={card} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function CompactMetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <div className="panel-interactive rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.66))] px-3 py-3 shadow-[0_14px_30px_rgba(2,6,23,0.26)] backdrop-blur">
      <div className="mb-2 h-1 w-10 rounded-full" style={{ background: toneGradient(metric.tone) }} />
      <div className="flex items-center justify-between gap-2">
        <metric.icon className={`h-3.5 w-3.5 ${toneText(metric.tone)}`} />
        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {metric.label}
        </span>
      </div>
      <p className="mt-2 text-[1.25rem] font-bold tracking-[-0.04em] text-white">{metric.value}</p>
    </div>
  );
}

function DesktopMetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <div className="panel-interactive rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(15,23,42,0.68))] p-4 shadow-[0_18px_40px_rgba(2,6,23,0.3)] backdrop-blur hover:shadow-[0_24px_48px_rgba(2,6,23,0.4)]">
      <div className="mb-3 h-1.5 w-14 rounded-full" style={{ background: toneGradient(metric.tone) }} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-200/88">{metric.label}</p>
          <p className="mt-3 text-3xl font-bold tracking-[-0.05em] text-white">{metric.value}</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[0.68rem] font-semibold ${tonePill(metric.tone)}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          <metric.icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300/72">{metric.hint}</p>
    </div>
  );
}

function QuickActionChip({ action }: { action: QuickAction }) {
  return (
    <Link
      href={action.href}
      prefetch={false}
      className={`panel-interactive group inline-flex min-h-[3rem] shrink-0 items-center gap-2 rounded-[1rem] border px-3.5 py-2.5 text-sm font-semibold tracking-[-0.01em] ${quickActionClasses(action.tone)}`}
    >
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${quickActionIconClasses(action.tone)}`}>
        <action.icon className="h-4 w-4" />
      </span>
      <span>{action.label}</span>
    </Link>
  );
}

function AttentionPanel({
  lowStockItems,
  reorderRecommendations,
  criticalCount,
  warningCount,
  compact = false,
}: {
  lowStockItems: DashboardLowStockItem[];
  reorderRecommendations: ReorderRecommendation[];
  criticalCount: number;
  warningCount: number;
  compact?: boolean;
}) {
  return (
    <section className={`panel-interactive rounded-[1.8rem] border border-rose-300/16 bg-[linear-gradient(180deg,rgba(50,11,24,0.72),rgba(15,23,42,0.84))] ${compact ? "p-4" : "p-5"} shadow-[0_18px_42px_rgba(2,6,23,0.34),0_0_28px_rgba(251,113,133,0.08)] backdrop-blur`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-300/18 bg-rose-300/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-rose-50">
            <AlertTriangle className="h-3.5 w-3.5" />
            Priority Queue
          </div>
          <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-white">Inventory pressure</h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-200/82">
            Surface the items that need review first so the next move is obvious.
          </p>
        </div>
        <Link
          href="/reorder"
          prefetch={false}
          className="inline-flex min-h-[2.7rem] items-center rounded-[1rem] border border-rose-300/15 bg-rose-300/10 px-3.5 py-2 text-sm font-semibold text-rose-50 transition-all duration-300 hover:bg-rose-300/16"
        >
          Review queue
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <SummaryFlag label="Critical" value={formatCompact(criticalCount)} tone="rose" />
        <SummaryFlag label="Warning" value={formatCompact(warningCount)} tone="amber" />
        <SummaryFlag label="Reorder" value={formatCompact(reorderRecommendations.length)} tone="indigo" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-300/72">
            Low stock
          </p>
          <div className="mt-2 space-y-2.5">
            {lowStockItems.length > 0 ? (
              lowStockItems.map((item) => <LowStockRow key={item.id} item={item} />)
            ) : (
              <EmptyState label="No low stock alerts are active." />
            )}
          </div>
        </div>

        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-300/72">
            Reorder queue
          </p>
          <div className="mt-2 space-y-2.5">
            {reorderRecommendations.length > 0 ? (
              reorderRecommendations.map((item) => <ReorderRow key={item.itemId} item={item} />)
            ) : (
              <EmptyState label="No reorder decisions are waiting right now." />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ActivityPanel({
  activity,
  compact = false,
}: {
  activity: DashboardActivity[];
  compact?: boolean;
}) {
  return (
    <section className={`panel-interactive rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(15,23,42,0.66))] ${compact ? "p-4" : "p-5"} shadow-[0_18px_40px_rgba(2,6,23,0.32)] backdrop-blur`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-white">Recent log</h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-300/78">
            Latest stock events and field work changes.
          </p>
        </div>
        <Clock3 className="h-5 w-5 text-slate-400/78" />
      </div>

      <div className="mt-4 space-y-3">
        {activity.length > 0 ? (
          activity.map((entry) => <ActivityRow key={entry.id} entry={entry} />)
        ) : (
          <EmptyState label="No activity logged yet." />
        )}
      </div>
    </section>
  );
}

function WorkspaceTile({ card, compact = false }: { card: WorkspaceCard; compact?: boolean }) {
  return (
    <Link
      href={card.href}
      prefetch={false}
      className={`panel-interactive group relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.66))] ${compact ? "p-4" : "p-5"} shadow-[0_18px_38px_rgba(2,6,23,0.3)] backdrop-blur hover:shadow-[0_24px_48px_rgba(2,6,23,0.38)] active:scale-[0.99]`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-80" style={{ background: tileOverlay(card.tone) }} />
      <div className="relative flex items-start justify-between gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border shadow-[0_12px_22px_rgba(2,6,23,0.16)] ${toneIconSurface(card.tone)}`}>
          <card.icon className="h-[1.125rem] w-[1.125rem]" />
        </span>
        <ArrowRight className="h-4 w-4 text-slate-500 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-slate-200" />
      </div>
      <p className={`relative ${compact ? "mt-4" : "mt-5"} text-sm font-medium text-slate-200/88`}>{card.title}</p>
      <p className="relative mt-2 text-3xl font-bold tracking-[-0.05em] text-white">{card.value}</p>
      <p className="relative mt-2 text-sm leading-6 text-slate-300/74">{card.detail}</p>
    </Link>
  );
}

function HeroSignal({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone: Tone;
}) {
  return (
    <div className="panel-interactive rounded-[1.45rem] border border-white/10 bg-white/[0.05] p-4 shadow-[0_16px_30px_rgba(2,6,23,0.22)] backdrop-blur">
      <div className="mb-3 h-1.5 w-12 rounded-full" style={{ background: toneGradient(tone) }} />
      <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-slate-300/72">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-[-0.05em] text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300/74">{detail}</p>
    </div>
  );
}

function FocusRow({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="panel-interactive flex items-center justify-between rounded-[1rem] border border-white/10 bg-white/[0.04] px-3.5 py-3">
      <span className="text-sm font-medium text-slate-300/84">{label}</span>
      <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ${tonePill(tone)}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {value}
      </span>
    </div>
  );
}

function SummaryFlag({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-black/10 px-3.5 py-3 backdrop-blur-sm">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-300/72">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-[-0.04em] ${toneText(tone)}`}>{value}</p>
    </div>
  );
}

function LowStockRow({ item }: { item: DashboardLowStockItem }) {
  return (
    <Link
      href="/items"
      prefetch={false}
      className={`panel-interactive group block rounded-[1.25rem] border px-4 py-3.5 shadow-[0_12px_24px_rgba(2,6,23,0.2)] ${
        item.severity === "critical"
            ? "border-rose-300/18 bg-rose-300/10 hover:bg-rose-300/12"
            : "border-amber-300/18 bg-amber-300/10 hover:bg-amber-300/12"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{item.name}</p>
            <span className={`rounded-full px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${item.severity === "critical" ? "bg-rose-300/12 text-rose-50" : "bg-amber-300/12 text-amber-50"}`}>
              {item.severity === "critical" ? "Critical" : "Warning"}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-6 text-slate-200/82">
            {item.quantityOnHand} on hand, threshold {item.threshold}
            {item.supplierName ? `, ${item.supplierName}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tracking-[-0.04em] text-white">{item.quantityOnHand}</p>
          <p className="mt-1 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-slate-400/72">
            {formatRelativeTime(item.updatedAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ReorderRow({ item }: { item: ReorderRecommendation }) {
  return (
    <Link
      href="/reorder"
      prefetch={false}
      className={`panel-interactive group block rounded-[1.25rem] border px-4 py-3.5 shadow-[0_12px_24px_rgba(2,6,23,0.2)] ${
        item.priority === "urgent"
            ? "border-rose-300/18 bg-rose-300/10 hover:bg-rose-300/12"
            : "border-amber-300/18 bg-amber-300/10 hover:bg-amber-300/12"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{item.name}</p>
            <span className={`rounded-full px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${item.priority === "urgent" ? "bg-rose-300/12 text-rose-50" : "bg-amber-300/12 text-amber-50"}`}>
              {item.priority}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-6 text-slate-200/82">
            Order {formatCompact(item.suggestedOrderQuantity)} units, {item.currentQuantity} on hand.
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tracking-[-0.04em] text-white">{item.suggestedOrderQuantity}</p>
          <p className="mt-1 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-slate-400/72">
            reorder
          </p>
        </div>
      </div>
    </Link>
  );
}

function ActivityRow({ entry }: { entry: DashboardActivity }) {
  return (
    <Link
      href={entry.href}
      prefetch={false}
      className="panel-interactive group flex items-start gap-4 rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[0_12px_28px_rgba(2,6,23,0.18)] hover:border-white/14 hover:bg-white/[0.06]"
    >
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${toneIconSurface(entry.tone)}`}>
        <entry.icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold text-white">{entry.title}</span>
          <span className="shrink-0 text-xs font-medium text-slate-400/80">{formatRelativeTime(entry.timestamp)}</span>
        </span>
        <span className="mt-1.5 block text-sm leading-6 text-slate-300/78">{entry.detail}</span>
        <span className="mt-2 block text-[0.68rem] font-medium uppercase tracking-[0.16em] text-slate-500/82">
          {formatExactTimestamp(entry.timestamp)}
        </span>
      </span>
    </Link>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm leading-6 text-slate-300/74">
      {label}
    </div>
  );
}

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[0.92rem] font-semibold uppercase tracking-[0.18em] text-slate-300/82">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400/82">{detail}</p>
      </div>
    </div>
  );
}

function getPrimaryAction({
  urgentReorders,
  criticalCount,
  openJobsCount,
}: {
  urgentReorders: number;
  criticalCount: number;
  openJobsCount: number;
}) {
  if (urgentReorders > 0 || criticalCount > 0) {
    return { href: "/reorder", label: "Review stock risk" };
  }

  if (openJobsCount > 0) {
    return { href: "/jobs", label: "Open live jobs" };
  }

  return { href: "/items", label: "Add first item" };
}

function buildHeroSummary({
  organizationName,
  inventoryHealth,
  lowStockCount,
  stockMovementsThisWeek,
}: {
  organizationName: string;
  inventoryHealth: number;
  lowStockCount: number;
  stockMovementsThisWeek: number;
}) {
  if (lowStockCount > 0) {
    return `${organizationName} is operating at ${inventoryHealth}% inventory health with ${lowStockCount} active stock alerts and ${stockMovementsThisWeek} stock events logged this week.`;
  }

  return `${organizationName} is operating at ${inventoryHealth}% inventory health with no active stock blockers and ${stockMovementsThisWeek} stock events logged this week.`;
}

function describeTransaction(type: string, quantity: number, itemName: string) {
  if (type === "add") {
    return `Added ${quantity} to ${itemName}`;
  }

  if (type === "use") {
    return `Used ${quantity} from ${itemName}`;
  }

  return `Adjusted ${itemName} by ${quantity}`;
}

function describeJob(jobNumber: string, customer: string, status: string) {
  if (status === "OPEN") {
    return `${jobNumber} open for ${customer}`;
  }

  if (status === "COMPLETED") {
    return `${jobNumber} completed for ${customer}`;
  }

  return `${jobNumber} invoiced for ${customer}`;
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

function formatExactTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toneGradient(tone: Tone) {
  if (tone === "emerald") {
    return "linear-gradient(90deg, rgba(52,211,153,0.95), rgba(16,185,129,0.42))";
  }

  if (tone === "amber") {
    return "linear-gradient(90deg, rgba(251,191,36,0.95), rgba(245,158,11,0.42))";
  }

  if (tone === "rose") {
    return "linear-gradient(90deg, rgba(251,113,133,0.95), rgba(244,63,94,0.42))";
  }

  if (tone === "indigo") {
    return "linear-gradient(90deg, rgba(129,140,248,0.95), rgba(79,70,229,0.42))";
  }

  return "linear-gradient(90deg, rgba(125,211,252,0.95), rgba(56,189,248,0.42))";
}

function tonePill(tone: Tone) {
  if (tone === "emerald") {
    return "border border-emerald-300/16 bg-emerald-300/10 text-emerald-100";
  }

  if (tone === "amber") {
    return "border border-amber-300/16 bg-amber-300/10 text-amber-100";
  }

  if (tone === "rose") {
    return "border border-rose-300/16 bg-rose-300/10 text-rose-100";
  }

  if (tone === "indigo") {
    return "border border-indigo-300/16 bg-indigo-300/10 text-indigo-100";
  }

  return "border border-sky-300/16 bg-sky-300/10 text-sky-100";
}

function toneText(tone: Tone) {
  if (tone === "emerald") {
    return "text-emerald-100";
  }

  if (tone === "amber") {
    return "text-amber-100";
  }

  if (tone === "rose") {
    return "text-rose-100";
  }

  if (tone === "indigo") {
    return "text-indigo-100";
  }

  return "text-sky-100";
}

function toneIconSurface(tone: Tone) {
  if (tone === "emerald") {
    return "border-emerald-300/16 bg-emerald-300/10 text-emerald-100";
  }

  if (tone === "amber") {
    return "border-amber-300/16 bg-amber-300/10 text-amber-100";
  }

  if (tone === "rose") {
    return "border-rose-300/16 bg-rose-300/10 text-rose-100";
  }

  if (tone === "indigo") {
    return "border-indigo-300/16 bg-indigo-300/10 text-indigo-100";
  }

  return "border-sky-300/16 bg-sky-300/10 text-sky-100";
}

function quickActionClasses(tone: Tone) {
  if (tone === "emerald") {
    return "border-emerald-300/16 bg-emerald-300/10 text-emerald-50 hover:bg-emerald-300/14 active:scale-[0.97]";
  }

  if (tone === "amber") {
    return "border-amber-300/16 bg-amber-300/10 text-amber-50 hover:bg-amber-300/14 active:scale-[0.97]";
  }

  if (tone === "rose") {
    return "border-rose-300/16 bg-rose-300/10 text-rose-50 hover:bg-rose-300/14 active:scale-[0.97]";
  }

  if (tone === "indigo") {
    return "border-indigo-300/16 bg-indigo-300/10 text-indigo-50 hover:bg-indigo-300/14 active:scale-[0.97]";
  }

  return "border-sky-300/16 bg-sky-300/10 text-sky-50 hover:bg-sky-300/14 active:scale-[0.97]";
}

function quickActionIconClasses(tone: Tone) {
  if (tone === "emerald") {
    return "border-emerald-300/16 bg-emerald-300/10 text-emerald-50";
  }

  if (tone === "amber") {
    return "border-amber-300/16 bg-amber-300/10 text-amber-50";
  }

  if (tone === "rose") {
    return "border-rose-300/16 bg-rose-300/10 text-rose-50";
  }

  if (tone === "indigo") {
    return "border-indigo-300/16 bg-indigo-300/10 text-indigo-50";
  }

  return "border-sky-300/16 bg-sky-300/10 text-sky-50";
}

function tileOverlay(tone: Tone) {
  if (tone === "emerald") {
    return "radial-gradient(circle at top left, rgba(52,211,153,0.08), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 24%)";
  }

  if (tone === "amber") {
    return "radial-gradient(circle at top left, rgba(251,191,36,0.08), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 24%)";
  }

  if (tone === "rose") {
    return "radial-gradient(circle at top left, rgba(251,113,133,0.08), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 24%)";
  }

  if (tone === "indigo") {
    return "radial-gradient(circle at top left, rgba(129,140,248,0.08), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 24%)";
  }

  return "radial-gradient(circle at top left, rgba(125,211,252,0.08), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 24%)";
}