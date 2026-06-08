import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Secrets / config (set via `supabase secrets set` or the Supabase dashboard →
// Edge Functions → send-notification-email → Secrets):
//   RESEND_API_KEY  — from your Resend account (required to actually send)
//   WEBHOOK_SECRET  — must equal the Vault secret `email_webhook_secret`
//   EMAIL_FROM      — optional; defaults to Resend's onboarding sender
//   SITE_URL        — optional; used to absolutise relative notification links
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "Surveyors UK <onboarding@resend.dev>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://surveyors-uk.vercel.app";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // Shared-secret auth. This function runs with verify_jwt=false, so the secret
  // is the only thing stopping it being an open email relay. Never remove it.
  if (!WEBHOOK_SECRET || req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const { email, name, notification } = payload ?? {};
  if (!email || !notification?.title) return json({ error: "missing email or notification" }, 400);

  // Not configured yet: acknowledge with 200 so callers don't retry-storm.
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set; skipping email to", email);
    return json({ skipped: "RESEND_API_KEY not configured" }, 200);
  }

  const rawLink: string | undefined = notification.link;
  const link = rawLink
    ? (rawLink.startsWith("http") ? rawLink : `${SITE_URL}${rawLink}`)
    : SITE_URL;

  const html = renderEmail({ name, title: notification.title, body: notification.body, link });
  const text = `${notification.title}\n\n${notification.body ?? ""}\n\n${link}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: [email], subject: notification.title, html, text }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Resend send failed", res.status, detail);
    return json({ error: "send failed", status: res.status, detail }, 502);
  }

  const data = await res.json();
  return json({ sent: true, id: data.id }, 200);
});

function renderEmail(
  { name, title, body, link }: { name?: string; title: string; body?: string; link: string },
) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e8ec;">
          <tr><td style="background:#0f1f3d;padding:20px 28px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;">Surveyors UK</span>
          </td></tr>
          <tr><td style="padding:28px;">
            <p style="margin:0 0 12px;font-size:15px;">${greeting}</p>
            <h1 style="margin:0 0 12px;font-size:19px;line-height:1.3;">${escapeHtml(title)}</h1>
            ${body ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3a3a52;">${escapeHtml(body)}</p>` : ""}
            <a href="${escapeAttr(link)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;">View in Surveyors UK</a>
          </td></tr>
          <tr><td style="padding:18px 28px;border-top:1px solid #eef0f3;">
            <p style="margin:0;font-size:12px;color:#8a8fa3;">You're receiving this because you have a Surveyors UK account.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: unknown) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}
function escapeAttr(s: unknown) {
  return String(s).replace(/"/g, "%22");
}
