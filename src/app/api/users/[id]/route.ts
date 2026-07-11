import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emailSchema, passwordSchema } from "@/lib/auth-credentials";
import {
  buildPermissionSnapshot,
  FINANCIAL_VISIBILITY_VALUES,
  getDefaultRolePreset,
  PERMISSION_KEYS,
  PRICE_VISIBILITY_KEYS,
  ROLE_PRESET_VALUES,
  requireUserAccess,
  USER_ACCESS_SELECT,
} from "@/lib/permissions";
import { z } from "zod";
import {
  deleteSupabaseAuthUserByReference,
  ensureSupabaseAuthUser,
  updateSupabaseAuthUserEmail,
} from "@/lib/supabase/admin";

const dbAny = prisma as any;

const permissionShape = Object.fromEntries(
  [...PERMISSION_KEYS, ...PRICE_VISIBILITY_KEYS].map((key) => [key, z.boolean().optional()])
) as Record<string, z.ZodBoolean | z.ZodOptional<z.ZodBoolean>>;

const updateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  email: emailSchema.optional(),
  role: z.enum(["SUPER_ADMIN", "OFFICE", "TECH"]).optional(),
  rolePreset: z.enum(ROLE_PRESET_VALUES).optional(),
  financialVisibilityMode: z.enum(FINANCIAL_VISIBILITY_VALUES).optional(),
  password: passwordSchema.optional(),
  ...permissionShape,
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireUserAccess(request);
  if (!access.ok) {
    return access.response;
  }
  if (!access.access.canManageUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const existing = await dbAny.appUser.findFirst({
      where: { id, organizationId: access.access.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        supabaseAuthUserId: true,
        role: true,
        rolePreset: true,
        financialVisibilityMode: true,
        ...USER_ACCESS_SELECT,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const body = await request.json();
    const data = updateSchema.parse(body);
    const update: Record<string, unknown> = {};
    if (data.name) update.name = data.name;
    if (data.email) {
      if (existing.supabaseAuthUserId) {
        await updateSupabaseAuthUserEmail(existing.supabaseAuthUserId, data.email);
      }
      update.email = data.email;
    }
    if (data.role) update.role = data.role;
    const rolePreset = data.rolePreset ?? existing.rolePreset ?? getDefaultRolePreset((data.role ?? existing.role) as "SUPER_ADMIN" | "OFFICE" | "TECH");
    const financialVisibilityMode = data.financialVisibilityMode ?? existing.financialVisibilityMode;
    const permissions = buildPermissionSnapshot({ ...existing, ...data }, rolePreset, financialVisibilityMode);
    update.rolePreset = permissions.rolePreset;
    update.financialVisibilityMode = permissions.financialVisibilityMode;
    Object.assign(update, permissions);
    if (data.password) {
      const ensuredAuthUser = await ensureSupabaseAuthUser({
        email: data.email ?? existing.email,
        name: data.name ?? existing.name,
        password: data.password,
        updatePasswordIfExists: true,
        appUserId: existing.id,
        organizationId: access.access.organizationId,
      });
      update.supabaseAuthUserId = ensuredAuthUser.userId;
    }

    if (!existing.supabaseAuthUserId && !update.supabaseAuthUserId) {
      const ensuredAuthUser = await ensureSupabaseAuthUser({
        email: data.email ?? existing.email,
        name: data.name ?? existing.name,
        appUserId: existing.id,
        organizationId: access.access.organizationId,
      });
      update.supabaseAuthUserId = ensuredAuthUser.userId;
    }

    const user = await dbAny.appUser.update({
      where: { id },
      data: update,
      select: USER_ACCESS_SELECT,
    });
    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid user data" }, { status: 400 });
    }
    if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }
    console.error("User PATCH error:", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireUserAccess(request);
  if (!access.ok) {
    return access.response;
  }
  const selfId = access.access.userId;
  if (!access.access.canManageUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { id } = await params;
    if (id === selfId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }
    const existing = await dbAny.appUser.findFirst({
      where: { id, organizationId: access.access.organizationId },
      select: { id: true, email: true, supabaseAuthUserId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await deleteSupabaseAuthUserByReference({
      userId: existing.supabaseAuthUserId,
      email: existing.email,
    });

    await dbAny.appUser.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("User DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
