import { randomBytes } from "node:crypto";
import { mutateCollection } from "@/lib/db/store";

// Magic-link tokens. A token is a one-time, short-lived secret emailed to the
// user (in dev we surface it directly instead of sending mail). Verifying it
// proves control of the inbox, which is all a passwordless login needs.

const COLLECTION = "magic_tokens";
const TTL_MS = 15 * 60 * 1000; // 15 minutes

type MagicToken = {
  token: string;
  email: string;
  createdAt: string;
  expiresAt: number; // epoch ms
  usedAt: string | null;
};

/** Mint a token for this email and return the raw token string. */
export async function createMagicToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const row: MagicToken = {
    token,
    email: email.trim().toLowerCase(),
    createdAt: new Date(now).toISOString(),
    expiresAt: now + TTL_MS,
    usedAt: null,
  };
  await mutateCollection<MagicToken, void>(COLLECTION, (rows) => {
    // Drop this email's older unused tokens so only the latest link works,
    // and garbage-collect anything already expired.
    const kept = rows.filter(
      (t) => t.email !== row.email && t.expiresAt > now,
    );
    return { rows: [...kept, row], result: undefined };
  });
  return token;
}

/**
 * Validate and burn a token. Returns the associated email on success, or null
 * if the token is unknown, already used, or expired.
 */
export async function consumeMagicToken(token: string): Promise<string | null> {
  if (!token) return null;
  return mutateCollection<MagicToken, string | null>(COLLECTION, (rows) => {
    const now = Date.now();
    const match = rows.find((t) => t.token === token);
    if (!match || match.usedAt || match.expiresAt <= now) {
      return { rows, result: null };
    }
    const next = rows.map((t) =>
      t.token === token ? { ...t, usedAt: new Date(now).toISOString() } : t,
    );
    return { rows: next, result: match.email };
  });
}
