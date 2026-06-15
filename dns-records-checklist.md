# DNS Records Checklist — outsourcesurveys.uk (Cloudflare)

All records live in **Cloudflare** now. Add via DNS → Records → Add record. Use copy buttons from Google/Resend for long values. No quotes needed in Cloudflare.

## Email — Google Workspace (human mail: kerri@ / hello@ / info@)

- [ ] **MX** · Name `@` · Value `smtp.google.com` · Priority `1` · DNS only  *(already imported ✓)*
- [ ] **TXT** · Name `@` · Value `v=spf1 include:_spf.google.com ~all`  *(Google SPF)*
- [ ] **TXT** · Name `google._domainkey` · Value `v=DKIM1; k=rsa; p=MIIBIjANBgkq…AQAB`  *(Google DKIM — copy from Google Admin → Authenticate email)*
- [ ] **CNAME** · Name `nddfsctutzbg` · Value `gv-uvdvrxgxq2mtm6.dv.googlehosted.com`  *(Google domain verification — keep if it imported; re-add if missing)*

## Email — Resend (app mail: noreply@, password resets + notifications)

- [ ] **MX** · Name `send` · Value `feedback-smtp.eu-west-1.amazonses.com` · Priority `10` · DNS only  *(already imported ✓)*
- [ ] **TXT** · Name `send` · Value `v=spf1 include:amazonses.com ~all`  *(Resend SPF)*
- [ ] **TXT** · Name `resend._domainkey` · Value `p=MIGfMA…wIDAQAB`  *(Resend DKIM — copy from Resend)*

## Shared (covers both Google and Resend — add ONCE)

- [ ] **TXT** · Name `_dmarc` · Value `v=DMARC1; p=none;`

## Website (already imported — leave as-is for now)

- [ ] **A** · Name `@` · `27.124.125.171` · Proxied  *(Crazy Domains parking — will change when domain points to the live Vercel app)*
- [ ] **A** · Name `www` · `27.124.125.171` · Proxied  *(same)*

---

## Why no conflicts
- **Two SPF records** is fine because they're on different names: `@` (Google) and `send` (Resend). One SPF per name is the rule — that's respected.
- **Two DKIM records** on different names: `google._domainkey` and `resend._domainkey`.
- **One DMARC** at `_dmarc` covers the whole domain.

## Verify (after nameservers go active — Cloudflare emails you)
- [ ] **Resend** → click "I've added the records" (should flip to Verified)
- [ ] **Google Admin** → Authenticate email → "Start authentication"
- [ ] Optional: run `outsourcesurveys.uk` through mxtoolbox.com / mail-tester.com

## Then — finish Resend app email (in Supabase, not DNS)
- [ ] Edge Functions → send-notification-email → Secrets: `RESEND_API_KEY` (re_…), `EMAIL_FROM` = `Outsource Surveys <noreply@outsourcesurveys.uk>`, `WEBHOOK_SECRET` = (the Vault `email_webhook_secret` value), `SITE_URL`
- [ ] Confirm the function's `verify_jwt = false`
- [ ] Authentication → SMTP: point at Resend (`smtp.resend.com:465`, user `resend`, pass = API key); set Site URL
- [ ] Test: trigger a notification + a password reset, confirm delivery
