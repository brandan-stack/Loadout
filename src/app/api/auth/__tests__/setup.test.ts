/**
 * @jest-environment node
 */
// Tests for GET /api/auth/setup error handling

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
  hash: jest.fn().mockResolvedValue("hashed-pin"),
  compare: jest.fn().mockResolvedValue(true),
}));

import { GET } from "@/app/api/auth/setup/route";

describe("GET /api/auth/setup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns { required: false } when users exist", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      count: jest
        .fn()
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0),
    };

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ required: false, legacyMigrationRequired: false });
  });

  it("returns { required: true } when no users exist", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = { count: jest.fn().mockResolvedValue(0) };

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ required: true, legacyMigrationRequired: false });
  });

  it("returns 503 (not required: true) when database throws an error", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      count: jest.fn().mockRejectedValue(new Error("Connection refused")),
    };

    const response = await GET();
    const data = await response.json();

    // Must NOT return { required: true } on DB error — that would show the setup form
    // instead of an error message, preventing admin sign-in on other devices
    expect(response.status).toBe(503);
    expect(data).not.toHaveProperty("required");
    expect(data).toHaveProperty("error");
  });
});
