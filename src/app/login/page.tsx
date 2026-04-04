"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PASSWORD_RULES_TEXT } from "@/lib/auth-credentials";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [legacyMigrationRequired, setLegacyMigrationRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupError, setSetupError] = useState("");
  const [migrationName, setMigrationName] = useState("");
  const [migrationPin, setMigrationPin] = useState("");
  const [migrationEmail, setMigrationEmail] = useState("");
  const [migrationPassword, setMigrationPassword] = useState("");
  const [migrationConfirm, setMigrationConfirm] = useState("");
  const [migrationError, setMigrationError] = useState("");

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((response) => response.json())
      .then((data) => {
        setSetupMode(Boolean(data?.required));
        setLegacyMigrationRequired(Boolean(data?.legacyMigrationRequired));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (response.ok) {
        router.push("/");
        router.refresh();
        return;
      }

      const data = await response.json();
      setError(data.error || "Sign-in failed");
      setSubmitting(false);
    } catch {
      setError("Sign-in failed. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!setupName.trim()) {
      setSetupError("Name is required");
      return;
    }
    if (!setupEmail.trim()) {
      setSetupError("Email is required");
      return;
    }
    if (!setupPassword) {
      setSetupError("Password is required");
      return;
    }
    if (setupPassword !== setupConfirm) {
      setSetupError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setSetupError("");

    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: setupName.trim(),
          email: setupEmail.trim(),
          password: setupPassword,
        }),
      });

      if (response.ok) {
        router.push("/");
        router.refresh();
        return;
      }

      const data = await response.json();
      setSetupError(data.error || "Setup failed");
      setSubmitting(false);
    } catch {
      setSetupError("Setup failed. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleLegacyMigration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!migrationName.trim()) {
      setMigrationError("Current account name is required");
      return;
    }
    if (migrationPin.length !== 4) {
      setMigrationError("Current 4-digit PIN is required");
      return;
    }
    if (!migrationEmail.trim()) {
      setMigrationError("New email is required");
      return;
    }
    if (!migrationPassword) {
      setMigrationError("New password is required");
      return;
    }
    if (migrationPassword !== migrationConfirm) {
      setMigrationError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setMigrationError("");

    try {
      const response = await fetch("/api/auth/migrate-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: migrationName.trim(),
          pin: migrationPin,
          email: migrationEmail.trim(),
          password: migrationPassword,
        }),
      });

      if (response.ok) {
        router.push("/");
        router.refresh();
        return;
      }

      const data = await response.json();
      setMigrationError(data.error || "Legacy account upgrade failed");
      setSubmitting(false);
    } catch {
      setMigrationError("Legacy account upgrade failed. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-400 animate-pulse">Loading…</div>
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
            <p className="text-slate-400 text-sm mt-1">Create the Super Admin account with an email and password</p>
          </div>
          <form onSubmit={handleSetup} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Admin Name</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="e.g. John Smith"
                value={setupName}
                onChange={(event) => setSetupName(event.target.value)}
                autoComplete="name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                type="email"
                placeholder="you@company.com"
                value={setupEmail}
                onChange={(event) => setSetupEmail(event.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                type="password"
                placeholder="Create a strong password"
                value={setupPassword}
                onChange={(event) => setSetupPassword(event.target.value)}
                autoComplete="new-password"
              />
              <p className="text-[11px] text-slate-500 mt-1">{PASSWORD_RULES_TEXT}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm Password</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                type="password"
                placeholder="Re-enter your password"
                value={setupConfirm}
                onChange={(event) => setSetupConfirm(event.target.value)}
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
          <p className="text-slate-400 text-sm mt-1">Use your email and password to access Loadout</p>
        </div>

        {legacyMigrationRequired && (
          <form onSubmit={handleLegacyMigration} className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-amber-200">Upgrade Legacy Account</h2>
              <p className="text-xs text-slate-400 mt-1">Use your current account name and old 4-digit PIN once to move that account onto email and password. PIN sign-in will be removed after this upgrade.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Current Account Name</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                placeholder="e.g. Admin"
                value={migrationName}
                onChange={(event) => setMigrationName(event.target.value)}
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Current 4-Digit PIN</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={migrationPin}
                onChange={(event) => setMigrationPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">New Email</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                type="email"
                placeholder="you@company.com"
                value={migrationEmail}
                onChange={(event) => setMigrationEmail(event.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">New Password</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                type="password"
                placeholder="Create a strong password"
                value={migrationPassword}
                onChange={(event) => setMigrationPassword(event.target.value)}
                autoComplete="new-password"
              />
              <p className="text-[11px] text-slate-500 mt-1">{PASSWORD_RULES_TEXT}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm New Password</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                type="password"
                placeholder="Re-enter your new password"
                value={migrationConfirm}
                onChange={(event) => setMigrationConfirm(event.target.value)}
                autoComplete="new-password"
              />
            </div>

            {migrationError && <p className="text-red-400 text-xs">{migrationError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-semibold py-3 text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? "Upgrading…" : "Upgrade Legacy Account"}
            </button>
          </form>
        )}

        <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
            <input
              className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
            <input
              className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl text-white font-semibold py-3 text-sm transition-colors disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
