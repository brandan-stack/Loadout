import { useMemo, useState } from "react";
import {
  loadUsers,
  addUser,
  disableUser,
  enableUser,
  setUserPin,
  setUserCanAddInventory,
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
  const [tick, setTick] = useState(0);

  const users = useMemo(() => loadUsers(), [tick]);

  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("viewer");
  const [newPin, setNewPin] = useState("");

  const [pinEdit, setPinEdit] = useState<Record<string, string>>({});

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
                alert("Enter a name.");
                return;
              }
              if (newPin.trim() && !isValidPin(newPin)) {
                alert("PIN must be 4–8 digits.");
                return;
              }
              addUser({ name, role: newRole, pin: newPin.trim() });
              setNewName("");
              setNewRole("viewer");
              setNewPin("");
              setTick((x) => x + 1);
            }}
          >
            Create
          </button>
        </div>

        <div className="muted adminHint">
          Tip: Give Admin/Stock/Invoicing a PIN. Viewer can be blank.
        </div>
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
                  className={"btn " + (u.canAddInventory || u.role === "admin" ? "primary" : "")}
                  disabled={u.role === "admin"}
                  onClick={() => {
                    setUserCanAddInventory(u.id, !u.canAddInventory);
                    setTick((x) => x + 1);
                  }}
                  title={u.role === "admin" ? "Admin always has add permission" : "Toggle inventory add permission"}
                >
                  {u.role === "admin"
                    ? "Add: Always on"
                    : u.canAddInventory
                    ? "Add: Allowed"
                    : "Add: Blocked"}
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
                      alert("PIN must be 4–8 digits.");
                      return;
                    }
                    if (!confirm(`Set PIN for ${u.name}?`)) return;
                    setUserPin(u.id, p);
                    setPinEdit((s) => ({ ...s, [u.id]: "" }));
                    setTick((x) => x + 1);
                  }}
                >
                  Save PIN
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}