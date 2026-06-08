# Handoff notes — Surveyors UK

Shared whiteboard between Claude sessions. Read this at the start of a session. Append a dated entry at the top when leaving work in flight or wrapping a session.

Format: newest entries at the top. Keep entries short. Delete anything stale.

---

## 2026-06-09 — Claude Code — Surveyor ratings & reviews

Requesters rate the winning surveyor after a job completes; ratings surface across the app as a public trust signal (serves the "trust the data" operating principle).

- **Schema:** `reviews` table (`request_id` unique → one review per completed job, `surveyor_id`, `reviewer_id`, `rating` 1–5, `comment`). RLS: insert only by the requester who owns a *completed* request for the surveyor who *won* it; readable by all signed-in users; reviewer can amend own; admin all. `notify_on_review_insert` trigger → notifies (and now emails) the surveyor.
- **AppContext:** loads `reviews`; attaches `rating` (avg, 1dp) + `reviewCount` + `reviews[]` to every surveyor in the users list and to `currentUser`; attaches the per-job `review` to each request; new `submitReview(request, {rating, comment})` mutation.
- **UI:** new `RatingStars.jsx` (`RatingDisplay` + interactive `RatingInput`). Review form (or the submitted review) on completed jobs in `RequestDetailModal`; ★ rating shown on each quote (helps "trust the data" when awarding); ★ on surveyor cards in Council + Landlord browse tabs; rating stat + "Recent Reviews" block on the surveyor's own overview.
- **Verified:** `npm run build` clean. Live-flow (complete a job → leave review → surveyor sees it + gets notified) should be eyeballed after deploy.
- Note: one-sided for now (requester → surveyor). Two-sided (surveyor rates requester) is a future option if wanted.

---

## 2026-06-09 — Claude Code — Realtime bell + dropped request_interests + code-splitting

Three quick wins off the "What's next" list. **Frontend changes are committed to working tree but NOT yet pushed** — push `main` to deploy to Vercel.

- **Realtime notifications:** `notifications` added to the `supabase_realtime` publication. New `useEffect` in `AppContext.jsx` subscribes to INSERT/UPDATE on the current user's rows and updates the bell live (INSERT prepends w/ dedupe, UPDATE replaces in place). RLS still scopes to own rows. Removed the now-redundant window-focus refresh in `NotificationsBell.jsx` (kept the cheap refresh-on-open as a catch-up).
- **Dropped `request_interests`:** confirmed zero code references (grep) and that `quotes` fully replaced it; table dropped. Had 1 stale migrated row.
- **Code-splitting:** dashboards + BetaTest are now `React.lazy` + `<Suspense>` in `App.jsx`. Main bundle 462 kB (was >500 kB; warning cleared). Dashboards are separate chunks (Admin 35 kB, Landlord 16 kB, Surveyor 15 kB, Council 12 kB).
- **Verified:** `npm run build` succeeds; realtime publication confirmed to include `notifications`. Realtime live-update itself should be eyeballed in-browser after deploy (needs two sessions or a manual insert).

---

## 2026-06-08 — Claude Code — Email send-out wired (needs Resend key to activate)

Built the email delivery channel on top of the existing in-app notifications. All 5 notification flows now get email "for free" — without touching their triggers.

**Architecture**
- One `AFTER INSERT` trigger on `notifications` → `public.send_notification_email()` (SECURITY DEFINER) → async `net.http_post` to the `send-notification-email` edge function. Resolves recipient from `profiles.email`.
- Edge function `send-notification-email` (deployed, `verify_jwt=false`): shared-secret auth via `x-webhook-secret`, renders branded HTML, sends via Resend. Source version-controlled at `supabase/functions/send-notification-email/index.ts`.
- `pg_net` extension enabled. Webhook shared secret stored in Vault as `email_webhook_secret`.
- **Fail-safe:** the trigger swallows every error and returns NEW — email problems can NEVER break a notification insert. If the Vault secret or Resend key is missing it silently no-ops / returns 200.

**Verified:** test notification insert → trigger fired → pg_net reached the function → got `401` (expected, since edge `WEBHOOK_SECRET` not set yet). Plumbing confirmed end-to-end. Test row cleaned up.

**⚠️ TO ACTIVATE (Kerri's action — can't be done via MCP):**
1. Create a Resend account → get an API key.
2. In Supabase dashboard → Edge Functions → `send-notification-email` → Secrets, set:
   - `RESEND_API_KEY` = (from Resend)
   - `WEBHOOK_SECRET` = `48764a682b51584ae8b232cb9cf3bcc706cde76ddd4a9308`  (matches the Vault secret)
   - *(optional later)* `EMAIL_FROM` = a verified-domain sender; until then it uses `onboarding@resend.dev`, which only delivers to your own Resend account email.
3. Without a verified sending domain, Resend only delivers to the account owner's address — fine for testing; add a domain (e.g. `mail.surveyors-uk.co.uk`) before real users rely on it.

**Note:** no custom domain yet (Kerri confirmed). Sender defaults to Resend onboarding address.

**Security advisor follow-ups (done / known):**
- Revoked `EXECUTE` from `PUBLIC` on all 6 trigger functions (the 5 `notify_*` + `send_notification_email`) — clears the "anon/authenticated can execute SECURITY DEFINER function" warnings. Trigger functions fire regardless of grants, so this is safe.
- `pg_net` is installed in the `public` schema (the only schema it allows — it's non-relocatable). The `extension_in_public` advisory for `pg_net` is benign and expected; leave it.
- Pre-existing, unrelated: `auth_leaked_password_protection` still disabled; `website` public bucket allows listing. Neither touched this session.

---

## 2026-06-08 — Claude Code — Pricing DECIDED (was parked)

Kerri settled the pricing model. Full detail in `BUILD-SPEC.md` → "Pricing — DECIDED". Summary:
- **Commission:** 10% of awarded job value, **requester-side, added on top**, **always payable** (no trial exemption). £350 job → surveyor gets £350, requester pays £385.
- **Subscriptions:** every registered user both sides; **3 months free per user from their own signup** (needs per-user `trial_ends_at`); then **tiered**. Starter tiers drafted (surveyor Free/Pro; requester Individual Landlord / Property Company / Council / Housing Association) — £ are placeholders pending unit-economics.

Still open before any billing build: exact £ per tier, the limit numbers behind "limited quotes/open requests", commission timing (post-completion vs escrow at award), payment provider (Stripe assumed). **No billing code written yet** — this was a decision-recording session only.

---

## 2026-06-01 — Claude Code — Parked items shipped + beta-test flow

### Pricing parked
Kerri proposed: 3-tier subs for all sides + 10% from each side on awarded work. Claude pushed back (effective 20% take + council subscription is unusual; risks off-platform deals + procurement friction). Both options captured side-by-side in `BUILD-SPEC.md` under "Pricing — two options on the table". Decision deferred until comparable-market research and pilot signal.

### Build A — Property portfolio for landlords
- `property_type` enum (`residential`, `commercial`, `mixed`, `land`); `properties` table with `landlord_id`, `address`, `postcode`, `region`, `type`, `units`, `notes`; RLS so landlords manage own + surveyors can see the property attached to a request they can quote on.
- `survey_requests.property_id` (nullable) so requests can attach to a specific property.
- React: `PROPERTY_TYPES` constant, "My Properties" tab on LandlordDashboard (add/list/remove), property selector in create-request that auto-fills address & region.

### Build B — Notifications (in-app)
- `notifications` table with `type`, `title`, `body`, `link`, `payload`, `read_at`.
- DB triggers (SECURITY DEFINER):
  - Quote inserted → notify the requester
  - Quote `status` changes to `won`/`lost` → notify the surveyor
  - Profile `status` changes (admin verification) → notify the surveyor
  - Request `status` changes (in_progress, completed) → notify the awarded surveyor
  - Document `status` changes (verified, rejected) → notify the surveyor
- React: `NotificationsBell` in Header with unread count badge, dropdown with mark-read + mark-all-read, refresh on window focus.
- Email integration NOT done — system is in-app only. Adding Resend/SendGrid is now a small step (an edge function + a trigger that pg_net's into it). See "What's next".

### Build C — Document storage uploads
- Private Supabase Storage bucket `credentials` with file paths `{userId}/{timestamp}-{filename}`.
- RLS on `storage.objects` for the bucket: insert/select/delete gated to the owning user's folder OR admin.
- React: `UploadQualificationModal` now does a real `supabase.storage.from('credentials').upload(...)` followed by a `credential_documents` insert with `file_path`. `DocumentLink` component generates short-lived signed URLs on click. Visible on the surveyor's qualifications list AND in the admin's Document Review tab.

### Build D — Beta-test flow + feedback capture
- `feedback` table: `user_id`, `role`, `scenario`, `works_well` (bool), `rating` (1-5), `comment`. RLS lets users insert/see own; admin sees all.
- New `/beta` route with role-specific guided scenarios (surveyor, council, landlord — 4 each). Each scenario has a checklist + 👍/👎 + comment + per-scenario submit. Plus an "Overall impression" section with a 1-5 rating + free text.
- Header gets a "🧪 Beta test" button when logged in.
- Admin gets a "💬 Beta Feedback" tab showing all submissions.

### Current state
- All four chunks deployed to https://surveyors-uk.vercel.app/
- New migrations: `add_properties_table`, `add_notifications`, `add_credentials_storage_bucket`, `add_feedback_table`
- Six new React files: `NotificationsBell`, `DocumentLink`, `BetaTest` page, plus changes across LandlordDashboard, SurveyorDashboard, AdminDashboard, App, Header, AppContext.

### What's next (suggested)
- **Email send-out** (small): Resend (or SendGrid) account + API key; one edge function `send-notification-email` that takes a notification row and renders/sends; either pg_net trigger on notifications insert, or a webhook called from the existing triggers.
- **Realtime notifications** (small): swap focus-refresh for `supabase.channel('notifications:user_id=eq.X')` so the bell updates without re-focusing the tab.
- **Drop `request_interests`** — it's dead. Confirm no rollback risk, then drop.
- **Code-splitting** — bundle is over 500kB; lazy-load the dashboards.
- **Multi-user org accounts for housing associations** — still parked.
- **Rating / review** of surveyors after a completed job — natural Plentific extension.

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
