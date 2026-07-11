import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emailSchema } from "@/lib/auth-credentials";
import { requireUserAccess } from "@/lib/permissions";
import { deleteSupabaseAuthUserByReference } from "@/lib/supabase/admin";
import { z } from "zod";

const dbAny = prisma as any;

const unlockEmailSchema = z.object({
  email: emailSchema,
});

function buildRetiredEmail(email: string) {
  return `deleted.${Date.now()}.${email}`;
}

export async function POST(request: NextRequest) {
  const access = await requireUserAccess(request);
  if (!access.ok) {
    return access.response;
  }
  if (!access.access.canManageUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = unlockEmailSchema.parse(body);

    const existing = await dbAny.appUser.findFirst({
      where: {
        email: data.email,
        organizationId: access.access.organizationId,
      },
      select: {
        id: true,
        email: true,
        supabaseAuthUserId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Account not found in your organization" }, { status: 404 });
    }

    if (existing.id === access.access.userId) {
      return NextResponse.json({ error: "You cannot unlock your own account email" }, { status: 400 });
    }

    const authDeletion = await deleteSupabaseAuthUserByReference({
      userId: existing.supabaseAuthUserId,
      email: existing.email,
    });

    const retiredEmail = buildRetiredEmail(existing.email);
    await dbAny.appUser.update({
      where: { id: existing.id },
      data: {
        email: retiredEmail,
        supabaseAuthUserId: null,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      ok: true,
      emailUnlocked: data.email,
      retiredLocalAccount: true,
      deletedSupabaseAuthUser: authDeletion.deleted,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid email" }, { status: 400 });
    }
    console.error("Unlock email error:", err);
    return NextResponse.json({ error: "Failed to unlock account email" }, { status: 500 });
  }
}
