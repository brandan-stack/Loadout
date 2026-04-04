import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/lib/auth";

export interface RequestContext {
  userId: string;
  name: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
}

export function getRequestContext(request: NextRequest): RequestContext | null {
  const userId = request.headers.get("x-user-id");
  const name = request.headers.get("x-user-name");
  const role = request.headers.get("x-user-role") as UserRole | null;
  const organizationId = request.headers.get("x-organization-id");
  const organizationName = request.headers.get("x-organization-name");

  if (!userId || !name || !role || !organizationId || !organizationName) {
    return null;
  }

  return {
    userId,
    name,
    role,
    organizationId,
    organizationName,
  };
}

export function requireRequestContext(request: NextRequest):
  | { ok: true; context: RequestContext }
  | { ok: false; response: NextResponse } {
  const context = getRequestContext(request);
  if (!context) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, context };
}