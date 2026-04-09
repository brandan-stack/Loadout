import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageShell({
  children,
  className,
  contentClassName,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <main className={cn("mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8", className)}>
      <div className={cn("space-y-6", contentClassName)}>{children}</div>
    </main>
  );
}

export function PageSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn("space-y-4", className)}>{children}</section>;
}

export function PageGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]", className)}>{children}</div>;
}