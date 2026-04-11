import { ReorderPageClient } from "@/components/reorder/reorder-page-client";
import { requirePageAccess } from "@/lib/permissions";
import { getReorderRecommendationSnapshot } from "@/lib/reorder/suggestion-service";

function getInitialPriorityFilter(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate === "urgent" || candidate === "high" || candidate === "medium") {
    return candidate;
  }

  return "all";
}

function getInitialItemId(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;

  return typeof candidate === "string" && candidate.trim() ? candidate : undefined;
}

export default async function ReorderPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requirePageAccess("canViewReorder");
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const snapshot = await getReorderRecommendationSnapshot(access.organizationId);

  return (
    <ReorderPageClient
      initialRecommendations={snapshot.recommendations.map((recommendation) => ({
        ...recommendation,
        estimatedArrivalDate: recommendation.estimatedArrivalDate.toISOString(),
      }))}
      initialSummary={snapshot.summary}
      linkedSupplierCount={snapshot.linkedSupplierCount}
      initialPriorityFilter={getInitialPriorityFilter(resolvedSearchParams?.priority)}
      initialSelectedItemId={getInitialItemId(resolvedSearchParams?.item)}
    />
  );
}