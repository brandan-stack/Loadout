/**
 * @jest-environment node
 */
// Tests for POST /api/auth/register

// Mock the db module before importing the route
jest.mock("@/lib/db", () => ({
  prisma: {},
}));

// Mock bcryptjs
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock rate limiter — allow by default
jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 }),
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
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 });
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
      findUnique: jest.fn().mockResolvedValue({ id: "existing-user" }),
    };

    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "existing@example.com", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatch(/already exists/i);
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

  it("hashes the password before storing", async () => {
    const bcrypt = require("bcryptjs");
    const { tx } = await mockSuccessfulTransaction();

    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "test@example.com", password: "TestPass1" });
    await POST(req);

    expect(bcrypt.hash).toHaveBeenCalledWith("TestPass1", 10);
    // Ensure the raw password is NOT passed to create
    const createCall = tx.appUser.create.mock.calls[0][0];
    expect(createCall.data.passwordHash).toBe("hashed-password");
    expect(createCall.data).not.toHaveProperty("password");
  });

  it("creates user with SUPER_ADMIN role by default", async () => {
    const { tx } = await mockSuccessfulTransaction();

    const req = makeRequest({ organizationName: "Test Org", name: "Test User", email: "test@example.com", password: "TestPass1" });
    await POST(req);

    const createCall = tx.appUser.create.mock.calls[0][0];
    expect(createCall.data.role).toBe("SUPER_ADMIN");
  });

  it("normalises email to lowercase before saving", async () => {
    const { tx } = await mockSuccessfulTransaction();

    const req = makeRequest({ organizationName: "Test Org", name: "Test", email: "User@EXAMPLE.COM", password: "TestPass1" });
    await POST(req);

    const createCall = tx.appUser.create.mock.calls[0][0];
    expect(createCall.data.email).toBe("user@example.com");
  });
});
