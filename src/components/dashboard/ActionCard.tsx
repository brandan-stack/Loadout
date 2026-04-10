import Link from "next/link";
import { BriefcaseBusiness, Clock3, Package2 } from "lucide-react";
import type { CommandDecisionItem } from "@/components/dashboard/types";
import { toneActionButton, tonePill, toneSurface } from "@/components/dashboard/theme";

export function ActionCard({
  item,
  variant,
  showDetails = false,
  featured = false,
}: {
  item: CommandDecisionItem;
  variant: "primary" | "secondary";
  showDetails?: boolean;
  featured?: boolean;
}) {
  const emphasized = variant === "primary";
  const criticalClass = item.isCritical
    ? variant === "primary"
      ? "command-center-card-critical scale-[1.02] border-2"
      : "work-queue-card-critical border-[1.5px]"
    : variant === "primary"
      ? "command-center-card-secondary opacity-[0.95]"
      : "work-queue-card-secondary opacity-[0.88]";
  const featuredClass = variant === "secondary" && featured ? "work-queue-card-featured scale-[1.03]" : "";
  const reorderActionClass = item.actionLabel === "Reorder Now" ? "reorder-now-button" : "";
  const criticalReorderClass = item.isCritical && item.actionLabel === "Reorder Now" ? "critical-reorder-button" : "";

  return (
    <article
      className={`dashboard-panel-shell panel-interactive overflow-hidden border backdrop-blur-sm transition-all duration-150 ${
        variant === "primary" ? "command-center-card rounded-[1.55rem] p-4" : "work-queue-card rounded-[1.3rem] p-3"
      } ${criticalClass} ${featuredClass} ${toneSurface(item.tone)}`}
    >
      <div className="flex h-full flex-col gap-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] ${tonePill(item.tone)}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {item.statusLabel}
            </span>
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-400/76">
              {item.isCritical ? "Immediate" : "Queued"}
            </span>
          </div>

          <h3 className="mt-3 text-[1.04rem] font-semibold tracking-[-0.04em] text-white">{item.name}</h3>
          <p className="mt-2 text-[0.84rem] leading-5 text-slate-300/72">{item.detail}</p>
          {item.impactLine ? (
            <p className="mt-3 rounded-[0.95rem] border border-white/10 bg-black/10 px-3 py-2 text-[0.78rem] font-medium leading-5 text-slate-100/88">
              {item.impactLine}
            </p>
          ) : null}
        </div>

        <div className="space-y-2.5 text-[0.78rem] text-slate-200/80">
          <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <span className="inline-flex items-center gap-2 text-slate-300/70">
              <Package2 className="h-3.5 w-3.5" />
              Stock status
            </span>
            <span className="font-semibold text-white">{item.stockLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <span className="inline-flex items-center gap-2 text-slate-300/70">
              <Clock3 className="h-3.5 w-3.5" />
              Lead time
            </span>
            <span className="font-semibold text-white">{item.leadTimeLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <span className="inline-flex items-center gap-2 text-slate-300/70">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              Job impact
            </span>
            <span className="font-semibold text-white">{item.jobImpactLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <span className="inline-flex items-center gap-2 text-slate-300/70">
              Supplier
            </span>
            <span className="max-w-[56%] truncate text-right font-semibold text-white">{item.supplierLabel}</span>
          </div>
        </div>

        <div className={`mt-auto flex items-center gap-2 border-t border-white/10 pt-4 ${showDetails ? "justify-between" : "justify-end"}`}>
          {showDetails ? (
            <Link
              href={item.detailHref}
              className="inline-flex min-h-10 items-center justify-center rounded-[0.95rem] border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-slate-100 transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/[0.1] active:scale-[0.98]"
            >
              View Details
            </Link>
          ) : null}
          <Link
            href={item.actionHref}
            className={`inline-flex min-h-10 items-center justify-center rounded-[0.95rem] px-3.5 py-2 text-sm font-semibold transition-all duration-[120ms] ${reorderActionClass} ${criticalReorderClass} ${toneActionButton(item.tone, emphasized)}`}
          >
            {item.actionLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}