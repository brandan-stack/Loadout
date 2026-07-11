"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  busy = false,
  tone = "danger",
  onClose,
  onConfirm,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: "danger" | "primary";
  onClose: () => void;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <div
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-[70] bg-slate-950/82 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-[80] flex items-end justify-center p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] transition-all duration-200 sm:items-center sm:p-4",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div className="w-full max-w-lg max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto rounded-[1.6rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_34%),linear-gradient(180deg,rgba(8,12,23,0.98),rgba(10,16,30,0.98))] p-5 shadow-[0_40px_80px_rgba(2,6,23,0.55)] sm:rounded-[2rem] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-100">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 space-y-3">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">{title}</h2>
            <p className="text-sm leading-6 text-slate-300/80">{description}</p>
          </div>

          {children ? <div className="mt-5">{children}</div> : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button variant={tone} onClick={onConfirm} disabled={busy}>
              {busy ? "Working..." : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}