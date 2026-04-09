import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="space-y-3">
        {eyebrow ? <div>{eyebrow}</div> : null}
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.05em] text-white lg:text-4xl">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300/78 lg:text-base">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto [&>*]:w-full sm:[&>*]:w-auto">{actions}</div> : null}
    </header>
  );
}