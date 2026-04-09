import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function ListItem({
  title,
  subtitle,
  meta,
  actions,
  className,
  leading,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
  leading?: ReactNode;
}) {
  return (
    <div className={cn("flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-all duration-200 hover:border-white/16 hover:bg-white/[0.06]", className)}>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{title}</div>
            {subtitle ? <div className="mt-2 text-sm leading-6 text-slate-300/78">{subtitle}</div> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        {meta ? <div className="mt-3 text-xs text-slate-400">{meta}</div> : null}
      </div>
    </div>
  );
}