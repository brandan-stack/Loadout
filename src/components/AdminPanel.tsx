import { useState } from "react";
import {
  loadUsers,
  addUser,
  disableUser,
  enableUser,
  setUserPin,
  renameUser,
  setUserCanAccessPartsUsed,
  setUserCanAccessToolSignout,
  setUserCanManageToolSignout,
  setUserCanReceiveLowStockAlerts,
  setUserReceivesJobNotifications,
  setUserAccessPreset,
  getAccessSummary,
  type AccessPreset,
  type Role,
} from "../lib/authStore";

function roleLabel(r: Role) {
  if (r === "admin") return "Admin";
  if (r === "stock") return "Stock";
  if (r === "invoicing") return "Invoicing";
  return "Viewer";
}

function isValidPin(pin: string) {
  const p = pin.trim();
  if (p.length < 4 || p.length > 8) return false;
  return /^[0-9]+$/.test(p);
}

export default function AdminPanel() {
  const [, setTick] = useState(0);
  const [adminFeedback, setAdminFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const users = loadUsers();

  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("viewer");
  const [newPin, setNewPin] = useState("");

  const [pinEdit, setPinEdit] = useState<Record<string, string>>({});
  const [nameEdit, setNameEdit] = useState<Record<string, string>>({});
  const [openAccessUserId, setOpenAccessUserId] = useState<string>("");

  const accessOptions: AccessPreset[] = ["blocked", "permanent", "1h", "2h", "4h", "8h"];

  function accessLabel(v: AccessPreset) {
    if (v === "blocked") return "Blocked";
    if (v === "permanent") return "Permanent";
    return `Temporary ${v}`;
  }

  return (
    <div className="adminPanel">
      <div>
        <div className="adminTitle">Admin Tools</div>
        <div className="muted">Create users, disable users, and set PINs (4–8 digits).</div>
      </div>

      {/* Create user */}
      <div className="card-soft adminCard">
        <div className="label">Create user</div>

        <div className="adminCreateGrid">
          <input
            className="input"
            placeholder="Name (e.g., Brandan)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
            <option value="admin">Admin</option>
            <option value="stock">Stock</option>
            <option value="invoicing">Invoicing</option>
            <option value="viewer">Viewer</option>
          </select>

          <input
            className="input"
            placeholder="PIN (optional)"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            inputMode="numeric"
          />

          <button
            className="btn"
            onClick={() => {
              const name = newName.trim();
              if (!name) {
                setAdminFeedback({ tone: "error", message: "Enter a name before creating a user." });
                return;
              }
              if (newPin.trim() && !isValidPin(newPin)) {
                setAdminFeedback({ tone: "error", message: "PIN must be 4–8 digits." });
                return;
              }
              addUser({ name, role: newRole, pin: newPin.trim() });
              setNewName("");
              setNewRole("viewer");
              setNewPin("");
              setAdminFeedback({ tone: "success", message: "User created." });
              setTick((x) => x + 1);
            }}
          >
            Create
          </button>
        </div>

        <div className="muted adminHint">
          Tip: Give Admin/Stock/Invoicing a PIN. Viewer can be blank.
        </div>

        {adminFeedback ? (
          <div className={`bannerFeedback bannerFeedback--${adminFeedback.tone}`} role="status" aria-live="polite">{adminFeedback.message}</div>
        ) : null}
      </div>

      {/* Manage users */}
      <div className="card-soft adminCard">
        <div className="label">Manage users</div>

        <div className="adminUsersList">
          {users.map((u) => {
            const currentPin = pinEdit[u.id] ?? "";
            return (
              <div key={u.id} className="adminUserRow">
                <div className="adminUserMain">
                  <div className="adminStrong">
                    {u.name}{" "}
                    {!u.isActive ? <span className="pill pill-warn">Disabled</span> : <span className="pill">{roleLabel(u.role)}</span>}
                  </div>
                  <div className="muted adminMeta">
                    Role: {roleLabel(u.role)}
                  </div>
                </div>

                <button
                  className="btn"
                  onClick={() => {
                    if (u.isActive) {
                      if (!confirm(`Disable ${u.name}?`)) return;
                      disableUser(u.id);
                    } else {
                      enableUser(u.id);
                    }
                    setTick((x) => x + 1);
                  }}
                >
                  {u.isActive ? "Disable" : "Enable"}
                </button>

                <button
                  className="btn"
                  onClick={() => {
                    setOpenAccessUserId((prev) => (prev === u.id ? "" : u.id));
                  }}
                  title="Open access controls"
                >
                  Access Controls
                </button>

                <input
                  className="input"
                  placeholder="Set PIN (4–8 digits) or blank to clear"
                  value={currentPin}
                  onChange={(e) => setPinEdit((s) => ({ ...s, [u.id]: e.target.value }))}
                  inputMode="numeric"
                />

                <button
                  className="btn"
                  onClick={() => {
                    const p = currentPin.trim();
                    if (p && !isValidPin(p)) {
                      setAdminFeedback({ tone: "error", message: "PIN must be 4–8 digits." });
                      return;
                    }
                    if (!confirm(`Set PIN for ${u.name}?`)) return;
                    setUserPin(u.id, p);
                    setPinEdit((s) => ({ ...s, [u.id]: "" }));
                    setAdminFeedback({ tone: "success", message: `PIN updated for ${u.name}.` });
                    setTick((x) => x + 1);
                  }}
                >
                  Save PIN
                </button>

                {openAccessUserId === u.id ? (
                  <div className="adminAccessPanel">
                    <div className="adminAccessTitle">Temporary Access (Admin only)</div>

                    <div className="adminAccessGrid">
                      <div className="adminAccessRow">
                        <div>
                          <div className="adminStrong">Display name</div>
                          <div className="muted adminMeta">Rename this user (e.g. Stock, Invoicing, Parts Used)</div>
                        </div>
                        <div className="adminInlineControls">
                          <input
                            className="input"
                            placeholder={u.name}
                            value={nameEdit[u.id] ?? ""}
                            onChange={(e) => setNameEdit((s) => ({ ...s, [u.id]: e.target.value }))}
                          />
                          <button
                            className="btn"
                            onClick={() => {
                              const next = (nameEdit[u.id] ?? "").trim();
                              if (!next) return;
                              renameUser(u.id, next);
                              setNameEdit((s) => ({ ...s, [u.id]: "" }));
                              setTick((x) => x + 1);
                            }}
                          >
                            Save Name
                          </button>
                        </div>
                      </div>

                      <div className="adminAccessRow">
                        <div>
                          <div className="adminStrong">Parts Used Tab</div>
                          <div className="muted adminMeta">Allow this user to view the Parts Used tab</div>
                        </div>
                        <button
                          className={"btn " + (u.canAccessPartsUsed || u.role === "admin" ? "primary" : "")}
                          disabled={u.role === "admin"}
                          onClick={() => {
                            setUserCanAccessPartsUsed(u.id, !u.canAccessPartsUsed);
                            setTick((x) => x + 1);
                          }}
                        >
                          {u.role === "admin"
                            ? "Always allowed"
                            : u.canAccessPartsUsed
                            ? "Allowed"
                            : "Blocked"}
                        </button>
                      </div>

                      <div className="adminAccessRow">
                        <div>
                          <div className="adminStrong">Tool Signout Tab</div>
                          <div className="muted adminMeta">Allow this user to request/signout tools</div>
                        </div>
                        <button
                          className={"btn " + (u.canAccessToolSignout || u.role === "admin" ? "primary" : "")}
                          disabled={u.role === "admin"}
                          onClick={() => {
                            setUserCanAccessToolSignout(u.id, !u.canAccessToolSignout);
                            setTick((x) => x + 1);
                          }}
                        >
                          {u.role === "admin"
                            ? "Always allowed"
                            : u.canAccessToolSignout
                            ? "Allowed"
                            : "Blocked"}
                        </button>
                      </div>

                      <div className="adminAccessRow">
                        <div>
                          <div className="adminStrong">Tool Dashboard / Approvals</div>
                          <div className="muted adminMeta">Allow this user to review and approve tool requests</div>
                        </div>
                        <button
                          className={"btn " + (u.canManageToolSignout || u.role === "admin" ? "primary" : "")}
                          disabled={u.role === "admin"}
                          onClick={() => {
                            setUserCanManageToolSignout(u.id, !u.canManageToolSignout);
                            setTick((x) => x + 1);
                          }}
                        >
                          {u.role === "admin"
                            ? "Always allowed"
                            : u.canManageToolSignout
                            ? "Allowed"
                            : "Blocked"}
                        </button>
                      </div>

                      <div className="adminAccessRow">
                        <div>
                          <div className="adminStrong">Low Stock Alerts</div>
                          <div className="muted adminMeta">Show dashboard low-stock alerts for this user</div>
                        </div>
                        <button
                          className={"btn " + (u.canReceiveLowStockAlerts || u.role === "admin" ? "primary" : "")}
                          disabled={u.role === "admin"}
                          onClick={() => {
                            setUserCanReceiveLowStockAlerts(u.id, !u.canReceiveLowStockAlerts);
                            setTick((x) => x + 1);
                          }}
                        >
                          {u.role === "admin"
                            ? "Always allowed"
                            : u.canReceiveLowStockAlerts
                            ? "Allowed"
                            : "Blocked"}
                        </button>
                      </div>

                      <div className="adminAccessRow">
                        <div>
                          <div className="adminStrong">Job Notifications</div>
                          <div className="muted adminMeta">Allow this user to receive Parts Used billing notifications</div>
                        </div>
                        <button
                          className={"btn " + (u.receivesJobNotifications || u.role === "admin" ? "primary" : "")}
                          disabled={u.role === "admin"}
                          onClick={() => {
                            setUserReceivesJobNotifications(u.id, !u.receivesJobNotifications);
                            setTick((x) => x + 1);
                          }}
                        >
                          {u.role === "admin"
                            ? "Always allowed"
                            : u.receivesJobNotifications
                            ? "Allowed"
                            : "Blocked"}
                        </button>
                      </div>

                      <div className="adminAccessRow">
                        <div>
                          <div className="adminStrong">Pricing & Margin View</div>
                          <div className="muted adminMeta">Current: {getAccessSummary(u, "pricing")}</div>
                        </div>
                        <select
                          value={u.pricingAccessPreset}
                          disabled={u.role === "admin"}
                          onChange={(e) => {
                            setUserAccessPreset(u.id, "pricing", e.target.value as AccessPreset);
                            setTick((x) => x + 1);
                          }}
                        >
                          {accessOptions.map((v) => (
                            <option key={`pricing-${v}`} value={v}>{accessLabel(v)}</option>
                          ))}
                        </select>
                      </div>

                      <div className="adminAccessRow">
                        <div>
                          <div className="adminStrong">Add inventory</div>
                          <div className="muted adminMeta">Current: {getAccessSummary(u, "add")}</div>
                        </div>
                        <select
                          value={u.addAccessPreset}
                          disabled={u.role === "admin"}
                          onChange={(e) => {
                            setUserAccessPreset(u.id, "add", e.target.value as AccessPreset);
                            setTick((x) => x + 1);
                          }}
                        >
                          {accessOptions.map((v) => (
                            <option key={`add-${v}`} value={v}>{accessLabel(v)}</option>
                          ))}
                        </select>
                      </div>

                      <div className="adminAccessRow">
                        <div>
                          <div className="adminStrong">Edit / Stock Actions</div>
                          <div className="muted adminMeta">Current: {getAccessSummary(u, "edit")}</div>
                        </div>
                        <select
                          value={u.editAccessPreset}
                          disabled={u.role === "admin"}
                          onChange={(e) => {
                            setUserAccessPreset(u.id, "edit", e.target.value as AccessPreset);
                            setTick((x) => x + 1);
                          }}
                        >
                          {accessOptions.map((v) => (
                            <option key={`edit-${v}`} value={v}>{accessLabel(v)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}