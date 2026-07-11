/**
 * @jest-environment node
 */
// Tests for POST /api/auth/register

// Mock the db module before importing the route
jest.mock("@/lib/db", () => ({
  prisma: {},
}));

// Mock rate limiter — allow by default
jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 }),
}));

jest.mock("@/lib/supabase/admin", () => ({
  ensureSupabaseAuthUser: jest.fn().mockResolvedValue({ userId: "supabase-user-1", created: true }),
  deleteSupabaseAuthUser: jest.fn().mockResolvedValue(undefined),
  getSupabaseAuthUserByEmail: jest.fn().mockResolvedValue(null),
  getSupabaseAuthUserById: jest.fn().mockResolvedValue(null),
}));

import { POST } from "@/app/api/auth/register/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>, ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply default mock so each test starts with rate limit allowed
    const { checkRateLimit } = require("@/lib/rateLimit");
    const {
      ensureSupabaseAuthUser,
      deleteSupabaseAuthUser,
      getSupabaseAuthUserByEmail,
      getSupabaseAuthUserById,
    } = require("@/lib/supabase/admin");
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 });
    (ensureSupabaseAuthUser as jest.Mock).mockResolvedValue({ userId: "supabase-user-1", created: true });
    (deleteSupabaseAuthUser as jest.Mock).mockResolvedValue(undefined);
    (getSupabaseAuthUserByEmail as jest.Mock).mockResolvedValue(null);
    (getSupabaseAuthUserById as jest.Mock).mockResolvedValue(null);
  });

  async function mockSuccessfulTransaction(userCount = 1) {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue(null),
    };

    const tx = {
      appUser: {
        count: jest.fn().mockResolvedValue(userCount),
        create: jest.fn().mockResolvedValue({
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          role: "SUPER_ADMIN",
          organization: { id: "org-1", name: "Test Org" },
        }),
      },
      organization: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: "org-1", name: "Test Org", contactEmail: "test@example.com" }),
      },
      settings: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    (prisma as any).$transaction = jest.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx));

    return { prisma, tx };
  }

  it("returns 201 without signing in on successful registration", async () => {
    const { tx } = await mockSuccessfulTransaction();
    const { ensureSupabaseAuthUser } = require("@/lib/supabase/admin");

    const req = makeRequest({
      organizationName: "Test Org",
      name: "Test User",
      email: "test@example.com",
      password: "TestPass1",
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.ok).toBe(true);
    expect(data.role).toBe("SUPER_ADMIN");
    expect(data.name).toBe("Test User");
    expect(data.requiresLogin).toBe(true);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toBeNull();
    expect(tx.organization.create).toHaveBeenCalledWith({
      data: {
        name: "Test Org",
        contactEmail: "test@example.com",
      },
    });
    const createCall = tx.appUser.create.mock.calls[0][0];
    expect(createCall.data.supabaseAuthUserId).toBe("supabase-user-1");
    expect(ensureSupabaseAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com",
        password: "TestPass1",
      })
    );
  });

  it("returns 400 when name is missing", async () => {
    const req = makeRequest({ organizationName: "Test Org", name: "", email: "test@example.com", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Name is required");
  });

  it("returns 400 when business name is missing", async () => {
    const req = makeRequest({ organizationName: "", name: "Test User", email: "test@example.com", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Business name is required");
  });

  it("returns 400 when email is invalid", async () => {
    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "notanemail", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Valid email address is required");
  });

  it("returns 400 when password is too short", async () => {
    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "test@example.com", password: "Short1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/at least 8 characters/i);
  });

  it("returns 400 when password has no uppercase letter", async () => {
    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "test@example.com", password: "lowercase1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/uppercase/i);
  });

  it("returns 400 when password has no number", async () => {
    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "test@example.com", password: "NoNumberHere" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/number/i);
  });

  it("returns 409 when email already exists (findUnique check)", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue({ id: "existing-user", email: "existing@example.com", supabaseAuthUserId: "supabase-existing" }),
    };

    const { getSupabaseAuthUserById } = require("@/lib/supabase/admin");
    (getSupabaseAuthUserById as jest.Mock).mockResolvedValue({ id: "supabase-existing", email: "existing@example.com" });

    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "existing@example.com", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatch(/already exists/i);
  });

  it("removes a stale local user when its Supabase auth user no longer exists", async () => {
    const { prisma } = await import("@/lib/db");
    const deleteMock = jest.fn().mockResolvedValue({ id: "stale-user" });
    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue({
        id: "stale-user",
        email: "stale@example.com",
        supabaseAuthUserId: "supabase-stale",
      }),
      delete: deleteMock,
    };

    const tx = {
      appUser: {
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue({
          id: "user-1",
          name: "Test User",
          email: "stale@example.com",
          role: "SUPER_ADMIN",
          organization: { id: "org-1", name: "Test Org" },
        }),
      },
      organization: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: "org-1", name: "Test Org", contactEmail: "stale@example.com" }),
      },
      settings: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    (prisma as any).$transaction = jest.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx));

    const { getSupabaseAuthUserById } = require("@/lib/supabase/admin");
    (getSupabaseAuthUserById as jest.Mock).mockResolvedValue(null);

    const req = makeRequest({
      organizationName: "Test Org",
      name: "Test User",
      email: "stale@example.com",
      password: "TestPass1",
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.ok).toBe(true);
    expect(deleteMock).toHaveBeenCalledWith({ where: { email: "stale@example.com" } });
  });

  it("returns 409 when email constraint violation occurs (P2002 race condition)", async () => {
    const { prisma } = await import("@/lib/db");
    const p2002Error = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue(null),
    };
    (prisma as any).$transaction = jest.fn().mockRejectedValue(p2002Error);

    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "race@example.com", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    // Race condition: another registration completed between findUnique and create.
    // Must return 409 (not 500) so the client shows a meaningful error.
    expect(response.status).toBe(409);
    expect(data.error).toMatch(/already exists/i);
  });

  it("returns 500 when database create fails with a non-unique error", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue(null),
    };
    (prisma as any).$transaction = jest.fn().mockRejectedValue(new Error("Connection refused"));

    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "test@example.com", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Registration failed");
  });

  it("returns 500 when Supabase auth provisioning fails", async () => {
    const { ensureSupabaseAuthUser } = require("@/lib/supabase/admin");
    (ensureSupabaseAuthUser as jest.Mock).mockRejectedValue(new Error("Supabase admin unavailable"));

    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "test@example.com", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toMatch(/provisioning authentication account/i);
  });

  it("attempts Supabase auth rollback if local user transaction fails", async () => {
    const { prisma } = await import("@/lib/db");
    const { ensureSupabaseAuthUser, deleteSupabaseAuthUser } = require("@/lib/supabase/admin");
    (ensureSupabaseAuthUser as jest.Mock).mockResolvedValue({ userId: "supabase-user-rollback", created: true });
    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue(null),
    };
    (prisma as any).$transaction = jest.fn().mockRejectedValue(new Error("Connection refused"));

    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "test@example.com", password: "TestPass1" });
    const response = await POST(req);

    expect(response.status).toBe(500);
    expect(deleteSupabaseAuthUser).toHaveBeenCalledWith("supabase-user-rollback");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const { checkRateLimit } = require("@/lib/rateLimit");
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: false, remaining: 0, retryAfterSeconds: 3600 });

    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "test@example.com", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toMatch(/too many/i);
  });

  it("returns 500 when database is unavailable (findUnique throws)", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findUnique: jest.fn().mockRejectedValue(new Error("Database unavailable")),
    };

    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "test@example.com", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Registration failed");
  });

  it("does not store password hash on local app user records", async () => {
    const { tx } = await mockSuccessfulTransaction();

    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "test@example.com", password: "TestPass1" });
    await POST(req);

    const createCall = tx.appUser.create.mock.calls[0][0];
    expect(createCall.data.passwordHash).toBeUndefined();
    expect(createCall.data).not.toHaveProperty("password");
  });

  it("creates user with SUPER_ADMIN role by default", async () => {
    const { tx } = await mockSuccessfulTransaction();

    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "test@example.com", password: "TestPass1" });
    await POST(req);

    const createCall = tx.appUser.create.mock.calls[0][0];
    expect(createCall.data.role).toBe("SUPER_ADMIN");
  });

  it("creates super admins with admin access preset", async () => {
    const { tx } = await mockSuccessfulTransaction();

    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "test@example.com", password: "TestPass1" });
    await POST(req);

    const createCall = tx.appUser.create.mock.calls[0][0];
    expect(createCall.data.rolePreset).toBe("ADMIN");
    expect(createCall.data.financialVisibilityMode).toBe("full");
    expect(createCall.data.canViewBasePrice).toBe(true);
    expect(createCall.data.canViewMarginPrice).toBe(true);
    expect(createCall.data.canViewTotalPrice).toBe(true);
    expect(createCall.data.canViewDashboard).toBe(true);
    expect(createCall.data.canViewJobs).toBe(true);
    expect(createCall.data.canViewInventory).toBe(true);
    expect(createCall.data.canViewSettings).toBe(true);
  });

  it("normalises email to lowercase before saving", async () => {
    const { tx } = await mockSuccessfulTransaction();

    const req = makeRequest({ organizationName: "Test Org", name: "Test", email: "User@EXAMPLE.COM", password: "TestPass1" });
    await POST(req);

    const createCall = tx.appUser.create.mock.calls[0][0];
    expect(createCall.data.email).toBe("user@example.com");
  });
});
