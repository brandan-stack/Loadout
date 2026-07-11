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
import { ensureSupabaseAuthUser, deleteSupabaseAuthUserByReference } from "@/lib/supabase/admin";

const dbAny = prisma as any;

const permissionShape = Object.fromEntries(
  [...PERMISSION_KEYS, ...PRICE_VISIBILITY_KEYS].map((key) => [key, z.boolean().optional()])
) as Record<string, z.ZodBoolean | z.ZodOptional<z.ZodBoolean>>;

interface CreatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: emailSchema,
  role: z.enum(["SUPER_ADMIN", "OFFICE", "TECH"]),
  rolePreset: z.enum(ROLE_PRESET_VALUES).optional(),
  financialVisibilityMode: z.enum(FINANCIAL_VISIBILITY_VALUES).optional(),
  password: passwordSchema,
  ...permissionShape,
});

export async function GET(request: NextRequest) {
  const access = await requireUserAccess(request);
  if (!access.ok) {
    return access.response;
  }
  if (!access.access.canManageUsers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const users = await dbAny.appUser.findMany({
      where: { organizationId: access.access.organizationId },
      select: { ...USER_ACCESS_SELECT, createdAt: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (err) {
    console.error("Users GET error:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
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
    const data = createSchema.parse(body);
    const rolePreset = data.rolePreset ?? getDefaultRolePreset(data.role);
    const permissionSource = data as unknown as Record<string, boolean | undefined>;
    const permissionInput = Object.fromEntries(
      [...PERMISSION_KEYS, ...PRICE_VISIBILITY_KEYS].map((key) => [key, permissionSource[key]])
    ) as Partial<Record<(typeof PERMISSION_KEYS)[number] | (typeof PRICE_VISIBILITY_KEYS)[number], boolean | undefined>>;
    const permissions = buildPermissionSnapshot(permissionInput, rolePreset, data.financialVisibilityMode);
    let createdSupabaseAuthUser = false;
    let supabaseAuthUserId = "";

    try {
      const ensuredAuthUser = await ensureSupabaseAuthUser({
        email: data.email,
        name: data.name,
        password: data.password,
        organizationId: access.access.organizationId,
      });
      createdSupabaseAuthUser = ensuredAuthUser.created;
      supabaseAuthUserId = ensuredAuthUser.userId;
    } catch (authErr) {
      console.error("Users POST Supabase auth sync error:", authErr);
      return NextResponse.json(
        { error: "Failed to create authentication account" },
        { status: 500 }
      );
    }

    let user: CreatedUser;
    try {
      user = await dbAny.appUser.create({
        data: {
          name: data.name,
          email: data.email,
          supabaseAuthUserId,
          role: data.role,
          ...permissions,
          organizationId: access.access.organizationId,
        },
        select: { ...USER_ACCESS_SELECT, createdAt: true },
      });
    } catch (createErr: unknown) {
      const code = (createErr as { code?: string })?.code;
      if (code === "P2002") {
        if (createdSupabaseAuthUser && supabaseAuthUserId) {
          try {
            await deleteSupabaseAuthUserByReference({ userId: supabaseAuthUserId });
          } catch (rollbackErr) {
            console.error("Users POST rollback failed for Supabase auth user:", rollbackErr);
          }
        }
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }

      if (createdSupabaseAuthUser && supabaseAuthUserId) {
        try {
          await deleteSupabaseAuthUserByReference({ userId: supabaseAuthUserId });
        } catch (rollbackErr) {
          console.error("Users POST rollback failed for Supabase auth user:", rollbackErr);
        }
      }

      throw createErr;
    }
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid user data" }, { status: 400 });
    }
    console.error("Users POST error:", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
