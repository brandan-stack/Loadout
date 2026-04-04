import { z } from "zod";

export const PASSWORD_RULES_TEXT = "Use at least 8 characters with uppercase, lowercase, and a number.";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/\d/, "Password must contain at least one number");

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}