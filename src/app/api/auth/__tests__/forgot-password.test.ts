/**
 * @jest-environment node
 */

jest.mock("@/lib/db", () => ({
  prisma: {},
}));

jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 }),
}));

const resetPasswordForEmail = jest.fn().mockResolvedValue({ error: null });

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      resetPasswordForEmail,
    },
  })),
}));

jest.mock("@/lib/password-reset", () => ({
  getAppBaseUrl: jest.fn().mockReturnValue("https://app.example.com"),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/forgot-password/route";

function makeRequest(body: Record<string, unknown>, ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { checkRateLimit } = require("@/lib/rateLimit");
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  it("sends a Supabase reset email when the user exists", async () => {
    const { prisma } = await import("@/lib/db");

    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        organization: { name: "Test Org" },
      }),
    };

    const response = await POST(makeRequest({ email: "user@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "https://app.example.com/reset-password",
    });
  });

  it("returns ok without sending email when the user does not exist", async () => {
    const { prisma } = await import("@/lib/db");

    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue(null),
    };

    const response = await POST(makeRequest({ email: "missing@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("returns ok when Supabase reset email call returns an error", async () => {
    const { prisma } = await import("@/lib/db");
    resetPasswordForEmail.mockResolvedValueOnce({ error: { message: "Supabase down" } });

    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        organization: { name: "Test Org" },
      }),
    };

    const response = await POST(makeRequest({ email: "user@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "https://app.example.com/reset-password",
    });
  });
});