"use client";

import { useState } from "react";
import Link from "next/link";
import { isValidEmail, checkPasswordStrength } from "@/lib/validation";
import { PasswordRules } from "@/components/ui/PasswordRules";
import { AuthLogo } from "@/components/ui/AuthLogo";

export default function SignUpPage() {
  const [organizationName, setOrganizationName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName.trim()) { setError("Business name is required"); return; }
    if (!name.trim()) { setError("Name is required"); return; }
    if (!isValidEmail(email.trim().toLowerCase())) { setError("Valid email is required"); return; }

    const pwCheck = checkPasswordStrength(password);
    if (!pwCheck.valid) { setError(pwCheck.message!); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      if (res.ok) {
        if (typeof window !== "undefined") {
          localStorage.setItem("loadout_remembered_email", email.trim().toLowerCase());
        }
        window.location.replace("/login?created=1");
      } else {
        const d = await res.json();
        setError(d.error || "Registration failed");
        setSubmitting(false);
      }
    } catch {
      setError("Registration failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-950 px-4 py-6 sm:py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <AuthLogo />
          <h1 className="mt-2 text-2xl font-bold text-slate-50 sm:text-3xl">Create Account</h1>
          <p className="text-slate-400 text-sm mt-1">Create your business workspace and superadmin account. You will sign in separately after this step.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Business Name</label>
            <input
              className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="Your company or shop name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              autoComplete="organization"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
            <input
              className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
            <input
              className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
            <input
              className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <PasswordRules password={password} />
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
            disabled={submitting}
            className="w-full rounded-xl text-white font-semibold py-3 text-sm transition-colors disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
          >
            {submitting ? "Creating account…" : "Create Account"}
          </button>
          <p className="text-center text-xs text-slate-500">
            After account creation, return to the sign-in page to access your workspace.
          </p>
          <p className="text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
