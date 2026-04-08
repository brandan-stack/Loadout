import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Clock3,
  ShoppingCart,
  Sparkles,
  Truck,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getReorderRecommendationSnapshot } from "@/lib/reorder/suggestion-service";
import type { ReorderRecommendation } from "@/lib/reorder/types";

type ReorderStats = {
  urgent: number;
  high: number;
  total: number;
};

type ReorderTone = "sky" | "emerald" | "amber" | "rose" | "indigo";

type SummaryCard = {
  label: string;
  value: string;
  detail: string;
  tone: ReorderTone;
  icon: typeof ShoppingCart;
};

export default async function ReorderPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const snapshot = await getReorderRecommendationSnapshot(session.organizationId);
  const recommendations = snapshot.recommendations;
  const stats: ReorderStats = {
    urgent: snapshot.summary.urgent,
    high: snapshot.summary.high,
    total: snapshot.summary.total,
  };

  const nextRecommendation = recommendations[0] ?? null;
  const riskLabel =
    stats.urgent > 0
      ? "Immediate buy pressure"
      : stats.high > 0
        ? "Watchlist is active"
        : "Stock is stable";
  const heroLead = stats.urgent > 0 ? "Priority orders need" : "Reorder signals are";
  const heroAccent = stats.urgent > 0 ? "attention now" : stats.high > 0 ? "stacking up" : "under control";
  const heroTone: ReorderTone = stats.urgent > 0 ? "rose" : stats.high > 0 ? "amber" : "emerald";

  const summaryCards: SummaryCard[] = [
    {
      label: "Queue",
      value: formatCompact(stats.total),
      detail: "Open reorder decisions",
      tone: stats.total > 0 ? "sky" : "emerald",
      icon: ShoppingCart,
    },
    {
      label: "Critical",
      value: formatCompact(stats.urgent),
      detail: "Immediate stockouts",
      tone: stats.urgent > 0 ? "rose" : "emerald",
      icon: AlertTriangle,
    },
    {
      label: "Watch",
      value: formatCompact(stats.high),
      detail: "Below safety stock",
      tone: stats.high > 0 ? "amber" : "sky",
      icon: Clock3,
    },
    {
      label: "Suppliers",
      value: formatCompact(snapshot.linkedSupplierCount),
      detail: "Routed with vendors",
      tone: "indigo",
      icon: Truck,
    },
  ];

  return (
    <main className="performance-dashboard mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_22%),radial-gradient(circle_at_50%_26%,rgba(244,63,94,0.08),transparent_32%)]" />

      <section className="dashboard-stage panel-interactive relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(145deg,rgba(10,21,39,0.97),rgba(2,6,23,0.99))] px-5 py-5 shadow-[0_28px_70px_rgba(2,6,23,0.52),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl sm:px-6 sm:py-6 lg:px-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.12),transparent_22%),radial-gradient(circle_at_82%_16%,rgba(251,191,36,0.1),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%)]" />

        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.72fr)] xl:items-start">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] ${tonePill(heroTone)}`}>
              <Sparkles className="h-3.5 w-3.5" />
              Reorder Radar
            </div>
            <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-slate-400/88">
              Smart stock suggestions
            </p>

            <h1 className="mt-4 max-w-[11ch] text-[2.4rem] font-bold leading-[0.9] tracking-[-0.07em] text-white sm:text-[2.85rem] xl:text-[3.4rem]">
              <span className="block">{heroLead}</span>
              <span className="mt-1 block bg-[linear-gradient(135deg,#f8fafc_0%,#67e8f9_35%,#fbbf24_100%)] bg-clip-text text-transparent">
                {heroAccent}
              </span>
            </h1>

            <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-400/80">
              {riskLabel}
            </p>
            <p className="mt-3 max-w-[46rem] text-[0.95rem] leading-[1.72] text-slate-200/82 sm:text-[1rem]">
              {buildHeroCopy(stats, nextRecommendation)}
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                href={nextRecommendation ? `/items?item=${nextRecommendation.itemId}` : "/items"}
                className="inline-flex min-h-[3rem] items-center gap-2 rounded-[1rem] bg-[linear-gradient(135deg,#0f766e_0%,#38bdf8_100%)] px-5 py-3 text-sm font-semibold tracking-[-0.01em] text-white shadow-[0_16px_32px_rgba(8,145,178,0.28),0_0_20px_rgba(56,189,248,0.14)] transition-all duration-300 hover:shadow-[0_22px_40px_rgba(8,145,178,0.34),0_0_26px_rgba(56,189,248,0.2)]"
              >
                {nextRecommendation ? "Open next decision" : "View inventory"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/items"
                className="inline-flex min-h-[3rem] items-center gap-2 rounded-[1rem] border border-white/12 bg-white/[0.05] px-5 py-3 text-sm font-semibold tracking-[-0.01em] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 hover:bg-white/[0.08]"
              >
                <Boxes className="h-4 w-4" />
                Review inventory
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {summaryCards.map((card) => (
                <SummaryCardTile key={card.label} card={card} />
              ))}
            </div>
          </div>

          <div className="dashboard-panel-shell panel-interactive rounded-[1.55rem] border border-white/12 bg-white/[0.06] p-4 shadow-[0_18px_36px_rgba(2,6,23,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
            <div className="mb-3 h-1 w-16 rounded-full bg-[linear-gradient(90deg,rgba(251,113,133,0.95),rgba(56,189,248,0.42))]" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300/78">
              Next Call
            </p>

            {nextRecommendation ? (
              <>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold tracking-[-0.03em] text-white">
                      {nextRecommendation.name}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-300/74">
                      {nextRecommendation.reason}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] ${priorityPill(nextRecommendation.priority)}`}>
                    {nextRecommendation.priority}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <MiniFact label="Order" value={formatCompact(nextRecommendation.suggestedOrderQuantity)} />
                  <MiniFact label="On hand" value={formatCompact(nextRecommendation.currentQuantity)} />
                  <MiniFact label="Min" value={formatCompact(nextRecommendation.minQuantity)} />
                  <MiniFact label="Lead" value={`${nextRecommendation.leadTimeDays}d`} />
                </div>

                <div className="mt-4 rounded-[1.1rem] border border-white/10 bg-black/10 px-3.5 py-3 text-sm leading-6 text-slate-300/78">
                  {nextRecommendation.preferredSupplier ? (
                    <>
                      Route to <span className="font-semibold text-white">{nextRecommendation.preferredSupplier.name}</span>
                      {" "}and expect arrival around {formatDate(nextRecommendation.estimatedArrivalDate)}.
                    </>
                  ) : (
                    <>No supplier is linked yet. Assign one before placing the order.</>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-[1.1rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm leading-6 text-slate-300/74">
                No active reorder pressure. This queue is clear.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.72fr)]">
        <div className="dashboard-lazy-section">
          <div className="mb-3">
            <div className="mb-2 h-px w-14 bg-[linear-gradient(90deg,rgba(56,189,248,0.9),rgba(251,113,133,0.2))]" />
            <h2 className="text-[0.92rem] font-semibold uppercase tracking-[0.18em] text-slate-300/82">
              Action Queue
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400/82">
              Tackle the highest pressure orders first and move down the deck.
            </p>
          </div>

          {recommendations.length === 0 ? (
            <EmptyQueueState />
          ) : (
            <div className="grid gap-3">
              {recommendations.map((recommendation) => (
                <RecommendationCard key={recommendation.itemId} recommendation={recommendation} />
              ))}
            </div>
          )}
        </div>

        <aside className="dashboard-lazy-section grid gap-4">
          <div className="dashboard-panel-shell panel-interactive rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.68))] p-5 shadow-[0_18px_38px_rgba(2,6,23,0.24)] backdrop-blur-sm">
            <div className="mb-2 h-px w-14 bg-[linear-gradient(90deg,rgba(251,191,36,0.9),rgba(56,189,248,0.25))]" />
            <h2 className="text-[0.92rem] font-semibold uppercase tracking-[0.18em] text-slate-300/82">
              Decision Rules
            </h2>
            <div className="mt-4 space-y-3">
              <RuleRow label="Min stock" detail="Supplier lead time × daily usage" />
              <RuleRow label="Max stock" detail="2× minimum for working buffer" />
              <RuleRow label="Priority" detail="How far current stock sits under target" />
              <RuleRow label="Arrival" detail="Today plus supplier lead time" />
            </div>
          </div>

          <div className="dashboard-panel-shell panel-interactive rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.68))] p-5 shadow-[0_18px_38px_rgba(2,6,23,0.24)] backdrop-blur-sm">
            <div className="mb-2 h-px w-14 bg-[linear-gradient(90deg,rgba(129,140,248,0.9),rgba(56,189,248,0.25))]" />
            <h2 className="text-[0.92rem] font-semibold uppercase tracking-[0.18em] text-slate-300/82">
              Queue Shape
            </h2>
            <div className="mt-4 space-y-3">
              <QueueStat label="Critical items" value={formatCompact(stats.urgent)} tone="rose" />
              <QueueStat label="Watchlist items" value={formatCompact(stats.high)} tone="amber" />
              <QueueStat label="Linked suppliers" value={formatCompact(snapshot.linkedSupplierCount)} tone="indigo" />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function SummaryCardTile({ card }: { card: SummaryCard }) {
  return (
    <div className="dashboard-panel-shell panel-interactive min-w-[10.5rem] overflow-hidden rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.64))] px-3.5 py-3 shadow-[0_14px_28px_rgba(2,6,23,0.2)] backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="h-1 w-10 rounded-full" style={{ background: toneGradient(card.tone) }} />
        <card.icon className={`h-4 w-4 ${toneText(card.tone)}`} />
      </div>
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
      <p className="mt-1.5 text-[1.55rem] font-bold tracking-[-0.05em] text-white">{card.value}</p>
      <p className="mt-1 text-[0.78rem] text-slate-300/72">{card.detail}</p>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: ReorderRecommendation }) {
  const tone = priorityTone(recommendation.priority);

  return (
    <article className="reorder-card-lazy dashboard-panel-shell panel-interactive relative overflow-hidden rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(15,23,42,0.7))] p-5 shadow-[0_18px_38px_rgba(2,6,23,0.24)] backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 opacity-75" style={{ background: tileOverlay(tone) }} />

      <div className="relative">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold tracking-[-0.03em] text-white">
                {recommendation.name}
              </h3>
              <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] ${priorityPill(recommendation.priority)}`}>
                {recommendation.priority}
              </span>
            </div>
            {recommendation.barcode && (
              <p className="mt-1 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-slate-500">
                {recommendation.barcode}
              </p>
            )}
            <p className="mt-2 text-sm leading-6 text-slate-300/78">{recommendation.reason}</p>
          </div>

          <Link
            href={`/items?item=${recommendation.itemId}`}
            className="inline-flex min-h-[2.7rem] shrink-0 items-center gap-2 rounded-[0.95rem] border border-white/12 bg-white/[0.05] px-3.5 py-2 text-sm font-semibold text-slate-100 transition-all duration-300 hover:bg-white/[0.08]"
          >
            View item
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
          <MetricBlock label="On hand" value={formatCompact(recommendation.currentQuantity)} />
          <MetricBlock label="Order" value={formatCompact(recommendation.suggestedOrderQuantity)} />
          <MetricBlock label="Min" value={formatCompact(recommendation.minQuantity)} />
          <MetricBlock label="Max" value={formatCompact(recommendation.maxQuantity)} />
          <MetricBlock label="Lead" value={`${recommendation.leadTimeDays}d`} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300/76">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
            <Clock3 className="h-3.5 w-3.5 text-slate-400" />
            {recommendation.usagePerDay} used per day
          </span>
          {recommendation.preferredSupplier ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <Truck className="h-3.5 w-3.5 text-slate-400" />
              {recommendation.preferredSupplier.name} · arrives {formatDate(recommendation.estimatedArrivalDate)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
              No supplier linked yet
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-panel-shell rounded-[1rem] border border-white/10 bg-black/10 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-panel-shell rounded-[1rem] border border-white/10 bg-black/10 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function RuleRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="dashboard-panel-shell rounded-[1rem] border border-white/10 bg-white/[0.04] px-3.5 py-3">
      <p className="text-sm font-medium text-slate-100">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-300/74">{detail}</p>
    </div>
  );
}

function QueueStat({ label, value, tone }: { label: string; value: string; tone: ReorderTone }) {
  return (
    <div className="dashboard-panel-shell flex items-center justify-between rounded-[1rem] border border-white/10 bg-white/[0.04] px-3.5 py-3">
      <span className="text-sm font-medium text-slate-300/84">{label}</span>
      <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ${tonePill(tone)}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {value}
      </span>
    </div>
  );
}

function EmptyQueueState() {
  return (
    <div className="dashboard-panel-shell overflow-hidden rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.68))] px-5 py-14 text-center shadow-[0_18px_38px_rgba(2,6,23,0.24)] backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.2rem] border border-white/10 bg-white/[0.04] text-slate-200">
        <ShoppingCart className="h-6 w-6" />
      </div>
      <p className="mt-5 text-lg font-semibold tracking-[-0.02em] text-white">No reorder actions right now</p>
      <p className="mt-2 text-sm leading-6 text-slate-300/74">
        Current stock levels are covering demand. This queue is clear.
      </p>
    </div>
  );
}

function buildHeroCopy(stats: ReorderStats, nextRecommendation: ReorderRecommendation | null) {
  if (stats.urgent > 0 && nextRecommendation) {
    return `${stats.urgent} critical items are already below safe cover. ${nextRecommendation.name} is the next buy call, and the queue is carrying ${stats.total} total reorder decisions.`;
  }

  if (stats.high > 0 && nextRecommendation) {
    return `${stats.high} items are sitting below target stock. ${nextRecommendation.name} is leading the queue, with ${stats.total} total decisions ready for review.`;
  }

  return "No urgent reorder pressure is active. The list is either clear or carrying only low-noise monitoring items.";
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function priorityTone(priority: ReorderRecommendation["priority"]): ReorderTone {
  if (priority === "urgent") {
    return "rose";
  }

  if (priority === "high") {
    return "amber";
  }

  if (priority === "medium") {
    return "indigo";
  }

  return "sky";
}

function priorityPill(priority: ReorderRecommendation["priority"]) {
  return tonePill(priorityTone(priority));
}

function toneText(tone: ReorderTone) {
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

function tonePill(tone: ReorderTone) {
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

function toneGradient(tone: ReorderTone) {
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

function tileOverlay(tone: ReorderTone) {
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