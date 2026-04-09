"use client";

import { useMemo, useState } from "react";
import { BarChart3, Boxes, BriefcaseBusiness, Download, TrendingUp, TriangleAlert } from "lucide-react";
import { ActionCard } from "@/components/cards/ActionCard";
import { PageGrid, PageSection, PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { PageHeader } from "@/components/ui/PageHeader";

const REPORTS = [
  {
    slug: "jobs",
    title: "Parts by Job",
    description: "Material costs per job for billing, margin review, and purchasing follow-up.",
    icon: BriefcaseBusiness,
    tone: "blue" as const,
    preview: [42, 65, 54, 78, 70],
  },
  {
    slug: "low-stock",
    title: "Low Stock",
    description: "Spot the items below low or critical threshold before the field team gets blocked.",
    icon: TriangleAlert,
    tone: "orange" as const,
    preview: [28, 44, 31, 25, 18],
  },
  {
    slug: "usage",
    title: "Usage",
    description: "Track what is being consumed fastest across the current reporting period.",
    icon: TrendingUp,
    tone: "teal" as const,
    preview: [22, 35, 48, 52, 64],
  },
  {
    slug: "dead-stock",
    title: "Dead Stock",
    description: "Find inventory that has not moved in 90 days so storage does not quietly fill up.",
    icon: Boxes,
    tone: "blue" as const,
    preview: [18, 20, 16, 14, 12],
  },
  {
    slug: "fast-movers",
    title: "Fast Movers",
    description: "See the items with the highest velocity so reorder rules stay ahead of demand.",
    icon: BarChart3,
    tone: "green" as const,
    preview: [30, 42, 58, 62, 76],
  },
];

export default function ReportsPage() {
  const [range, setRange] = useState("30d");

  const reportSummary = useMemo(
    () => ({
      reports: REPORTS.length,
      highlighted: REPORTS.filter((report) => report.tone === "orange").length,
    }),
    []
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow={<Badge tone="blue">Reports Center</Badge>}
        title="Turn inventory data into decisions"
        description="Every report is built around one decision: what needs attention, what is moving, and what should the business do next."
        actions={
          <>
            <Button variant="secondary">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="primary" href="/reports/jobs">
              Open top report
            </Button>
          </>
        }
      />

      <PageSection>
        <Card className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Reporting window</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300/78">Switch the reporting horizon without drilling into each page first.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="slate">{reportSummary.reports} reports</Badge>
              <Badge tone="orange">{reportSummary.highlighted} stock risk views</Badge>
            </div>
          </div>
          <FilterTabs
            value={range}
            onChange={setRange}
            options={[
              { value: "7d", label: "7 days" },
              { value: "30d", label: "30 days" },
              { value: "90d", label: "90 days" },
              { value: "ytd", label: "YTD" },
            ]}
          />
        </Card>
      </PageSection>

      <PageGrid className="xl:grid-cols-[minmax(0,1fr)_18rem]">
        <PageSection className="grid gap-4 lg:grid-cols-2">
          {REPORTS.map((report) => (
            <ActionCard
              key={report.slug}
              title={report.title}
              description={report.description}
              icon={report.icon}
              tone={report.tone}
              action={<Button variant="secondary" href={`/reports/${report.slug}`}>Generate</Button>}
            />
          ))}
        </PageSection>

        <PageSection>
          <Card className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Preview</p>
              <h2 className="mt-3 text-xl font-semibold text-white">What should the user do next?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300/78">Start with low stock for field continuity, then use usage and fast movers to tune the next purchasing cycle.</p>
            </div>
            <div className="space-y-4">
              {REPORTS.slice(0, 3).map((report) => (
                <div key={report.slug} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-white">{report.title}</p>
                    <Badge tone={report.tone === "orange" ? "orange" : report.tone === "green" ? "green" : report.tone === "teal" ? "teal" : "blue"}>{range}</Badge>
                  </div>
                  <div className="mt-4 flex items-end gap-2">
                    {report.preview.map((value, index) => (
                      <div key={`${report.slug}-${index}`} className="flex-1 rounded-t-xl bg-[linear-gradient(180deg,rgba(20,184,166,0.95),rgba(14,165,233,0.4))]" style={{ height: `${value}px` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </PageSection>
      </PageGrid>
    </PageShell>
  );
}