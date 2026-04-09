import { cn } from "@/lib/cn";

export type FilterTabOption = {
  value: string;
  label: string;
  count?: string;
};

export function FilterTabs({
  options,
  value,
  onChange,
  className,
}: {
  options: FilterTabOption[];
  value: string;
  onChange: (nextValue: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("horizontal-scroll-row flex gap-2 overflow-x-auto", className)}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-2xl border px-4 text-sm font-semibold transition-all duration-200",
              active
                ? "border-sky-400/20 bg-sky-400/12 text-sky-100"
                : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/14 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            <span>{option.label}</span>
            {option.count ? <span className="text-xs text-current/75">{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}