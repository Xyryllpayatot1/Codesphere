/*
 * CreyvaPH
 * Copyright © 2026 Jhon Xyryll Samoy
 * All rights reserved.
 */

import "server-only";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { ROLES, type Role } from "@/lib/constants";
import {
  signSessionToken,
  verifySessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  type SessionUser,
} from "@/lib/jwt";

// ---------------------------------------------------------------------------
// Custom session auth (no external auth provider — fully offline).
// Strategy: signed JWT in an httpOnly, same-site cookie. Roles are checked via
// proxy + server-side guards, never from client state.
// ---------------------------------------------------------------------------

export type { SessionUser };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await signSessionToken(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new AuthError("Not authenticated", 401);
  return session;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return session;
}

export function isAdmin(session: SessionUser | null): boolean {
  return session?.role === ROLES.ADMIN;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
