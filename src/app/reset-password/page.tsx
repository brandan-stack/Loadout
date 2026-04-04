"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The reset token is read server-side from the httpOnly cookie set by
        // /api/auth/forgot-password — it is never exposed in the URL or body.
        body: JSON.stringify({ password }),
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-indigo-300 text-xs font-bold tracking-widest uppercase">Loadout</span>
          <h1 className="text-3xl font-bold text-slate-50 mt-2">Set New Password</h1>
          <p className="text-slate-400 text-sm mt-1">Enter and confirm your new password</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">New Password</label>
            <input
              className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
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
            disabled={submitting}
            className="w-full rounded-xl text-white font-semibold py-3 text-sm transition-colors disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
          >
            {submitting ? "Saving…" : "Set New Password"}
          </button>
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
