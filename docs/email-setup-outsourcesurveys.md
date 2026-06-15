# Email Setup — outsourcesurveys.uk

**Provider:** Google Workspace
**Addresses to create:** `kerri@outsourcesurveys.uk` (your mailbox), plus `hello@` and `info@`

## Cost-smart structure

You only pay per *user mailbox*. Aliases are free. So set up **one paid mailbox** and point the generic addresses at it:

- `kerri@outsourcesurveys.uk` → paid user (your login + inbox)
- `hello@outsourcesurveys.uk` → **alias** on Kerri's mailbox (free)
- `info@outsourcesurveys.uk` → **alias** on Kerri's mailbox (free)

This means one Business Starter seat (~£5–6/user/month) covers all three. When you hire, give new staff their own mailbox or split `hello@`/`info@` into a shared inbox / group then.

---

## Step 1 — Sign up for Google Workspace

1. Go to **workspace.google.com** → *Get started*.
2. Enter business name (use your trading name for now — you can update legal details after registration), number of employees (Just you), and country **United Kingdom**.
3. When asked about a domain, choose **"Yes, I have one I can use"** and enter `outsourcesurveys.uk`.
4. Create your admin account: this becomes `kerri@outsourcesurveys.uk`.
5. Pick the **Business Starter** plan to begin (30 GB/user, full Gmail, Meet, Drive). You can upgrade later.

> Note: registering the limited company isn't required to open the account. You can update the business legal name and billing details once Companies House registration is done.

## Step 2 — Verify domain ownership

Google will give you a **TXT verification record** (looks like `google-site-verification=...`). Add it at your domain registrar (where you bought the domain) in the DNS settings, then click *Verify* in the setup wizard.

## Step 3 — Add the DNS records

In your registrar's DNS panel for `outsourcesurveys.uk`, add the following. (These are the current Google Workspace values as of 2026.)

### MX (mail routing) — simplified single record
| Type | Host/Name | Value / Points to | Priority | TTL |
|------|-----------|-------------------|----------|-----|
| MX | @ (or blank/root) | `smtp.google.com` | 1 | Default / 1 hour |

> Google simplified MX to this single record in 2023. If your registrar rejects it or you prefer the legacy set, use the five `ASPMX` records instead (`ASPMX.L.GOOGLE.COM` priority 1, `ALT1`/`ALT2.ASPMX.L.GOOGLE.COM` priority 5, `ALT3`/`ALT4.ASPMX.L.GOOGLE.COM` priority 10). Don't mix the two — use one approach.

### SPF (sender authentication)
| Type | Host/Name | Value |
|------|-----------|-------|
| TXT | @ (root) | `v=spf1 include:_spf.google.com ~all` |

> Only **one** SPF record per domain. If one already exists, merge — don't add a second.

### DKIM (signs your outgoing mail)
DKIM isn't a fixed value — you generate it inside Google Admin:
1. **admin.google.com** → *Apps → Google Workspace → Gmail → Authenticate email*.
2. Select the domain, set key length **2048**, click *Generate new record*.
3. Copy the generated `TXT` record (host is usually `google._domainkey`) into your registrar's DNS.
4. Back in Admin, click *Start authentication*.

### DMARC (policy + reporting) — add after MX/SPF/DKIM are live
| Type | Host/Name | Value |
|------|-----------|-------|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:kerri@outsourcesurveys.uk; pct=100` |

> Start with `p=none` (monitor only) for the first few weeks so nothing legitimate gets blocked. Once you confirm your mail passes, tighten to `p=quarantine` and later `p=reject`. Google/Yahoo now require valid SPF + DKIM + DMARC for reliable delivery, so don't skip DMARC.

## Step 4 — Create the addresses

In **admin.google.com**:

- `kerri@` already exists (your admin account).
- Add aliases: *Directory → Users → Kerri → Add alternate emails* → add `hello@outsourcesurveys.uk` and `info@outsourcesurveys.uk`.
- Mail to all three lands in your one inbox. You can set Gmail to *send as* any of them (Gmail → Settings → Accounts → Send mail as).

---

## Verification & deliverability checklist

- [ ] Domain verified (green tick in Google setup wizard)
- [ ] MX record resolves — test at **mxtoolbox.com** (enter the domain)
- [ ] SPF present and only one record — check at mxtoolbox.com → SPF
- [ ] DKIM authentication shows *Authenticating email* in Admin
- [ ] DMARC record live — check mxtoolbox.com → DMARC
- [ ] Send a test email to a Gmail and an Outlook address; reply works both ways
- [ ] Send a test to **check-auth@verifier.port25.com** or use **mail-tester.com** — aim for 10/10
- [ ] Aliases `hello@` and `info@` receive mail
- [ ] After 2–4 weeks of clean DMARC reports, tighten policy to `p=quarantine`

> DNS changes can take anywhere from a few minutes to 48 hours to propagate, though Google's records usually activate within an hour.

---

## After business registration

Once the limited company is registered with Companies House:
- Update the business legal name and address in Google Admin billing.
- Consider adding `accounts@` (alias) for invoices and `support@` when the platform launches.
- If you later want `hello@`/`info@` monitored by more than one person, convert them from aliases to a **Google Group** (free) or a **shared/collaborative inbox**.
