import { PageShell } from "@/components/layout/page-shell";
import { ActionStrip } from "@/components/dashboard/ActionStrip";
import { CommandCenter } from "@/components/dashboard/CommandCenter";
import { HealthStats } from "@/components/dashboard/HealthStats";
import { JobsAtRiskPanel } from "@/components/dashboard/JobsAtRiskPanel";
import type {
  ActionStripItem,
  CommandDecisionItem,
  ContextRiskItem,
  HealthStatItem,
  Tone,
} from "@/components/dashboard/types";
import { WorkQueue } from "@/components/dashboard/WorkQueue";

type SummaryItem = {
  label: string;
  value: string;
  tone: Tone;
};

export function Dashboard({
  organizationName,
  heroTitle,
  summaryItems,
  supportingLine,
  primaryAction,
  secondaryAction,
  commandActions,
  healthStats,
  actionStripItems,
  workQueueItems,
  jobsAtRisk,
  analyticsNote,
}: {
  organizationName: string;
  heroTitle: string;
  summaryItems: SummaryItem[];
  supportingLine: string;
  primaryAction: { label: string; href: string };
  secondaryAction: { label: string; href: string };
  commandActions: CommandDecisionItem[];
  healthStats: HealthStatItem[];
  actionStripItems: ActionStripItem[];
  workQueueItems: CommandDecisionItem[];
  jobsAtRisk: ContextRiskItem[];
  analyticsNote?: string;
}) {
  return (
    <PageShell
      className="performance-dashboard relative max-w-[1320px] px-4 py-4 sm:px-6 sm:py-5 lg:px-6 lg:py-5"
      contentClassName="space-y-4 lg:space-y-5"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(129,140,248,0.18),transparent_24%),radial-gradient(circle_at_50%_28%,rgba(59,130,246,0.08),transparent_34%)]" />

      <div className="dashboard-rise">
        <CommandCenter
          organizationName={organizationName}
          heroTitle={heroTitle}
          summaryItems={summaryItems}
          supportingLine={supportingLine}
          primaryAction={primaryAction}
          secondaryAction={secondaryAction}
          actions={commandActions}
        />
      </div>

      <div className="dashboard-rise dashboard-delay-1">
        <HealthStats stats={healthStats} />
      </div>

      <div className="dashboard-rise dashboard-delay-2">
        <ActionStrip actions={actionStripItems} />
      </div>

      <section className="dashboard-rise dashboard-delay-3 grid gap-4 xl:grid-cols-[minmax(0,1.38fr)_minmax(20rem,0.82fr)] xl:items-start">
        <WorkQueue items={workQueueItems} />
        <JobsAtRiskPanel jobs={jobsAtRisk} analyticsNote={analyticsNote} />
      </section>
    </PageShell>
  );
}