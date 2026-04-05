"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLogo } from "@/components/ui/AuthLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required"); return; }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const d = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(d.error || "Failed to process request");
        setSubmitting(false);
      }
    } catch {
      setError("Failed to process request. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-950 px-4 py-6 sm:py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <AuthLogo />
          <h1 className="mt-2 text-2xl font-bold text-slate-50 sm:text-3xl">Forgot Password</h1>
          <p className="text-slate-400 text-sm mt-1">Enter your email and we&apos;ll send you a reset link</p>
        </div>
        {submitted ? (
          <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 text-center sm:p-6">
            <div className="rounded-xl bg-emerald-900/30 border border-emerald-700/50 px-4 py-3 text-emerald-300 text-sm">
              If an account exists for {email.trim().toLowerCase()}, a password reset link has been sent.
            </div>
            <p className="text-sm text-slate-400">
              Check your inbox and spam folder, then open the reset link to choose a new password.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setError("");
              }}
              className="w-full rounded-xl border border-slate-600 text-slate-200 font-semibold py-3 text-sm transition-colors hover:bg-slate-800"
            >
              Send Another Reset Email
            </button>
            <p className="text-center text-xs text-slate-500">
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Back to Sign In
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl text-white font-semibold py-3 text-sm transition-colors disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
            >
              {submitting ? "Sending…" : "Send Reset Link"}
            </button>
            <p className="text-center text-xs text-slate-500">
              Remember your password?{" "}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
