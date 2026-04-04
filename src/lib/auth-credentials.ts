import { z } from "zod";

export const PASSWORD_RULES_TEXT = "Use at least 8 characters with at least one letter and one number.";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must include at least one letter")
  .regex(/\d/, "Password must include at least one number");

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}