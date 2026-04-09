import { redirect } from "next/navigation";
import { ReorderPageClient } from "@/components/reorder/reorder-page-client";
import { getSession } from "@/lib/auth";
import { getReorderRecommendationSnapshot } from "@/lib/reorder/suggestion-service";

function getInitialPriorityFilter(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate === "urgent" || candidate === "high" || candidate === "medium") {
    return candidate;
  }

  return "all";
}

export default async function ReorderPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!session) {
    redirect("/login");
  }

  const snapshot = await getReorderRecommendationSnapshot(session.organizationId);

  return (
    <ReorderPageClient
      initialRecommendations={snapshot.recommendations.map((recommendation) => ({
        ...recommendation,
        estimatedArrivalDate: recommendation.estimatedArrivalDate.toISOString(),
      }))}
      initialSummary={snapshot.summary}
      linkedSupplierCount={snapshot.linkedSupplierCount}
      initialPriorityFilter={getInitialPriorityFilter(resolvedSearchParams?.priority)}
    />
  );
}