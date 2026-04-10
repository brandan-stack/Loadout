import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { ContextRiskItem } from "@/components/dashboard/types";
import { tonePill, toneSurface } from "@/components/dashboard/theme";

export function JobsAtRiskPanel({
  jobs,
  analyticsNote,
}: {
  jobs: ContextRiskItem[];
  analyticsNote?: string;
}) {
  const hasJobs = jobs.length > 0;

  return (
    <div className="space-y-4">
      <section className="dashboard-panel-shell overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,19,36,0.92),rgba(15,23,42,0.74))] p-4 shadow-[0_22px_48px_rgba(2,6,23,0.3)] backdrop-blur-sm sm:p-5">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-slate-400/82">Right Column</p>
          <h2 className="mt-2 text-[1.3rem] font-semibold tracking-[-0.04em] text-white">Jobs at Risk</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300/74">
            Jobs blocked or exposed by stock pressure.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {hasJobs ? (
            jobs.map((job) => (
              <Link
                key={job.id}
                href={job.href}
                className={`jobs-at-risk-row dashboard-panel-shell panel-interactive group block overflow-hidden rounded-[1.25rem] border p-3.5 backdrop-blur-sm ${toneSurface(job.tone)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.16em] ${tonePill(job.tone)}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {job.statusLabel}
                      </span>
                      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-400/72">
                        {job.updatedLabel}
                      </span>
                    </div>
                    <h3 className="mt-2 truncate text-[0.98rem] font-semibold tracking-[-0.03em] text-white">
                      {job.jobNumber} · {job.customer}
                    </h3>
                    <p className="mt-1 text-[0.82rem] leading-5 text-slate-300/70">Blocked by {job.blockedBy}</p>
                    <p className="mt-2 text-[0.78rem] leading-5 text-slate-300/66">{job.detail}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[0.72rem] font-medium text-slate-200/82">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{job.stockLabel}</span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{job.leadTimeLabel}</span>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.3rem] border border-emerald-300/16 bg-emerald-300/10 px-4 py-5 text-sm leading-6 text-emerald-50/88 shadow-[0_16px_34px_rgba(6,95,70,0.18)]">
              All clear — no jobs are currently blocked by stock.
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-panel-shell overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,23,42,0.82),rgba(15,23,42,0.68))] p-4 shadow-[0_18px_40px_rgba(2,6,23,0.26)] backdrop-blur-sm sm:p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] border border-indigo-300/24 bg-indigo-300/14 text-indigo-50 shadow-[0_12px_26px_rgba(99,102,241,0.16)]">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-slate-400/82">Future analytics</p>
            <h3 className="mt-2 text-[1.05rem] font-semibold tracking-[-0.03em] text-white">Demand signals placeholder</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300/72">
              Usage forecasting, supplier drift, and route-level demand can be added here next.
            </p>
            {analyticsNote ? (
              <p className="mt-3 rounded-[1rem] border border-amber-300/18 bg-amber-300/10 px-3 py-2.5 text-[0.78rem] leading-5 text-amber-50/88">
                {analyticsNote}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}