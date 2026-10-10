import { query } from "./client";

// Users repository. Email is the identity; a user row is created on first
// successful magic-link verification (find-or-create). Role defaults to
// student — teacher onboarding is a v2 concern. Backed by Neon Postgres
// (`users` table); the exported surface is unchanged from the file-store era.

export type UserRole = "student" | "teacher";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: Date;
};

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at.toISOString(),
  };
}

// Turn "ali.raza@cust.pk" into "Ali Raza" for a friendly default display name.
function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "";
  const words = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(" ") || "Student";
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await query<UserRow>(
    "select id, email, name, role, created_at from users where email = $1",
    [normalized],
  );
  return rows[0] ? mapUser(rows[0]) : undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const { rows } = await query<UserRow>(
    "select id, email, name, role, created_at from users where id = $1",
    [id],
  );
  return rows[0] ? mapUser(rows[0]) : undefined;
}

/** Return the user for this email, creating the row on first sign-in. */
export async function findOrCreateUser(email: string): Promise<User> {
  const normalized = email.trim().toLowerCase();
  // ON CONFLICT with a no-op update lets RETURNING yield the existing row too,
  // so this is a single atomic find-or-create round trip.
  const { rows } = await query<UserRow>(
    `insert into users (email, name, role)
     values ($1, $2, 'student')
     on conflict (email) do update set email = excluded.email
     returning id, email, name, role, created_at`,
    [normalized, nameFromEmail(normalized)],
  );
  return mapUser(rows[0]);
}
