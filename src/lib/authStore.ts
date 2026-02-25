export type Role = "admin" | "stock" | "invoicing" | "viewer";
export type AccessPreset = "blocked" | "permanent" | "1h" | "2h" | "4h" | "8h";

type AccessField = "add" | "edit" | "pricing";

export type User = {
  id: string;
  name: string;
  role: Role;
  pin?: string; // 4–8 digits recommended
  isActive: boolean;
  canReceiveLowStockAlerts: boolean;
  canAccessPartsUsed: boolean;
  canAccessToolSignout: boolean;
  canManageToolSignout: boolean;
  receivesJobNotifications: boolean;
  canViewPricingMargin: boolean;
  pricingAccessPreset: AccessPreset;
  pricingAccessUntil: number;
  canAddInventory: boolean;
  addAccessPreset: AccessPreset;
  addAccessUntil: number;
  editAccessPreset: AccessPreset;
  editAccessUntil: number;
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
const REMEMBER_DEVICE_KEY = "inventory.rememberDevice.v1";

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

function normalizeRole(v: unknown): Role {
  if (v === "admin" || v === "stock" || v === "invoicing" || v === "viewer") return v;
  return "viewer";
}

function normalizePreset(v: unknown, fallback: AccessPreset): AccessPreset {
  if (v === "blocked" || v === "permanent" || v === "1h" || v === "2h" || v === "4h" || v === "8h") return v;
  return fallback;
}

function toRecord(v: unknown): Record<string, unknown> {
  if (typeof v === "object" && v !== null) return v as Record<string, unknown>;
  return {};
}

function toMsFromPreset(preset: AccessPreset): number {
  if (preset === "1h") return 60 * 60 * 1000;
  if (preset === "2h") return 2 * 60 * 60 * 1000;
  if (preset === "4h") return 4 * 60 * 60 * 1000;
  if (preset === "8h") return 8 * 60 * 60 * 1000;
  return 0;
}

function defaultAddPresetForRole(role: Role, canAddInventory: boolean): AccessPreset {
  if (role === "admin") return "permanent";
  return canAddInventory ? "permanent" : "blocked";
}

function defaultEditPresetForRole(role: Role): AccessPreset {
  if (role === "admin" || role === "stock") return "permanent";
  return "blocked";
}

function defaultPartsUsedAccessForRole(role: Role): boolean {
  return role === "admin";
}

function defaultJobNotificationForRole(role: Role): boolean {
  return role === "admin" || role === "invoicing";
}

function defaultToolSignoutAccessForRole(role: Role): boolean {
  return role === "admin" || role === "stock";
}

function defaultToolSignoutManageForRole(role: Role): boolean {
  return role === "admin";
}

function defaultPricingAccessForRole(role: Role): boolean {
  return role === "admin" || role === "invoicing";
}

function defaultPricingPresetForRole(role: Role): AccessPreset {
  if (role === "admin" || role === "invoicing") return "permanent";
  return "blocked";
}

function defaultLowStockAlertForRole(role: Role): boolean {
  return role === "admin" || role === "stock";
}

function isAccessActive(preset: AccessPreset, until: number): boolean {
  if (preset === "permanent") return true;
  if (preset === "blocked") return false;
  return Number(until || 0) > Date.now();
}

function normalizeUser(u: unknown): User {
  const rec = toRecord(u);
  const role = normalizeRole(rec.role);
  const legacyCanAdd = typeof rec.canAddInventory === "boolean" ? rec.canAddInventory : role === "admin";
  const addFallback = defaultAddPresetForRole(role, legacyCanAdd);
  const editFallback = defaultEditPresetForRole(role);
  const pricingFallback = defaultPricingPresetForRole(role);
  const addAccessPreset = normalizePreset(rec.addAccessPreset, addFallback);
  const editAccessPreset = normalizePreset(rec.editAccessPreset, editFallback);
  const pricingAccessPreset = normalizePreset(rec.pricingAccessPreset, pricingFallback);
  const canAccessPartsUsed =
    typeof rec.canAccessPartsUsed === "boolean"
      ? rec.canAccessPartsUsed
      : defaultPartsUsedAccessForRole(role);
  const receivesJobNotifications =
    typeof rec.receivesJobNotifications === "boolean"
      ? rec.receivesJobNotifications
      : defaultJobNotificationForRole(role);
  const canAccessToolSignout =
    typeof rec.canAccessToolSignout === "boolean"
      ? rec.canAccessToolSignout
      : defaultToolSignoutAccessForRole(role);
  const canManageToolSignout =
    typeof rec.canManageToolSignout === "boolean"
      ? rec.canManageToolSignout
      : defaultToolSignoutManageForRole(role);
  const canViewPricingMargin =
    typeof rec.canViewPricingMargin === "boolean"
      ? rec.canViewPricingMargin
      : defaultPricingAccessForRole(role);
  const canReceiveLowStockAlerts =
    typeof rec.canReceiveLowStockAlerts === "boolean"
      ? rec.canReceiveLowStockAlerts
      : defaultLowStockAlertForRole(role);
  return {
    id: String(rec.id || newId()),
    name: String(rec.name || "User").trim() || "User",
    role,
    pin: typeof rec.pin === "string" ? rec.pin : "",
    // KEY FIX: if old data has no isActive → treat as ACTIVE
    isActive: typeof rec.isActive === "boolean" ? rec.isActive : true,
    canReceiveLowStockAlerts,
    canAccessPartsUsed,
    canAccessToolSignout,
    canManageToolSignout,
    receivesJobNotifications,
    canViewPricingMargin,
    pricingAccessPreset,
    pricingAccessUntil: Number(rec.pricingAccessUntil || 0),
    canAddInventory: legacyCanAdd,
    addAccessPreset,
    addAccessUntil: Number(rec.addAccessUntil || 0),
    editAccessPreset,
    editAccessUntil: Number(rec.editAccessUntil || 0),
  };
}

function defaultUsers(): User[] {
  return [
    {
      id: newId(),
      name: "Admin",
      role: "admin",
      pin: "1234",
      isActive: true,
      canReceiveLowStockAlerts: true,
      canAccessPartsUsed: true,
      canAccessToolSignout: true,
      canManageToolSignout: true,
      receivesJobNotifications: true,
      canViewPricingMargin: true,
      pricingAccessPreset: "permanent",
      pricingAccessUntil: 0,
      canAddInventory: true,
      addAccessPreset: "permanent",
      addAccessUntil: 0,
      editAccessPreset: "permanent",
      editAccessUntil: 0,
    },
    {
      id: newId(),
      name: "Stock",
      role: "stock",
      pin: "1111",
      isActive: true,
      canReceiveLowStockAlerts: true,
      canAccessPartsUsed: false,
      canAccessToolSignout: true,
      canManageToolSignout: false,
      receivesJobNotifications: false,
      canViewPricingMargin: false,
      pricingAccessPreset: "blocked",
      pricingAccessUntil: 0,
      canAddInventory: false,
      addAccessPreset: "blocked",
      addAccessUntil: 0,
      editAccessPreset: "permanent",
      editAccessUntil: 0,
    },
    {
      id: newId(),
      name: "Invoicing",
      role: "invoicing",
      pin: "2222",
      isActive: true,
      canReceiveLowStockAlerts: false,
      canAccessPartsUsed: false,
      canAccessToolSignout: false,
      canManageToolSignout: false,
      receivesJobNotifications: true,
      canViewPricingMargin: true,
      pricingAccessPreset: "permanent",
      pricingAccessUntil: 0,
      canAddInventory: false,
      addAccessPreset: "blocked",
      addAccessUntil: 0,
      editAccessPreset: "blocked",
      editAccessUntil: 0,
    },
    {
      id: newId(),
      name: "Viewer",
      role: "viewer",
      pin: "",
      isActive: true,
      canReceiveLowStockAlerts: false,
      canAccessPartsUsed: false,
      canAccessToolSignout: false,
      canManageToolSignout: false,
      receivesJobNotifications: false,
      canViewPricingMargin: false,
      pricingAccessPreset: "blocked",
      pricingAccessUntil: 0,
      canAddInventory: false,
      addAccessPreset: "blocked",
      addAccessUntil: 0,
      editAccessPreset: "blocked",
      editAccessUntil: 0,
    },
  ];
}

/** Repairs/migrates saved users/session/settings. Safe: does NOT touch inventory. */
export function ensureDefaults() {
  // USERS
  const rawUsers = rawLoad<unknown[]>(USERS_KEY, []);
  let users: User[] = Array.isArray(rawUsers) ? rawUsers.filter(Boolean).map(normalizeUser) : [];

  if (users.length === 0) {
    users = defaultUsers();
    rawSave(USERS_KEY, users);
  } else {
    // Ensure at least one active admin
    const hasAdmin = users.some((u) => u.isActive && u.role === "admin");
    if (!hasAdmin) {
      users.unshift({
        id: newId(),
        name: "Admin",
        role: "admin",
        pin: "1234",
        isActive: true,
        canReceiveLowStockAlerts: true,
        canAccessPartsUsed: true,
        canAccessToolSignout: true,
        canManageToolSignout: true,
        receivesJobNotifications: true,
        canViewPricingMargin: true,
        pricingAccessPreset: "permanent",
        pricingAccessUntil: 0,
        canAddInventory: true,
        addAccessPreset: "permanent",
        addAccessUntil: 0,
        editAccessPreset: "permanent",
        editAccessUntil: 0,
      });
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

export function loadRememberDevicePreference(): boolean {
  try {
    return localStorage.getItem(REMEMBER_DEVICE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveRememberDevicePreference(enabled: boolean) {
  try {
    localStorage.setItem(REMEMBER_DEVICE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

export function isDeviceRemembered(): boolean {
  return loadRememberDevicePreference();
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

export function unlockWithPin(pin: string, minutesOverride?: number, rememberDeviceOverride?: boolean): boolean {
  const users = loadUsers();
  const s = loadSession();
  const u = users.find((x) => x.id === s.currentUserId);
  if (!u) return false;

  const settings = loadSecuritySettings();
  const minutes = minutesOverride ?? Math.max(1, Number(settings.autoLockMinutes) || 60);
  const rememberDevice = rememberDeviceOverride ?? loadRememberDevicePreference();

  // require a real PIN for unlock
  if (!u.pin || !String(u.pin).trim()) {
    return false;
  }

  if (String(pin).trim() === String(u.pin).trim()) {
    saveRememberDevicePreference(rememberDevice);
    const unlockedUntil = rememberDevice ? Date.now() + 5 * 365 * 24 * 60 * 60_000 : Date.now() + minutes * 60_000;
    saveSession({ ...s, unlockedUntil });
    return true;
  }
  return false;
}

/* Permissions */
export function canManageUsers(u: User | null) {
  return !!u && u.role === "admin";
}
export function canAdjustStock(u: User | null) {
  return canEditInventory(u);
}
export function canSeeCosts(u: User | null) {
  return canViewPricingMargin(u);
}
export function canViewPricingMargin(u: User | null) {
  if (!u) return false;
  if (u.role === "admin") return true;
  if (isAccessActive(u.pricingAccessPreset, u.pricingAccessUntil)) return true;
  return !!u.canViewPricingMargin;
}
export function canReceiveLowStockAlerts(u: User | null) {
  if (!u) return false;
  if (u.role === "admin") return true;
  return !!u.canReceiveLowStockAlerts;
}
export function canAccessPartsUsed(u: User | null) {
  if (!u) return false;
  if (u.role === "admin") return true;
  return !!u.canAccessPartsUsed;
}
export function canAccessToolSignout(u: User | null) {
  if (!u) return false;
  if (u.role === "admin") return true;
  return !!u.canAccessToolSignout;
}
export function canManageToolSignout(u: User | null) {
  if (!u) return false;
  if (u.role === "admin") return true;
  return !!u.canManageToolSignout;
}
export function canAddInventory(u: User | null) {
  if (!u) return false;
  if (u.role === "admin") return true;
  if (isAccessActive(u.addAccessPreset, u.addAccessUntil)) return true;
  return !!u.canAddInventory;
}
export function canEditInventory(u: User | null) {
  if (!u) return false;
  if (u.role === "admin") return true;
  return isAccessActive(u.editAccessPreset, u.editAccessUntil);
}

/* User ops (admin) */
export function addUser(input: { name: string; role: Role; pin?: string }) {
  const users = loadUsers();
  const canAdd = input.role === "admin";
  const u: User = {
    id: newId(),
    name: input.name.trim(),
    role: input.role,
    pin: (input.pin ?? "").trim(),
    isActive: true,
    canReceiveLowStockAlerts: defaultLowStockAlertForRole(input.role),
    canAccessPartsUsed: defaultPartsUsedAccessForRole(input.role),
    canAccessToolSignout: defaultToolSignoutAccessForRole(input.role),
    canManageToolSignout: defaultToolSignoutManageForRole(input.role),
    receivesJobNotifications: defaultJobNotificationForRole(input.role),
    canViewPricingMargin: defaultPricingAccessForRole(input.role),
    pricingAccessPreset: defaultPricingPresetForRole(input.role),
    pricingAccessUntil: 0,
    canAddInventory: canAdd,
    addAccessPreset: defaultAddPresetForRole(input.role, canAdd),
    addAccessUntil: 0,
    editAccessPreset: defaultEditPresetForRole(input.role),
    editAccessUntil: 0,
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
export function renameUser(userId: string, name: string) {
  const next = name.trim();
  if (!next) return;
  updateUser(userId, { name: next });
}
export function disableUser(userId: string) {
  updateUser(userId, { isActive: false });
}
export function enableUser(userId: string) {
  updateUser(userId, { isActive: true });
}
export function setUserCanAccessPartsUsed(userId: string, allowed: boolean) {
  const users = loadUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return;
  if (target.role === "admin") {
    updateUser(userId, { canAccessPartsUsed: true });
    return;
  }
  updateUser(userId, { canAccessPartsUsed: !!allowed });
}

export function setUserCanAccessToolSignout(userId: string, allowed: boolean) {
  const users = loadUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return;
  if (target.role === "admin") {
    updateUser(userId, { canAccessToolSignout: true, canManageToolSignout: true });
    return;
  }
  updateUser(userId, { canAccessToolSignout: !!allowed });
}

export function setUserCanManageToolSignout(userId: string, allowed: boolean) {
  const users = loadUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return;
  if (target.role === "admin") {
    updateUser(userId, { canManageToolSignout: true, canAccessToolSignout: true });
    return;
  }
  updateUser(userId, {
    canManageToolSignout: !!allowed,
    canAccessToolSignout: !!allowed || !!target.canAccessToolSignout,
  });
}

export function setUserReceivesJobNotifications(userId: string, allowed: boolean) {
  const users = loadUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return;
  if (target.role === "admin") {
    updateUser(userId, { receivesJobNotifications: true });
    return;
  }
  updateUser(userId, { receivesJobNotifications: !!allowed });
}

export function setUserCanViewPricingMargin(userId: string, allowed: boolean) {
  const users = loadUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return;
  if (target.role === "admin") {
    updateUser(userId, { canViewPricingMargin: true, pricingAccessPreset: "permanent", pricingAccessUntil: 0 });
    return;
  }
  updateUser(userId, {
    canViewPricingMargin: !!allowed,
    pricingAccessPreset: allowed ? "permanent" : "blocked",
    pricingAccessUntil: 0,
  });
}

export function setUserCanReceiveLowStockAlerts(userId: string, allowed: boolean) {
  const users = loadUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return;
  if (target.role === "admin") {
    updateUser(userId, { canReceiveLowStockAlerts: true });
    return;
  }
  updateUser(userId, { canReceiveLowStockAlerts: !!allowed });
}
export function setUserCanAddInventory(userId: string, allowed: boolean) {
  const users = loadUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return;
  if (target.role === "admin") {
    updateUser(userId, { canAddInventory: true, addAccessPreset: "permanent", addAccessUntil: 0 });
    return;
  }
  updateUser(userId, {
    canAddInventory: !!allowed,
    addAccessPreset: allowed ? "permanent" : "blocked",
    addAccessUntil: 0,
  });
}

export function setUserAccessPreset(userId: string, field: AccessField, preset: AccessPreset) {
  const users = loadUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return;

  if (target.role === "admin") {
    updateUser(userId, {
      canAddInventory: true,
      addAccessPreset: "permanent",
      addAccessUntil: 0,
      canViewPricingMargin: true,
      pricingAccessPreset: "permanent",
      pricingAccessUntil: 0,
      editAccessPreset: "permanent",
      editAccessUntil: 0,
    });
    return;
  }

  const until = toMsFromPreset(preset) > 0 ? Date.now() + toMsFromPreset(preset) : 0;
  if (field === "add") {
    updateUser(userId, {
      canAddInventory: preset !== "blocked",
      addAccessPreset: preset,
      addAccessUntil: until,
    });
    return;
  }

  if (field === "pricing") {
    updateUser(userId, {
      canViewPricingMargin: preset !== "blocked",
      pricingAccessPreset: preset,
      pricingAccessUntil: until,
    });
    return;
  }

  updateUser(userId, {
    editAccessPreset: preset,
    editAccessUntil: until,
  });
}

export function getAccessSummary(user: User, field: AccessField) {
  const preset = field === "add" ? user.addAccessPreset : field === "edit" ? user.editAccessPreset : user.pricingAccessPreset;
  const until = field === "add" ? user.addAccessUntil : field === "edit" ? user.editAccessUntil : user.pricingAccessUntil;
  if (preset === "blocked") return "Blocked";
  if (preset === "permanent") return "Permanent";
  const ms = Number(until || 0) - Date.now();
  if (ms <= 0) return "Expired";
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `Temp (${mins}m left)`;
  const hrs = Math.ceil(mins / 60);
  return `Temp (${hrs}h left)`;
}