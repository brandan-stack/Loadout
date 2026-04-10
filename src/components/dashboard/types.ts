import type { LucideIcon } from "lucide-react";

export type Tone = "sky" | "emerald" | "amber" | "rose" | "indigo";

export type CommandDecisionItem = {
  id: string;
  name: string;
  tone: Tone;
  isCritical: boolean;
  statusLabel: string;
  stockLabel: string;
  leadTimeLabel: string;
  jobImpactLabel: string;
  jobImpactCount: number;
  impactLine: string | null;
  detail: string;
  supplierLabel: string;
  actionLabel: string;
  actionHref: string;
  detailHref: string;
};

export type ActionStripItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  tone: Tone;
};

export type HealthStatItem = {
  label: string;
  value: string;
  detail: string;
  tone: Tone;
};

export type ContextRiskItem = {
  id: string;
  jobNumber: string;
  customer: string;
  blockedBy: string;
  detail: string;
  statusLabel: string;
  updatedLabel: string;
  stockLabel: string;
  leadTimeLabel: string;
  tone: Tone;
  href: string;
};