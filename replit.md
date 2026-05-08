# Super Sheldon AI Teacher Dashboard

An AI-powered dashboard for Super Sheldon teachers to monitor, analyze, and improve their online teaching performance using real-time AI analysis.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/super-sheldon run dev` — run the frontend (port 24724)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Demo Credentials

- Email: teacher@supersheldon.com
- Password: 123456

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, Framer Motion, Recharts, Lucide React, Wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- AI: Gemini AI via Replit AI Integrations
- API codegen: Orval (from OpenAPI spec)
- Auth: Custom HMAC-based JWT (no external deps)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle ORM schema (teachers, classes, sessions, reports)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/auth.ts` — Auth middleware & token utils
- `artifacts/api-server/src/lib/gemini.ts` — Gemini AI report generation
- `artifacts/super-sheldon/src/` — React frontend

## Architecture decisions

- Custom HMAC token auth (no JWT library) — avoids extra deps, stored in localStorage as `sheldon_token`
- Gemini AI for report generation with graceful fallback to simulated data
- Orval-generated React Query hooks for all API calls
- Real-time monitoring simulation via setInterval in the frontend
- All API routes protected by `requireAuth` middleware

## Product

Teachers can login, view upcoming classes, activate AI monitoring for any class, simulate background analysis while teaching, then finish the session to generate a detailed AI performance report with scores, suggestions, highlights, and improvement areas.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After codegen, manually fix `lib/api-zod/src/index.ts` to only export `./generated/api` (orval regenerates it with bad exports)
- The codegen script runs `typecheck:libs` after orval — run orval directly if you just need the files fast

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
