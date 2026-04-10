import type { Tone } from "@/components/dashboard/types";

export function tonePill(tone: Tone) {
  if (tone === "emerald") {
    return "border-emerald-300/24 bg-emerald-300/12 text-emerald-50";
  }

  if (tone === "amber") {
    return "border-amber-300/24 bg-amber-300/12 text-amber-50";
  }

  if (tone === "rose") {
    return "border-rose-300/24 bg-rose-300/12 text-rose-50";
  }

  if (tone === "indigo") {
    return "border-indigo-300/24 bg-indigo-300/12 text-indigo-50";
  }

  return "border-sky-300/24 bg-sky-300/12 text-sky-50";
}

export function toneText(tone: Tone) {
  if (tone === "emerald") {
    return "text-emerald-100";
  }

  if (tone === "amber") {
    return "text-amber-100";
  }

  if (tone === "rose") {
    return "text-rose-100";
  }

  if (tone === "indigo") {
    return "text-indigo-100";
  }

  return "text-sky-100";
}

export function toneIconSurface(tone: Tone) {
  if (tone === "emerald") {
    return "border-emerald-300/26 bg-emerald-300/16 text-emerald-50";
  }

  if (tone === "amber") {
    return "border-amber-300/26 bg-amber-300/16 text-amber-50";
  }

  if (tone === "rose") {
    return "border-rose-300/26 bg-rose-300/16 text-rose-50";
  }

  if (tone === "indigo") {
    return "border-indigo-300/26 bg-indigo-300/16 text-indigo-50";
  }

  return "border-sky-300/26 bg-sky-300/16 text-sky-50";
}

export function toneAccentGradient(tone: Tone) {
  if (tone === "emerald") {
    return "linear-gradient(90deg, rgba(52,211,153,0.98), rgba(16,185,129,0.42))";
  }

  if (tone === "amber") {
    return "linear-gradient(90deg, rgba(251,191,36,0.98), rgba(245,158,11,0.42))";
  }

  if (tone === "rose") {
    return "linear-gradient(90deg, rgba(251,113,133,0.98), rgba(244,63,94,0.42))";
  }

  if (tone === "indigo") {
    return "linear-gradient(90deg, rgba(129,140,248,0.98), rgba(79,70,229,0.42))";
  }

  return "linear-gradient(90deg, rgba(56,189,248,0.98), rgba(14,165,233,0.42))";
}

export function toneSurface(tone: Tone) {
  if (tone === "emerald") {
    return "border-emerald-300/22 bg-[linear-gradient(180deg,rgba(6,95,70,0.34),rgba(5,46,22,0.18),rgba(15,23,42,0.84))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";
  }

  if (tone === "amber") {
    return "border-amber-300/22 bg-[linear-gradient(180deg,rgba(120,53,15,0.34),rgba(120,53,15,0.16),rgba(15,23,42,0.84))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";
  }

  if (tone === "rose") {
    return "border-rose-300/28 bg-[linear-gradient(180deg,rgba(159,18,57,0.42),rgba(127,29,29,0.24),rgba(15,23,42,0.86))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";
  }

  if (tone === "indigo") {
    return "border-indigo-300/22 bg-[linear-gradient(180deg,rgba(49,46,129,0.34),rgba(49,46,129,0.18),rgba(15,23,42,0.84))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";
  }

  return "border-sky-300/22 bg-[linear-gradient(180deg,rgba(8,47,73,0.34),rgba(8,47,73,0.18),rgba(15,23,42,0.84))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";
}

export function toneActionButton(tone: Tone, emphasized: boolean) {
  if (tone === "rose") {
    return emphasized
      ? "bg-[linear-gradient(135deg,#fda4af_0%,#fb7185_28%,#f43f5e_58%,#e11d48_100%)] text-white shadow-[0_18px_34px_rgba(244,63,94,0.34),0_0_22px_rgba(251,113,133,0.2)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_28px_48px_rgba(244,63,94,0.42),0_0_38px_rgba(251,113,133,0.32)] active:scale-[0.98]"
      : "bg-[linear-gradient(135deg,rgba(251,113,133,0.94),rgba(244,63,94,0.9),rgba(225,29,72,0.88))] text-white shadow-[0_14px_28px_rgba(244,63,94,0.24)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_22px_38px_rgba(244,63,94,0.32),0_0_24px_rgba(251,113,133,0.18)] active:scale-[0.98]";
  }

  if (tone === "amber") {
    return emphasized
      ? "bg-[linear-gradient(135deg,#f59e0b_0%,#fbbf24_100%)] text-slate-950 shadow-[0_16px_32px_rgba(245,158,11,0.24)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_24px_42px_rgba(245,158,11,0.32),0_0_24px_rgba(251,191,36,0.2)] active:scale-[0.98]"
      : "bg-[linear-gradient(135deg,rgba(245,158,11,0.88),rgba(251,191,36,0.9))] text-slate-950 shadow-[0_14px_28px_rgba(245,158,11,0.2)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_20px_36px_rgba(245,158,11,0.28)] active:scale-[0.98]";
  }

  if (tone === "indigo") {
    return emphasized
      ? "bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] text-white shadow-[0_16px_32px_rgba(99,102,241,0.24)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_24px_42px_rgba(99,102,241,0.32),0_0_24px_rgba(139,92,246,0.18)] active:scale-[0.98]"
      : "bg-[linear-gradient(135deg,rgba(99,102,241,0.84),rgba(139,92,246,0.82))] text-white shadow-[0_14px_28px_rgba(99,102,241,0.18)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_20px_36px_rgba(99,102,241,0.26)] active:scale-[0.98]";
  }

  return emphasized
    ? "bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-950 shadow-[0_14px_30px_rgba(255,255,255,0.18)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_24px_42px_rgba(255,255,255,0.24),0_0_26px_rgba(255,255,255,0.12)] active:scale-[0.98]"
    : "bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-950 shadow-[0_12px_24px_rgba(255,255,255,0.14)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_20px_34px_rgba(255,255,255,0.2)] active:scale-[0.98]";
}