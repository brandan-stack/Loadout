"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Clock3,
  ShoppingCart,
  Sparkles,
  Truck,
} from "lucide-react";
import { ActionCard } from "@/components/cards/ActionCard";
import { StatCard } from "@/components/cards/StatCard";
import { PageGrid, PageSection, PageShell } from "@/components/layout/page-shell";
import { SidePanel } from "@/components/panels/SidePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { ListItem } from "@/components/ui/ListItem";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchBar } from "@/components/ui/SearchBar";
import type { ReorderRecommendationSummary } from "@/lib/reorder/types";

type ClientReorderRecommendation = {
  itemId: string;
  name: string;
  barcode?: string | null;
  currentQuantity: number;
  suggestedQuantity: number;
  suggestedOrderQuantity: number;
  minQuantity: number;
  maxQuantity: number;
  usagePerDay: number;
  leadTimeDays: number;
  estimatedArrivalDate: string;
  priority: "urgent" | "high" | "medium" | "low";
  preferredSupplier?: {
    id: string;
    name: string;
    leadTimeD: number;
  };
  reason: string;
};

interface ReorderPageClientProps {
  initialRecommendations: ClientReorderRecommendation[];
  initialSummary: ReorderRecommendationSummary;
  linkedSupplierCount: number;
}

export function ReorderPageClient({
  initialRecommendations,
  initialSummary,
  linkedSupplierCount,
}: ReorderPageClientProps) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const filteredRecommendations = useMemo(() => {
    return initialRecommendations.filter((recommendation) => {
      if (priorityFilter !== "all" && recommendation.priority !== priorityFilter) {
        return false;
      }

      if (!search.trim()) {
        return true;
      }

      const query = search.trim().toLowerCase();

      return [
        recommendation.name,
        recommendation.barcode,
        recommendation.preferredSupplier?.name,
        recommendation.reason,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [initialRecommendations, priorityFilter, search]);

  const filteredSummary = useMemo(
    () => ({
      urgent: filteredRecommendations.filter((recommendation) => recommendation.priority === "urgent").length,
      high: filteredRecommendations.filter((recommendation) => recommendation.priority === "high").length,
      total: filteredRecommendations.length,
    }),
    [filteredRecommendations]
  );

  const nextRecommendation = filteredRecommendations[0] ?? initialRecommendations[0] ?? null;
  const selectedRecommendation =
    filteredRecommendations.find((recommendation) => recommendation.itemId === selectedItemId) ??
    initialRecommendations.find((recommendation) => recommendation.itemId === selectedItemId) ??
    null;

  const filterOptions = [
    { value: "all", label: "All", count: String(initialSummary.total) },
    { value: "urgent", label: "Urgent", count: String(initialSummary.urgent) },
    { value: "high", label: "Warning", count: String(initialSummary.high) },
    {
      value: "medium",
      label: "Buffer",
      count: String(initialRecommendations.filter((recommendation) => recommendation.priority === "medium").length),
    },
  ];

  return (
    <PageShell className="performance-dashboard">
      <PageHeader
        eyebrow={<Badge tone="teal">Reorder Control</Badge>}
        title="Make the next purchasing decision obvious"
        description="Field teams need instant buying clarity. This queue ranks stock pressure, recommends order quantities, and keeps supplier context one click away."
        actions={
          <>
            <Button href={nextRecommendation ? `/items?item=${nextRecommendation.itemId}` : "/items"} variant="primary">
              {nextRecommendation ? "Open next item" : "Review inventory"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="/suppliers" variant="secondary">
              Supplier rules
            </Button>
          </>
        }
      />

      <PageSection>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <ActionCard
            title={
              filteredSummary.urgent > 0
                ? "Immediate buy pressure is building"
                : filteredSummary.high > 0
                  ? "The watchlist is active"
                  : "Stock coverage is stable"
            }
            description={buildHeroCopy(filteredSummary, nextRecommendation)}
            icon={Sparkles}
            tone={filteredSummary.urgent > 0 ? "red" : filteredSummary.high > 0 ? "orange" : "teal"}
            action={
              nextRecommendation ? (
                <Button variant="primary" href={`/items?item=${nextRecommendation.itemId}`}>
                  Order next
                </Button>
              ) : null
            }
          />

          <Card className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Next call</p>
              {nextRecommendation ? (
                <>
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">{nextRecommendation.name}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-300/78">{nextRecommendation.reason}</p>
                    </div>
                    <PriorityBadge priority={nextRecommendation.priority} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <MetricTile label="Order" value={formatCompact(nextRecommendation.suggestedOrderQuantity)} />
                    <MetricTile label="Arrival" value={formatDate(nextRecommendation.estimatedArrivalDate)} />
                    <MetricTile label="Min" value={formatCompact(nextRecommendation.minQuantity)} />
                    <MetricTile label="Lead" value={`${nextRecommendation.leadTimeDays}d`} />
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-300/78">No active reorder pressure is visible right now.</p>
              )}
            </div>
          </Card>
        </div>
      </PageSection>

      <PageSection className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Queue" value={formatCompact(filteredSummary.total)} hint="Open reorder decisions" trend={`${initialSummary.total} total`} tone="blue" icon={ShoppingCart} />
        <StatCard label="Critical" value={formatCompact(filteredSummary.urgent)} hint="Immediate stockouts" trend={filteredSummary.urgent > 0 ? "Escalate" : "Stable"} tone={filteredSummary.urgent > 0 ? "red" : "green"} icon={AlertTriangle} />
        <StatCard label="Warning" value={formatCompact(filteredSummary.high)} hint="Below safety stock" trend={filteredSummary.high > 0 ? "Review" : "Clear"} tone={filteredSummary.high > 0 ? "orange" : "green"} icon={Clock3} />
        <StatCard label="Suppliers" value={formatCompact(linkedSupplierCount)} hint="Vendors linked to queue items" trend="Routing ready" tone="teal" icon={Truck} />
      </PageSection>

      <PageSection>
        <Card className="sticky top-24 z-20 space-y-4 bg-[linear-gradient(180deg,rgba(7,11,20,0.94),rgba(9,15,29,0.92))]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-white">Queue controls</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300/78">Search by item, barcode, supplier, or rationale. Filter by urgency without leaving the queue.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="blue">{filteredSummary.total} showing</Badge>
              <Badge tone="slate">{linkedSupplierCount} suppliers linked</Badge>
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <SearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reorder queue"
            />
            <FilterTabs options={filterOptions} value={priorityFilter} onChange={setPriorityFilter} />
          </div>
        </Card>
      </PageSection>

      <PageGrid>
        <PageSection>
          <div className="space-y-4">
            {filteredRecommendations.length > 0 ? (
              filteredRecommendations.map((recommendation) => {
                const confidence = getConfidence(recommendation);

                return (
                  <Card key={recommendation.itemId} className="space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold tracking-[-0.04em] text-white">{recommendation.name}</h3>
                          <PriorityBadge priority={recommendation.priority} />
                          <ConfidenceBadge confidence={confidence} />
                        </div>
                        <p className="text-sm leading-6 text-slate-300/78">{recommendation.reason}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone="slate">On hand {formatCompact(recommendation.currentQuantity)}</Badge>
                          <Badge tone="slate">Suggested {formatCompact(recommendation.suggestedOrderQuantity)}</Badge>
                          <Badge tone="slate">Min {formatCompact(recommendation.minQuantity)}</Badge>
                          <Badge tone="slate">Lead {recommendation.leadTimeDays}d</Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                        <Button variant="primary" href={`/items?item=${recommendation.itemId}`}>
                          Order now
                        </Button>
                        <Button variant="secondary" onClick={() => setSelectedItemId(recommendation.itemId)}>
                          View detail
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetricTile label="Current" value={formatCompact(recommendation.currentQuantity)} />
                      <MetricTile label="Order" value={formatCompact(recommendation.suggestedOrderQuantity)} />
                      <MetricTile label="Target range" value={`${formatCompact(recommendation.minQuantity)}-${formatCompact(recommendation.maxQuantity)}`} />
                      <MetricTile label="Arrival" value={formatDate(recommendation.estimatedArrivalDate)} />
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-200">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">Nothing matches those controls</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300/78">Clear the search or switch filters to see more reorder decisions.</p>
              </Card>
            )}
          </div>
        </PageSection>

        <PageSection>
          <Card className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Queue intelligence</p>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white">What should the buyer do next?</h2>
            </div>
            <div className="space-y-4">
              <ListItem
                title="Buy urgent items first"
                subtitle="Critical items are already below safe cover and should move before watchlist stock."
                leading={<IconTile icon={AlertTriangle} tone="red" />}
                meta={`${filteredSummary.urgent} urgent decisions`}
              />
              <ListItem
                title="Favor linked suppliers"
                subtitle="Items with an assigned vendor are faster to turn into a purchase without extra clicks."
                leading={<IconTile icon={Truck} tone="teal" />}
                meta={`${linkedSupplierCount} suppliers already routed`}
              />
              <ListItem
                title="Use suggested quantity"
                subtitle="Suggested orders are calculated from demand velocity, lead time, and target range coverage."
                leading={<IconTile icon={Boxes} tone="blue" />}
                meta="Auto order calculation enabled"
              />
            </div>
          </Card>
        </PageSection>
      </PageGrid>

      <SidePanel
        open={selectedRecommendation !== null}
        onClose={() => setSelectedItemId(null)}
        title={selectedRecommendation?.name ?? "Reorder detail"}
        description={selectedRecommendation?.reason}
        footer={
          selectedRecommendation ? (
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button className="flex-1" variant="primary" href={`/items?item=${selectedRecommendation.itemId}`}>
                Order now
              </Button>
              <Button className="flex-1" variant="secondary" href={`/items?item=${selectedRecommendation.itemId}`}>
                View item
              </Button>
            </div>
          ) : null
        }
      >
        {selectedRecommendation ? (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <PriorityBadge priority={selectedRecommendation.priority} />
              <ConfidenceBadge confidence={getConfidence(selectedRecommendation)} />
              {selectedRecommendation.preferredSupplier ? <Badge tone="teal">{selectedRecommendation.preferredSupplier.name}</Badge> : <Badge tone="orange">Supplier needed</Badge>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetricTile label="Current stock" value={formatCompact(selectedRecommendation.currentQuantity)} />
              <MetricTile label="Suggested order" value={formatCompact(selectedRecommendation.suggestedOrderQuantity)} />
              <MetricTile label="Min target" value={formatCompact(selectedRecommendation.minQuantity)} />
              <MetricTile label="Max target" value={formatCompact(selectedRecommendation.maxQuantity)} />
              <MetricTile label="Lead time" value={`${selectedRecommendation.leadTimeDays} days`} />
              <MetricTile label="Expected arrival" value={formatDate(selectedRecommendation.estimatedArrivalDate)} />
            </div>

            <Card className="space-y-3 bg-white/[0.04]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Supplier recommendation</p>
              <p className="text-sm leading-6 text-slate-300/78">
                {selectedRecommendation.preferredSupplier
                  ? `${selectedRecommendation.preferredSupplier.name} is already linked to this item, so the buyer can move directly from decision to purchase.`
                  : "No preferred supplier is linked yet. Assign one so this recommendation can turn into a fast purchase path."}
              </p>
            </Card>
          </div>
        ) : null}
      </SidePanel>
    </PageShell>
  );
}

function buildHeroCopy(
  summary: ReorderRecommendationSummary,
  nextRecommendation: ClientReorderRecommendation | null
) {
  if (summary.urgent > 0 && nextRecommendation) {
    return `${summary.urgent} critical items are below safe cover. ${nextRecommendation.name} is the next buy call, and the queue is carrying ${summary.total} total reorder decisions.`;
  }

  if (summary.high > 0 && nextRecommendation) {
    return `${summary.high} items are under safety stock. ${nextRecommendation.name} is leading the queue, with ${summary.total} purchase decisions ready to review.`;
  }

  return "No urgent reorder pressure is active. The queue is clear or carrying only low-noise monitoring items.";
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function getConfidence(recommendation: ClientReorderRecommendation) {
  if (recommendation.preferredSupplier && recommendation.usagePerDay > 0.3) {
    return "high" as const;
  }

  if (recommendation.preferredSupplier || recommendation.usagePerDay > 0.15) {
    return "medium" as const;
  }

  return "low" as const;
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-white">{value}</p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: ClientReorderRecommendation["priority"] }) {
  const tone = priority === "urgent" ? "red" : priority === "high" ? "orange" : priority === "medium" ? "blue" : "green";
  return <Badge tone={tone}>{priority}</Badge>;
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const tone = confidence === "high" ? "green" : confidence === "medium" ? "orange" : "slate";
  return <Badge tone={tone}>{confidence} confidence</Badge>;
}

function IconTile({
  icon: Icon,
  tone,
}: {
  icon: typeof AlertTriangle;
  tone: "red" | "teal" | "blue";
}) {
  const className = tone === "red" ? "border-rose-400/20 bg-rose-400/10 text-rose-100" : tone === "teal" ? "border-teal-400/20 bg-teal-400/10 text-teal-100" : "border-sky-400/20 bg-sky-400/10 text-sky-100";
  return (
    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${className}`}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

export default ReorderPageClient;