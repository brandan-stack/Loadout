import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const dbAny = prisma as any;

const CreateScheduleSchema = z.object({
  name: z.string().min(1),
  reportType: z.enum(["low_stock", "usage_period", "dead_stock", "fast_movers"]),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  filters: z.record(z.unknown()).optional(),
});

function calcNextRun(frequency: string): Date {
  const now = new Date();
  if (frequency === "daily") {
    now.setDate(now.getDate() + 1);
  } else if (frequency === "weekly") {
    now.setDate(now.getDate() + 7);
  } else {
    now.setMonth(now.getMonth() + 1);
  }
  return now;
}

export async function GET() {
  const schedules = await dbAny.scheduledReport.findMany({
    where: { archived: false },
    orderBy: { nextRun: "asc" },
  });
  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schedule = await dbAny.scheduledReport.create({
    data: {
      name: parsed.data.name,
      reportType: parsed.data.reportType,
      frequency: parsed.data.frequency,
      filters: JSON.stringify(parsed.data.filters ?? {}),
      nextRun: calcNextRun(parsed.data.frequency),
    },
  });
  return NextResponse.json(schedule, { status: 201 });
}
