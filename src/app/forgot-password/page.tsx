"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
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
      if (res.ok && d.token) {
        // Redirect directly to reset page with token
        router.push(`/reset-password?token=${encodeURIComponent(d.token)}`);
      } else if (res.ok) {
        // Email not found — show a generic message to avoid leaking info
        router.push("/reset-password");
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-indigo-300 text-xs font-bold tracking-widest uppercase">Loadout</span>
          <h1 className="text-3xl font-bold text-slate-50 mt-2">Forgot Password</h1>
          <p className="text-slate-400 text-sm mt-1">Enter your email to reset your password</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
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
            {submitting ? "Checking…" : "Continue"}
          </button>
          <p className="text-center text-xs text-slate-500">
            Remember your password?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
