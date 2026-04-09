import { redirect } from "next/navigation";
import { ReorderPageClient } from "@/components/reorder/reorder-page-client";
import { getSession } from "@/lib/auth";
import { getReorderRecommendationSnapshot } from "@/lib/reorder/suggestion-service";

export default async function ReorderPage() {
  const session = await getSession();

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
    />
  );
}