import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { mutateCollection, readCollection } from "@/lib/db/store";
import { getUserById, type User } from "@/lib/db/users";

// Database-session auth: the cookie holds only an opaque random token; all
// session state lives server-side in the `.data/sessions.json` collection.
// Nothing in the cookie is secret-signed, so there's no SESSION_SECRET to
// manage — revoking a session is just deleting its row.

const COLLECTION = "sessions";
export const SESSION_COOKIE = "lumi_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type Session = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: number; // epoch ms
};

/**
 * Create a session for `userId` and set its cookie. Must run inside a Route
 * Handler or Server Action (it mutates cookies).
 */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + TTL_MS;
  await mutateCollection<Session, void>(COLLECTION, (rows) => {
    const live = rows.filter((s) => s.expiresAt > now);
    return {
      rows: [...live, { token, userId, createdAt: new Date(now).toISOString(), expiresAt }],
      result: undefined,
    };
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

/** Delete the current session row and clear its cookie. Route Handler / Action only. */
export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await mutateCollection<Session, void>(COLLECTION, (rows) => ({
      rows: rows.filter((s) => s.token !== token),
      result: undefined,
    }));
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

  const sessions = await readCollection<Session>(COLLECTION);
  const session = sessions.find((s) => s.token === token);
  if (!session || session.expiresAt <= Date.now()) return null;

  return (await getUserById(session.userId)) ?? null;
});

/** Convenience alias; returns the current user or null. */
export async function getCurrentUser(): Promise<User | null> {
  return verifySession();
}
