/**
 * @jest-environment node
 */

jest.mock("@/lib/db", () => ({
  prisma: {},
}));

jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 }),
}));

jest.mock("@/lib/server-email", () => ({
  isPasswordRecoveryEmailConfigured: jest.fn().mockReturnValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/password-reset", () => ({
  createPasswordResetTokenPair: jest.fn().mockReturnValue({ token: "plain-reset-token", tokenHash: "hashed-reset-token" }),
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
    const { isPasswordRecoveryEmailConfigured } = require("@/lib/server-email");
    (checkRateLimit as jest.Mock).mockReturnValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 });
    (isPasswordRecoveryEmailConfigured as jest.Mock).mockReturnValue(true);
  });

  it("returns 503 when password recovery email is not configured", async () => {
    const { isPasswordRecoveryEmailConfigured } = require("@/lib/server-email");
    (isPasswordRecoveryEmailConfigured as jest.Mock).mockReturnValue(false);

    const response = await POST(makeRequest({ email: "user@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toMatch(/not configured/i);
  });

  it("stores a hashed token and sends a reset link when the user exists", async () => {
    const { prisma } = await import("@/lib/db");
    const { sendPasswordResetEmail } = require("@/lib/server-email");
    const update = jest.fn().mockResolvedValue({});

    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        organization: { name: "Test Org" },
      }),
      update,
    };

    const response = await POST(makeRequest({ email: "user@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        resetToken: "hashed-reset-token",
      }),
    });
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({
      to: "user@example.com",
      name: "Test User",
      organizationName: "Test Org",
      resetUrl: "https://app.example.com/reset-password?token=plain-reset-token",
    });
  });

  it("returns ok without sending email when the user does not exist", async () => {
    const { prisma } = await import("@/lib/db");
    const { sendPasswordResetEmail } = require("@/lib/server-email");

    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    };

    const response = await POST(makeRequest({ email: "missing@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("clears the token when sending email fails", async () => {
    const { prisma } = await import("@/lib/db");
    const { sendPasswordResetEmail } = require("@/lib/server-email");
    const update = jest.fn().mockResolvedValue({});
    (sendPasswordResetEmail as jest.Mock).mockRejectedValueOnce(new Error("SMTP down"));

    (prisma as any).appUser = {
      findUnique: jest.fn().mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        organization: { name: "Test Org" },
      }),
      update,
    };

    const response = await POST(makeRequest({ email: "user@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(update).toHaveBeenNthCalledWith(2, {
      where: { id: "user-1" },
      data: { resetToken: null, resetTokenExpiry: null },
    });
  });
});