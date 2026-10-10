import { NextResponse, type NextRequest } from "next/server";
import { consumeMagicToken } from "@/lib/auth/magic";
import { findOrCreateUser } from "@/lib/db/users";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

// GET /api/auth/verify?token=...
// Burns the magic token, finds-or-creates the user, opens a session, and
// redirects into the app. A bad/expired token bounces back to /login.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const email = await consumeMagicToken(token);

  if (!email) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "link");
    return NextResponse.redirect(url);
  }

  const user = await findOrCreateUser(email);
  await createSession(user.id);

  // Honor a safe same-origin ?next, otherwise land on the dashboard.
  const next = request.nextUrl.searchParams.get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(new URL(dest, request.url));
}
