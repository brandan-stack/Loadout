/**
 * @jest-environment node
 */
// Tests for POST /api/auth/register

// Mock the db module before importing the route
jest.mock("@/lib/db", () => ({
  prisma: {},
}));

// Mock the auth module
jest.mock("@/lib/auth", () => ({
  signToken: jest.fn().mockResolvedValue("mock-token"),
  COOKIE_NAME: "loadout_session",
  MAX_AGE: 604800,
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

  it("returns 200 and sets cookie on successful registration", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "user-1", name: "Test User", email: "test@example.com", role: "TECH" }),
    };

    const req = makeRequest({ name: "Test User", email: "test@example.com", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.role).toBe("TECH");
    expect(data.name).toBe("Test User");
    // Verify the session cookie is set
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("loadout_session=mock-token");
  });

  it("returns 400 when name is missing", async () => {
    const req = makeRequest({ name: "", email: "test@example.com", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Name is required");
  });

  it("returns 400 when email is invalid", async () => {
    const req = makeRequest({ name: "Test User", email: "notanemail", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Valid email address is required");
  });

  it("returns 400 when password is too short", async () => {
    const req = makeRequest({ name: "Test User", email: "test@example.com", password: "Short1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/at least 8 characters/i);
  });

  it("returns 400 when password has no uppercase letter", async () => {
    const req = makeRequest({ name: "Test User", email: "test@example.com", password: "lowercase1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/uppercase/i);
  });

  it("returns 400 when password has no number", async () => {
    const req = makeRequest({ name: "Test User", email: "test@example.com", password: "NoNumberHere" });
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

    const req = makeRequest({ name: "Test User", email: "existing@example.com", password: "TestPass1" });
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
      create: jest.fn().mockRejectedValue(p2002Error),
    };

    const req = makeRequest({ name: "Test User", email: "race@example.com", password: "TestPass1" });
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
      create: jest.fn().mockRejectedValue(new Error("Connection refused")),
    };

    const req = makeRequest({ name: "Test User", email: "test@example.com", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Registration failed");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const { checkRateLimit } = require("@/lib/rateLimit");
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: false, remaining: 0, retryAfterSeconds: 3600 });

    const req = makeRequest({ name: "Test User", email: "test@example.com", password: "TestPass1" });
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

    const req = makeRequest({ name: "Test User", email: "test@example.com", password: "TestPass1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Registration failed");
  });

  it("hashes the password before storing", async () => {
    const bcrypt = require("bcryptjs");
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "user-1", name: "Test User", email: "test@example.com", role: "TECH" }),
    };

    const req = makeRequest({ name: "Test User", email: "test@example.com", password: "TestPass1" });
    await POST(req);

    expect(bcrypt.hash).toHaveBeenCalledWith("TestPass1", 10);
    // Ensure the raw password is NOT passed to create
    const createCall = (prisma as any).appUser.create.mock.calls[0][0];
    expect(createCall.data.passwordHash).toBe("hashed-password");
    expect(createCall.data).not.toHaveProperty("password");
  });

  it("creates user with TECH role by default", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "user-1", name: "Test User", email: "test@example.com", role: "TECH" }),
    };

    const req = makeRequest({ name: "Test User", email: "test@example.com", password: "TestPass1" });
    await POST(req);

    const createCall = (prisma as any).appUser.create.mock.calls[0][0];
    expect(createCall.data.role).toBe("TECH");
  });

  it("normalises email to lowercase before saving", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "user-1", name: "Test", email: "user@example.com", role: "TECH" }),
    };

    const req = makeRequest({ name: "Test", email: "User@EXAMPLE.COM", password: "TestPass1" });
    await POST(req);

    const createCall = (prisma as any).appUser.create.mock.calls[0][0];
    expect(createCall.data.email).toBe("user@example.com");
  });
});
