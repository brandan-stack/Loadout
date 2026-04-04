import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRequestContext } from "@/lib/request-context";
import { z } from "zod";

const CreateLocationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = requireRequestContext(request);
    if (!auth.ok) {
      return auth.response;
    }

    const locations = await prisma.location.findMany({
      where: { archived: false, organizationId: auth.context.organizationId },
      orderBy: { name: "asc" },
      include: {
        stock: {
          include: { item: { select: { id: true, name: true } } },
        },
      },
    });
    return NextResponse.json(locations);
  } catch (error) {
    console.error("Locations GET error:", error);
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireRequestContext(req);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await req.json();
    const parsed = CreateLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const location = await prisma.location.create({
      data: {
        organizationId: auth.context.organizationId,
        name: parsed.data.name,
        description: parsed.data.description,
      },
    });
    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error("Location POST error:", error);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}
