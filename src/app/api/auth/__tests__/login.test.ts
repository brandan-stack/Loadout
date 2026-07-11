/**
 * @jest-environment node
 */

jest.mock("@/lib/db", () => ({
  prisma: {},
}));

jest.mock("@/lib/auth", () => ({
  signToken: jest.fn().mockResolvedValue("signed-token"),
  COOKIE_NAME: "loadout_session",
  MAX_AGE: 604800,
}));

jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 9, retryAfterSeconds: 0 }),
}));

const signInWithPassword = jest.fn().mockResolvedValue({
  data: { user: { id: "supabase-user-1", email: "user@example.com" } },
  error: null,
});

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword,
    },
  })),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/login/route";

function makeRequest(body: Record<string, unknown>, ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { checkRateLimit } = require("@/lib/rateLimit");
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true, remaining: 9, retryAfterSeconds: 0 });
    signInWithPassword.mockResolvedValue({
      data: { user: { id: "supabase-user-1", email: "user@example.com" } },
      error: null,
    });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
  });

  it("authenticates with Supabase and issues app session cookie", async () => {
    const { prisma } = await import("@/lib/db");
    const update = jest.fn().mockResolvedValue({});
    (prisma as any).appUser = {
      findFirst: jest.fn().mockResolvedValue({
        id: "app-user-1",
        name: "App User",
        role: "SUPER_ADMIN",
        email: "user@example.com",
        supabaseAuthUserId: null,
        organization: { id: "org-1", name: "Org" },
      }),
      update,
    };

    const response = await POST(makeRequest({ email: "user@example.com", password: "TestPass1" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "TestPass1",
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "app-user-1" },
      data: { supabaseAuthUserId: "supabase-user-1" },
    });
  });

  it("returns 401 when Supabase rejects credentials", async () => {
    signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    const response = await POST(makeRequest({ email: "user@example.com", password: "wrong" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toMatch(/invalid email or password/i);
  });
});