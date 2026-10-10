import { NextResponse } from "next/server";
import { createMagicToken } from "@/lib/auth/magic";

export const runtime = "nodejs";

// POST /api/auth/magic  { email }
// Mints a magic-link token for the email. In production this link would be
// emailed (a provider wired via the marketplace later); in development we
// return it in the response so the flow is testable without a mailbox.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const token = await createMagicToken(email);
  const origin = new URL(request.url).origin;
  const link = `${origin}/api/auth/verify?token=${token}`;

  // Only ever expose the link off-production. In production the response stays
  // silent about the token and the link travels by email instead.
  const devLink = process.env.NODE_ENV === "production" ? undefined : link;
  if (devLink) {
    console.log(`[auth] magic link for ${email}: ${link}`);
  }

  return NextResponse.json({ ok: true, email, devLink });
}
