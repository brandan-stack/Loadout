"use client";

import { useState } from "react";
import { PASSWORD_RULES_TEXT } from "@/lib/auth-credentials";
import { checkPasswordStrength } from "@/lib/validation";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserDraft {
  name: string;
  email: string;
  role: string;
  password: string;
  confirm: string;
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

interface UsersPageClientProps {
  currentUserId: string;
  organizationName: string;
  initialUsers: AppUser[];
}

export function UsersPageClient({ currentUserId, organizationName, initialUsers }: UsersPageClientProps) {
  const [users, setUsers] = useState<AppUser[]>(initialUsers);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>(
    Object.fromEntries(initialUsers.map((user) => [user.id, {
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
      confirm: "",
    }]))
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "TECH", password: "", confirm: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      const nextUsers = Array.isArray(data) ? data : [];
      setUsers(nextUsers);
      setDrafts(Object.fromEntries(nextUsers.map((user) => [user.id, {
        name: user.name,
        email: user.email ?? "",
        role: user.role,
        password: "",
        confirm: "",
      }])));
    } catch { /* ignore */ }
  }

  function updateDraft(id: string, patch: Partial<UserDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  }

  async function handleCreate() {
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    if (!form.email.trim()) { setFormError("Email is required"); return; }
    if (!form.password) { setFormError("Password is required"); return; }
    const pwCheck = checkPasswordStrength(form.password);
    if (!pwCheck.valid) { setFormError(pwCheck.message ?? "Invalid password"); return; }
    if (form.password !== form.confirm) { setFormError("Passwords do not match"); return; }
    setSaving(true); setFormError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, role: form.role, password: form.password }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: "", email: "", role: "TECH", password: "", confirm: "" });
        await fetchUsers();
      } else {
        const d = await res.json();
        setFormError(d.error || "Failed to create user");
      }
    } catch { setFormError("Failed to create user"); }
    setSaving(false);
  }

  async function handleSave(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    if (!draft.name.trim()) {
      setRowErrors((current) => ({ ...current, [id]: "Name is required" }));
      return;
    }
    if (!draft.email.trim()) {
      setRowErrors((current) => ({ ...current, [id]: "Email is required" }));
      return;
    }
    if (draft.password) {
      const pwCheck = checkPasswordStrength(draft.password);
      if (!pwCheck.valid) {
        setRowErrors((current) => ({ ...current, [id]: pwCheck.message ?? "Invalid password" }));
        return;
      }
    }
    if (draft.password && draft.password !== draft.confirm) {
      setRowErrors((current) => ({ ...current, [id]: "Passwords do not match" }));
      return;
    }

    setSavingId(id);
    setRowErrors((current) => ({ ...current, [id]: "" }));

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          email: draft.email,
          role: draft.role,
          ...(draft.password ? { password: draft.password } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setRowErrors((current) => ({ ...current, [id]: data.error || "Failed to update user" }));
        setSavingId(null);
        return;
      }

      const updated = await res.json();
      setUsers((current) => current.map((user) => (user.id === id ? updated : user)));
      setDrafts((current) => ({
        ...current,
        [id]: {
          name: updated.name,
          email: updated.email ?? "",
          role: updated.role,
          password: "",
          confirm: "",
        },
      }));
    } catch {
      setRowErrors((current) => ({ ...current, [id]: "Failed to update user" }));
    }

    setSavingId(null);
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

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 form-screen">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-slate-500 text-sm mt-1">Manage team members, emails, passwords, and roles for {organizationName}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="self-start rounded-xl px-4 py-2 text-sm font-semibold text-white sm:self-auto"
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
              <label className="block text-xs font-semibold text-slate-400 mb-1">Name</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tech@company.com"
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
                placeholder="Create a password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <p className="text-[11px] text-slate-500 mt-1">{PASSWORD_RULES_TEXT}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm Password</label>
              <input
                className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                type="password"
                placeholder="Re-enter the password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
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
            className="bg-slate-900 border border-slate-700 rounded-2xl px-4 py-4 space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                    <span>{u.name}</span>
                    {u.id === currentUserId && (
                      <span className="text-[10px] uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5">
                        You
                      </span>
                    )}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLOR[u.role] ?? "bg-slate-700 text-slate-300"}`}>
                    {ROLE_LABEL[u.role] ?? u.role}
                  </span>
                </div>
              </div>
              {u.id !== currentUserId && (
                <button
                  onClick={() => handleDelete(u.id)}
                  disabled={deletingId === u.id}
                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  {deletingId === u.id ? "Removing…" : "Remove"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Name</label>
                <input
                  className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={drafts[u.id]?.name ?? ""}
                  onChange={(e) => updateDraft(u.id, { name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                <input
                  className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  type="email"
                  value={drafts[u.id]?.email ?? ""}
                  onChange={(e) => updateDraft(u.id, { email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
                <select
                  value={drafts[u.id]?.role ?? u.role}
                  onChange={(e) => updateDraft(u.id, { role: e.target.value })}
                  disabled={u.id === currentUserId}
                  className="w-full rounded-lg bg-slate-800 border border-slate-600 text-slate-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
                >
                  <option value="TECH">Technician</option>
                  <option value="OFFICE">Office</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">New Password</label>
                <input
                  className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={drafts[u.id]?.password ?? ""}
                  onChange={(e) => updateDraft(u.id, { password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm Password</label>
                <input
                  className="w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  type="password"
                  placeholder="Repeat new password"
                  value={drafts[u.id]?.confirm ?? ""}
                  onChange={(e) => updateDraft(u.id, { confirm: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-slate-500">{PASSWORD_RULES_TEXT}</p>
              <button
                onClick={() => handleSave(u.id)}
                disabled={savingId === u.id || deletingId === u.id}
                className="rounded-xl text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #5b5ef4 0%, #818cf8 100%)" }}
              >
                {savingId === u.id ? "Saving…" : "Save Changes"}
              </button>
            </div>

            {rowErrors[u.id] && (
              <p className="text-red-400 text-xs">{rowErrors[u.id]}</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

export default UsersPageClient;
