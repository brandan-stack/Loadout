import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const CreateLocationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  const locations = await prisma.location.findMany({
    where: { archived: false },
    orderBy: { name: "asc" },
    include: {
      stock: {
        include: { item: { select: { id: true, name: true } } },
      },
    },
  });
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const location = await prisma.location.create({
    data: { name: parsed.data.name, description: parsed.data.description },
  });
  return NextResponse.json(location, { status: 201 });
}
