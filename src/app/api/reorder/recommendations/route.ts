// src/app/api/reorder/recommendations/route.ts - Reorder recommendations API

import { NextRequest, NextResponse } from "next/server";
import {
  getItemReorderRecommendation,
  getReorderRecommendationSummary,
  getReorderRecommendations,
} from "@/lib/reorder/suggestion-service";
import { requireRequestContext } from "@/lib/request-context";

export async function GET(request: NextRequest) {
  try {
    const auth = requireRequestContext(request);
    if (!auth.ok) {
      return auth.response;
    }

    const itemId = request.nextUrl.searchParams.get("itemId");
    const summaryOnly = request.nextUrl.searchParams.get("summary") === "1";

    if (itemId) {
      // Single item recommendation
      const recommendation = await getItemReorderRecommendation(auth.context.organizationId, itemId);
      if (!recommendation) {
        return NextResponse.json(
          { error: "Item not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(recommendation);
    }

    if (summaryOnly) {
      const summary = await getReorderRecommendationSummary(auth.context.organizationId);
      return NextResponse.json(summary);
    }

    // All items recommendations
    const recommendations = await getReorderRecommendations(auth.context.organizationId);
    let urgent = 0;
    let high = 0;

    for (const recommendation of recommendations) {
      if (recommendation.priority === "urgent") {
        urgent += 1;
      }

      if (recommendation.priority === "high") {
        high += 1;
      }
    }

    return NextResponse.json({
      recommendations,
      count: recommendations.length,
      urgent,
      high,
    });
  } catch (error) {
    console.error("Reorder recommendations error:", error);
    return NextResponse.json(
      { error: "Failed to get recommendations" },
      { status: 500 }
    );
  }
}
