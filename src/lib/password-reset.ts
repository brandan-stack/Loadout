import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

const RESET_TOKEN_BYTES = 32;

export function createPasswordResetTokenPair() {
  const token = randomBytes(RESET_TOKEN_BYTES).toString("hex");
  return {
    token,
    tokenHash: hashPasswordResetToken(token),
  };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getAppBaseUrl(request: NextRequest) {
  const explicitBaseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, "");
  }

  if (request.nextUrl.origin) {
    return request.nextUrl.origin.replace(/\/$/, "");
  }

  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) {
    throw new Error("Unable to determine application base URL");
  }

  return `${protocol}://${host}`;
}