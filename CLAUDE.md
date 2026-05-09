# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Super Sheldon AI Teacher Dashboard — pnpm workspace with an Express API, a React/Vite frontend, a shared OpenAPI-driven client, and Drizzle-managed Postgres.

## Commands

- `pnpm install` — install (the `preinstall` script enforces pnpm; npm/yarn will be rejected).
- `pnpm --filter @workspace/api-server run dev` — build + run API on `PORT` (script in `replit.md` uses 8080). Requires `DATABASE_URL`.
- `PORT=24724 BASE_PATH=/ pnpm --filter @workspace/super-sheldon run dev` — frontend Vite. **Both `PORT` and `BASE_PATH` must be set** or `vite.config.ts` throws.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate `lib/api-client-react/src/generated` (React Query hooks) and `lib/api-zod/src/generated` (Zod schemas) from `lib/api-spec/openapi.yaml`. Then runs `typecheck:libs`.
- `pnpm --filter @workspace/db run push` — push Drizzle schema (`push-force` for destructive). Dev only.
- `pnpm run typecheck` — `tsc --build` over the lib project references, then per-package typecheck for `artifacts/*` and `scripts`.
- `pnpm run build` — typecheck + recursive `build` (api-server uses esbuild → `dist/index.mjs`; frontend uses `vite build`).
- Demo login: `teacher@supersheldon.com` / `123456` (seeded by `ensureDemoTeacher` on API boot).

## Architecture

**Workspace shape** (`pnpm-workspace.yaml`): `artifacts/*` are runnable apps (`api-server`, `super-sheldon` frontend, `mockup-sandbox`); `lib/*` are shared libraries (`api-spec`, `api-client-react`, `api-zod`, `db`). Versions for shared deps are pinned via the pnpm `catalog:` protocol — add new shared versions to the catalog rather than per-package.

**OpenAPI is the source of truth.** `lib/api-spec/openapi.yaml` → `orval` (config in `lib/api-spec/orval.config.ts`) generates two outputs:
- `lib/api-client-react/src/generated/` — React Query hooks consumed by the frontend, routed through `custom-fetch.ts`.
- `lib/api-zod/src/generated/` — Zod validators used by the API server for request/response validation.

After editing `openapi.yaml`, run codegen; never hand-edit the generated dirs.

**TypeScript layout.** `tsconfig.base.json` sets `customConditions: ["workspace"]`, so workspace packages resolve via their `exports` `workspace` condition (typically `./src/index.ts`) — no build step needed for libs in dev. Top-level `tsconfig.json` is a project-references root for the libs; artifacts each own a `tsconfig.json` with `--noEmit`.

**API server** (`artifacts/api-server`): Express 5 mounted at `/api` (see `src/app.ts`). Routes registered in `src/routes/index.ts` (`auth`, `classes`, `sessions`, `reports`, `dashboard`, `ai`, `health`). Auth is custom HMAC tokens (no JWT library) — see `src/lib/auth.ts`; tokens live in `localStorage` as `sheldon_token`. AI report generation is in `src/lib/gemini.ts` (Gemini via Replit AI Integrations) with a graceful fallback to simulated data. Builds via `build.mjs` (esbuild + `esbuild-plugin-pino`); native modules listed in the `external` array there must stay externalized.

**DB** (`lib/db`): Drizzle ORM over `node-postgres`. Schema lives in `src/schema/` (`teachers`, `classes`, `sessions`, `reports`); `src/index.ts` exports `db` and `pool` and re-exports the schema. `db` and `drizzle.config.ts` both throw on missing `DATABASE_URL`.

**Frontend** (`artifacts/super-sheldon`): React + Vite + Tailwind + Wouter + Framer Motion + Recharts. Calls the API exclusively through generated React Query hooks. The `@replit/vite-plugin-cartographer` and `dev-banner` plugins only load when `REPL_ID` is set — safe to ignore outside Replit.

## Required env

- API: `DATABASE_URL` (Postgres — using **Supabase**), `PORT`.
- Frontend: `PORT`, `BASE_PATH` (use `/` for local).

### Supabase

Get the **Postgres connection string** from Supabase → Project Settings → Database → Connection string (NOT the publishable/anon API key — that's for `@supabase/supabase-js`, which this project does not use). Prefer the **Session pooler** / direct connection for `drizzle-kit push`; the **Transaction pooler** (port 6543) is fine for runtime but breaks prepared statements and migrations.

`lib/db/src/index.ts` and `lib/db/drizzle.config.ts` auto-enable SSL with `rejectUnauthorized: false` for any non-localhost URL — Supabase requires SSL but ships a CA chain that node-postgres won't validate by default. Do not remove this; do not commit the connection string.

**Shared-database isolation.** All tables live in a dedicated Postgres schema `sheldon` (declared in `lib/db/src/schema/_schema.ts`) so the project can share a Supabase instance with unrelated apps without `drizzle-kit push` touching their tables. When adding new tables, use `sheldonSchema.table(...)`, not `pgTable(...)`. Do not move tables to `public` — anything outside `sheldon` (e.g. `vespers_session` from a co-tenant project) must remain invisible to migrations.

## Gotchas

- After codegen, fix `lib/api-zod/src/index.ts` to only export `./generated/api` — orval regenerates it with bad exports.
- The codegen script runs `typecheck:libs` after orval; run `orval` directly if you only need the files fast.
- `pnpm-workspace.yaml` enforces `minimumReleaseAge: 1440` (1-day quarantine) as a supply-chain defense. Do not lower it; add narrow entries to `minimumReleaseAgeExclude` only for trusted publishers.
- `artifacts/api-server` `dev` script does `build && start` — there is no watch mode; re-run on changes.
