# Handoff notes — Surveyors UK

Shared whiteboard between Claude sessions. Read this at the start of a session. Append a dated entry at the top when leaving work in flight or wrapping a session.

Format: newest entries at the top. Keep entries short. Delete anything stale.

---

## ⭐ NEXT UP — Wire Stripe (blocked on business registration)

Payments are now **modelled in-app**: **10% commission added on top** of completed jobs (surveyor keeps full fee; org pays fee×1.10) + subscription tiers both sides. Admin → Billing drives the rate + plan prices. DB-tested. What's left:

1. **Set real subscription prices** in admin → Billing (currently "to be confirmed").
2. **Wire Stripe** — Billing for subscriptions + invoicing/Connect for the commission & surveyor payouts. **Blocked on** registering the business with Companies House + a business bank account (Stripe needs these for payouts).

Parked until closer to launch: **go-live prep** (backups/PITR, final SSL confirmation), **Companies House** auto-check for surveyor entities (needs the free CH API key).

Quick housekeeping: **rotate the Resend API key** (shared in chat 2026-06-16).

## Also pending (not blocking)
- **Rotate the Resend API key** — shared in chat 2026-06-16; create a fresh one in Resend + update the Supabase edge-fn `RESEND_API_KEY` secret.
- **Supabase Auth SMTP** — optional: point at Resend (`smtp.resend.com:465`, user `resend`, pass = API key) so auth/reset emails come from outsourcesurveys.uk (currently default Supabase sender; reset links already work).
- **LinkedIn lookup hardening** — `match_linkedin_profile` is anon-callable (needed for pre-login signup match) but returns scraped personal data; consider exact-email-only matching or rate limiting.
- **Branding decision** — app/email say "Surveyors UK"; company/domain is "Outsource Surveys". Align before launch?

---

## 2026-06-16 — Cowork (Claude) — Verification gate, admin tools, direct offers, email LIVE, domain, unified customer model

Big session. Repo moved off OneDrive to `C:\Users\kerri\Projects\surveyors-uk`. Email went live. Customer model unified. All committed & pushed; `npm run build` clean.

- **Surveyor verification gate** (migrations `surveyor_entity_verification_gate`, `enforce_surveyor_entity_verification`, `surveyor_entity_sync_bypass`, `harden_verification_functions`). A surveyor must clear **4 gates** before they can quote / be matched / accept work — enforced in DB (RLS on `quotes` insert + `private.surveyor_work_ready(uuid)`), not just UI: (1) **trading entity** — `surveyors.entity_type` sole_trader/limited_company + `entity_status='verified'` (admin-only; trigger `enforce_surveyor_entity` blocks self-verify); (2) **PI insurance** verified, in-date, cover ≥ RICS minimum for `fee_band` (under_100k→£250k / 100k_200k→£500k / over_200k→£1m via `private.required_pi_minimum`); (3) **≥1 verified credential_document**; (4) **liability declaration** (`liability_declared_at`). Maintained `surveyors.work_ready` bool + auto `profiles.status`→active via `private.sync_surveyor_work_ready` (tx-local flag `app.sync_work_ready` lets the sync bypass the enforce trigger). New surveyor cols: entity_type, trading_name, company_number, company_name, company_status, company_verified_at, vat_number, fee_band, entity_status, liability_declared_at, work_ready.
- **Surveyor UI:** new ✅ Verification tab (EntityForm + LiabilityCard + 4-step checklist via `verificationChecklist()` in data.js). Quote buttons gate on `currentUser.workReady` (was `status==='active'`) in RequestDetailModal + RequestCard.
- **Admin UI:** 🏢 Entities tab (verify/reject entity + Companies House lookup link), Insurance tab shows required PI min vs cover (flags underinsured), 🔎 Match Surveyors tab (recruiter search/match to a job, email + share-job mailto), 📣 Follow-up tab (unverified surveyors + exactly what each is missing + outreach mailto). `setEntityStatus` admin action added.
- **Direct fixed-fee offers** (migration `direct_assign_offers`, DB-tested OK). `offers` table + RLS; an org offers a job at a set fee to a work-ready surveyor; surveyor **accepts** (via SECURITY DEFINER RPC `accept_offer` → creates a 'won' quote at the fee, awards the job, notifies the org) or **declines**. Org UI: DirectOfferSection in RequestDetailModal (verified-surveyor picker, flags matches). Surveyor UI: 📨 Job Offers tab. `notify_offer` trigger notifies surveyor on new offer.
- **Email LIVE & tested.** Resend secrets set in edge fn (`RESEND_API_KEY`, `EMAIL_FROM`, `WEBHOOK_SECRET`=vault value, `SITE_URL`). Test: inserting a notification → pg_net 200 `{"sent":true}` → email received in inbox. (Auth SMTP still default Supabase sender — optional follow-up.)
- **Domain:** `outsourcesurveys.uk` pointed at Vercel — Cloudflare root **A → 76.76.21.21**, **www CNAME → cname.vercel-dns.com**, both **DNS-only (grey cloud)**. www is primary; apex 308-redirects. SSL issued. Supabase Auth Site URL + redirect URLs set to the new domain (fixed the localhost:3000 reset-link bug).
- **Customer model unified** (migration `unify_customer_org_type`). Councils + landlords → one **"Organisation"** customer (still the `council` role under the hood — no enum churn). `councils.org_type` (council/housing_association/almo/managing_agent/property_company/private_landlord) + `councils.address`. `properties_insert` RLS now allows the council role. Registration = **Surveyor + Organisation** (org_type select); landlord signup retired. CouncilDashboard = unified Organisation dashboard (added Properties tab ported from landlord; ProfileTab has org_type+address; sidebar shows org type). Landing + Admin relabelled ("Organisations"). Legacy `landlord` role/route/LandlordDashboard kept for back-compat (no real landlord data).
- **Payments model** (migration `payments_model_foundation`) — **modelled, Stripe NOT wired** (deferred until business registered + bank). Model: subscriptions both sides + **10% commission added on top** of completed jobs (surveyor keeps full fee; org pays fee×1.10; platform keeps 10%). Tables: `platform_settings` (commission_rate=0.10 + plan prices, admin-editable), `subscriptions` (Stripe-ready/inert), `job_charges` (auto-snapshot via SECURITY DEFINER trigger `create_job_charge` on status→completed, from winning quote × rate). DB-tested: £300 → fee 300 / commission 30 / total 330. UI: Org 💷 Billing (invoices), Surveyor 💷 Earnings, Admin 💷 Billing (edit rate/prices + revenue stats), payment breakdown on completed job. Sub prices still TBC; everyone "Founding member (free)", no gating yet.
- Security advisors clean — remaining warnings all intentional (pg_net in public; anon `submit_hazard_report`/`org_public_name`; authenticated `claim_linkedin_profile`/`accept_offer`).

---

## 2026-06-15 — Cowork (Claude) — Email + domain + DNS → Cloudflare

- **Domain:** `outsourcesurveys.uk` bought via Crazy Domains (trading name "Outsource Surveys"). Business not yet registered with Companies House.
- **Google Workspace email LIVE:** kerri@ (paid) + hello@/info@ (free aliases). Verified via Google CNAME method.
- **DNS moved to Cloudflare (free).** Crazy Domains standard DNS only does A/AAAA/CNAME/MX — couldn't add the TXT records. Cloudflare scanned/imported existing records; nameservers switched at Crazy Domains to julio/miki.ns.cloudflare.com. From now on **all DNS is managed in Cloudflare**, not Crazy Domains.
- **All 9 DNS records entered in Cloudflare** (see `dns-records-checklist.md`): A root+www (parking, proxied), MX root smtp.google.com pri1, MX send feedback-smtp.eu-west-1.amazonses.com pri10, TXT root Google SPF, TXT google._domainkey (Google DKIM), TXT resend._domainkey (Resend DKIM), TXT send (Resend SPF v=spf1 include:amazonses.com ~all), TXT _dmarc (v=DMARC1; p=none;). Two SPF on separate names (root=Google, send=Resend) → no conflict. Google verification CNAME not re-added (optional).
- **Resend:** account created, domain added in **EU (Ireland / eu-west-1)** region. Awaiting verification (click after Cloudflare propagates).
- **Edge fn wiring audited & confirmed good:** trigger `email_on_notification_insert` → `send_notification_email()` (pulls Vault `email_webhook_secret`, posts to edge fn w/ x-webhook-secret). Vault secret is set. Edge fn ready; just needs RESEND_API_KEY + EMAIL_FROM secrets + verify_jwt=false confirmed. See NEXT UP.
- Also: app confirmed already fully built (React/Vite, connected to Supabase) — "wire up prototype" was already done; smoke-test build clean.

---

## 2026-06-15 — Cowork (Claude) — DB security/perf hardening + CRITICAL RLS recursion fix

Ran Supabase security + performance advisors and fixed the findings. 8 migrations. All verified by impersonating real users (set role + request.jwt.claims sub).

- **CRITICAL (was breaking the app): infinite RLS recursion.** `survey_requests`, `quotes`, `properties` policies referenced each other in a loop → every authenticated query on them threw "infinite recursion detected in policy". Fixed by moving the cross-table checks into SECURITY DEFINER helpers in a new **`private`** schema: `request_is_open`, `request_council_id`, `surveyor_has_quote`, `property_has_visible_request`, `can_review` (they read the other table without triggering its RLS). Migrations `add_rls_definer_helpers`, `rls_fix_recursion_and_initplan`. Verified: surveyor/council/admin see correct rows, owner of the one quote sees it, non-owners don't, anon gets empty (not error).
- **`is_admin()` + `is_conversation_participant()` MOVED to `private` schema** (no longer exposed as REST RPC). Policies now call `private.is_admin()`. `enforce_insurance_status` repointed. App code doesn't call these directly (checked) so no frontend change needed. NOTE: any NEW policy/function must reference `private.is_admin()`, not `public.`.
- **Performance:** wrapped `auth.uid()`/`is_admin()` in `(select …)` across all policies (cleared 41 initplan warnings) + consolidated duplicate admin "FOR ALL" policies (conversations/insurance/reviews/linkedin) → perf advisor now 0 warnings. Added covering indexes on 10 FKs (`add_foreign_key_indexes`).
- **Security:** narrowed the `website` bucket (dropped the list-everything SELECT policy; public URLs still work). `match_linkedin_profile` — briefly restricted to authenticated, then RESTORED to anon (`restore_anon_match_linkedin_for_signup`) because Register.jsx calls it pre-login; keep it anon. Leaked-password protection enabled (dashboard).
- **Left as-is:** `pg_net` in public (tied to email webhook — moving it risks breaking notifications). 7 remaining security advisor warnings are all intentional public RPCs (submit_hazard_report, org_public_name anon; claim/match_linkedin authed) — accepted.
- Frontend `npm run build` clean; lint has 7 pre-existing `set-state-in-effect` errors (not addressed).

---

## 2026-06-15 — Claude Code — Resident intake (per-org link → staff triage)

Residents report issues directly via a per-org public link; reports land in the org's queue to triage into a job. `npm run build` clean. Approach chosen 2026-06-14 (per-org link, staff triage — not full resident accounts).

- **Migration `add_resident_hazard_reports`:** `hazard_reports` table (org_id, resident_name/contact, address, postcode, category, description, status new|triaged|dismissed, request_id, reported_at). RLS: org-owner/admin select+update only. Anon submit via SECURITY DEFINER `submit_hazard_report(...)` (validates org, inserts, notifies org). `org_public_name(org_id)` for the public page header. `survey_requests` + `resident_name`, `resident_contact`, `source_report_id`. Verified: valid org inserts+notifies, bad org rejected.
- **Public page** `src/pages/ResidentReport.jsx` at `/report/:orgId` (no login, eager-loaded). Calls the two RPCs directly via supabase.
- **AppContext:** loads `reports` (RLS-scoped); `createRequest` now returns the new id, accepts resident fields + `sourceReportId` (auto-marks the report triaged + links it); `dismissReport`.
- **Dashboards (council + landlord):** new "🧾 Resident Reports" tab (shared `components/ResidentReports.jsx`) — shows the shareable intake link (copy button), new-reports queue with **Create job** (prefills the create form incl. reported-at = resident's report time, so the clock starts correctly) + **Dismiss**, and a handled list. Tab shows a count badge of new reports. Create form gained resident name/contact fields + a "created from report" banner.

### Clock-start note
Triaging a report sets the job's `reported_at` to the **resident's** submission time (not triage time) — accurate Awaab's Law clock start.

---

## 2026-06-14 — Claude Code — Awaab's Law hazard clock + matching/availability layer

Pivot toward the real product: a compliance-driven matching service for social-housing hazards. Two migrations applied + verified, frontend wired, `npm run build` clean, advisors clean.

### Brian Gaines login fix (start of session)
- Brian + Sarah couldn't log in: rows were hand-inserted into `auth.users` with NULL token columns → GoTrue 500 on /token AND /recover. Fixed (set tokens to ''). Added `public.seed_auth_user(email,password,metadata)` helper (migration `add_seed_auth_user_helper`) — use it for future seeding, never raw inserts. Brian to confirm login works.

### Awaab's Law hazard model + statutory clock (migration `add_awaabs_law_hazard_clock`)
- `survey_requests` now hazard-aware: `awaabs_applies`, `hazard_category`, `hazard_severity` (enum emergency|significant|routine), `reported_at`, milestone stamps (`investigated_at`/`summary_sent_at`/`made_safe_at`), trigger-computed deadlines (`investigate_by`/`summary_due_by`/`make_safe_by`).
- `uk_bank_holidays` table (England & Wales 2025–27) + `add_working_days()` for working-day math. `compute_awaabs_deadlines()` BEFORE trigger: emergency = +24h; significant = 10 working days investigate, 3 to summary, 5 to make-safe (summary/make-safe provisional off investigate-by until investigated). Verified against hand-calc incl. Christmas cluster.

### Matching + availability (migration `add_surveyor_availability_and_matching`)
- `surveyors`: `coverage_areas text[]` (postcode prefixes), `availability_status` (available|limited|unavailable), `available_from`, `accepts_emergency`. `survey_requests.postcode`.
- `notify_matching_surveyors()` AFTER INSERT trigger: notifies active + available surveyors whose skill (qualifications) + area (postcode prefix or region fallback) match a new open job. Verified: building job in Greater London notified James Walker only (not wrong-skill/region or pending surveyors). Fires existing email pipeline too.
- Postcode helpers `postcode_outward`/`postcode_area` (search_path pinned).

### Frontend
- `data.js`: HAZARD_CATEGORIES/SEVERITIES, AVAILABILITY_OPTIONS, `isMatch`/`matchReasons`, `awaabsClock` (per-milestone on_track/due_soon/breached/done + overall), `urgencyRank`, `dueLabel`, `COMPLIANCE_COLOR`.
- AppContext: maps all new fields; `createRequest` sends hazard+postcode; `updateCurrentUser` saves coverage/availability; new `setAwaabsMilestone(reqId, 'investigated'|'summary_sent'|'made_safe')`.
- SurveyorDashboard: matched feed (skill+area+available, urgency-sorted) with "Matched to me only" toggle; availability + coverage-areas + accepts-emergency controls in Edit Profile.
- Create-request forms (council + landlord): Awaab's Law toggle (category/severity/reported-at) + postcode (landlord auto-fills postcode from property).
- RequestCard: colour-coded Awaab's badge w/ soonest deadline. RequestDetailModal: full compliance section (3 milestones, due dates, status, requester/admin "Mark done").

### NEXT UP (agreed direction)
- **Resident intake** — per-org public intake link, staff triage into a live job (decided this session; resident dimension/fields on the job still to add).
- Then: compliance **dashboard panel** for requesters (at-risk/breached counts), **contractor stage** (remediation works after surveyor report), HA **multi-user** accounts.
- Frontend changes are in the working tree — push `main` to deploy to Vercel.

---

## 2026-06-13 — Claude Code — Pre-launch hardening: password reset, legal pages, security revokes

Knocking off launch must-haves identified in the app review.

- **Password reset** — `requestPasswordReset(email)` in AppContext (`resetPasswordForEmail`, redirect to `/reset-password`). New pages `ForgotPassword.jsx` (`/forgot-password`) and `ResetPassword.jsx` (`/reset-password`, unguarded — listens for the recovery session via `PASSWORD_RECOVERY`/`SIGNED_IN`, then `updateUser`). "Forgot your password?" link added to Login.
- **Legal + consent** — `Legal.jsx` renders Privacy (`/privacy`) and Terms (`/terms`); both are **draft templates flagged for legal review**, UK-GDPR-aware (controller, lawful basis, rights, LinkedIn-seed-pool erasure, cookies). Required consent checkbox added to Register (blocks submit until ticked). Footer links on Landing.
- **Security (migration `revoke_execute_on_trigger_functions`)** — revoked EXECUTE from public/anon/authenticated on all 9 trigger fns (notify_on_*, enforce_insurance_status, sync_insurance_policy). Safe: triggers don't require caller EXECUTE. Cleared all 9 advisor lints.
  - Left intentionally: `match_linkedin_profile`/`claim_linkedin_profile` (registration claim flow), `is_admin`/`is_conversation_participant` (used in RLS — authenticated needs EXECUTE).
- **Still open (not code):** enable **Leaked Password Protection** (Auth → Providers → Password settings — dashboard toggle); confirm **Resend key** is set so emails (incl. reset) actually send; optional: narrow the public `website` storage bucket SELECT policy; move `pg_net` out of public schema.
- Consent is gated client-side only — storing a consent timestamp (e.g. `profiles.agreed_terms_at`) is a sensible follow-up for GDPR proof-of-consent.

Verified: `npm run build` clean.

---

## 2026-06-13 — Claude Code — In-app messaging: COMPLETE ✓

3rd of the sequence (property-type ✓ → insurance ✓ → **messaging ✓** → payment). Backend (DB + AppContext) and UI are both done; tree builds green.

### DONE — UI (committed)
- `src/components/ConversationThread.jsx` — left/right bubbles (mine = primary bg, right-aligned), auto-scrolls to bottom, marks read on show via `markConversationRead`, composer input + Send. Handles a null `conversation` ("Say hello to …").
- `src/components/Messages.jsx` — inbox: conversation-list | active-thread grid. Per conversation resolves peer name, request title, unread count, last-message snippet; sorted by last activity; empty state.
- `data.js` helpers `unreadInConversation` / `totalUnreadMessages`.
- 💬 Messages tab added to Surveyor / Council / Landlord dashboards, with an unread badge on the nav item. Tab initialises from `?tab=messages` and a `useLocation` effect follows query-param changes (so a message-notification deep-link lands on Messages even when already on the dashboard).
- RequestDetailModal entry points: surveyor gets an "Open chat" toggle with the requester; requester gets a "💬 Message" toggle per quote. Both find the existing `(request, surveyor)` conversation or start one on first send.

### DONE — DB (applied & live in Supabase)
- `conversations` (id, request_id, requester_id, surveyor_id, created_at; `unique(request_id, surveyor_id)`) — one thread per (request, surveyor).
- `messages` (id, conversation_id, sender_id, body, read_at, created_at).
- RLS: participant-only via SECURITY DEFINER `is_conversation_participant(uuid)`. conversations insert requires `requester_id = the request's council_id`. messages insert requires `sender_id = auth.uid()` + participant. messages update (read_at) by participants. Admin full on conversations.
- `messages` added to `supabase_realtime` publication (RLS applies on the sub).
- `notify_on_message_insert` trigger → notifies (+emails) the recipient; notification `link` = `/{recipientRole}?tab=messages`.

### DONE — AppContext (committed, builds)
- New `conversations` state: array of `{ id, request_id, requester_id, surveyor_id, created_at, messages: [...] }`, loaded in `loadAll` (two queries: conversations + messages, grouped). Cleared on logout.
- Mutations exposed via `useApp()`:
  - `sendMessage({ conversationId? , requestId?, surveyorId?, requesterId?, body })` — pass `conversationId` for an existing thread, OR `(requestId, surveyorId, requesterId)` to find-or-create one (`ensureConversation`). Returns bool. Reloads after send.
  - `markConversationRead(conversationId)` — marks the *other* party's messages read (optimistic + DB).
- Realtime: the notifications channel `useEffect` now also subscribes to `messages` INSERT (RLS-scoped). Appends to the matching conversation; if the conversation is unknown (other party just started it), calls `loadAll` to pull it in.

### NEXT UP — payment / invoicing (last planned feature)
Blocked on the pricing tier £ numbers being settled (model decided 2026-06-08: 10% requester-side commission on top + per-user subscriptions, 3 months free then tiered — see `BUILD-SPEC.md`). No billing code written yet.

---

## 2026-06-11 — Claude Code — Insurance verification (PI)

Surveyors submit professional indemnity insurance; admin verifies; an "Insured" badge surfaces to requesters. (2nd of the sequence: property-type filtering ✓ → insurance verification ✓ → in-app messaging → payment/invoicing.)

- **Schema:** private `insurance_policies` (one per surveyor: insurer, policy_number, coverage_amount, expiry_date, file, `document_status`). Detail rows are surveyor-own + admin only (policy numbers stay private). Denormalised `surveyors.insurance_status / insurance_expiry / insurance_coverage` are publicly readable so the badge works without exposing detail.
- **Security:** `enforce_insurance_status` BEFORE trigger forces any non-admin write to `pending` — **surveyors can't self-verify**. `sync_insurance_policy` AFTER trigger keeps the denormalised fields current and notifies (+emails) the surveyor on verify/reject. Both SECURITY DEFINER, search_path set, EXECUTE revoked from public.
- **Storage:** reuses the existing `credentials` bucket (path `{userId}/insurance-…`).
- **AppContext:** insurance fields on surveyor `currentUser`/users list; own policy detail loaded as `currentUser.insurance`; `submitInsurance` (upload+upsert, always pending) and `setInsuranceStatus` (admin) mutations.
- **UI:** insurance card on the surveyor's Qualifications tab (insurer/policy/cover/expiry + cert upload + status); new admin **🛡 Insurance** tab (verify/reject + doc link); "🛡 Insured" badge on surveyor browse cards (Council + Landlord) and on each quote in RequestDetailModal. `isInsured()` helper (verified + non-expired) in `data.js`.
- **Verified:** `npm run build` clean.

**Next up: in-app messaging** — requester ↔ surveyor thread per request/quote. New table + RLS (participants only) + realtime + UI. Largest of the remaining UI features.

---

## 2026-06-10 — Claude Code — Property-type filtering

Both sides of the marketplace now carry a property type and can be filtered by it. (1st of an agreed sequence: property-type filtering → insurance verification → in-app messaging → payment/invoicing.)

- **Schema:** `survey_requests.property_type` (nullable, reuses the `property_type` enum), backfilled from any linked property. `surveyors.property_types text[]` (ids matching `PROPERTY_TYPES`).
- **AppContext:** `propertyType` mapped onto requests + sent in `createRequest`; `propertyTypes` on surveyor `currentUser`/users list + saved via `updateCurrentUser`.
- **Forms:** property-type dropdown on both create-request forms (landlord auto-fills from the chosen property); property-types checkboxes on the surveyor profile.
- **Display:** property type on RequestCard + RequestDetailModal; "🏠 types handled" on surveyor browse cards (Council + Landlord).
- **Filters:** property-type dropdown added to the surveyor's Available Requests browse and to both requesters' Browse Surveyors tabs.
- **Verified:** `npm run build` clean. Data helper `propertyTypeLabel()` added to `data.js`.

**Next up: insurance verification** — surveyors upload PI insurance docs, admin verifies, verified-insurance badge on profiles. Will extend the existing `credential_documents` flow (consider a dedicated `insurance` document type + a derived "insured" flag).

---

## 2026-06-09 — Claude Code — Self-serve change password

Added an in-app change-password form (there was none before — password resets needed the Supabase dashboard or a manual SQL update).

- `changePassword(newPassword)` mutation in AppContext → `supabase.auth.updateUser({ password })`.
- Reusable `ChangePassword.jsx` (new password + confirm, min 8 chars, client-side validation, stays signed in).
- Wired into every role's profile area: Surveyor / Council / Landlord profile tabs (below the profile form), and a new `🔑 Account` tab on AdminDashboard.
- Verified: `npm run build` clean. **Kerri can now change the temp admin password from /admin → Account.**

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
