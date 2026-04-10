import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { ActionCard } from "@/components/dashboard/ActionCard";
import type { CommandDecisionItem, Tone } from "@/components/dashboard/types";
import { toneText } from "@/components/dashboard/theme";

type SummaryItem = {
  label: string;
  value: string;
  tone: Tone;
};

export function CommandCenter({
  organizationName,
  heroTitle,
  summaryItems,
  supportingLine,
  primaryAction,
  secondaryAction,
  actions,
}: {
  organizationName: string;
  heroTitle: string;
  summaryItems: SummaryItem[];
  supportingLine: string;
  primaryAction: { label: string; href: string };
  secondaryAction: { label: string; href: string };
  actions: CommandDecisionItem[];
}) {
  return (
    <section className="dashboard-stage relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(7,16,32,0.98),rgba(16,23,42,0.98),rgba(49,46,129,0.48))] px-4 py-5 shadow-[0_28px_72px_rgba(2,6,23,0.52),0_0_0_1px_rgba(255,255,255,0.03)] sm:px-6 sm:py-6 xl:px-7 xl:py-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_82%_14%,rgba(129,140,248,0.18),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_24%)]" />

      <div className="relative space-y-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-[48rem]">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-100">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-200" />
                Command Center
              </span>
              <span className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-slate-400/88">
                {organizationName}
              </span>
            </div>

            <h1 className="mt-4 max-w-[13ch] text-[2.15rem] font-semibold leading-[0.88] tracking-[-0.07em] text-white sm:text-[2.8rem] xl:text-[3.35rem]">
              {heroTitle}
            </h1>
            <p className="mt-3 text-[0.92rem] font-semibold leading-6 text-slate-100/84">
              {supportingLine}
            </p>
            <p className="mt-3 max-w-[42rem] text-[0.96rem] leading-6 text-slate-300/76">
              Reoder parts. keep jobs moving. Nothing else matter. Keep you crew cruisin'
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className="dashboard-panel-shell overflow-hidden rounded-[1.05rem] border border-white/10 bg-white/[0.05] px-3.5 py-2.5 backdrop-blur-sm"
                >
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-400/82">{item.label}</p>
                  <p className={`mt-1 text-[1.1rem] font-bold tracking-[-0.04em] ${toneText(item.tone)}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={primaryAction.href}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1rem] bg-[linear-gradient(135deg,#2563eb_0%,#60a5fa_52%,#c4b5fd_100%)] px-5 py-3 text-sm font-semibold tracking-[-0.01em] text-white shadow-[0_18px_38px_rgba(37,99,235,0.28),0_0_24px_rgba(129,140,248,0.16)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_28px_52px_rgba(37,99,235,0.36),0_0_34px_rgba(129,140,248,0.28)] active:scale-[0.98]"
              >
                {primaryAction.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={secondaryAction.href}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1rem] border border-white/12 bg-white/[0.06] px-5 py-3 text-sm font-semibold tracking-[-0.01em] text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/[0.1] active:scale-[0.98]"
              >
                {secondaryAction.label}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {actions.length > 0 ? (
            actions.map((action) => <ActionCard key={action.id} item={action} variant="primary" showDetails />)
          ) : (
            <div className="dashboard-panel-shell rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.04] px-4 py-5 text-sm leading-6 text-slate-300/74 md:col-span-2 xl:col-span-3">
              The urgent queue is clear. Use the action strip below to scan, add stock, move inventory, or start the next job.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}