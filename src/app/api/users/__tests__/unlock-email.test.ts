/**
 * @jest-environment node
 */

jest.mock("@/lib/db", () => ({
  prisma: {},
}));

jest.mock("@/lib/permissions", () => ({
  requireUserAccess: jest.fn(),
}));

jest.mock("@/lib/supabase/admin", () => ({
  deleteSupabaseAuthUserByReference: jest.fn().mockResolvedValue({ deleted: true }),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/users/unlock-email/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/users/unlock-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/users/unlock-email", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { requireUserAccess } = require("@/lib/permissions");
    (requireUserAccess as jest.Mock).mockResolvedValue({
      ok: true,
      access: {
        userId: "admin-user",
        organizationId: "org-1",
        canManageUsers: true,
      },
    });
  });

  it("retires a local account and removes linked Supabase auth user", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findFirst: jest.fn().mockResolvedValue({
        id: "user-1",
        email: "person@example.com",
        supabaseAuthUserId: "supabase-user-1",
      }),
      update: jest.fn().mockResolvedValue({ id: "user-1" }),
    };

    const response = await POST(makeRequest({ email: "person@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);

    const { deleteSupabaseAuthUserByReference } = require("@/lib/supabase/admin");
    expect(deleteSupabaseAuthUserByReference).toHaveBeenCalledWith({
      userId: "supabase-user-1",
      email: "person@example.com",
    });

    expect((prisma as any).appUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          supabaseAuthUserId: null,
          resetToken: null,
          resetTokenExpiry: null,
        }),
      })
    );
  });

  it("returns 404 when account email is not found in organization", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findFirst: jest.fn().mockResolvedValue(null),
    };

    const response = await POST(makeRequest({ email: "missing@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toMatch(/not found/i);
  });

  it("returns 400 when unlocking own account", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findFirst: jest.fn().mockResolvedValue({
        id: "admin-user",
        email: "admin@example.com",
        supabaseAuthUserId: "supabase-admin",
      }),
    };

    const response = await POST(makeRequest({ email: "admin@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/cannot unlock your own account/i);
  });
});
