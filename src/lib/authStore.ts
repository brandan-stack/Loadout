export type Role = "admin" | "stock" | "invoicing" | "viewer";

export type User = {
  id: string;
  name: string;
  role: Role;
  pin?: string; // 4–8 digits recommended
  isActive: boolean;
  canAddInventory: boolean;
};

type Session = {
  currentUserId: string;
  unlockedUntil: number; // ms timestamp; 0 = locked
};

export type SecuritySettings = {
  autoLockMinutes: number; // 0 = never
  requirePinForStock: boolean;
  requirePinForCosts: boolean;
};

const USERS_KEY = "inventory.users.v1";
const SESSION_KEY = "inventory.session.v1";
const SETTINGS_KEY = "inventory.securitySettings.v1";

function newId() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function rawLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function rawSave<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeRole(v: any): Role {
  if (v === "admin" || v === "stock" || v === "invoicing" || v === "viewer") return v;
  return "viewer";
}

function normalizeUser(u: any): User {
  const role = normalizeRole(u?.role);
  return {
    id: String(u?.id || newId()),
    name: String(u?.name || "User").trim() || "User",
    role,
    pin: typeof u?.pin === "string" ? u.pin : "",
    // KEY FIX: if old data has no isActive → treat as ACTIVE
    isActive: typeof u?.isActive === "boolean" ? u.isActive : true,
    canAddInventory:
      typeof u?.canAddInventory === "boolean"
        ? u.canAddInventory
        : role === "admin",
  };
}

function defaultUsers(): User[] {
  return [
    { id: newId(), name: "Admin", role: "admin", pin: "1234", isActive: true, canAddInventory: true },
    { id: newId(), name: "Stock", role: "stock", pin: "1111", isActive: true, canAddInventory: false },
    { id: newId(), name: "Invoicing", role: "invoicing", pin: "2222", isActive: true, canAddInventory: false },
    { id: newId(), name: "Viewer", role: "viewer", pin: "", isActive: true, canAddInventory: false },
  ];
}

/** Repairs/migrates saved users/session/settings. Safe: does NOT touch inventory. */
export function ensureDefaults() {
  // USERS
  const rawUsers = rawLoad<any[]>(USERS_KEY, []);
  let users: User[] = Array.isArray(rawUsers) ? rawUsers.filter(Boolean).map(normalizeUser) : [];

  if (users.length === 0) {
    users = defaultUsers();
    rawSave(USERS_KEY, users);
  } else {
    // Ensure at least one active admin
    const hasAdmin = users.some((u) => u.isActive && u.role === "admin");
    if (!hasAdmin) {
      users.unshift({ id: newId(), name: "Admin", role: "admin", pin: "1234", isActive: true, canAddInventory: true });
    }
    rawSave(USERS_KEY, users); // save repaired
  }

  // SESSION
  const s = rawLoad<Session>(SESSION_KEY, { currentUserId: "", unlockedUntil: 0 });
  const firstActive = users.find((u) => u.isActive) ?? users[0];

  if (!s.currentUserId) {
    rawSave(SESSION_KEY, { currentUserId: firstActive?.id || "", unlockedUntil: 0 });
  } else {
    const cur = users.find((u) => u.id === s.currentUserId);
    if (!cur || !cur.isActive) {
      rawSave(SESSION_KEY, { currentUserId: firstActive?.id || "", unlockedUntil: 0 });
    }
  }

  // SETTINGS
  const sec = rawLoad<SecuritySettings | null>(SETTINGS_KEY, null);
  if (!sec) {
    rawSave(SETTINGS_KEY, { autoLockMinutes: 60, requirePinForStock: true, requirePinForCosts: true });
  }
}

export function loadUsers(): User[] {
  ensureDefaults();
  return rawLoad<User[]>(USERS_KEY, []).filter(Boolean).map(normalizeUser);
}

export function saveUsers(users: User[]) {
  rawSave(USERS_KEY, users.map(normalizeUser));
}

export function loadSession(): Session {
  ensureDefaults();
  return rawLoad<Session>(SESSION_KEY, { currentUserId: "", unlockedUntil: 0 });
}

export function saveSession(s: Session) {
  rawSave(SESSION_KEY, s);
}

export function loadSecuritySettings(): SecuritySettings {
  ensureDefaults();
  return rawLoad<SecuritySettings>(SETTINGS_KEY, { autoLockMinutes: 60, requirePinForStock: true, requirePinForCosts: true });
}

export function saveSecuritySettings(patch: Partial<SecuritySettings>) {
  const cur = loadSecuritySettings();
  rawSave(SETTINGS_KEY, { ...cur, ...patch });
}

/** Safe reset: resets users/session only. Inventory is NOT touched. */
export function resetUsersToDefaults() {
  const users = defaultUsers();
  rawSave(USERS_KEY, users);
  rawSave(SESSION_KEY, { currentUserId: users[0].id, unlockedUntil: 0 });
}

export function setCurrentUser(userId: string) {
  const s = loadSession();
  saveSession({ ...s, currentUserId: userId, unlockedUntil: 0 }); // switching user locks
}

export function currentUser(): User | null {
  const users = loadUsers();
  const s = loadSession();
  return users.find((u) => u.id === s.currentUserId) ?? null;
}

export function isUnlocked(): boolean {
  const s = loadSession();
  return (s.unlockedUntil ?? 0) > Date.now();
}

export function lockNow() {
  const s = loadSession();
  saveSession({ ...s, unlockedUntil: 0 });
}

export function unlockWithPin(pin: string, minutesOverride?: number): boolean {
  const users = loadUsers();
  const s = loadSession();
  const u = users.find((x) => x.id === s.currentUserId);
  if (!u) return false;

  const settings = loadSecuritySettings();
  const minutes = minutesOverride ?? Math.max(1, Number(settings.autoLockMinutes) || 60);

  // require a real PIN for unlock
  if (!u.pin || !String(u.pin).trim()) {
    return false;
  }

  if (String(pin).trim() === String(u.pin).trim()) {
    saveSession({ ...s, unlockedUntil: Date.now() + minutes * 60_000 });
    return true;
  }
  return false;
}

/* Permissions */
export function canManageUsers(u: User | null) {
  return !!u && u.role === "admin";
}
export function canAdjustStock(u: User | null) {
  return !!u && (u.role === "admin" || u.role === "stock");
}
export function canSeeCosts(u: User | null) {
  return !!u && (u.role === "admin" || u.role === "invoicing");
}
export function canAddInventory(u: User | null) {
  return !!u && (u.role === "admin" || !!u.canAddInventory);
}

/* User ops (admin) */
export function addUser(input: { name: string; role: Role; pin?: string }) {
  const users = loadUsers();
  const u: User = {
    id: newId(),
    name: input.name.trim(),
    role: input.role,
    pin: (input.pin ?? "").trim(),
    isActive: true,
    canAddInventory: input.role === "admin",
  };
  users.unshift(u);
  saveUsers(users);
  return u;
}

export function updateUser(userId: string, patch: Partial<Omit<User, "id">>) {
  const users = loadUsers().map((u) => (u.id === userId ? { ...u, ...patch } : u));
  saveUsers(users);

  // If you disabled the currently selected user, move selection
  const s = loadSession();
  if (s.currentUserId === userId && patch.isActive === false) {
    const next = users.find((x) => x.isActive) ?? users[0];
    if (next) setCurrentUser(next.id);
  }
}

export function setUserPin(userId: string, pin: string) {
  updateUser(userId, { pin: pin.trim() });
}
export function disableUser(userId: string) {
  updateUser(userId, { isActive: false });
}
export function enableUser(userId: string) {
  updateUser(userId, { isActive: true });
}
export function setUserCanAddInventory(userId: string, allowed: boolean) {
  const users = loadUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return;
  if (target.role === "admin") {
    updateUser(userId, { canAddInventory: true });
    return;
  }
  updateUser(userId, { canAddInventory: !!allowed });
}