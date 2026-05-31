# Handoff notes — Surveyors UK

Shared whiteboard between Claude sessions. Read this at the start of a session. Append a dated entry at the top when leaving work in flight or wrapping a session.

Format: newest entries at the top. Keep entries short. Delete anything stale.

---

## 2026-06-01 — Claude Code — Phase 2 shipped: landlords, quotes + lifecycle, LinkedIn pool

### What was done (Build 1: Landlord role)
- `landlord` added to `user_role` enum; `landlords` table with `business_name`, `landlord_type`, `region`, `address`, `phone`, `about`.
- `handle_new_user()` extended to create `landlords` row from signup metadata.
- `survey_requests_insert` RLS now allows both councils AND landlords.
- React: `LANDLORD_TYPES` constant, 3-way role selector on Register, full `LandlordDashboard.jsx` mirroring CouncilDashboard, `/landlord` route, landing-page button, Header icon.

### What was done (Build 2: Quotes + job lifecycle)
- `quote_status` enum (submitted | withdrawn | won | lost); `quotes` table with `price`, `days_to_complete`, `scope_notes`; unique `(request_id, surveyor_id)`.
- `survey_requests.awarded_quote_id` added; status enum extended with `awarded`, `in_progress`, `completed`, `cancelled`.
- Migrated existing `request_interests` rows into `quotes` (no price, scope notes flagged as migrated).
- RLS on quotes: surveyor own; requester sees quotes on their own requests; admin all.
- `survey_requests_select` updated so surveyors keep seeing requests they've quoted on after status changes.
- React: new `SubmitQuoteModal`, rewritten `RequestCard` (status badges, price summary, quote button), rewritten `RequestDetailModal` (quote review + Award + In-progress + Completed buttons), `AppContext` mutations: `submitQuote`, `withdrawQuote`, `awardQuote`, `updateRequestStatus`.

### What was done (Build 3: LinkedIn seed pool + claim)
- `linkedin_profiles` table with `name`, `email`, `rics`, `region`, `position_title`, `company`, `linkedin_url`, `qualifications`, `bio`, `raw_csv_row`, `claimed_by`, `claimed_at`, `imported_at`, `imported_by`. (`current_role` is a Postgres reserved word — renamed to `position_title`.)
- RLS: admin all; owner sees own claimed; active users can browse unclaimed.
- `match_linkedin_profile(email, name, rics)` RPC — anon-callable, SECURITY DEFINER, returns at most one likely match.
- `claim_linkedin_profile(linkedin_id)` RPC — authenticated, links to caller's profile + folds fields into surveyors row.
- React: `LinkedInImport` component (papaparse-based CSV upload, preview, commit). New `LinkedIn Pool` tab on AdminDashboard showing all imported profiles with claim status. Register page: "Check if we already have your profile" button → calls match RPC → "claim & autofill" UI; after successful signUp, calls claim RPC.

### Current state
- Persistence end-to-end working for everything in Phase 2.
- All Phase 2 sub-features deployed: https://surveyors-uk.vercel.app/
- `papaparse` added to dependencies (CSV parsing).
- One Postgres advisory remaining from Phase 1: `auth_leaked_password_protection` disabled (toggle in Supabase Auth settings if wanted).
- `request_interests` table still exists but is no longer written to. Dropping it is a 1-line migration when we're sure no rollback is needed.

### What's next (suggested)
- **Property portfolio for landlords** (Phase 2b — was deferred): `properties` table + property-typed requests. Useful for housing associations.
- **Emails / notifications** — surveyors when a request matches them; requesters when quotes arrive; both sides on award/lifecycle changes. Likely via Supabase edge functions + a transactional email provider.
- **Document storage upload** — credential documents currently just record filenames. Wire to Supabase Storage with a `credentials` bucket and signed URLs.
- **Drop `request_interests`** once we're confident the quotes flow is the only path forward.
- **Multi-user org accounts** for housing associations (Phase 2f) — still parked.

---

## 2026-06-01 — Claude Code — Supabase persistence live + new direction (Plentific-style marketplace)

### What was done
- Designed and applied initial Supabase schema (`profiles`, `surveyors`, `councils`, `survey_requests`, `request_interests`, `credential_documents`) with full RLS.
- Built `handle_new_user()` trigger that creates the right role-row on signup from auth metadata.
- Built `is_admin()` helper for RLS policies; revoked anon EXECUTE on both SECURITY DEFINER functions (security advisory fix).
- Seeded admin (kerri@thetalentnetwork.com.au), 3 demo surveyors (2 active + 1 pending), 2 demo councils, 4 demo requests, 1 interest, 3 verified credential docs. Demo password: `demo1234`. Admin password generated separately.
- Replaced in-memory `AppContext.jsx` with a Supabase-backed version (same `useApp()` shape so pages didn't need rewrites). Loads session on mount, listens for auth state changes, reloads on mutation.
- Updated Register, Login, dashboards to await async actions. Added pending/rejected banners on SurveyorDashboard.
- Built `AdminDashboard` with five tabs: Pending Surveyors (approve/reject), All Surveyors, Councils, All Requests, Document Review (verify/reject documents).
- Added `/admin` route. App.jsx now redirects to the right dashboard based on role after login; `PublicOnly` guards login/register.
- All changes live at https://surveyors-uk.vercel.app/.

### Product direction confirmed this session
**Plentific is the product reference.** Surveyors UK is becoming a Plentific-style marketplace adapted for surveys:
- Multiple requester types (councils + landlords incl. housing associations)
- Quote-based engagement (not just "express interest")
- Job lifecycle in-app (open → awarded → in_progress → completed)
- LinkedIn seed pool for surveyors so the marketplace doesn't look empty at launch (admin CSV import → claim-on-registration UX)

### Current state
- Persistence working end-to-end. Auth, registration, role-gated dashboards, admin verification flow all live.
- Two security advisories outstanding (pre-existing, not from our schema): `public_bucket_allows_listing` on the leftover `website` bucket, and `auth_leaked_password_protection` disabled. Neither blocks anything.
- No quoting, no landlords, no LinkedIn pool yet — those are Phase 2.

### What's next — Phase 2 (decided with Kerri but not yet sequenced)
- **2a. Landlord role** — registration + dashboard mirroring council
- **2b. Property portfolio** — `properties` table; survey requests can target a property
- **2c. Quoting** — replace `request_interests` with a real `quotes` table (price, days, scope_notes); requester awards
- **2d. Job lifecycle** — request statuses: open → quoting_closed → awarded → in_progress → completed
- **2e. LinkedIn seed pool + claim flow** — admin CSV import; surveyor claims pre-existing profile at registration
- **2f. Multi-user org accounts** for housing associations — DEFER

Kerri to confirm sequence next session. Recommended first move: **2a landlord** (small, low-risk) followed by **2c quoting** (highest product impact — turns this from "intro service" to "marketplace").

---

## 2026-05-31 — Claude Code — Initial scaffold, deploy, AND mockup ported to React

### What was done
**Morning — scaffold + deploy**
- Discovered existing single-file HTML mockup at `OneDrive\Documents\Claude\Projects\Surveyors UK\` (70 KB, two identical copies). Moved into `reference/`.
- Scaffolded the project at `C:\Users\kerri\OneDrive\Desktop\surveyors-uk\` mirroring `level-app` (React 19 + Vite 8 + Tailwind 4 + Supabase + Router 7).
- Supabase project link: ref `zxraxgjzmthgzilgkihb`, region `eu-west-2`. `.env.local` written with publishable key.
- GitHub repo `Kerrigeo80/surveyors-uk` created, code pushed.
- Vercel project set up, env vars added, auto-deploy on push wired.
- `BUILD-SPEC.md` written as the canonical spec; this `HANDOFF.md` started as the session whiteboard.

**Afternoon — port the mockup to React**
- Full 1:1 port of `reference/mockup.html` into a React/Vite app, preserving the visual design exactly (CSS copied verbatim into `src/index.css`).
- New structure:
  - `src/lib/data.js` — UK regions, qualification types, demo users + requests, helpers
  - `src/lib/AppContext.jsx` — in-memory store + provider (users, requests, currentUser, toasts) with register/login/logout/createRequest/closeRequest/toggleInterest/addDocument/updateCurrentUser
  - `src/components/` — Header, Toasts, RequestCard, RequestDetailModal, UploadQualificationModal
  - `src/pages/` — Landing, Register, Login, SurveyorDashboard (overview / qualifications / available requests / my interests / profile), CouncilDashboard (overview / my requests / new request / browse surveyors / profile)
  - `src/App.jsx` — React Router (`/`, `/register`, `/login`, `/surveyor`, `/council`) wrapped in `AppProvider`
- Routes for dashboards `<Navigate to="/login">` if not logged in as the matching role.
- Demo login buttons (Demo Surveyor / Demo Council) still work for fast preview.

### Current state
- Repo on `main`, clean working tree, latest commit pushed and deployed.
- **Live URL** (shareable): https://surveyors-uk.vercel.app/
- Full app is browsable end-to-end, but **all state is in-memory** — refreshing the page resets it. No Supabase persistence yet.
- `reference/mockup.html` still preserved for reference. `public/mockup.html` also still serves the original static version at `/mockup.html` (consider removing once React app is the source of truth).
- Supabase project is empty — no tables, no migrations, no edge functions.

### What's next (suggested)
- **Decide on Supabase persistence model** — replicate the in-memory `AppContext` shape into Supabase tables (users/profiles, requests, interests, documents). Most of the React code is already shaped around the right data model.
- **Replace demo auth with Supabase Auth** — email/password or magic link; preserve the demo-login buttons as fixtures for now or behind a `VITE_DEMO=true` flag.
- **Document upload** currently just records the filename — wire to Supabase Storage with a `credential-documents/` bucket and a verification queue.
- Fill in BUILD-SPEC's "Open questions" section (target market, revenue model, verification depth, launch plan).
- Decide whether the original static `public/mockup.html` should be removed (now redundant) or kept as a designer reference.
