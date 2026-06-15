# Supabase Health & Security Check — Surveyors UK

**Project:** Surveyors UK (`zxraxgjzmthgzilgkihb`) · region `eu-west-2` (London) · org "Kerri Geo"
**Date:** 15 June 2026
**Overall:** Healthy. **No critical (ERROR) issues. RLS enabled on all tables.** Everything below is a warning or advisory — worth doing before real users, but nothing is on fire.

Totals: 13 security warnings, 71 performance advisories (54 WARN / 17 INFO).

---

## Priority 1 — Do before launch (security)

**1. Enable leaked-password protection** *(2-minute dashboard toggle)*
Auth currently doesn't check new passwords against HaveIBeenPwned. Turn it on in **Authentication → Policies / Password settings**. Free, no downside.

**2. Review the publicly-callable `SECURITY DEFINER` functions**
11 functions can be invoked directly via the REST API (`/rest/v1/rpc/...`). Some are intentional, some probably shouldn't be exposed. Decide per function:

| Function | Callable by | Likely intent |
|----------|-------------|---------------|
| `submit_hazard_report` | anon | **Probably intended** — residents report hazards without logging in. Keep, but confirm it validates input. |
| `org_public_name` | anon | Likely intended — public lookup of a council/org display name. Keep if so. |
| `match_linkedin_profile` | anon | Review — should an anonymous user be able to probe whether a profile exists by email/name/RICS? Consider restricting to `authenticated`. |
| `claim_linkedin_profile` | authenticated | Review — fine if any signed-in surveyor can claim; confirm it checks ownership. |
| `is_admin`, `is_conversation_participant` | anon / authenticated | **Helper functions used inside RLS policies** — they don't need to be exposed as RPC endpoints at all. Revoke EXECUTE from `anon` and `authenticated`. |

The two `is_*` helpers are the clear action: revoke EXECUTE so they're internal-only. The rest are a deliberate "is this meant to be public?" decision.

**3. Tighten the `website` storage bucket**
It's a public bucket with a broad SELECT policy, which lets anyone **list every file** in it (not just open a known URL). Public object URLs still work without listing — restrict the policy so the bucket contents can't be enumerated.

---

## Priority 2 — Before you scale (performance)

**4. Fix RLS `auth.<fn>()` re-evaluation — 41 policies** *(biggest perf item)*
Many policies call `auth.uid()` / `current_setting()` **once per row**, which gets slow as tables grow. The fix is mechanical: wrap each call as `(select auth.uid())` so Postgres evaluates it once per query. Affects policies across `profiles`, `survey_requests`, `quotes`, `messages`, etc. Low risk, big payoff at scale. Best applied as a single migration.

**5. Consolidate overlapping policies — 13 cases**
Tables like `conversations` have multiple permissive policies for the same role+action (e.g. `{conv_admin, conv_insert}`). Postgres must check all of them on every query. Merging each pair into one policy (`admin OR participant`) is cleaner and faster.

---

## Priority 3 — Housekeeping (low urgency)

**6. Add covering indexes on 10 foreign keys** *(INFO)*
FKs without an index (e.g. on `conversations`, `messages`, `properties`) can slow joins and cascade deletes. Cheap to add; do it as part of the same perf migration.

**7. Review 6 unused indexes** *(INFO)*
Indexes like `linkedin_profiles_unclaimed_idx` haven't been hit yet — but the DB has barely any traffic, so "unused" is expected this early. Don't drop them yet; re-check after real usage.

**8. Move `pg_net` out of the `public` schema** *(minor)*
Extension hygiene — relocate to a dedicated `extensions` schema.

**9. Auth connection allocation** *(INFO)*
Auth server is capped at 10 connections (absolute). If you ever upsize the instance, switch to a percentage-based strategy or the bump won't help. Irrelevant at current scale.

---

## Suggested sequence

1. Flip the two dashboard toggles (leaked-password protection; note the auth-connection setting for later).
2. One **security migration**: revoke EXECUTE on the `is_*` helpers, tighten the `website` bucket, and action whichever RPC functions you decide shouldn't be public.
3. One **performance migration**: wrap `auth.*()` calls in `(select …)`, consolidate the duplicate policies, and add the 10 FK indexes.

Items 1–3 (Priority 1) are the only ones that matter before onboarding real councils/surveyors. The rest can ride along whenever.

*Remediation references: Supabase Database Linter — https://supabase.com/docs/guides/database/database-linter*
