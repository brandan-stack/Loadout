import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export function ActionCard({
  title,
  description,
  icon: Icon,
  action,
  tone = "blue",
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: ReactNode;
  tone?: "blue" | "teal" | "green" | "orange" | "red";
}) {
  const toneClassName = {
    blue: "from-sky-400/20 to-blue-500/10 text-sky-100 border-sky-400/20",
    teal: "from-teal-400/20 to-cyan-500/10 text-teal-100 border-teal-400/20",
    green: "from-emerald-400/20 to-green-500/10 text-emerald-100 border-emerald-400/20",
    orange: "from-amber-400/20 to-orange-500/10 text-amber-100 border-amber-400/20",
    red: "from-rose-400/20 to-red-500/10 text-rose-100 border-rose-400/20",
  }[tone];

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <span className={cn("inline-flex h-12 w-12 items-center justify-center rounded-2xl border bg-gradient-to-br", toneClassName)}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300/78">{description}</p>
          </div>
        </div>
        {action}
      </div>
    </Card>
  );
}