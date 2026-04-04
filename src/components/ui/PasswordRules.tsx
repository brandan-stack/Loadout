"use client";

import { checkPasswordStrength } from "@/lib/validation";

/**
 * Displays a live checklist of password strength requirements.
 * Renders nothing when the password field is empty.
 */
export function PasswordRules({ password }: { password: string }) {
  if (!password) return null;
  const { rules } = checkPasswordStrength(password);
  const items: { label: string; met: boolean }[] = [
    { label: "At least 8 characters", met: rules.minLength },
    { label: "One uppercase letter (A–Z)", met: rules.hasUppercase },
    { label: "One lowercase letter (a–z)", met: rules.hasLowercase },
    { label: "One number (0–9)", met: rules.hasNumber },
  ];
  return (
    <ul className="mt-2 space-y-1">
      {items.map(({ label, met }) => (
        <li
          key={label}
          className={`flex items-center gap-1.5 text-xs ${met ? "text-emerald-400" : "text-slate-500"}`}
        >
          <span>{met ? "✓" : "○"}</span>
          {label}
        </li>
      ))}
    </ul>
  );
}
