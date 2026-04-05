"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { checkPasswordStrength } from "@/lib/validation";
import { PasswordRules } from "@/components/ui/PasswordRules";
import { AuthLogo } from "@/components/ui/AuthLogo";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const token = searchParams.get("token")?.trim() ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setError("Invalid or expired reset link"); return; }
    const pwCheck = checkPasswordStrength(password);
    if (!pwCheck.valid) { setError(pwCheck.message!); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json();
      if (res.ok) {
        router.push("/login?reset=1");
      } else {
        setError(d.error || "Failed to reset password");
        setSubmitting(false);
      }
    } catch {
      setError("Failed to reset password. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-950 px-4 py-6 sm:py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <AuthLogo />
          <h1 className="mt-2 text-2xl font-bold text-slate-50 sm:text-3xl">Set New Password</h1>
          <p className="text-slate-400 text-sm mt-1">Open the link from your email, then enter and confirm your new password</p>
        </div>
        {!token && (
          <div className="mb-4 rounded-xl bg-amber-900/30 border border-amber-700/50 px-4 py-3 text-amber-300 text-xs text-center">
            This reset link is invalid or expired. Request a new password reset email.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">New Password</label>
            <input
              className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
            <PasswordRules password={password} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm New Password</label>
            <input
              className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              type="password"
              placeholder="Re-enter new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={!token || submitting}
            className="w-full rounded-xl text-white font-semibold py-3 text-sm transition-colors disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
          >
            {submitting ? "Saving…" : "Set New Password"}
          </button>
          <p className="text-center text-xs text-slate-500">
            <Link href="/forgot-password" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Request Another Reset Link
            </Link>
          </p>
          <p className="text-center text-xs text-slate-500">
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Back to Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 py-6 sm:py-8">
        <div className="text-slate-400 animate-pulse">Loading…</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
