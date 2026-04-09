import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

type StatTone = "blue" | "teal" | "green" | "orange" | "red";

const accentClassNames: Record<StatTone, string> = {
  blue: "from-sky-400 to-blue-500 text-sky-100",
  teal: "from-teal-400 to-cyan-500 text-teal-100",
  green: "from-emerald-400 to-green-500 text-emerald-100",
  orange: "from-amber-400 to-orange-500 text-amber-100",
  red: "from-rose-400 to-red-500 text-rose-100",
};

export function StatCard({
  label,
  value,
  hint,
  trend,
  tone = "blue",
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  trend?: string;
  tone?: StatTone;
  icon?: LucideIcon;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-[-0.05em] text-white">{value}</p>
        </div>
        {Icon ? (
          <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br shadow-[0_14px_28px_rgba(15,23,42,0.22)]", accentClassNames[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm leading-6 text-slate-300/80">{hint}</p>
        {trend ? <Badge tone={tone === "red" ? "red" : tone === "orange" ? "orange" : tone === "green" ? "green" : tone === "teal" ? "teal" : "blue"}>{trend}</Badge> : null}
      </div>
    </Card>
  );
}