"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLogo } from "@/components/ui/AuthLogo";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirm) {
      setError("New password and confirm password must match.");
      return;
    }

    if (!token) {
      setError("Invalid or expired reset link. Please request a new password reset email.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: newPassword }),
      });

      const data = await response.json().catch(() => ({ error: "Failed to update password." }));

      if (!response.ok) {
        setError(data.error || "Failed to update password.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSubmitting(false);
      window.setTimeout(() => {
        router.replace("/login?reset=1");
      }, 1600);
    } catch {
      setError("Failed to update password. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-950 px-4 py-6 sm:py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <AuthLogo />
          <h1 className="mt-2 text-2xl font-bold text-slate-50 sm:text-3xl">Reset Password</h1>
          <p className="text-slate-400 text-sm mt-1">Enter and confirm your new password</p>
        </div>

        {success && (
          <div className="mb-4 rounded-xl bg-emerald-900/30 border border-emerald-700/50 px-4 py-3 text-emerald-300 text-xs text-center">
            Password updated successfully.
          </div>
        )}

        {!token && !success && (
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
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
            <p className="mt-2 text-xs text-slate-500">Minimum 8 characters.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm Password</label>
            <input
              className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              type="password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={!token || submitting || success}
            className="w-full rounded-xl text-white font-semibold py-3 text-sm transition-colors disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
          >
            {submitting ? "Updating..." : "Update password"}
          </button>
          <p className="text-center text-xs text-slate-500">
            <Link href="/forgot-password" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Request Another Reset Link
            </Link>
          </p>
          <p className="text-center text-xs text-slate-500">
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Back to Login
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
