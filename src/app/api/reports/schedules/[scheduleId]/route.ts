import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params;
  await prisma.scheduledReport.update({
    where: { id: scheduleId },
    data: { archived: true },
  });
  return new NextResponse(null, { status: 204 });
}
