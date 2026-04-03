"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface AppUser {
  id: string;
  name: string;
  role: string;
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  OFFICE: "Office",
  TECH: "Technician",
};

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-900/60 text-purple-300",
  OFFICE: "bg-blue-900/60 text-blue-300",
  TECH: "bg-teal-900/60 text-teal-300",
};

export default function UsersPage() {
  const router = useRouter();
  const { user: me, loading: meLoading } = useCurrentUser();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", role: "TECH", pin: "", confirm: "" });
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
    if (form.pin.length !== 4) { setFormError("PIN must be 4 digits"); return; }
    if (form.pin !== form.confirm) { setFormError("PINs do not match"); return; }
    setSaving(true); setFormError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, role: form.role, pin: form.pin }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: "", role: "TECH", pin: "", confirm: "" });
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
    return <div className="flex justify-center items-center min-h-screen"><p className="text-slate-400 animate-pulse">Loading…</p></div>;
  }

  return (
    <main className="container mx-auto px-3 py-4 sm:p-4 max-w-2xl form-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-slate-500 text-sm mt-1">Manage team members and PINs</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-teal-700 hover:bg-teal-600 text-white px-4 py-2 text-sm font-semibold"
        >
          + Add User
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-6 space-y-4">
          <h2 className="font-bold text-slate-200">New User</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Name</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
              <select
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="TECH">Technician</option>
                <option value="OFFICE">Office</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">4-Digit PIN</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 tracking-widest"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm PIN</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 tracking-widest"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              />
            </div>
          </div>
          {formError && <p className="text-red-400 text-xs">{formError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-5 py-2 text-sm font-semibold disabled:opacity-50"
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
                className="rounded-lg bg-slate-800 border border-slate-600 text-slate-100 text-xs px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
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
