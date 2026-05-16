"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function SidePanel({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-50 bg-slate-950/72 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-[60] flex w-full max-w-full flex-col border-l border-white/10 bg-[linear-gradient(180deg,rgba(7,11,20,0.985),rgba(9,15,29,0.965))] shadow-[-24px_0_48px_rgba(2,6,23,0.42)] transition-transform duration-300 sm:w-[34rem] lg:w-[42rem] xl:w-[48rem]",
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-6 sm:pb-6 sm:pt-6">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">{title}</h2>
            {description ? <p className="mt-3 text-sm leading-6 text-slate-300/78">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-300 transition-colors hover:bg-white/[0.1] hover:text-white"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">{children}</div>
        {footer ? <div className="border-t border-white/10 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:py-6">{footer}</div> : null}
      </aside>
    </>,
    document.body
  );
}