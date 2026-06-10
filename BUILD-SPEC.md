# Surveyors UK — Build Spec

**Canonical source of truth.** Edit this file in place as decisions are made.

**Last updated:** 2026-06-08
**Sister documents:** `HANDOFF.md` (session whiteboard) · `reference/mockup.html` (original visual prototype)

---

## What Surveyors UK is

A **Plentific-style marketplace** for the UK surveying industry. Three sides:

- **Requesters** — councils, landlords (individual through housing associations), other property owners — post survey requirements and receive **quotes** from vetted surveyors.
- **Surveyors** — vetted professionals who submit quotes on matched work, win jobs, and run them through to completion in-app.
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
- Live: https://surveyors-uk.vercel.app/

---

## Operating principles

1. **Verified credentials only.** RICS membership + supporting docs reviewed before a surveyor can quote on work.
2. **Trust the data.** Sort by data (verified first, rating, recency) — never algorithmic "top picks".
3. **Privacy by design.** Contact details locked behind engagement; consent flows from day one.
4. **Multi-requester from day one.** Councils, landlords, housing associations — same posting flow, role-specific fields.
5. **Quote, don't just intro.** Surveyors submit a real quote (price, timeline, scope notes); requester picks one. End-to-end, not lead-gen.

---

## Roles

| Role | Status default | Capabilities |
|---|---|---|
| `surveyor` | `pending` until verified | Browse open requests; submit quotes (planned); upload credentials |
| `council` | `active` | Post requests; review quotes; award work |
| `landlord` | `active` (planned) | Same as council but with optional property portfolio |
| `admin` | `active` | Verify surveyors, review documents, import LinkedIn pool, moderate everything |

Future: **housing association** as a multi-user variant of `landlord` — a single account with several team members. Defer until single-user landlord works.

---

## Schema — current (Phase 1 — ✓ DONE)

```
profiles                — auth.users mirror; role + status
surveyors               — RICS, region, phone, bio, qualifications[]
councils                — council_name, department, region, phone, about
survey_requests         — title, type, region, address, deadline, budget, description, status
request_interests       — surveyor_id × request_id  (will evolve into quotes)
credential_documents    — uploads with verification status
```

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

### Phase 3 — Trust + UX polish (IN PROGRESS)
Done: ratings/reviews (2026-06-09) · email notifications (2026-06-08, needs Resend key to activate) · property type filtering (2026-06-10) · insurance verification (2026-06-11).
Remaining (in agreed order): in-app messaging → payment + invoicing (payment needs the pricing tier £ numbers settled first).

### Phase 4 — Mobile + scale (PARKED)
Mobile-first browse for surveyors on the road · push notifications · advanced search · admin analytics.

---

## Auth credentials (dev only)

| Account | Email | Password |
|---|---|---|
| Admin (Kerri) | kerri@thetalentnetwork.com.au | _set 2026-06-01, see secure store_ |
| Demo Surveyor (verified) | james@walkersurveys.co.uk | demo1234 |
| Demo Surveyor (verified) | sarah@precisionsurveys.co.uk | demo1234 |
| Demo Surveyor (pending) | david@murrayenv.co.uk | demo1234 |
| Demo Council | emily@brighton.gov.uk | demo1234 |
| Demo Council | mark@camden.gov.uk | demo1234 |

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
