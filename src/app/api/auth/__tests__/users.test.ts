/**
 * @jest-environment node
 */
// Tests for GET /api/auth/users error handling

// Mock the db module before importing the route
jest.mock("@/lib/db", () => ({
  prisma: {},
}));

import { GET } from "@/app/api/auth/users/route";

describe("GET /api/auth/users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns users array when database is available", async () => {
    const mockUsers = [
      { id: "1", name: "Admin", email: "admin@example.com", role: "SUPER_ADMIN" },
      { id: "2", name: "Tech", email: "tech@example.com", role: "TECH" },
    ];
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findMany: jest.fn().mockResolvedValue(mockUsers),
    };

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockUsers);
  });

  it("returns 503 (not empty array) when database throws an error", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma as any).appUser = {
      findMany: jest.fn().mockRejectedValue(new Error("Connection refused")),
    };

    const response = await GET();
    const data = await response.json();

    // Must NOT return [] on DB error — that would show "No users found" instead
    // of an error message, preventing admin sign-in on other devices
    expect(response.status).toBe(503);
    expect(Array.isArray(data)).toBe(false);
    expect(data).toHaveProperty("error");
  });
});
