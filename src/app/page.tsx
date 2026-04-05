import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  Boxes,
  Briefcase,
  ChevronRight,
  Clock3,
  MapPin,
  PackagePlus,
  Settings,
  ShoppingCart,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getReorderRecommendations } from "@/lib/reorder/suggestion-service";

type Severity = "critical" | "low";

type ActivityEntry = {
  id: string;
  title: string;
  detail: string;
  timestamp: Date;
  href: string;
  icon: LucideIcon;
  tone: "sky" | "amber" | "rose";
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

type MetricCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  hint: string;
  tone: "sky" | "amber" | "rose" | "emerald";
};

type QuickActionProps = {
  href: string;
  label: string;
  detail: string;
  icon: LucideIcon;
  tone: "sky" | "indigo" | "amber" | "rose";
};

type ModuleCardProps = {
  href: string;
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "indigo" | "amber" | "emerald" | "sky" | "rose";
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
    settings,
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
        preferredSupplier: {
          select: {
            name: true,
          },
        },
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
      where: {
        item: { organizationId: session.organizationId },
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        quantity: true,
        notes: true,
        createdAt: true,
        item: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.inventoryTransaction.count({
      where: {
        item: { organizationId: session.organizationId },
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.settings.findUnique({
      where: { organizationId: session.organizationId },
      select: {
        premiumEnabled: true,
        enableMultiLocation: true,
        enableVariants: true,
        enableImportWizard: true,
        enableLotExpiry: true,
        enableBackupZip: true,
        enableReportScheduler: true,
      },
    }),
    getReorderRecommendations(session.organizationId),
  ]);

  const totalItems = items.length;
  const totalUnits = items.reduce((sum, item) => sum + item.quantityOnHand, 0);
  const criticalStock = items.filter(
    (item) => item.quantityOnHand <= item.lowStockRedThreshold
  );
  const lowStock = items.filter(
    (item) =>
      item.quantityOnHand > item.lowStockRedThreshold &&
      item.quantityOnHand <= item.lowStockAmberThreshold
  );
  const lowStockCount = criticalStock.length + lowStock.length;
  const lowStockItems: DashboardLowStockItem[] = [...criticalStock, ...lowStock]
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
      severity: (item.quantityOnHand <= item.lowStockRedThreshold
        ? "critical"
        : "low") as Severity,
    }))
    .sort((left, right) => {
      if (left.severity !== right.severity) {
        return left.severity === "critical" ? -1 : 1;
      }

      if (left.quantityOnHand !== right.quantityOnHand) {
        return left.quantityOnHand - right.quantityOnHand;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });

  const inventoryHealth =
    totalItems === 0
      ? 100
      : Math.max(8, Math.round(((totalItems - lowStockCount) / totalItems) * 100));
  const urgentReorders = reorderRecommendations.filter(
    (recommendation) => recommendation.priority === "urgent"
  ).length;
  const highReorders = reorderRecommendations.filter(
    (recommendation) => recommendation.priority === "high"
  ).length;
  const preferredSupplierCoverage = items.filter((item) => item.preferredSupplier?.name).length;
  const nextReorder = reorderRecommendations[0];
  const enabledFeatureCount = settings
    ? [
        settings.premiumEnabled,
        settings.enableMultiLocation,
        settings.enableVariants,
        settings.enableImportWizard,
        settings.enableLotExpiry,
        settings.enableBackupZip,
        settings.enableReportScheduler,
      ].filter(Boolean).length
    : 0;

  const activity: ActivityEntry[] = [
    ...recentTransactions.map((transaction) => ({
      id: `tx-${transaction.id}`,
      title: describeTransaction(transaction.type, transaction.quantity, transaction.item.name),
      detail: transaction.notes?.trim() || "Inventory movement recorded",
      timestamp: transaction.createdAt,
      href: "/items",
      icon: transaction.type === "add" ? PackagePlus : transaction.type === "use" ? Truck : ArrowRightLeft,
      tone: (
        transaction.type === "add"
          ? "sky"
          : transaction.type === "use"
            ? "amber"
            : "rose"
      ) as ActivityEntry["tone"],
    })),
    ...recentJobs.map((job) => ({
      id: `job-${job.id}`,
      title: describeJob(job.jobNumber, job.customer, job.status),
      detail: job.status === "OPEN" ? "Active field work order" : `Status: ${job.status.toLowerCase()}`,
      timestamp: job.updatedAt,
      href: `/jobs/${job.id}`,
      icon: Briefcase,
      tone: (job.status === "OPEN" ? "sky" : job.status === "COMPLETED" ? "amber" : "rose") as ActivityEntry["tone"],
    })),
  ]
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, 6);

  const desktopModules: ModuleCardProps[] = [
    {
      href: "/jobs",
      title: "Jobs",
      value: formatCompact(openJobsCount),
      detail:
        recentJobs[0] != null
          ? `Latest ${recentJobs[0].jobNumber} for ${recentJobs[0].customer}`
          : "Create and track field work orders.",
      icon: Briefcase,
      tone: "sky",
    },
    {
      href: "/items",
      title: "Inventory",
      value: formatCompact(totalUnits),
      detail:
        totalItems > 0
          ? `${formatCompact(totalItems)} cataloged items across active stock.`
          : "Start by adding your first stocked item.",
      icon: Boxes,
      tone: "indigo",
    },
    {
      href: "/reports",
      title: "Reports",
      value: formatCompact(stockMovementsThisWeek),
      detail:
        stockMovementsThisWeek > 0
          ? `${formatCompact(stockMovementsThisWeek)} movements captured in the last 7 days.`
          : "No stock movement recorded in the last 7 days.",
      icon: BarChart3,
      tone: "emerald",
    },
    {
      href: "/suppliers",
      title: "Suppliers",
      value: formatCompact(suppliersCount),
      detail:
        suppliersCount > 0
          ? `${formatCompact(preferredSupplierCoverage)} items already mapped to preferred suppliers.`
          : "Add suppliers to tighten your reorder workflow.",
      icon: Truck,
      tone: "amber",
    },
    {
      href: "/reorder",
      title: "Reorder",
      value: formatCompact(urgentReorders + highReorders),
      detail:
        nextReorder != null
          ? `${nextReorder.name} needs ${formatCompact(nextReorder.suggestedOrderQuantity)} more units.`
          : "No active reorder recommendations right now.",
      icon: ShoppingCart,
      tone: "rose",
    },
    {
      href: "/settings",
      title: "Settings",
      value: formatCompact(enabledFeatureCount),
      detail:
        settings?.premiumEnabled
          ? "Premium workflow controls are active for this workspace."
          : "Core field workflow is active and ready to configure.",
      icon: Settings,
      tone: "indigo",
    },
  ];

  const quickActions: QuickActionProps[] = [
    {
      href: "/items",
      label: "Add Item",
      detail: "Receive or catalog stock",
      icon: PackagePlus,
      tone: "sky",
    },
    {
      href: "/jobs",
      label: "New Job",
      detail: "Start a field work order",
      icon: Briefcase,
      tone: "indigo",
    },
    {
      href: "/locations",
      label: "Move Stock",
      detail: "Transfer between locations",
      icon: ArrowRightLeft,
      tone: "amber",
    },
    {
      href: "/reorder",
      label: "Reorder",
      detail: "Review supplier actions",
      icon: ShoppingCart,
      tone: "rose",
    },
  ];

  const stats: MetricCardProps[] = [
    {
      label: "Total Items",
      value: formatCompact(totalItems),
      icon: Boxes,
      hint: `${formatCompact(totalUnits)} units on hand`,
      tone: "sky",
    },
    {
      label: "Low Stock",
      value: formatCompact(lowStockCount),
      icon: AlertTriangle,
      hint: `${formatCompact(criticalStock.length)} critical alerts`,
      tone: lowStockCount > 0 ? "amber" : "emerald",
    },
    {
      label: "Open Jobs",
      value: formatCompact(openJobsCount),
      icon: Briefcase,
      hint: session.role === "TECH" ? "Assigned to you" : "Across the workspace",
      tone: openJobsCount > 0 ? "rose" : "sky",
    },
    {
      label: "Locations",
      value: formatCompact(locationsCount),
      icon: MapPin,
      hint: "Active stock points",
      tone: "emerald",
    },
  ];

  const heroTone =
    urgentReorders > 0
      ? "Critical stock pressure"
      : lowStockCount > 0
        ? "Inventory needs attention"
        : "Inventory is stable";

  return (
    <main className="relative mx-auto w-full max-w-[1400px] px-4 pt-6 sm:px-6 lg:px-8 lg:pt-9">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_28%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_26%),radial-gradient(circle_at_50%_35%,rgba(14,165,233,0.12),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.16),transparent)]" />

      {!passwordRecoveryConfigured && (
        <div className="mb-5 rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3.5 text-sm text-amber-50 shadow-[0_18px_42px_rgba(15,23,42,0.3)] backdrop-blur">
          Password recovery email setup is still required before forgot-password can be used in production.
        </div>
      )}

      <div className="md:hidden">
        <section className="relative overflow-hidden rounded-[2.15rem] border border-white/12 bg-[linear-gradient(160deg,rgba(12,23,43,0.96),rgba(3,7,18,0.98))] p-6 shadow-[0_38px_100px_rgba(2,6,23,0.68),0_0_0_1px_rgba(125,211,252,0.04)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_24%),radial-gradient(circle_at_85%_15%,rgba(129,140,248,0.16),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_28%)]" />
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" />
          <div className="absolute -right-16 top-10 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-sky-50 shadow-[0_0_22px_rgba(56,189,248,0.12)]">
                <Sparkles className="h-3.5 w-3.5" />
                Dashboard
              </div>
              <h1 className="mt-4 font-bold tracking-[-0.04em] text-white" style={{ fontSize: "1.95rem", lineHeight: 1.02 }}>
                {heroTone}
              </h1>
              <p className="mt-3 max-w-xs text-[0.95rem] leading-7 text-slate-200/95">
                {session.organizationName} is running at {inventoryHealth}% stock health with {formatCompact(stockMovementsThisWeek)} movements this week.
              </p>
            </div>

            <div className="rounded-[1.55rem] border border-white/12 bg-white/[0.08] p-4 text-right shadow-[0_22px_44px_rgba(2,6,23,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-300/90">
                Reorder Queue
              </p>
              <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-white">
                {formatCompact(urgentReorders + highReorders)}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-300/80">
                {urgentReorders > 0 ? `${urgentReorders} urgent actions` : "No urgent actions"}
              </p>
            </div>
          </div>

          <div className="relative mt-7 grid grid-cols-2 gap-3.5">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[1.45rem] border border-white/10 bg-white/[0.055] p-4 shadow-[0_16px_34px_rgba(2,6,23,0.26),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur transition-all duration-300 ease-out hover:-translate-y-1 hover:border-sky-200/20 hover:shadow-[0_24px_48px_rgba(2,6,23,0.4),0_0_24px_rgba(56,189,248,0.08)] active:scale-[0.985]"
              >
                <div className="mb-3 h-1.5 w-12 rounded-full" style={{ background: statToneGradient(stat.tone) }} />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[0.8rem] font-medium text-slate-200/90">{stat.label}</span>
                  <span className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-[0.65rem] font-semibold ${statTonePill(stat.tone)}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    <stat.icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-3 text-[1.9rem] font-bold tracking-[-0.04em] text-white">{stat.value}</p>
                <p className="mt-1.5 text-xs leading-5 text-slate-300/75">{stat.hint}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300/85">
              Quick Actions
            </h2>
            <Link href="/items" className="inline-flex items-center rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1.5 text-xs font-semibold text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.08)] transition-all duration-300 hover:border-sky-200/30 hover:bg-sky-300/14 hover:text-white active:scale-[0.97]">
              Open inventory
            </Link>
          </div>

          <div className="horizontal-scroll-row flex gap-3 overflow-x-auto pb-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                prefetch={false}
                className="group relative flex min-h-[11.25rem] min-w-[15.5rem] flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.68))] p-5 shadow-[0_22px_48px_rgba(2,6,23,0.38)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-sky-300/30 hover:shadow-[0_28px_60px_rgba(2,6,23,0.5),0_0_28px_rgba(56,189,248,0.12)] active:scale-[0.97] active:shadow-[0_14px_32px_rgba(2,6,23,0.42)]"
              >
                <div className="pointer-events-none absolute inset-0 opacity-80 transition-opacity duration-300 group-hover:opacity-100" style={{ background: quickActionOverlay(action.tone) }} />
                <div className="relative flex items-start justify-between gap-3">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-[1.15rem] border shadow-[0_12px_24px_rgba(2,6,23,0.16)] transition-all duration-300 group-hover:scale-105 ${quickActionIconTone(action.tone)}`}>
                    <action.icon className="h-5 w-5" />
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-500 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-slate-200" />
                </div>
                <div className="relative mt-6">
                  <p className="text-[1.02rem] font-semibold tracking-[-0.02em] text-white">{action.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300/90">{action.detail}</p>
                </div>
                <div className="relative mt-4 inline-flex w-fit items-center rounded-full border border-white/12 bg-white/[0.08] px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  Launch
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-7 grid gap-6">
          <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.62))] p-5 shadow-[0_18px_40px_rgba(2,6,23,0.34)] backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-white">Recent Activity</h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-300/80">Latest stock and job updates across the workspace.</p>
              </div>
              <Clock3 className="h-5 w-5 text-slate-400/80" />
            </div>

            <ActivityList activity={activity} emptyLabel="No activity logged yet." />
          </div>

          <div className="rounded-[1.8rem] border border-rose-300/18 bg-[linear-gradient(180deg,rgba(52,11,24,0.76),rgba(15,23,42,0.82))] p-5 shadow-[0_18px_42px_rgba(2,6,23,0.34),0_0_28px_rgba(251,113,133,0.08)] backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-300/18 bg-rose-300/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-rose-50">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Warning
                </div>
                <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-white">Low Stock Alerts</h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-200/85">Priority items that need action first.</p>
              </div>
              <Link href="/reorder" className="inline-flex items-center rounded-full border border-rose-300/15 bg-rose-300/10 px-3 py-1.5 text-xs font-semibold text-rose-50 shadow-[0_0_18px_rgba(251,113,133,0.08)] transition-all duration-300 hover:border-rose-200/30 hover:bg-rose-300/14 hover:text-white active:scale-[0.97]">
                Review queue
              </Link>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-[1.2rem] border border-rose-300/14 bg-black/10 px-4 py-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-rose-100/80">Critical</p>
                <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-white">{formatCompact(criticalStock.length)}</p>
              </div>
              <div className="rounded-[1.2rem] border border-amber-300/14 bg-black/10 px-4 py-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-amber-100/80">Low</p>
                <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-white">{formatCompact(lowStock.length)}</p>
              </div>
            </div>

            <LowStockList items={lowStockItems.slice(0, 5)} />
          </div>
        </section>
      </div>

      <div className="hidden md:block">
        <section className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.68))] p-5 shadow-[0_18px_40px_rgba(2,6,23,0.34)] backdrop-blur transition-all duration-300 ease-out hover:-translate-y-1 hover:border-sky-200/18 hover:shadow-[0_24px_52px_rgba(2,6,23,0.44),0_0_24px_rgba(56,189,248,0.08)]"
              >
                <div className="mb-4 h-1.5 w-14 rounded-full" style={{ background: statToneGradient(stat.tone) }} />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-200/90">{stat.label}</p>
                  <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[0.68rem] font-semibold ${statTonePill(stat.tone)}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    <stat.icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-6 text-3xl font-bold tracking-[-0.04em] text-white">{stat.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/75">{stat.hint}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(15,23,42,0.64))] p-5 shadow-[0_18px_42px_rgba(2,6,23,0.34)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300/80">Reorder Queue</p>
                <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">{formatCompact(urgentReorders + highReorders)}</p>
                <p className="mt-2 text-sm leading-6 text-slate-200/85">
                  {nextReorder != null
                    ? `${nextReorder.name} is the next recommended replenishment action.`
                    : "No supplier action is needed right now."}
                </p>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-300/15 bg-rose-400/10 text-rose-100 shadow-[0_14px_26px_rgba(251,113,133,0.12)]">
                <ShoppingCart className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400/80">Urgent</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-white">{formatCompact(urgentReorders)}</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400/80">High</p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-white">{formatCompact(highReorders)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(145deg,rgba(12,23,42,0.97),rgba(2,6,23,0.99))] p-8 shadow-[0_42px_110px_rgba(2,6,23,0.66),0_0_0_1px_rgba(125,211,252,0.04)] backdrop-blur xl:p-9">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.14),transparent_22%),radial-gradient(circle_at_80%_18%,rgba(129,140,248,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%)]" />
            <div className="absolute -left-16 top-4 h-52 w-52 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-indigo-500/12 blur-3xl" />
            <div className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" />

            <div className="relative flex items-start justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-sky-50 shadow-[0_0_22px_rgba(56,189,248,0.12)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Inventory Overview
                </div>
                <h1 className="mt-5 max-w-xl text-5xl font-bold leading-[0.93] tracking-[-0.055em] text-white xl:text-[3.65rem]">
                  {heroTone}
                </h1>
                <p className="mt-5 max-w-2xl text-[1.02rem] leading-8 text-slate-200/92">
                  {session.organizationName} currently holds {formatCompact(totalUnits)} units across {formatCompact(totalItems)} tracked items and {formatCompact(locationsCount)} active locations.
                </p>
              </div>

              <div className="min-w-[16rem] rounded-[1.7rem] border border-white/12 bg-white/[0.07] p-5 shadow-[0_26px_50px_rgba(2,6,23,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300/85">Stock Health</p>
                <p className="mt-4 text-4xl font-bold tracking-[-0.04em] text-white">{inventoryHealth}%</p>
                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400 shadow-[0_0_22px_rgba(56,189,248,0.35)]"
                    style={{ width: `${inventoryHealth}%` }}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200/78">
                  {lowStockCount > 0
                    ? `${formatCompact(lowStockCount)} items need attention.`
                    : "No low stock alerts are active."}
                </p>
              </div>
            </div>

            <div className="relative mt-8 grid gap-4 lg:grid-cols-3">
              <HeroInsightCard
                title="Critical Attention"
                value={formatCompact(criticalStock.length)}
                detail={
                  criticalStock.length > 0
                    ? `${criticalStock[0].name} is the most urgent stock alert.`
                    : "No critical stock alerts right now."
                }
              />
              <HeroInsightCard
                title="Supplier Coverage"
                value={formatCompact(preferredSupplierCoverage)}
                detail={
                  suppliersCount > 0
                    ? `${formatCompact(suppliersCount)} active suppliers connected to current inventory.`
                    : "No suppliers configured yet for reorder automation."
                }
              />
              <HeroInsightCard
                title="Movement Pulse"
                value={formatCompact(stockMovementsThisWeek)}
                detail={
                  stockMovementsThisWeek > 0
                    ? `${formatCompact(stockMovementsThisWeek)} stock movements in the last 7 days.`
                    : "No stock movement recorded during the last 7 days."
                }
              />
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.64))] p-5 shadow-[0_18px_40px_rgba(2,6,23,0.34)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-white">Recent Activity</h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-300/80">Latest stock movements and job updates.</p>
                </div>
                <Clock3 className="h-5 w-5 text-slate-400/80" />
              </div>
              <ActivityList activity={activity} emptyLabel="No activity logged yet." />
            </div>

            <div className="rounded-[1.9rem] border border-rose-300/18 bg-[linear-gradient(180deg,rgba(52,11,24,0.7),rgba(15,23,42,0.84))] p-5 shadow-[0_18px_42px_rgba(2,6,23,0.34),0_0_28px_rgba(251,113,133,0.08)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-rose-300/18 bg-rose-300/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-rose-50">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Warning
                  </div>
                  <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-white">Low Stock Alerts</h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-200/85">Prioritized by severity and quantity remaining.</p>
                </div>
                <Link href="/reorder" className="inline-flex items-center rounded-full border border-rose-300/15 bg-rose-300/10 px-3 py-1.5 text-sm font-semibold text-rose-50 shadow-[0_0_18px_rgba(251,113,133,0.08)] transition-all duration-300 hover:border-rose-200/30 hover:bg-rose-300/14 hover:text-white active:scale-[0.98]">
                  Open reorder
                </Link>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-[1.2rem] border border-rose-300/14 bg-black/10 px-4 py-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-rose-100/80">Critical</p>
                  <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-white">{formatCompact(criticalStock.length)}</p>
                </div>
                <div className="rounded-[1.2rem] border border-amber-300/14 bg-black/10 px-4 py-3">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-amber-100/80">Low</p>
                  <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-white">{formatCompact(lowStock.length)}</p>
                </div>
              </div>

              <LowStockList items={lowStockItems.slice(0, 4)} />
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Modules</h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-300/80">Core workspace areas with live operational context.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {desktopModules.map((module) => (
              <ModuleCard key={module.title} {...module} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function ActivityList({
  activity,
  emptyLabel,
}: {
  activity: ActivityEntry[];
  emptyLabel: string;
}) {
  if (activity.length === 0) {
    return (
      <div className="rounded-[1.45rem] border border-dashed border-white/10 bg-white/[0.035] px-4 py-6 text-sm leading-6 text-slate-300/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activity.map((entry) => (
        <Link
          key={entry.id}
          href={entry.href}
          prefetch={false}
          className="group flex items-start gap-4 rounded-[1.45rem] border border-white/8 bg-white/[0.04] px-4 py-4 shadow-[0_12px_28px_rgba(2,6,23,0.18)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.06] hover:shadow-[0_22px_40px_rgba(2,6,23,0.34),0_0_22px_rgba(56,189,248,0.06)] active:scale-[0.985]"
        >
          <span className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-[0_10px_18px_rgba(2,6,23,0.16)] transition-all duration-300 group-hover:scale-105 ${toneClasses(entry.tone)}`}>
            <entry.icon className="h-4 w-4" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-3">
              <span className="block truncate text-sm font-semibold tracking-[-0.01em] text-white">{entry.title}</span>
              <span className="shrink-0 text-xs font-medium text-slate-400/80">{formatRelativeTime(entry.timestamp)}</span>
            </span>
            <span className="mt-1.5 block text-sm leading-6 text-slate-300/80">{entry.detail}</span>
            <span className="mt-2 block text-[0.7rem] font-medium uppercase tracking-[0.16em] text-slate-500/85">
              {formatExactTimestamp(entry.timestamp)}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function LowStockList({ items }: { items: DashboardLowStockItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[1.45rem] border border-dashed border-white/10 bg-white/[0.035] px-4 py-6 text-sm leading-6 text-slate-200/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        No low stock alerts are active.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href="/items"
          prefetch={false}
          className={`group block rounded-[1.45rem] border px-4 py-4 shadow-[0_12px_28px_rgba(2,6,23,0.2)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_22px_40px_rgba(2,6,23,0.34)] active:scale-[0.985] ${
            item.severity === "critical"
              ? "border-rose-300/20 bg-rose-400/8 hover:border-rose-200/30 hover:shadow-[0_24px_42px_rgba(2,6,23,0.34),0_0_26px_rgba(251,113,133,0.08)]"
              : "border-amber-300/20 bg-amber-400/8 hover:border-amber-200/30 hover:shadow-[0_24px_42px_rgba(2,6,23,0.34),0_0_26px_rgba(251,191,36,0.08)]"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold tracking-[-0.01em] text-white">{item.name}</p>
                <span
                  className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${
                    item.severity === "critical"
                      ? "bg-rose-400/14 text-rose-100"
                      : "bg-amber-300/14 text-amber-100"
                  }`}
                >
                  {item.severity === "critical" ? "Critical" : "Low"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-200/84">
                {item.quantityOnHand} on hand, threshold {item.threshold}
                {item.supplierName ? `, ${item.supplierName}` : ""}
              </p>
            </div>

            <div className="text-right">
              <p className="text-lg font-bold tracking-[-0.03em] text-white">{item.quantityOnHand}</p>
              <p className="mt-1 text-xs font-medium text-slate-300/70">{formatRelativeTime(item.updatedAt)}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function HeroInsightCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5 shadow-[0_16px_32px_rgba(2,6,23,0.2),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_24px_46px_rgba(2,6,23,0.32),0_0_24px_rgba(56,189,248,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/70">{title}</p>
      <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200/76">{detail}</p>
    </div>
  );
}

function ModuleCard({ href, title, value, detail, icon: Icon, tone }: ModuleCardProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group relative overflow-hidden rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(15,23,42,0.7))] p-5 shadow-[0_18px_40px_rgba(2,6,23,0.34)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-white/15 hover:shadow-[0_26px_58px_rgba(2,6,23,0.46),0_0_28px_rgba(56,189,248,0.08)] active:scale-[0.99]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.08),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_28%)] opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-4">
        <span className={`relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border shadow-[0_14px_24px_rgba(2,6,23,0.18)] transition-all duration-300 group-hover:scale-105 ${moduleToneClasses(tone)}`}>
          <Icon className="h-5 w-5" />
        </span>
        <ChevronRight className="h-4 w-4 text-slate-500 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-slate-200" />
      </div>

      <p className="relative mt-5 text-sm font-medium text-slate-200/88">{title}</p>
      <p className="relative mt-2 text-3xl font-bold tracking-[-0.04em] text-white">{value}</p>
      <p className="relative mt-3 text-sm leading-6 text-slate-300/78">{detail}</p>
      <div className="relative mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-100 transition-all duration-300 group-hover:gap-2.5 group-hover:text-white">
        Open module
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
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
    return `${jobNumber} is active for ${customer}`;
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

function toneClasses(tone: ActivityEntry["tone"]) {
  if (tone === "amber") {
    return "border-amber-300/15 bg-amber-300/10 text-amber-100";
  }

  if (tone === "rose") {
    return "border-rose-300/15 bg-rose-300/10 text-rose-100";
  }

  return "border-sky-300/15 bg-sky-300/10 text-sky-100";
}

function moduleToneClasses(tone: ModuleCardProps["tone"]) {
  if (tone === "amber") {
    return "border-amber-300/15 bg-amber-300/10 text-amber-100";
  }

  if (tone === "emerald") {
    return "border-emerald-300/15 bg-emerald-300/10 text-emerald-100";
  }

  if (tone === "sky") {
    return "border-sky-300/15 bg-sky-300/10 text-sky-100";
  }

  if (tone === "rose") {
    return "border-rose-300/15 bg-rose-300/10 text-rose-100";
  }

  return "border-indigo-300/15 bg-indigo-300/10 text-indigo-100";
}

function statToneGradient(tone: MetricCardProps["tone"]) {
  if (tone === "amber") {
    return "linear-gradient(90deg, rgba(251,191,36,0.95), rgba(245,158,11,0.4))";
  }

  if (tone === "rose") {
    return "linear-gradient(90deg, rgba(251,113,133,0.95), rgba(244,63,94,0.42))";
  }

  if (tone === "emerald") {
    return "linear-gradient(90deg, rgba(52,211,153,0.95), rgba(16,185,129,0.42))";
  }

  return "linear-gradient(90deg, rgba(125,211,252,0.95), rgba(56,189,248,0.42))";
}

function statTonePill(tone: MetricCardProps["tone"]) {
  if (tone === "amber") {
    return "border border-amber-300/16 bg-amber-300/10 text-amber-100";
  }

  if (tone === "rose") {
    return "border border-rose-300/16 bg-rose-300/10 text-rose-100";
  }

  if (tone === "emerald") {
    return "border border-emerald-300/16 bg-emerald-300/10 text-emerald-100";
  }

  return "border border-sky-300/16 bg-sky-300/10 text-sky-100";
}

function quickActionOverlay(tone: QuickActionProps["tone"]) {
  if (tone === "amber") {
    return "radial-gradient(circle at top left, rgba(251,191,36,0.14), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.04), transparent 30%)";
  }

  if (tone === "rose") {
    return "radial-gradient(circle at top left, rgba(251,113,133,0.14), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.04), transparent 30%)";
  }

  if (tone === "indigo") {
    return "radial-gradient(circle at top left, rgba(129,140,248,0.16), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.04), transparent 30%)";
  }

  return "radial-gradient(circle at top left, rgba(125,211,252,0.14), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.04), transparent 30%)";
}

function quickActionIconTone(tone: QuickActionProps["tone"]) {
  if (tone === "amber") {
    return "border-amber-300/20 bg-amber-300/12 text-amber-50 group-hover:shadow-[0_18px_30px_rgba(251,191,36,0.18)]";
  }

  if (tone === "rose") {
    return "border-rose-300/20 bg-rose-300/12 text-rose-50 group-hover:shadow-[0_18px_30px_rgba(251,113,133,0.18)]";
  }

  if (tone === "indigo") {
    return "border-indigo-300/20 bg-indigo-300/12 text-indigo-50 group-hover:shadow-[0_18px_30px_rgba(129,140,248,0.18)]";
  }

  return "border-sky-300/20 bg-sky-300/12 text-sky-50 group-hover:shadow-[0_18px_30px_rgba(56,189,248,0.2)]";
}

function formatExactTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}