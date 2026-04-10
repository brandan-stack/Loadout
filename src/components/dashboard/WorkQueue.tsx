import { ActionCard } from "@/components/dashboard/ActionCard";
import type { CommandDecisionItem } from "@/components/dashboard/types";

export function WorkQueue({ items }: { items: CommandDecisionItem[] }) {
  return (
    <section className="dashboard-panel-shell overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,19,36,0.88),rgba(15,23,42,0.72))] p-4 shadow-[0_22px_48px_rgba(2,6,23,0.28)] backdrop-blur-sm sm:p-5">
      <div>
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-slate-400/82">Queue</p>
        <h2 className="mt-2 text-[1.45rem] font-semibold tracking-[-0.05em] text-white">Work Queue</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300/74">
          Only the next actionable items. No passive status noise.
        </p>
        <p className="mt-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-slate-500/80">
          Remaining actions
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item, index) => <ActionCard key={item.id} item={item} variant="secondary" featured={index === 0} />)
        ) : (
          <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-white/[0.04] px-4 py-5 text-sm leading-6 text-slate-300/72">
            No additional work queue items. The next move lives in the command center or action strip.
          </div>
        )}
      </div>
    </section>
  );
}