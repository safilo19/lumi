import { NextResponse } from "next/server";
import { createMagicToken } from "@/lib/auth/magic";
import { isEmailConfigured, sendMagicLinkEmail } from "@/lib/auth/email";

export const runtime = "nodejs";

// POST /api/auth/magic  { email }
// Mints a magic-link token and emails the sign-in link via Brevo. If email is
// not configured we fall back to returning the link in the response during
// local development, but in production we surface a real error rather than
// silently claiming the mail was sent.
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

  // Preferred path: a configured provider emails the link. This works in every
  // environment once BREVO_API_KEY + EMAIL_FROM are set.
  if (isEmailConfigured()) {
    try {
      await sendMagicLinkEmail(email, link);
    } catch (err) {
      console.error("[auth] magic link email failed:", err);
      return NextResponse.json(
        { error: "We couldn't send the sign-in email. Please try again shortly." },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, email });
  }

  // No provider configured. Off-production we hand the link back so the flow is
  // testable without a mailbox; in production that would be a silent failure,
  // so we refuse loudly instead.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Email delivery is not configured yet. Please contact support." },
      { status: 500 },
    );
  }

  console.log(`[auth] magic link for ${email}: ${link}`);
  return NextResponse.json({ ok: true, email, devLink: link });
}
