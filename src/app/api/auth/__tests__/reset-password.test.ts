/**
 * @jest-environment node
 */

jest.mock("@/lib/db", () => ({
  prisma: {},
}));

jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 }),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

jest.mock("@/lib/password-reset", () => ({
  hashPasswordResetToken: jest.fn().mockImplementation((value: string) => `hashed:${value}`),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/reset-password/route";

function makeRequest(body: Record<string, unknown>, ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { checkRateLimit } = require("@/lib/rateLimit");
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 });
  });

  it("returns 400 when the reset token is missing", async () => {
    const response = await POST(makeRequest({ password: "TestPass1" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/invalid or expired/i);
  });

  it("returns 400 when the reset token is unknown", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findFirst: jest.fn().mockResolvedValue(null),
    };

    const response = await POST(makeRequest({ token: "plain-token", password: "TestPass1" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/invalid or expired/i);
    expect((prisma as any).appUser.findFirst).toHaveBeenCalledWith({
      where: { resetToken: "hashed:plain-token" },
    });
  });

  it("returns 400 when the reset token has expired", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findFirst: jest.fn().mockResolvedValue({
        id: "user-1",
        resetTokenExpiry: new Date(Date.now() - 60_000),
      }),
    };

    const response = await POST(makeRequest({ token: "plain-token", password: "TestPass1" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/expired/i);
  });

  it("updates the password and clears the reset token", async () => {
    const bcrypt = require("bcryptjs");
    const { prisma } = await import("@/lib/db");
    const update = jest.fn().mockResolvedValue({});
    (prisma as any).appUser = {
      findFirst: jest.fn().mockResolvedValue({
        id: "user-1",
        resetTokenExpiry: new Date(Date.now() + 60_000),
      }),
      update,
    };

    const response = await POST(makeRequest({ token: "plain-token", password: "TestPass1" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(bcrypt.hash).toHaveBeenCalledWith("TestPass1", 10);
    expect(update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: "hashed-password",
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  });
});