import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "blue" | "teal" | "green" | "orange" | "red" | "slate";

const toneClassNames: Record<BadgeTone, string> = {
  blue: "border-sky-400/20 bg-sky-400/10 text-sky-100",
  teal: "border-teal-400/20 bg-teal-400/10 text-teal-100",
  green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  orange: "border-amber-400/20 bg-amber-400/10 text-amber-100",
  red: "border-rose-400/20 bg-rose-400/10 text-rose-100",
  slate: "border-white/10 bg-white/[0.06] text-slate-200",
};

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        toneClassNames[tone],
        className
      )}
    >
      {children}
    </span>
  );
}