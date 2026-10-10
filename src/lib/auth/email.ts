// Transactional email for magic-link sign-in, sent via Brevo's HTTP API.
// We call the REST endpoint with fetch directly so the app pulls in no extra
// dependency and stays on the free tier. Three env vars drive it:
//   BREVO_API_KEY   - the Brevo "SMTP & API" v3 key (secret; set in Vercel)
//   EMAIL_FROM       - a sender address verified in your Brevo account
//   EMAIL_FROM_NAME  - optional display name (defaults to "Lumi")
// On the free tier a single *verified sender* can email any recipient, so no
// custom domain is required.

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/** True when the mail provider has everything it needs to send. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Email a sign-in link. Throws on misconfiguration or a non-2xx response so the
 * caller can surface a real error instead of silently claiming "check inbox".
 */
export async function sendMagicLinkEmail(to: string, link: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Email is not configured (missing BREVO_API_KEY or EMAIL_FROM).");
  }
  const fromName = process.env.EMAIL_FROM_NAME || "Lumi";

  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: fromName, email: from },
      to: [{ email: to }],
      subject: "Your Lumi sign-in link",
      htmlContent: magicLinkHtml(link),
      textContent: `Sign in to Lumi by opening this link (valid for 15 minutes):\n\n${link}\n\nIf you did not request this, you can ignore this email.`,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}). ${detail.slice(0, 300)}`);
  }
}
/** Branded HTML body. Inline styles only — email clients ignore <style>/CSS. */
function magicLinkHtml(link: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#fbf5e9;font-family:'Nunito',-apple-system,Segoe UI,Roboto,sans-serif;color:#2a2550;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fbf5e9;padding:32px 16px;">
      <tr><td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:3px solid #2a2550;border-radius:24px;box-shadow:6px 6px 0 #2a2550;overflow:hidden;">
          <tr><td style="padding:28px 32px 8px;">
            <div style="font-weight:800;font-size:26px;letter-spacing:-0.5px;color:#5b4df6;">Lumi</div>
          </td></tr>
          <tr><td style="padding:4px 32px 0;">
            <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#2a2550;">Here is your sign-in link</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#555070;">Tap the button below to sign in. This link is valid for 15 minutes and can be used once.</p>
          </td></tr>
          <tr><td align="center" style="padding:0 32px 28px;">
            <a href="${link}" style="display:inline-block;background:#5b4df6;color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;padding:14px 28px;border-radius:16px;border:3px solid #2a2550;box-shadow:4px 4px 0 #2a2550;">Sign in to Lumi</a>
          </td></tr>
          <tr><td style="padding:0 32px 28px;">
            <p style="margin:0 0 8px;font-size:13px;color:#8a85a5;">Or paste this link into your browser:</p>
            <p style="margin:0;font-size:12px;word-break:break-all;color:#5b4df6;">${link}</p>
          </td></tr>
          <tr><td style="padding:16px 32px 28px;border-top:1px solid #efe8d8;">
            <p style="margin:0;font-size:12px;line-height:1.5;color:#a8a3bd;">If you did not request this, you can safely ignore this email.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
