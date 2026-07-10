import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/db";
import { isValidEmail } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";
import { getAppBaseUrl } from "@/lib/password-reset";

const dbAny = prisma as any;

// Allow 5 requests per hour per IP
const FORGOT_RATE_LIMIT = { maxRequests: 5, windowMs: 60 * 60 * 1000 };

function getSupabasePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const rl = checkRateLimit(`forgot:${ip}`, FORGOT_RATE_LIMIT);
    if (!rl.allowed) {
      // Always return ok to avoid leaking rate-limit state (which would leak email existence)
      return NextResponse.json({ ok: true });
    }

    const body = await request.json();
    const trimmedEmail = String(body.email ?? "").toLowerCase().trim().slice(0, 320);

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const user = await dbAny.appUser.findUnique({ where: { email: trimmedEmail } });

    if (user) {
      const supabase = getSupabasePublicClient();
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
          redirectTo: `${getAppBaseUrl(request)}/reset-password`,
        });

        if (error) {
          console.error("Password reset email send failed:", error);
        }
      } catch (mailError) {
        console.error("Password reset email send failed:", mailError);
      }
    }

    return NextResponse.json({ ok: true, emailSent: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
