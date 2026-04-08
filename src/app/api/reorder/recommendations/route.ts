// src/app/api/reorder/recommendations/route.ts - Reorder recommendations API

import { NextRequest, NextResponse } from "next/server";
import {
  getItemReorderRecommendation,
  getReorderRecommendationSnapshot,
  getReorderRecommendationSummary,
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

    const snapshot = await getReorderRecommendationSnapshot(auth.context.organizationId);

    return NextResponse.json({
      recommendations: snapshot.recommendations,
      count: snapshot.summary.total,
      urgent: snapshot.summary.urgent,
      high: snapshot.summary.high,
      linkedSupplierCount: snapshot.linkedSupplierCount,
    });
  } catch (error) {
    console.error("Reorder recommendations error:", error);
    return NextResponse.json(
      { error: "Failed to get recommendations" },
      { status: 500 }
    );
  }
}
