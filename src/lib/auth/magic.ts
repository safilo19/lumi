import { randomBytes } from "node:crypto";
import { query, withTransaction } from "@/lib/db/client";

// Magic-link tokens. A token is a one-time, short-lived secret emailed to the
// user (in dev we surface it directly instead of sending mail). Verifying it
// proves control of the inbox, which is all a passwordless login needs.
// Backed by Neon Postgres (`magic_tokens` table).

const TTL_MS = 15 * 60 * 1000; // 15 minutes

/** Mint a token for this email and return the raw token string. */
export async function createMagicToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const normalized = email.trim().toLowerCase();
  const expiresAt = new Date(Date.now() + TTL_MS);
  await withTransaction(async (client) => {
    // Drop this email's older tokens so only the latest link works, and
    // garbage-collect anything already expired.
    await client.query(
      "delete from magic_tokens where email = $1 or expires_at <= now()",
      [normalized],
    );
    await client.query(
      "insert into magic_tokens (token, email, expires_at) values ($1, $2, $3)",
      [token, normalized, expiresAt],
    );
  });
  return token;
}

/**
 * Validate and burn a token. Returns the associated email on success, or null
 * if the token is unknown, already used, or expired. The conditional UPDATE
 * burns and checks in one atomic statement.
 */
export async function consumeMagicToken(token: string): Promise<string | null> {
  if (!token) return null;
  const { rows } = await query<{ email: string }>(
    `update magic_tokens set used_at = now()
     where token = $1 and used_at is null and expires_at > now()
     returning email`,
    [token],
  );
  return rows[0]?.email ?? null;
}
