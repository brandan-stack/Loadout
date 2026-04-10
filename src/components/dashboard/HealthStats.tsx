import type { HealthStatItem } from "@/components/dashboard/types";
import { toneAccentGradient, toneText } from "@/components/dashboard/theme";

export function HealthStats({ stats }: { stats: HealthStatItem[] }) {
  return (
    <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
      {stats.map((stat) => (
        <article
          key={stat.label}
          className="dashboard-panel-shell panel-interactive overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.64))] px-3.5 py-3 shadow-[0_14px_30px_rgba(2,6,23,0.2)]"
        >
          <div className="mb-2 h-1 w-10 rounded-full" style={{ background: toneAccentGradient(stat.tone) }} />
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400/82">{stat.label}</p>
          <p className={`mt-1.5 text-[1.55rem] font-bold tracking-[-0.05em] ${toneText(stat.tone)}`}>{stat.value}</p>
          <p className="mt-1 text-[0.78rem] leading-5 text-slate-300/66">{stat.detail}</p>
        </article>
      ))}
    </section>
  );
}