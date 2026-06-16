# Surveyors UK — Build Spec

**Canonical source of truth.** Edit this file in place as decisions are made.

**Last updated:** 2026-06-16
**Sister documents:** `HANDOFF.md` (session whiteboard) · `reference/mockup.html` (original visual prototype)

---

## What Surveyors UK is

A **Plentific-style marketplace** for the UK surveying industry. Three sides:

- **Organisations (requesters)** — one unified customer account with an *organisation type* (council, housing association, ALMO, managing agent, property company, private landlord). Post survey requirements and receive **quotes**, or send a **direct fixed-fee offer** to a verified surveyor. Awaab's Law statutory clock tracked on social-housing hazards.
- **Surveyors** — vetted professionals who must clear a 4-step verification gate (entity + PI insurance + qualification + liability) before they can quote on matched work or accept offers, win jobs, and run them to completion in-app.
- **Admin (Talent Network team)** — vets surveyors, reviews credentials, moderates listings, seeds the surveyor pool from imported LinkedIn profiles.

**Reference product:** [Plentific](https://plentific.com) — same pattern adapted for surveys instead of repairs/compliance work. Their core loop is: requester posts work → matched contractors quote → requester awards → work runs through stages → completion + invoicing.

---

## Stack

- React 19 + Vite 8 (JSX, no TypeScript)
- React Router v7
- Plain CSS (mockup styles in `src/index.css`) — Tailwind is installed but not in use
- Supabase — project ref `zxraxgjzmthgzilgkihb`, region `eu-west-2`. Auth (email+password) + Postgres + Storage (planned).
- Client: `src/lib/supabase.js`. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (also configured in Vercel).
- Hosting: Vercel, auto-deploy from `main` on `Kerrigeo80/surveyors-uk`.
- Live: **https://www.outsourcesurveys.uk** (custom domain; also https://surveyors-uk.vercel.app/). Local repo: `C:\Users\kerri\Projects\surveyors-uk` (moved off OneDrive 2026-06-16).

---

## Operating principles

1. **Verified, insured, registered surveyors only.** A surveyor must clear a 4-step gate — registered trading entity, in-date PI insurance at the RICS minimum for their fee band, ≥1 verified qualification, and a signed liability declaration — before they can quote or accept work. Enforced in the database, not just the UI.
2. **Trust the data.** Sort by data (verified first, rating, recency) — never algorithmic "top picks".
3. **Privacy by design.** Contact details locked behind engagement; consent flows from day one.
4. **One Organisation customer.** Councils, housing associations, ALMOs, agents, landlords — same account type with an `org_type`, same posting flow.
5. **Quote or direct-offer.** Surveyors submit a real quote (price, timeline, scope) and the org awards one; or the org sends a direct fixed-fee offer the surveyor accepts. End-to-end, not lead-gen.

---

## Roles

| Role | Status default | Capabilities |
|---|---|---|
| `surveyor` | `pending` until **work-ready** | Browse open requests; submit quotes; accept direct offers — all gated on the 4-step verification (entity + PI insurance + qualification + liability). Uploads credentials/insurance/entity details. |
| `council` (= **Organisation**) | `active` | Post requests, review quotes, award work, send direct fixed-fee offers, manage properties. Carries an `org_type` (council / housing association / ALMO / managing agent / property company / private landlord). |
| `landlord` | legacy | Superseded by the unified Organisation (council role). Kept for back-compat; not offered at signup. |
| `admin` | `active` | Verify surveyors (entity, insurance, docs), match/shortlist surveyors to jobs, follow up unverified, import LinkedIn pool, moderate everything. |

**Done (2026-06-16):** councils + landlords unified into one **Organisation** account with an `org_type` (covers housing associations, ALMOs, etc.). Multi-user org accounts (several team members under one org) remain a future enhancement.

---

## Commercials — payments & fees (modelled 2026-06-16; Stripe deferred)

Two revenue lines, **modelled in the app now; real Stripe billing wired once the business is registered with Companies House + has a business bank account.**

1. **Subscriptions** — both surveyors and organisations pay a recurring fee to use the platform. Prices are admin-set (`platform_settings.surveyor_plan_price` / `org_plan_price`), currently "to be confirmed". Pre-launch everyone is a free "Founding member"; no access gating enforced yet.
2. **Commission on completed jobs — added ON TOP.** When a job is marked complete, the platform takes a percentage (**default 10%**, admin-editable) *on top of* the surveyor's fee. The **surveyor keeps their full agreed fee**; the **organisation pays fee × (1 + rate)**. Example at 10%: surveyor fee £300 → org pays £330 → platform keeps £30.

**How it's built:** `platform_settings` (single-row config, commission rate + plan prices), `subscriptions` (per-profile, Stripe-ready but inert), `job_charges` (commission snapshot auto-created by SECURITY DEFINER trigger `create_job_charge` when `survey_requests.status → completed`, reading the winning quote's price × current rate). UI: organisation **Billing** tab (invoices: fee + platform fee + total), surveyor **Earnings** tab (their fee), admin **Billing** tab (edit rate/prices + revenue overview), and a payment breakdown on completed jobs.

**Still to do:** set real subscription prices; wire Stripe (Billing for subscriptions, invoicing/Connect for commission + surveyor payouts); decide if/when to gate access on an active subscription.

---

## Schema — current (Phase 1 — ✓ DONE)

```
profiles                — auth.users mirror; role + status
surveyors               — RICS, region, phone, bio, qualifications[]
                          + coverage_areas[] (postcode prefixes), availability_status,
                            available_from, accepts_emergency  ← matching/availability
councils                — council_name, department, region, phone, about
survey_requests         — title, type, region, address, postcode, deadline, budget, description, status
                          + Awaab's Law: awaabs_applies, hazard_category, hazard_severity,
                            reported_at, investigated_at/summary_sent_at/made_safe_at,
                            investigate_by/summary_due_by/make_safe_by (trigger-computed)
credential_documents    — uploads with verification status
uk_bank_holidays        — England & Wales dates; backs add_working_days() for the statutory clock
```

**Awaab's Law (added 2026-06-14).** Jobs can be flagged as social-housing hazards; `compute_awaabs_deadlines()` sets statutory deadlines (emergency 24h; significant 10/3/5 working days). `notify_matching_surveyors()` alerts active, available, in-area surveyors with the right skill when a job is posted. Frontend: hazard fields on create forms, compliance clock on cards/detail, surveyor matched-feed + availability settings. Seed users via `seed_auth_user()` — never raw `auth.users` inserts.

RLS in place. `is_admin()` and `handle_new_user()` SECURITY DEFINER, EXECUTE revoked from anon. Trigger creates profile + role-row on signup from auth user metadata. Demo data seeded.

## Schema — planned (Phase 2)

```
landlords               — business_name, contact_name, region, phone, about
properties              — landlord_id, address, postcode, type (residential/commercial/mixed)
                          1 landlord → many properties (optional)
survey_requests         — add property_id (nullable for council requests),
                          add requester_role (council|landlord),
                          add lifecycle status (open|quoting_closed|awarded|in_progress|completed|cancelled)
quotes                  — surveyor_id × request_id, price, days, scope_notes, status (submitted|withdrawn|won|lost)
                          REPLACES request_interests as the core engagement table
linkedin_profiles       — unclaimed surveyor seed pool
                          name, email, rics, region, current_role, company, linkedin_url, raw_csv_row,
                          claimed_by (FK profiles, nullable), claimed_at, imported_at, imported_by_admin
```

LinkedIn matching: on signup, server-side check for unclaimed `linkedin_profiles` matching on email (primary) or name+RICS (secondary). If match, show "we think we already have you — claim this profile?" before account is created/finalised.

---

## Phases

### Phase 0 — Scaffolding ✓ DONE (2026-05-31)
Vite/React/Supabase project, Vercel deploy, mockup ported to React with in-memory state.

### Phase 1 — Supabase persistence ✓ DONE (2026-05-31)
Real auth (email+password), schema with RLS, trigger-based profile creation, admin role, surveyor verification queue, demo accounts seeded.

### Phase 2 — Plentific-style marketplace mechanics (NEXT)
Build order to be decided with Kerri (see "What's next" below):
- **2a. Landlord role** — add to enum, registration, dashboard
- **2b. Property portfolio** — properties table; surveyor requests can target a property
- **2c. Quoting** — replace `request_interests` with `quotes` (price, days, scope notes); requester compares quotes; award flow
- **2d. Job lifecycle** — request status progresses open → awarded → in_progress → completed; both sides see stage
- **2e. LinkedIn seed pool + claim flow** — admin CSV import, claim-on-registration UX
- **2f. Multi-user org accounts** (housing associations) — defer until 2a–2e land

### Phase 3 — Trust + UX polish (DONE 2026-06-13)
Done: ratings/reviews (2026-06-09) · property-type filtering (2026-06-10) · insurance verification (2026-06-11) · **in-app messaging UI (2026-06-13)** · **pre-launch hardening (2026-06-13)** — password-reset flow, Privacy/Terms pages + required registration consent, DB EXECUTE revokes on trigger functions.
Email notifications: edge function `send-notification-email` built (2026-06-08) but **not yet live** — needs a verified domain + Resend setup (see "Pre-launch — outstanding" below).

### Phase 4 — Mobile + scale (PARKED)
Mobile-first browse for surveyors on the road · push notifications · advanced search · admin analytics.

---

## Pre-launch — outstanding

### A. Email + domain — IN PROGRESS (DNS done; Supabase config + verify remaining)
Two email paths, **both need a verified sending domain**:
1. **Auth emails** (password reset, signup confirm) — sent by Supabase Auth, currently on the built-in tester (low rate limit, unbranded, spam-prone). Needs custom SMTP.
2. **Notification emails** (quote / award / message) — sent by the `send-notification-email` edge function via the Resend API. Falls back to `onboarding@resend.dev` (Resend test domain — only delivers to the Resend account owner) until `EMAIL_FROM` is set to a verified domain.

Status / steps:
1. ✓ **Domain `outsourcesurveys.uk`** (Crazy Domains, trading name "Outsource Surveys"). Business not yet registered with Companies House.
2. ✓ **DNS moved to Cloudflare (free)** — Crazy Domains standard DNS couldn't do TXT records. Nameservers julio/miki.ns.cloudflare.com. **All DNS now managed in Cloudflare.** Full record list in `dns-records-checklist.md`. Two SPF records on separate names (root = Google `_spf.google.com`, `send` = Resend amazonses) so no conflict.
3. ✓ **Google Workspace mailboxes LIVE** — kerri@ (paid) + hello@/info@ (aliases), verified via Google CNAME.
4. ✓ **All email DNS records entered in Cloudflare** (Google SPF/DKIM + Resend DKIM/SPF/MX + shared DMARC `p=none`). ⏳ Awaiting nameserver propagation, then **verify** in Resend ("I've added the records") and Google Admin ("Start authentication").
5. ⏳ **Resend** account created, domain added (EU/Ireland region). Create API key (`re_…`) once verified.
6. ⏳ **Supabase → Edge Functions → Secrets:** set `RESEND_API_KEY`, `EMAIL_FROM` = `Outsource Surveys <noreply@outsourcesurveys.uk>`, `WEBHOOK_SECRET` = the Vault `email_webhook_secret` value (must match). Wiring already audited & confirmed good (trigger `email_on_notification_insert` → `send_notification_email()` → edge fn).
7. ⏳ **Confirm `verify_jwt = false`** on the edge function.
8. ⏳ **Supabase → Authentication → SMTP:** enable custom SMTP via Resend (`smtp.resend.com:465`, user `resend`, pass = API key). Set **Site URL**.
9. ⏳ **Test** the reset email and a notification email end-to-end.

### B. Other launch items
- ✓ **Leaked Password Protection ENABLED** (2026-06-15).
- **Billing / subscriptions** — unbuilt; blocked on the pricing tier £ numbers + Stripe confirmation (model decided 2026-06-08, see Pricing).
- **Consent timestamp** — store `profiles.agreed_terms_at` for GDPR proof-of-consent (registration consent is UI-gated only right now).
- **Legal pages are DRAFTS** (`/privacy`, `/terms`) — have counsel review before launch.
- ✓ `website` storage bucket SELECT policy narrowed (2026-06-15). `pg_net` in public schema left as-is (tied to email webhook).
- **DB hardening done 2026-06-15** (see HANDOFF) — fixed critical RLS infinite-recursion on survey_requests/quotes/properties; `is_admin()`/`is_conversation_participant()` moved to `private` schema (reference as `private.is_admin()` in any new policy); perf advisor now 0 warnings.

---

## Auth credentials (dev only)

| Account | Email | Password |
|---|---|---|
| Admin (Kerri) | kerri@thetalentnetwork.com.au | _set 2026-06-01, see secure store_ |
| Admin (Brian) | brian.gaines1@gmail.com | _provisioned 2026-06-13, temp pw in secure store; change on first login_ |
| Admin (Sarah) | sarahgaines645@gmail.com | _provisioned 2026-06-13, temp pw in secure store; change on first login_ |
| Demo Surveyor (verified) | james@walkersurveys.co.uk | demo1234 |
| Demo Surveyor (verified) | sarah@precisionsurveys.co.uk | demo1234 |
| Demo Surveyor (pending) | david@murrayenv.co.uk | demo1234 |
| Demo Council | emily@brighton.gov.uk | demo1234 |
| Demo Council | mark@camden.gov.uk | demo1234 |

**Seeding new accounts:** never hand-write `INSERT INTO auth.users` — leaving the
token columns NULL makes GoTrue return 500 on login *and* password reset (this
broke Brian's login on 2026-06-13; fixed 2026-06-14). Use the
`public.seed_auth_user(email, password, metadata)` helper
(`supabase/migrations/20260614000000_add_seed_auth_user_helper.sql`), which sets
all token columns to `''` and bcrypt-hashes the password. Pass `role`/`name` in
the metadata so the `handle_new_user()` trigger builds the profile + role row.

---

## Pricing — DECIDED (2026-06-08)

Two revenue streams: a per-transaction **commission** and a per-user **subscription**.

### 1. Commission — 10%, requester-side, always payable
- **10% of the awarded job value**, charged to the **requester (council / landlord / housing association) on top** of the surveyor's fee.
- The surveyor receives their full quoted fee; the platform's 10% is added to what the requester pays.
- **Example:** £350 full house inspection → surveyor receives £350, requester pays **£385** (£350 + £35 commission).
- **No trial exemption** — the 10% applies from day one, including during the 3-month subscription-free window.

### 2. Subscriptions — per registered user, both sides, 3 months free
- Every registered user (surveyor side AND requester side) pays a subscription.
- **First 3 months free, per user** — the free clock starts on each user's own signup date (not a shared launch window). Needs a per-user `trial_ends_at` field.
- After the trial, a **tiered subscription** applies. Starter tiers below (£ are placeholders pending a unit-economics pass):

**Surveyor side**
| Tier | Price (placeholder) | Includes |
|---|---|---|
| Free | £0/mo | Limited quotes/month (e.g. 5), standard listing visibility |
| Pro | ~£29/mo | Unlimited quotes, featured/priority visibility, profile highlights |

**Requester side** (tier by org type)
| Tier | Price (placeholder) | Includes |
|---|---|---|
| Individual Landlord | ~£15/mo | Few properties, limited concurrent open requests |
| Property Company | ~£49/mo | Multi-property portfolio, more concurrent open requests |
| Council | ~£99/mo | Department use, higher request volume |
| Housing Association (Enterprise) | Custom / SLA | Multi-user accounts, priority support — ties to the parked multi-user org feature |

### Open pricing sub-decisions (refine before billing build)
- Exact £ for each tier — run a unit-economics model on realistic deal volume first.
- Quote/open-request limits per tier (the actual numbers behind "limited").
- Whether commission is invoiced post-completion or held/escrowed at award time.
- Payment provider (Stripe is the default assumption for subs + commission).

## Open product questions

- ~~Revenue model~~ — DECIDED 2026-06-08, see "Pricing" above (10% requester-side commission + per-user tiered subs, 3 months free).
- Verification depth — RICS check only, or also insurance, references, past work?
- Geographic scope at launch — all UK, or pilot region (Brighton/London since demo data lives there)?
- Multi-user housing association accounts — what's the smallest housing association we'd target?
