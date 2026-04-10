import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ActionStripItem } from "@/components/dashboard/types";
import { toneIconSurface } from "@/components/dashboard/theme";

export function ActionStrip({ actions }: { actions: ActionStripItem[] }) {
  return (
    <section className="sticky top-[5.3rem] z-30 md:top-[5.9rem]">
      <div className="dashboard-panel-shell rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,15,29,0.88),rgba(9,15,29,0.8))] p-2 shadow-[0_20px_42px_rgba(2,6,23,0.3)] backdrop-blur-xl">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="action-strip-button dashboard-panel-shell panel-interactive group flex min-h-[3.25rem] min-w-[10.5rem] flex-1 items-center justify-between gap-2.5 rounded-[1rem] border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-sm font-semibold tracking-[-0.01em] text-slate-50 shadow-[0_12px_24px_rgba(2,6,23,0.16)]"
            >
              <span className="flex items-center gap-2.5">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-[0.9rem] border ${toneIconSurface(action.tone)}`}>
                  <action.icon className="h-4 w-4" />
                </span>
                <span>{action.label}</span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-current/68 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}