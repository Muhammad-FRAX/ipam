# CLAUDE.md — Agent Guide for the IPAM Platform

**You are working on a Phase 1 IPAM (IP Address Management) platform for telecom networks.** This file tells you how to work on it productively. Read it in full before touching any code.

---

## TL;DR — Read these three files in order, then start

1. **This file** (you're here) — conventions and required skills
2. **[APP-ISSUES.md](./APP-ISSUES.md)** — the engineering review listing every known bug, ranked by severity with confidence scores
3. **[PLAN.md](./PLAN.md)** — the phased remediation plan with copy-pasteable prompts per task

Your operator will tell you which Phase + Task to work on. Find it in `PLAN.md`, follow the steps verbatim, and stop when the task's Acceptance criteria are met.

---

## What this app does

A platform for tracking, allocating, and managing IP addresses across a telecom network. It models IP blocks → subnets → individual IP assignments, with telecom-specific overlays for IPRAN/MPBN domains, VLANs, sites, and devices.

**Architecture:** 8 Node containers behind Docker Compose. NestJS microservices (auth, ipam-core, request-workflow, forecasting-insight, audit, configuration, api-gateway) + a React 19 frontend served by NGINX. Single shared PostgreSQL. Redis is currently unused.

**The honest current state:** polished UI, scaffolded backend, broken backing logic. APP-ISSUES.md has the full list of P0/P1 bugs. PLAN.md is how we fix them.

---

## Required skills

Before starting any non-trivial task, invoke the relevant skill. **You do not have a choice — if a skill matches your task, use it.**

### From the `superpowers` plugin

| Situation | Skill to invoke |
|---|---|
| About to write any code that adds behavior | `superpowers:test-driven-development` |
| About to write a new spec or feature | `superpowers:brainstorming` first |
| Executing a task from `PLAN.md` | `superpowers:executing-plans` |
| Multiple independent tasks queued | `superpowers:dispatching-parallel-agents` |
| About to claim a task is done | `superpowers:verification-before-completion` |
| About to commit or open a PR | `superpowers:requesting-code-review` |
| Got code-review feedback | `superpowers:receiving-code-review` |
| Debugging anything unexpected | `superpowers:systematic-debugging` |
| Creating or editing a skill itself | `superpowers:writing-skills` |

### From the `impeccable` plugin

| Situation | Skill to invoke |
|---|---|
| Any code change you're about to commit | `impeccable:impeccable` — runs the quality checks |

### Invocation pattern

Use the `Skill` tool with the name. Example: `Skill(skill="superpowers:test-driven-development")`. Then announce what skill you're using and why, then follow the skill's instructions exactly.

---

## Working principles (non-negotiable)

1. **TDD where possible.** Write the failing test first. Watch it fail. Implement the minimum to make it pass. Refactor. Commit. PLAN.md tells you when this applies.
2. **Read before writing.** Read the files you'll touch and one level of their callers before editing. The codebase has inconsistencies (e.g. schema drift); know the surrounding context first.
3. **Small, atomic commits.** One issue per commit. One concern per commit. Never "while I was here" — that's a separate commit.
4. **Verify before claiming done.** Every task in PLAN.md has Acceptance criteria. Run the actual scenario through `docker compose up` and confirm with real curl or browser interaction. "Tests pass" ≠ "feature works."
5. **Never break a working flow.** After every change, run the prior happy paths. If the dashboard loaded before, it loads after.
6. **Don't add features beyond the task.** Each task in PLAN.md is sized to fit a single agent turn. Resist scope creep. Note follow-ups in `database/drift-audit.md` or new `TODO.md` entries, not by silently expanding the diff.

---

## Git conventions

- **Never add yourself (Claude) as a git author or co-author.** Commits must appear authored solely by the repo owner. Do not append `Co-Authored-By: Claude <...>` to commit messages. This is a hard requirement from the project owner's global preferences.
- Commit message format: Conventional Commits.
  - `feat(scope): description` for new behavior
  - `fix(scope): description` for bug fixes
  - `chore(scope): description` for non-functional changes
  - `refactor(scope): description` for restructuring with no behavior change
  - `test(scope): description` for test-only commits
  - `db: ...` for migration commits
  - Scope examples: `auth`, `ipam`, `workflow`, `ui`, `db`
- Commit early, commit often. Per PLAN.md, each numbered task should produce 1-3 commits.
- Do not force-push, do not amend after pushing, do not skip hooks (`--no-verify`).

---

## File and code conventions

### Backend (NestJS services)

- Each service is a workspace under `apps/`. They share `packages/` for utilities.
- **Raw SQL via `dataSource.query(...)` is the current pattern.** Do not migrate to TypeORM entities mid-task. (A future refactor may go either direction — entity-first or `pg.Pool` — but not now.)
- Always use parameterized queries (`$1`, `$2`). Never string-concatenate SQL.
- New shared logic goes in `packages/shared-*`. Examples: `shared-validation` (CIDR math), `shared-audit` (logAudit helper), `shared-config` (runtime config reader).
- Controllers stay thin: parse the body, call the service, return the result. Business logic lives in services.
- Service methods take explicit parameters, not raw request objects. The `userId` for audit logging is passed as an explicit argument from the controller.

### Frontend (React 19 + Vite + Tailwind 4)

- Pages live in `apps/frontend-portal/src/pages/`. One default-exported component per file.
- Shared components go in `apps/frontend-portal/src/components/`. Create this directory when you need it.
- Hooks go in `apps/frontend-portal/src/hooks/`. Use the `useXxx` naming convention.
- **Styling: Tailwind only.** No inline `style={...}` unless dynamic (e.g. progress bar widths from props). No additional CSS files except `index.css` for global resets.
- Aesthetic: dark glassmorphism with indigo/purple gradients. Match the existing pages. See `App.tsx` for the reference palette: backgrounds `#0a0a0e` / `#12121a` with `backdrop-blur-xl` overlays, borders `border-white/5` to `border-white/10`, accent gradients `from-indigo-500 to-purple-600`.
- Animation: use Tailwind's `animate-in`, `fade-in`, `slide-in-from-bottom-4` for entrances. For richer transitions, framer-motion is acceptable (add as a dependency only when actually needed).
- API calls: use the existing `axios` import. Base URL is `/api` (proxied by Vite dev server and NGINX in prod). Always attach the auth token via the `useAuth` hook (built in Phase 2).

### Database

- Migrations are SQL files in `database/init/`, numbered `NN-description.sql` and applied in lexicographic order by the Postgres entrypoint on first boot.
- **You cannot edit existing migration files** once they have been applied to a real database. To change a column or table, add a new numbered migration.
- For local dev, wiping the DB is OK: `docker compose down -v && docker compose up --build`. For production-style testing, always go via additive migrations.
- Use native Postgres types where they help: `CIDR`/`INET` for network types, `JSONB` for structured metadata, `TIMESTAMPTZ` for timestamps. (Phase 0 migrates `cidr` columns from `VARCHAR` to `CIDR`.)
- Every new query that filters by a non-PK column should be backed by an index. Add the index in the same migration as the column.

---

## How to run the app

```powershell
# First time or after Dockerfile change
docker compose up --build

# Subsequent boots
docker compose up

# Wipe + rebuild (e.g. after a migration change)
docker compose down -v
docker compose up --build

# Tail one service
docker compose logs -f ipam-core-service

# Restart one service after editing its code
docker compose restart ipam-core-service
```

App is served at **https://localhost** (accept the self-signed cert).

Postgres is exposed on `localhost:5432` (or `5433` if there is a host collision — see PLAN.md Phase 0 notes). Connect via `psql -h localhost -U ipam_user -d ipam_db` (password `ipam_password` in dev).

---

## How to test

- **Per-workspace tests:** `npm test --workspace=apps/ipam-core-service`
- **All workspaces:** `npm test` (from repo root, once Jest is set up per Phase 7)
- **Frontend in browser:** open https://localhost, log in (admin@ipam.local / admin123 after Phase 2.1), and click through the affected pages.
- **Manual API test:** use curl with the JWT from `/api/auth/login`. Example:

```powershell
$token = (curl -s -X POST https://localhost/api/auth/login -k -H "Content-Type: application/json" -d '{"email":"admin@ipam.local","password":"admin123"}' | ConvertFrom-Json).accessToken
curl -k -H "Authorization: Bearer $token" https://localhost/api/ipam/blocks
```

---

## What "done" looks like for a task

A task in PLAN.md is **only** done when:

1. Every checkbox `- [ ]` in the task is checked
2. The Acceptance criteria are observably true (you ran the scenario and saw it pass)
3. Tests pass: `npm test` in the relevant workspace
4. The existing happy path still works (run a smoke test of the prior feature)
5. The change is committed with a Conventional Commits message and no `Co-Authored-By: Claude` line
6. You have written a one-paragraph completion summary to the operator: what shipped, what was tricky, what's left ambiguous

If you cannot meet all six, the task is `BLOCKED` and you say so explicitly. Do not mark a partial task complete.

---

## Things to never do

- Never store passwords in plain text (Phase 2 fixes the existing case)
- Never use string concatenation in SQL
- Never delete a row that has audit value — soft-delete instead (Phase 3)
- Never silently swallow errors — log them and re-throw or return a structured failure
- Never bypass the auth middleware once Phase 2 is in
- Never commit with `--no-verify`
- Never add `Co-Authored-By: Claude` to commit messages
- Never edit an already-applied migration file — write a new one
- Never widen scope mid-task — finish the task, then propose a follow-up

---

## When you're unsure

If the plan is ambiguous or the code's behavior surprises you:

1. **Re-read the relevant section of APP-ISSUES.md.** Often the surprise is a known bug.
2. **Read one level of callers.** Grep for who calls the function you're about to change.
3. **Ask the operator.** Better to pause and clarify than to ship a half-broken fix. Frame your question with: what you tried, what you observed, what 2-3 paths forward you see, and which one you'd recommend.

---

## Quick reference

| What | Where |
|---|---|
| The bug list | [APP-ISSUES.md](./APP-ISSUES.md) |
| The remediation plan | [PLAN.md](./PLAN.md) |
| Database schema | [database/init/](./database/init/) |
| Backend services | [apps/](./apps/) |
| Frontend | [apps/frontend-portal/](./apps/frontend-portal/) |
| Shared packages | [packages/](./packages/) |
| Container orchestration | [docker-compose.yml](./docker-compose.yml) |
| Backend container build | [Dockerfile](./Dockerfile) |
| Frontend container build | [apps/frontend-portal/Dockerfile](./apps/frontend-portal/Dockerfile) |

Welcome aboard. Read PLAN.md and start with whatever Phase + Task your operator hands you.
