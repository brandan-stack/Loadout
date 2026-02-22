import { useEffect, useMemo, useState } from "react";

const USERS_KEY = "users.list.v1";
const CURRENT_KEY = "users.current.v1";

function safeLoadList(): string[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed) && parsed.length) return parsed.map(String);
  } catch {}
  return ["Brandan"];
}

function safeLoadCurrent(list: string[]): string {
  const cur = localStorage.getItem(CURRENT_KEY);
  if (cur && list.includes(cur)) return cur;
  return list[0] ?? "Brandan";
}

export function useUser() {
  const [users, setUsers] = useState<string[]>(() => safeLoadList());
  const [currentUser, setCurrentUser] = useState<string>(() => safeLoadCurrent(safeLoadList()));

  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    if (!users.includes(currentUser)) setCurrentUser(users[0] ?? "Brandan");
  }, [users]);

  useEffect(() => {
    localStorage.setItem(CURRENT_KEY, currentUser);
  }, [currentUser]);

  return useMemo(() => {
    return {
      users,
      currentUser,
      setCurrentUser,

      addUser(name: string) {
        const n = name.trim();
        if (!n) return;
        setUsers((prev) => (prev.includes(n) ? prev : [...prev, n]));
      },

      removeUser(name: string) {
        setUsers((prev) => prev.filter((u) => u !== name));
      },
    };
  }, [users, currentUser]);
}