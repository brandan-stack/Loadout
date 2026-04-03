import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Check header first (set by middleware)
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");
  const name = request.headers.get("x-user-name");

  if (userId && role && name) {
    return NextResponse.json({ userId, role, name });
  }

  // Fallback: parse cookie directly (e.g. first request before middleware header)
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ userId: session.userId, role: session.role, name: session.name });
}
