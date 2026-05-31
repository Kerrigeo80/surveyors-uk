# Surveyors UK

Connecting councils with qualified surveyors.

## Stack

- React 19 + Vite 8 (JSX, no TypeScript)
- React Router v7
- Tailwind v4 (via `@tailwindcss/vite`)
- Supabase (project ref `zxraxgjzmthgzilgkihb`, region `eu-west-2`)

Mirrors the structure of `level-app`.

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run preview` — preview production build

## Setup

```
npm install
cp .env.example .env.local   # then fill in VITE_SUPABASE_ANON_KEY
npm run dev
```

## Folders

- `src/pages/` — page components
- `src/lib/` — shared utilities (Supabase client lives here)
- `supabase/` — SQL migrations and edge functions
- `reference/` — original static HTML mockup, kept for visual reference
