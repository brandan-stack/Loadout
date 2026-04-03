"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PublicUser {
  id: string;
  name: string;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  OFFICE: "Office",
  TECH: "Technician",
};

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupPin, setSetupPin] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupError, setSetupError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((d) => {
        if (d.required) {
          setSetupMode(true);
          setLoading(false);
        } else {
          return fetch("/api/auth/users")
            .then((r) => r.json())
            .then((u) => {
              setUsers(u);
              setLoading(false);
            });
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const pressDigit = (d: string) => {
    if (pin.length < 4) setPin((p) => p + d);
  };
  const backspace = () => setPin((p) => p.slice(0, -1));

  const handleLogin = async () => {
    if (!selectedUser || pin.length !== 4 || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, pin }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const d = await res.json();
        setError(d.error || "Incorrect PIN");
        setPin("");
        setSubmitting(false);
      }
    } catch {
      setError("Login failed. Please try again.");
      setPin("");
      setSubmitting(false);
    }
  };

  const handleSetup = async () => {
    if (!setupName.trim()) { setSetupError("Name is required"); return; }
    if (setupPin.length !== 4) { setSetupError("PIN must be exactly 4 digits"); return; }
    if (setupPin !== setupConfirm) { setSetupError("PINs do not match"); return; }
    setSubmitting(true);
    setSetupError("");
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: setupName.trim(), pin: setupPin }),
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

  if (setupMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-teal-400 text-xs font-bold tracking-widest uppercase">Loadout</span>
            <h1 className="text-3xl font-bold text-slate-50 mt-2">First-Time Setup</h1>
            <p className="text-slate-400 text-sm mt-1">Create the Super Admin account</p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Admin Name</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. John Smith"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">4-Digit PIN</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 tracking-widest"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={setupPin}
                onChange={(e) => setSetupPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm PIN</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 tracking-widest"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={setupConfirm}
                onChange={(e) => setSetupConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            {setupError && <p className="text-red-400 text-xs">{setupError}</p>}
            <button
              onClick={handleSetup}
              disabled={submitting}
              className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create Account & Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-teal-400 text-xs font-bold tracking-widest uppercase">Loadout</span>
            <h1 className="text-3xl font-bold text-slate-50 mt-2">Sign In</h1>
            <p className="text-slate-400 text-sm mt-1">Select your name to continue</p>
          </div>
          <div className="space-y-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className="w-full flex items-center justify-between bg-slate-900 border border-slate-700 hover:border-teal-500 rounded-2xl px-4 py-4 transition-colors group"
              >
                <span className="font-semibold text-slate-100 group-hover:text-teal-300">{u.name}</span>
                <span className="text-xs text-slate-500 bg-slate-800 rounded-full px-2.5 py-1">
                  {ROLE_LABEL[u.role] ?? u.role}
                </span>
              </button>
            ))}
            {users.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">No users found.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // PIN pad
  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4">
      <div className="w-full max-w-xs">
        <button
          onClick={() => { setSelectedUser(null); setPin(""); setError(""); }}
          className="mb-6 text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
        >
          ← Back
        </button>
        <div className="text-center mb-6">
          <span className="text-teal-400 text-xs font-bold tracking-widest uppercase">Loadout</span>
          <h1 className="text-2xl font-bold text-slate-50 mt-1">{selectedUser.name}</h1>
          <p className="text-slate-400 text-sm">{ROLE_LABEL[selectedUser.role] ?? selectedUser.role}</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-6">
          {dots.map((filled, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${filled ? "bg-teal-400 border-teal-400" : "border-slate-600"}`}
            />
          ))}
        </div>

        {error && <p className="text-red-400 text-xs text-center mb-4">{error}</p>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {["1","2","3","4","5","6","7","8","9"].map((d) => (
            <button
              key={d}
              onClick={() => pressDigit(d)}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100 font-bold text-xl py-4 transition-colors"
            >
              {d}
            </button>
          ))}
          <div /> {/* empty cell */}
          <button
            onClick={() => pressDigit("0")}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100 font-bold text-xl py-4 transition-colors"
          >
            0
          </button>
          <button
            onClick={backspace}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-xl py-4 transition-colors"
          >
            ⌫
          </button>
        </div>

        <button
          onClick={handleLogin}
          disabled={pin.length !== 4 || submitting}
          className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3.5 text-sm transition-colors disabled:opacity-40"
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </div>
    </div>
  );
}
