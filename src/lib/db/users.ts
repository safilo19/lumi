import { randomUUID } from "node:crypto";
import { mutateCollection, readCollection } from "./store";

// Users repository. Email is the identity; a user row is created on first
// successful magic-link verification (find-or-create). Role defaults to
// student — teacher onboarding is a v2 concern.

const COLLECTION = "users";

export type UserRole = "student" | "teacher";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
};

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
  const users = await readCollection<User>(COLLECTION);
  return users.find((u) => u.email === normalized);
}

export async function getUserById(id: string): Promise<User | undefined> {
  const users = await readCollection<User>(COLLECTION);
  return users.find((u) => u.id === id);
}

/** Return the user for this email, creating the row on first sign-in. */
export async function findOrCreateUser(email: string): Promise<User> {
  const normalized = email.trim().toLowerCase();
  return mutateCollection<User, User>(COLLECTION, (rows) => {
    const existing = rows.find((u) => u.email === normalized);
    if (existing) return { rows, result: existing };
    const user: User = {
      id: randomUUID(),
      email: normalized,
      name: nameFromEmail(normalized),
      role: "student",
      createdAt: new Date().toISOString(),
    };
    return { rows: [...rows, user], result: user };
  });
}
