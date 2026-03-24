// src/app/api/reorder/recommendations/route.ts - Reorder recommendations API

import { NextRequest, NextResponse } from "next/server";
import { getReorderRecommendations, getItemReorderRecommendation } from "@/lib/reorder/suggestion-service";

export async function GET(request: NextRequest) {
  try {
    const itemId = request.nextUrl.searchParams.get("itemId");

    if (itemId) {
      // Single item recommendation
      const recommendation = await getItemReorderRecommendation(itemId);
      if (!recommendation) {
        return NextResponse.json(
          { error: "Item not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(recommendation);
    }

    // All items recommendations
    const recommendations = await getReorderRecommendations();
    return NextResponse.json({
      recommendations,
      count: recommendations.length,
      urgent: recommendations.filter((r) => r.priority === "urgent").length,
      high: recommendations.filter((r) => r.priority === "high").length,
    });
  } catch (error) {
    console.error("Reorder recommendations error:", error);
    return NextResponse.json(
      { error: "Failed to get recommendations" },
      { status: 500 }
    );
  }
}
