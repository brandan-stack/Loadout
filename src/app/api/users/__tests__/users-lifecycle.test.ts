/**
 * @jest-environment node
 */

jest.mock("@/lib/db", () => ({
  prisma: {},
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

jest.mock("@/lib/permissions", () => ({
  buildPermissionSnapshot: jest.fn().mockReturnValue({
    rolePreset: "STANDARD",
    financialVisibilityMode: "total_only",
    canViewBasePrice: false,
    canViewMarginPrice: false,
    canViewTotalPrice: true,
  }),
  FINANCIAL_VISIBILITY_VALUES: ["full", "total_only", "none"],
  getDefaultRolePreset: jest.fn().mockReturnValue("STANDARD"),
  PERMISSION_KEYS: [],
  PRICE_VISIBILITY_KEYS: [],
  ROLE_PRESET_VALUES: ["ADMIN", "STANDARD"],
  requireUserAccess: jest.fn(),
  USER_ACCESS_SELECT: { id: true, name: true, email: true, role: true },
}));

jest.mock("@/lib/supabase/admin", () => ({
  ensureSupabaseAuthUser: jest.fn().mockResolvedValue({ userId: "supabase-user-1", created: true }),
  deleteSupabaseAuthUserByReference: jest.fn().mockResolvedValue({ deleted: true }),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/users/route";
import { DELETE } from "@/app/api/users/[id]/route";

function makeRequest(method: string, body?: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/users`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("user lifecycle sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { requireUserAccess } = require("@/lib/permissions");
    const { ensureSupabaseAuthUser, deleteSupabaseAuthUserByReference } = require("@/lib/supabase/admin");

    (requireUserAccess as jest.Mock).mockResolvedValue({
      ok: true,
      access: {
        canManageUsers: true,
        organizationId: "org-1",
        userId: "current-user",
      },
    });
    (ensureSupabaseAuthUser as jest.Mock).mockResolvedValue({ userId: "supabase-user-1", created: true });
    (deleteSupabaseAuthUserByReference as jest.Mock).mockResolvedValue({ deleted: true });
  });

  it("creates a Supabase auth user when an admin creates a local user", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      create: jest.fn().mockResolvedValue({
        id: "user-1",
        name: "New User",
        email: "new@example.com",
        role: "TECH",
        createdAt: new Date(),
      }),
    };

    const response = await POST(
      makeRequest("POST", {
        name: "New User",
        email: "new@example.com",
        role: "TECH",
        password: "TestPass1",
      })
    );

    expect(response.status).toBe(201);
    const { ensureSupabaseAuthUser } = require("@/lib/supabase/admin");
    expect(ensureSupabaseAuthUser).toHaveBeenCalledWith({
      email: "new@example.com",
      name: "New User",
      password: "TestPass1",
      organizationId: "org-1",
    });
    expect((prisma as any).appUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          supabaseAuthUserId: "supabase-user-1",
        }),
      })
    );
  });

  it("deletes the Supabase auth user when an admin deletes a local user", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findFirst: jest.fn().mockResolvedValue({
        id: "user-2",
        email: "remove@example.com",
        supabaseAuthUserId: "supabase-user-2",
      }),
      delete: jest.fn().mockResolvedValue({ id: "user-2" }),
    };

    const response = await DELETE(makeRequest("DELETE"), {
      params: Promise.resolve({ id: "user-2" }),
    });

    expect(response.status).toBe(200);
    const { deleteSupabaseAuthUserByReference } = require("@/lib/supabase/admin");
    expect(deleteSupabaseAuthUserByReference).toHaveBeenCalledWith({
      userId: "supabase-user-2",
      email: "remove@example.com",
    });
    expect((prisma as any).appUser.delete).toHaveBeenCalledWith({ where: { id: "user-2" } });
  });
});