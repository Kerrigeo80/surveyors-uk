# Surveyors UK — Build Spec

**Canonical source of truth.** Edit this file in place as decisions are made.

**Last updated:** 2026-06-01
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

### Phase 3 — Trust + UX polish (PARKED)
Ratings/reviews · insurance verification · property type filtering · in-app messaging · email notifications · payment + invoicing.

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

## Pricing — two options on the table (decision parked 2026-06-01)

A 3-month free trial for everyone is locked in for launch. After the trial, two pricing models are under consideration.

### Option A — Kerri's original proposal
- **3-tier subscriptions for all three sides** (surveyor / landlord / council)
- **10% commission from the council/landlord side** AND **10% commission from the surveyor side** on awarded work
- Effective platform take per transaction: ~20% of the quote value, plus subs

### Option B — Claude's counter (single-sided commission, councils free)
- **Councils:** free forever (procurement is sticky; price-sensitive; they're the demand-side moat — match Plentific's approach)
- **Landlords:** tiered subscription
  - Free for individual landlords (limit on number of open requests)
  - ~£29/mo for property companies (multi-property, more open requests)
  - Enterprise contracts for housing associations (multi-user accounts, SLA)
- **Surveyors:** free tier with limited quotes/month + paid tier for unlimited quotes/visibility + **10% commission on awarded work** (single-sided)
- Effective take per transaction: 10% from the supply side only; subscription revenue from landlords

### Why the disagreement matters
- 20% combined take on £500–£5000 jobs ≈ £100–£1000 of friction per deal — high enough that surveyors will quietly arrange repeat work off-platform once trial ends. Two-sided marketplaces that take from both sides usually cap each side at 3–5%.
- Charging councils a subscription adds procurement-approval friction at exactly the wrong moment in adoption.
- Single-sided commission keeps incentives aligned: the platform only earns when a surveyor wins paid work.

### Decision criteria when revisiting
- Research what comparable platforms (Plentific, Procore, Houzz Pro for trades) take from each side
- Pilot with a small set of councils and landlords to see if subscription is a dealbreaker
- Model the unit economics on realistic deal volume

## Open product questions

- Revenue model — subscription for surveyors / commission on awarded work / posting fee for councils?
- Verification depth — RICS check only, or also insurance, references, past work?
- Geographic scope at launch — all UK, or pilot region (Brighton/London since demo data lives there)?
- Multi-user housing association accounts — what's the smallest housing association we'd target?
