# Surveyors UK — Build Spec

**Canonical source of truth.** Edit this file in place as decisions are made. Do not create parallel versions. Git preserves history — `git log BUILD-SPEC.md` for previous states.

**Last updated:** 2026-05-31
**Audience:** Claude (Cowork + Claude Code in VS Code), Kerri, future-Kerri
**Sister documents:** `HANDOFF.md` (session-to-session whiteboard) · `reference/mockup.html` (original visual prototype)

---

## What Surveyors UK is

A two-sided matching platform that connects **UK local councils** with **qualified, verified surveyors**.

- **Councils** post survey requirements and receive quotes from verified surveyors in their area.
- **Surveyors** display credentials (RICS etc.), discover matched council work, and quote on requirements.
- **Verification** is the moat: all surveyor qualifications are reviewed before they can quote.

(Description derived from `reference/mockup.html` — confirm/expand with Kerri.)

---

## Stack

- React 19 + Vite 8 (JSX, no TypeScript)
- React Router v7
- Tailwind v4 (via `@tailwindcss/vite`)
- Supabase — project ref `zxraxgjzmthgzilgkihb`, region `eu-west-2`
- Supabase client: `src/lib/supabase.js`
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (also configured in Vercel)
- Hosting: Vercel, auto-deploy from `main` on GitHub (`Kerrigeo80/surveyors-uk`)
- Live URL: https://surveyors-uk.vercel.app/

Mirrors the structure of [`level-app`](../level-app/).

---

## Operating principles

_To be defined with Kerri. Likely candidates, borrowed from Level's approach:_

1. **Verified credentials only.** RICS / equivalent qualifications must be reviewed before a surveyor can quote on council work.
2. **Councils trust the data, not the marketing.** Display facts (qualifications, areas covered, past council work) — no algorithmic "top picks".
3. **Privacy by design.** Surveyor contact details locked until a council engages; consent flows from day one.
4. **Geographic + credential matching.** Match councils to surveyors by location and qualification, not paid promotion.

---

## Phase 0 — Scaffolding (✓ DONE — 2026-05-31)

- Vite + React + Tailwind + Supabase scaffold mirroring level-app
- Supabase project created in eu-west-2
- GitHub repo created, code pushed to `main`
- Vercel project created, env vars wired in, auto-deploy on push
- Original HTML mockup preserved at `reference/mockup.html` and also served at `/mockup.html` on production for sharing

---

## Phase 1 — Auth + accounts (NOT STARTED)

- Separate registration flows for **councils** and **surveyors**
- Decide: email + password? email OTP? phone OTP?
- Demo / preview mode for prospects to look around before signing up (mockup has this — confirm intent)

## Phase 2 — Surveyor credential capture + verification (NOT STARTED)

- Surveyor uploads RICS membership + supporting docs
- Admin (Kerri) review queue → approve / reject with notes
- "Verified" badge surfaces to councils

## Phase 3 — Council requirements + quoting (NOT STARTED)

- Council creates a survey request (location, type, scope, deadline)
- System matches verified surveyors by qualification + geography
- Surveyors see matched requests in their dashboard and submit quotes
- Council compares quotes, selects surveyor

## Phase 4 — Profile pages + dashboards (NOT STARTED)

- Surveyor dashboard: credentials, available requests, quotes submitted
- Council dashboard: open requests, received quotes, surveyor browse
- Public-ish surveyor profile (visible to councils once verified)

## Phase 5 — Payments / billing (PARKED — decide model later)

- Listing fee for surveyors? Per-quote fee? Commission on awarded work?
- Council pays / surveyor pays / both?

---

## Open questions for Kerri

- **Target market specifics:** all UK councils, or starting with a region?
- **Revenue model:** subscription, transaction fee, lead-gen fee?
- **Verification depth:** RICS check only, or also insurance, references, past council work?
- **Competitive landscape:** who else does this? What's the wedge?
- **Launch plan:** which councils are the design partners?

---

## Schema (TBD)

No Supabase tables created yet. To be designed once Phase 1/2 details are confirmed. Likely starting tables:

- `councils` (council org details, contact)
- `surveyors` (individual or firm details, areas served)
- `credentials` (RICS membership + uploaded docs, verification status)
- `survey_requests` (council posts)
- `quotes` (surveyor responses to requests)
