// src/app/api/sharing/log/route.ts - Share activity logging API

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const shareLogSchema = z.object({
  type: z.enum(["pdf", "email"]),
  reportType: z.string(),
  emailClient: z.string().optional(),
  filters: z.any().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = shareLogSchema.parse(body);

    const shareLog = await prisma.shareLog.create({
      data: {
        type: data.type,
        reportType: data.reportType,
        emailClient: data.emailClient,
        filters: data.filters ? JSON.stringify(data.filters) : "{}",
      },
    });

    return NextResponse.json(shareLog, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Share log error:", error);
    return NextResponse.json(
      { error: "Failed to log share activity" },
      { status: 500 }
    );
  }
}

/**
 * Get share activity logs (last 50)
 */
export async function GET() {
  try {
    const logs = await prisma.shareLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Share log retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve logs" },
      { status: 500 }
    );
  }
}
