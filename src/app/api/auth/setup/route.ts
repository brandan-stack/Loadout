import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emailSchema, passwordSchema } from "@/lib/auth-credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

const dbAny = prisma as any;
const BOOTSTRAP_ORG_ID = "org_legacy_bootstrap";
const setupSchema = z.object({
  organizationName: z.string().trim().min(1, "Business name is required").max(120, "Business name is too long"),
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: emailSchema,
  password: passwordSchema,
});

// GET — check if setup is required (no users exist)
export async function GET() {
  const MAX_RETRIES = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const count = await dbAny.appUser.count();
      return NextResponse.json({ required: count === 0 });
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  console.error("[setup] Database check failed after retries:", lastError);
  return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
}

// POST — create the first Super Admin (only works when no users exist)
export async function POST(request: NextRequest) {
  try {
    const count = await dbAny.appUser.count();
    if (count > 0) {
      return NextResponse.json({ error: "Setup already complete" }, { status: 403 });
    }

    const body = await request.json();
    const data = setupSchema.parse(body);

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await dbAny.$transaction(async (tx: any) => {
      const bootstrapOrganization = await tx.organization.findUnique({
        where: { id: BOOTSTRAP_ORG_ID },
      });
      const organization = bootstrapOrganization
        ? await tx.organization.update({
            where: { id: BOOTSTRAP_ORG_ID },
            data: {
              name: data.organizationName,
              contactEmail: data.email,
            },
          })
        : await tx.organization.create({
            data: {
              name: data.organizationName,
              contactEmail: data.email,
            },
          });

      const createdUser = await tx.appUser.create({
        data: {
          name: data.name,
          email: data.email,
          role: "SUPER_ADMIN",
          passwordHash,
          organizationId: organization.id,
        },
        include: {
          organization: { select: { id: true, name: true } },
        },
      });

      await tx.settings.upsert({
        where: { organizationId: organization.id },
        update: {},
        create: {
          organizationId: organization.id,
        },
      });

      return createdUser;
    });

    return NextResponse.json(
      {
        ok: true,
        organizationId: user.organization.id,
        organizationName: user.organization.name,
        requiresLogin: true,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid setup data" }, { status: 400 });
    }
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }
    console.error("Setup error:", err);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}
