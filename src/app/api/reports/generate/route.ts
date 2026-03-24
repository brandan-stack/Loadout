// src/app/api/reports/generate/route.ts - Report generation API

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getLowStockReport,
  getUsageReport,
  getDeadStockReport,
  getFastMoversReport,
} from "@/lib/reports/query-service";
import { ReportFilters } from "@/lib/reports/types";

const generateReportSchema = z.object({
  type: z.enum(["low_stock", "usage_period", "dead_stock", "fast_movers"]),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  supplierId: z.string().optional(),
  sortBy: z.enum(["name", "quantity", "usage", "date"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, dateFrom, dateTo, supplierId, sortBy, sortOrder } =
      generateReportSchema.parse(body);

    const filters: ReportFilters = {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      supplierId,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    };

    let data;

    switch (type) {
      case "low_stock":
        data = await getLowStockReport(filters);
        break;
      case "usage_period":
        data = await getUsageReport(filters);
        break;
      case "dead_stock":
        data = await getDeadStockReport(filters);
        break;
      case "fast_movers":
        data = await getFastMoversReport(filters);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      type,
      filters,
      generatedAt: new Date().toISOString(),
      data,
      itemCount: data.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
