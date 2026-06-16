# Outsource Surveys — Founder Launch Checklist

A practical, prioritised list for taking the platform from "built" to "live with real customers."
Work top-down — the early tiers de-risk everything after them.

> ⚠️ Not legal or financial advice. The legal / data / money items are prompts to get
> proper professional help (solicitor + accountant), not substitutes for it.

---

## Tier 1 — Validate (do this BEFORE building anything else)

The biggest risk isn't the code, it's an empty marketplace. Prove people want this first.

- [ ] Talk to **3–5 organisations** (councils, housing associations, ALMOs) — would they use this? How do they find surveyors today? What would make them switch?
- [ ] Talk to **5–10 surveyors** — would they take ad-hoc work this way? Is a 10% on-top fee acceptable? Would they pay a subscription?
- [ ] Find **one friendly pilot customer** willing to post a real job, and **2–3 surveyors** ready to quote. A live two-sided pilot beats any feature.
- [ ] Write down the **one sentence** of who this is for and the problem it solves — and sanity-check every future feature against it.
- [ ] Decide which side you lead with (you have the LinkedIn import to seed surveyors; demand from one org may be the harder, more valuable side to secure).

## Tier 2 — Protect (before any real customer or real personal data)

- [ ] **Register the company** with Companies House (also unblocks Stripe).
- [ ] Open a **business bank account**.
- [ ] Get **professional indemnity + public liability insurance for the platform itself** (Outsource Surveys), separate from surveyors' cover.
- [ ] **Solicitor review** of: Terms of Service, the surveyor agreement, the organisation agreement. Make sure they state the platform is an **intermediary** — not the surveyor's employer, and not a guarantor of the work. Liability sits with the surveyor's own insured entity.
- [ ] Confirm the **Awaab's Law** wording legally positions you as *tracking/alerting only* — the landlord keeps the statutory duty. Never imply you assume it.
- [ ] **Privacy policy + lawful basis** for the personal data you hold (resident hazard reports, surveyor details). Collect the minimum you need.
- [ ] **LinkedIn-imported data:** get advice on this specifically — storing scraped personal data without a lawful basis is a real GDPR/ICO risk. Consider consent-on-claim, exact-email matching, or removing it.

## Tier 3 — Pre-launch technical safety (before live data you can't lose)

- [ ] Turn on **database backups / point-in-time recovery** (Supabase).
- [ ] Set up a **staging environment** so you're never testing on live data.
- [ ] **Rotate the Resend API key** (it was shared in chat) and review where other secrets live.
- [ ] Confirm the custom domain's **SSL** finished and email auth (SPF/DKIM/DMARC) is healthy (mail-tester.com).
- [ ] Basic **accessibility** pass — public-sector buyers often require WCAG compliance; it can be a procurement blocker.
- [ ] A simple **monitoring/error alert** so you know when something breaks before a customer tells you.

## Tier 4 — Money & pricing (validate, then wire Stripe)

- [ ] **Confirm pricing with real customers** — is 10% on-top right? What subscription would each side actually pay? Set the real numbers in Admin → Billing.
- [ ] **Accountant** on: VAT treatment of your commission, and how money flowing through the platform is handled.
- [ ] **Wire Stripe** once registered: Billing for subscriptions + invoicing/Connect for commission & surveyor payouts (Connect handles a lot of the KYC/payout compliance).
- [ ] Decide if/when access is **gated** on an active subscription (it isn't yet — everyone's a free "Founding member").

## Tier 5 — Understand the buyers (parallel with everything)

- [ ] Research **public-sector procurement** — councils usually can't just sign up; they buy via frameworks/tenders (e.g. Crown Commercial Service / G-Cloud). Know the real buying process before betting your GTM on it.
- [ ] Map the **housing association** buying process too — often faster than councils.
- [ ] Talk to other **proptech / govtech / marketplace founders** — fastest way to surface the unknowns.

---

## The mindset shift

You've proven you can build it. The questions that matter now are:
**Who needs it? Will they pay? What could bite me?** Spend your time there.
