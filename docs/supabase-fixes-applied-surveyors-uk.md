# Supabase Fixes Applied — Surveyors UK

**Project:** Surveyors UK (`zxraxgjzmthgzilgkihb`) · 15 June 2026

## Headline

| | Before | After |
|---|--------|-------|
| Security advisories | 13 WARN | 8 WARN (all expected) |
| Performance advisories | 71 (54 WARN, 17 INFO) | 18 (0 WARN, 18 INFO) |
| Critical RLS bug | **survey_requests / quotes / properties unqueryable** | **Fixed** |

The most important fix wasn't on either advisor's list: a **pre-existing infinite-recursion bug** in the row-level security policies that made your three core marketplace tables throw an error for every logged-in user.

## Migrations applied (in order)

1. `harden_security_definer_helpers` — moved `is_admin()` and `is_conversation_participant()` into a private (non-API) schema so they can no longer be called as REST endpoints, while still working inside policies; repointed `enforce_insurance_status`.
2. `restrict_match_linkedin_to_authenticated` — removed anonymous access to `match_linkedin_profile` (it returns scraped personal data); signed-in users only.
3. `restrict_website_bucket_listing` — dropped the broad policy that let anyone list every file in the public `website` bucket. Public file URLs still work.
4. `add_foreign_key_indexes` — added covering indexes on 10 foreign keys.
5. `add_rls_definer_helpers` — created `private.*` SECURITY DEFINER helpers that read cross-referenced tables without triggering their RLS (this is what breaks the recursion loop).
6. `rls_fix_recursion_and_initplan` — rewrote every relevant policy to (a) use those helpers instead of mutually-recursive subqueries, (b) wrap `auth.uid()`/`is_admin()` in `(select …)` for performance at scale, and (c) consolidate duplicate admin "FOR ALL" policies.
7. `grant_anon_execute_private_helpers` — lets anonymous visitors evaluate the policies cleanly (empty results instead of a 500 error).

## Verified

Tested by impersonating real users:
- Recursion gone — surveyor, council, and admin can all read `survey_requests`, `quotes`, `properties`, `conversations`.
- Access control intact — the surveyor who owns the one quote sees it; the council on that request sees it; a different surveyor and a different council see nothing; admin sees it; anon gets clean empty results, no errors.

## Remaining items (by design or manual)

**Two dashboard toggles (can't be done via SQL):**
- **Enable leaked-password protection** — Authentication → Providers/Policies → turn on the HaveIBeenPwned check.
- **Auth connection strategy** — switch from absolute (10) to percentage-based if you ever upsize the instance. Not urgent.

**Accepted security warnings (intentional public RPCs):**
- `submit_hazard_report` (anon) — residents report hazards without an account.
- `org_public_name` (anon) — returns only a council/landlord display name.
- `claim_linkedin_profile` (authenticated) — surveyor claims their own imported profile; checks ownership.
- `match_linkedin_profile` (authenticated) — now signed-in only.

**Deliberately deferred:**
- `pg_net` extension in `public` schema — moving it risks breaking the notification-email trigger that depends on it. Low severity; revisit as a tested change later.
- The 10 new FK indexes show as "unused" only because there's no traffic yet; keep them.
