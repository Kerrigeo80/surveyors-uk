# Handoff notes — Surveyors UK

Shared whiteboard between Claude sessions. Read this at the start of a session. Append a dated entry at the top when leaving work in flight or wrapping a session.

Format: newest entries at the top. Keep entries short. Delete anything stale.

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
