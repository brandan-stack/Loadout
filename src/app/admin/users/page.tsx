"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { checkPasswordStrength } from "@/lib/validation";

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  OFFICE: "Office",
  TECH: "Technician",
};

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-900/60 text-purple-300",
  OFFICE: "bg-slate-700/60 text-slate-300",
  TECH: "bg-slate-700/60 text-slate-300",
};

export default function UsersPage() {
  const router = useRouter();
  const { user: me, loading: meLoading } = useCurrentUser();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "TECH", password: "", confirm: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  useEffect(() => {
    if (meLoading) return;
    if (me?.role !== "SUPER_ADMIN") { router.push("/"); return; }
    fetchUsers();
  }, [me, meLoading, router]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setFormError("Valid email is required"); return; }
    const pwCheck = checkPasswordStrength(form.password);
    if (!pwCheck.valid) { setFormError(pwCheck.message!); return; }
    if (form.password !== form.confirm) { setFormError("Passwords do not match"); return; }
    setSaving(true); setFormError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email.trim().toLowerCase(), role: form.role, password: form.password }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: "", email: "", role: "TECH", password: "", confirm: "" });
        fetchUsers();
      } else {
        const d = await res.json();
        setFormError(d.error || "Failed to create user");
      }
    } catch { setFormError("Failed to create user"); }
    setSaving(false);
  }

  async function handleRoleChange(id: string, newRole: string) {
    setChangingRoleId(id);
    try {
      await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
    } catch { /* ignore */ }
    setChangingRoleId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/users/${id}`, { method: "DELETE" });
      fetchUsers();
    } catch { /* ignore */ }
    setDeletingId(null);
  }

  if (meLoading || loading) {
    return <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen"><p className="text-slate-400 animate-pulse">Loading…</p></main>;
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-slate-500 text-sm mt-1">Manage team members and credentials</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl text-white px-4 py-2 text-sm font-semibold"
          style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
        >
          + Add User
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-6 space-y-4">
          <h2 className="font-bold text-slate-200">New User</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@example.com"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
              <select
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="TECH">Technician</option>
                <option value="OFFICE">Office</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                type="password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm Password</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                type="password"
                placeholder="Re-enter password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                autoComplete="new-password"
              />
            </div>
          </div>
          {formError && <p className="text-red-400 text-xs">{formError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="rounded-xl text-white px-5 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
            >
              {saving ? "Saving…" : "Create User"}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(""); }}
              className="rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-100 text-sm">{u.name}</p>
                <p className="text-xs text-slate-400">{u.email}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLOR[u.role] ?? "bg-slate-700 text-slate-300"}`}>
                  {ROLE_LABEL[u.role] ?? u.role}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                disabled={u.id === me?.userId || changingRoleId === u.id}
                className="rounded-lg bg-slate-800 border border-slate-600 text-slate-100 text-xs px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
              >
                <option value="TECH">Technician</option>
                <option value="OFFICE">Office</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
              {u.id !== me?.userId && (
                <button
                  onClick={() => handleDelete(u.id)}
                  disabled={deletingId === u.id}
                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  {deletingId === u.id ? "Removing…" : "Remove"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
