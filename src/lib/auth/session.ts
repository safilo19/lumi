import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { query } from "@/lib/db/client";
import type { User, UserRole } from "@/lib/db/users";

// Database-session auth: the cookie holds only an opaque random token; all
// session state lives server-side in the Postgres `sessions` table. Nothing in
// the cookie is secret-signed, so there's no SESSION_SECRET to manage —
// revoking a session is just deleting its row.

export const SESSION_COOKIE = "lumi_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type SessionUserRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: Date;
};

/**
 * Create a session for `userId` and set its cookie. Must run inside a Route
 * Handler or Server Action (it mutates cookies).
 */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_MS);
  // Opportunistically GC expired rows, then insert the new session.
  await query("delete from sessions where expires_at <= now()");
  await query(
    "insert into sessions (token, user_id, expires_at) values ($1, $2, $3)",
    [token, userId, expiresAt],
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Delete the current session row and clear its cookie. Route Handler / Action only. */
export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await query("delete from sessions where token = $1", [token]);
  }
  store.delete(SESSION_COOKIE);
}

/**
 * Resolve the signed-in user from the session cookie, or null. Memoized per
 * request with React cache() so layouts, pages, and the DAL share one lookup.
 */
export const verifySession = cache(async (): Promise<User | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { rows } = await query<SessionUserRow>(
    `select u.id, u.email, u.name, u.role, u.created_at
     from sessions s
     join users u on u.id = s.user_id
     where s.token = $1 and s.expires_at > now()`,
    [token],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at.toISOString(),
  };
});

/** Convenience alias; returns the current user or null. */
export async function getCurrentUser(): Promise<User | null> {
  return verifySession();
}
