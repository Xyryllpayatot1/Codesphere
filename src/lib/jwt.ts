/*
 * CreyvaPH
 * Copyright © 2026 Jhon Xyryll Samoy
 * All rights reserved.
 */

// Pure JWT helpers (jose only) — safe to import from the edge proxy as well as
// Node server code. Signing/verification of the session cookie.

import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/constants";

export type SessionUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: Role;
};

export const SESSION_COOKIE = "codesphere_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? "dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const u = payload as unknown as SessionUser;
    if (!u.id || !u.role) return null;
    return u;
  } catch {
    return null;
  }
}
