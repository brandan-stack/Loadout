import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Check header first (set by middleware)
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");
  const name = request.headers.get("x-user-name");
  const organizationId = request.headers.get("x-organization-id");
  const organizationName = request.headers.get("x-organization-name");

  if (userId && role && name && organizationId && organizationName) {
    return NextResponse.json({ userId, role, name, organizationId, organizationName });
  }

  // Fallback: parse cookie directly (e.g. first request before middleware header)
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({
    userId: session.userId,
    role: session.role,
    name: session.name,
    organizationId: session.organizationId,
    organizationName: session.organizationName,
  });
}
