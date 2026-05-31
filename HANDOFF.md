# Handoff notes — Surveyors UK

Shared whiteboard between Claude sessions. Read this at the start of a session. Append a dated entry at the top when leaving work in flight or wrapping a session.

Format: newest entries at the top. Keep entries short. Delete anything stale.

---

## 2026-05-31 — Claude Code — Initial scaffold + deploy

### What was done
- Discovered existing single-file HTML mockup at `OneDrive\Documents\Claude\Projects\Surveyors UK\` (70 KB, two identical copies). Moved into `reference/`.
- Scaffolded the project at `C:\Users\kerri\OneDrive\Desktop\surveyors-uk\` mirroring `level-app` (React 19 + Vite 8 + Tailwind 4 + Supabase + Router 7).
- Created Supabase project link: ref `zxraxgjzmthgzilgkihb`, region `eu-west-2`. Wrote `.env.local` with the publishable key.
- Created GitHub repo `Kerrigeo80/surveyors-uk`, pushed initial commit.
- Set up Vercel project, added env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), deployed.
- Live URLs:
  - https://surveyors-uk.vercel.app/ — placeholder React landing
  - https://surveyors-uk.vercel.app/mockup.html — full design mockup (the thing Kerri can share now)
- Created `BUILD-SPEC.md` (this file's sibling) as the canonical spec, scaffolded from what the mockup shows.

### Current state
- Repo on `main`, clean working tree, auto-deploy on push working.
- Supabase project is empty — no tables, no migrations, no edge functions.
- React app shows only a placeholder. The actual UI exists only as the static `mockup.html`.
- `dist/` and `node_modules/` are gitignored. `.env.local` is gitignored.

### What's next (suggested — needs Kerri's input)
- Fill in BUILD-SPEC's "Open questions" section (target market, revenue model, verification depth, launch plan).
- Decide auth model for councils vs surveyors (see Phase 1).
- Once auth is decided, design initial Supabase schema (councils, surveyors, credentials, survey_requests, quotes).
- Begin porting `reference/mockup.html` content into React pages — start with the landing page and the two registration flows.
