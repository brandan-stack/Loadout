"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupError, setSetupError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => {
        if (!r.ok) {
          setDbError(true);
          setLoading(false);
          return;
        }
        return r.json().then((d) => {
          setSetupMode(d.required === true);
          setLoading(false);
        });
      })
      .catch(() => {
        setDbError(true);
        setLoading(false);
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const d = await res.json();
        setError(d.error || "Invalid email or password");
        setSubmitting(false);
      }
    } catch {
      setError("Login failed. Please try again.");
      setSubmitting(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupName.trim()) { setSetupError("Name is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setupEmail.trim())) { setSetupError("Valid email is required"); return; }
    if (setupPassword.length < 8) { setSetupError("Password must be at least 8 characters"); return; }
    if (setupPassword !== setupConfirm) { setSetupError("Passwords do not match"); return; }
    setSubmitting(true);
    setSetupError("");
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: setupName.trim(), email: setupEmail.trim().toLowerCase(), password: setupPassword }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const d = await res.json();
        setSetupError(d.error || "Setup failed");
        setSubmitting(false);
      }
    } catch {
      setSetupError("Setup failed. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-400 animate-pulse">Loading…</div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4">
        <div className="w-full max-w-sm text-center">
          <span className="text-indigo-300 text-xs font-bold tracking-widest uppercase">Loadout</span>
          <h1 className="text-2xl font-bold text-slate-50 mt-2">Unable to Connect</h1>
          <p className="text-slate-400 text-sm mt-2">The database is unavailable. Please check your connection and try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl text-white font-semibold px-6 py-3 text-sm transition-colors"
            style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (setupMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-indigo-300 text-xs font-bold tracking-widest uppercase">Loadout</span>
            <h1 className="text-3xl font-bold text-slate-50 mt-2">First-Time Setup</h1>
            <p className="text-slate-400 text-sm mt-1">Create the Super Admin account</p>
          </div>
          <form onSubmit={handleSetup} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="e.g. John Smith"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                type="email"
                placeholder="admin@example.com"
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                type="password"
                placeholder="Min. 8 characters"
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm Password</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                type="password"
                placeholder="Re-enter password"
                value={setupConfirm}
                onChange={(e) => setSetupConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {setupError && <p className="text-red-400 text-xs">{setupError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl text-white font-semibold py-3 text-sm transition-colors disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
            >
              {submitting ? "Creating…" : "Create Account & Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-indigo-300 text-xs font-bold tracking-widest uppercase">Loadout</span>
          <h1 className="text-3xl font-bold text-slate-50 mt-2">Sign In</h1>
          <p className="text-slate-400 text-sm mt-1">Enter your email and password to continue</p>
        </div>
        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
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
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
            <input
              className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={!email.trim() || !password || submitting}
            className="w-full rounded-xl text-white font-semibold py-3 text-sm transition-colors disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
