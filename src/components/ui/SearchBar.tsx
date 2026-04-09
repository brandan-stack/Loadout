import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function SearchBar({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]", className)}>
      <Search className="h-4 w-4 text-slate-400" />
      <input
        {...props}
        className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
      />
    </label>
  );
}