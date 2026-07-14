# Hey Zuly

Landing site and future app for [heyzuly.com](https://heyzuly.com) — a warm AI wellness guide (Comadre Guide persona).

## Status

- **Production:** Live on Cloudflare Pages (static build from `dist/` + Pages Functions)
- **Source:** Astro 5 project in `src/` — editable components, entity-led copy
- **Waitlist:** Phase 2 — `POST /api/waitlist` persists signups to Cloudflare D1
- **Auth + preview app:** Phase 3 — Clerk sign-in at `/sign-in`, protected shell at `/app`
- **Chat stub:** Phase 4 — `POST /api/chat` (JSON or SSE stream; canned or Anthropic); local bypass without Clerk keys
- **Wave + ICS:** D1 `waves`/`day_plans` + Talk→build (`POST /api/wave/build-from-talk`) + `GET /api/wave/today.ics` calendar export

## Local development

### Astro only (UI)

```bash
cd C:\Users\1devi\Projects\heyzuly
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321). The dev server hot-reloads Astro components and CSS. The waitlist API is **not** available here — use Pages dev below.

To start Astro and open the site in your **heyzuly** Chrome profile automatically:

```bash
npm run dev:heyzuly
# alias: npm run dev:open
```

### Waitlist API + site (recommended for Phase 2)

```bash
npm install
npm run db:migrate:local    # once: create local D1 tables
npm run pages:dev           # build dist/ + wrangler pages dev
```

Open the URL wrangler prints (usually [http://localhost:8788](http://localhost:8788)). Submit the waitlist form to exercise `POST /api/waitlist`.

### Auth + preview app (Phase 3)

1. Create a [Clerk](https://clerk.com) application (free tier is fine for preview).
2. Copy `.env.example` → `.env` and set `PUBLIC_CLERK_PUBLISHABLE_KEY`.
3. Add `CLERK_SECRET_KEY` to `.dev.vars` (see `.dev.vars.example`).
4. Run auth migration once: `npm run db:migrate:auth:local` (or full `npm run db:migrate:local`).
5. Build + Pages dev: `npm run pages:dev` — test `/sign-in`, `/sign-up`, `/app`.

Clerk dashboard → **Paths**: set sign-in URL `/sign-in`, sign-up `/sign-up`, after sign-in `/app`. Add `http://localhost:8788` and `https://heyzuly.com` to allowed origins.

### Chat API stub without Clerk (Phase 4 local)

Continue chat work when Clerk keys are not available:

1. In `.dev.vars`: `CHAT_DEV_BYPASS=true` (and leave `CLERK_SECRET_KEY` unset).
2. In `.env`: `PUBLIC_CHAT_DEV_BYPASS=true` so `/app` renders the dev shell without a publishable key.
3. Migrate chat + memory + waves + nudge_log once: `npm run db:migrate:local` (or add `db:migrate:nudges:local` after waves).
4. `npm run pages:dev` → open `/app`, complete onboarding (or ensure Wave), mark a tiny action, and send a chat message, or curl:

```bash
# Default: JSON reply (good for curl)
curl -X POST http://localhost:8788/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"I feel scattered this morning.\"}]}"

# SSE stream: body flag or Accept header
curl -N -X POST http://localhost:8788/api/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"I feel scattered this morning.\"}],\"stream\":true}"

curl http://localhost:8788/api/chat

curl -X POST http://localhost:8788/api/memory \
  -H "Content-Type: application/json" \
  -d "{\"wave\":{\"pillar\":\"self-healing\",\"status\":\"starting\",\"week\":1}}"

# First Wave + today’s plan stub (migration 0005)
curl -X POST http://localhost:8788/api/wave \
  -H "Content-Type: application/json" \
  -d "{\"pillars\":[\"self-healing\"]}"

curl http://localhost:8788/api/wave

curl -X POST http://localhost:8788/api/wave/today \
  -H "Content-Type: application/json" \
  -d "{\"regenerate\":true}"

curl -X POST http://localhost:8788/api/wave/today \
  -H "Content-Type: application/json" \
  -d "{\"item_id\":\"t1\",\"done\":true}"

# Talk → build day (Phase 5b) — propose from chat (stub keywords; Anthropic optional)
curl -X POST http://localhost:8788/api/wave/build-from-talk \
  -H "Content-Type: application/json" \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"I feel scattered and want one tiny step for today.\"}],\"pillar\":\"self-healing\"}"

# Confirm/edit → replace today’s day_plan
curl -X POST http://localhost:8788/api/wave/today \
  -H "Content-Type: application/json" \
  -d "{\"items\":[{\"id\":\"t1\",\"text\":\"Three slow breaths before email.\",\"pillar\":\"self-healing\",\"done\":false}]}"

# ICS calendar export (today’s day_plan → VEVENTs; shame-free titles)
curl -OJ http://localhost:8788/api/wave/today.ics

# Check-in nudge stubs (no Resend/Twilio/Meta) — migration 0006
# With CHAT_DEV_BYPASS and no CRON_SECRET/INVITE_ADMIN_SECRET, POST is open locally.
# Prefer: CRON_SECRET=… or INVITE_ADMIN_SECRET=… in .dev.vars
curl -X POST http://localhost:8788/api/cron/nudges \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CRON_OR_INVITE_SECRET" \
  -d "{\"user_id\":\"dev-bypass\"}"

# Alias:
curl -X POST http://localhost:8788/api/nudges/run \
  -H "Content-Type: application/json" \
  -d "{}"

curl http://localhost:8788/api/nudges
```

`POST /api/wave/build-from-talk` proposes 1–3 tiny actions from recent chat (or `summary`) using keyword stub templates + survey facts (`heal.energy` caps). Optional Anthropic JSON extract when `ANTHROPIC_API_KEY` is set. Confirm/edit persists via `POST /api/wave/today` with `{ items: [...] }` (or `{ confirm: true, items }` on build-from-talk). In `/app`, use **Build today from this chat** under Talk.

`GET /api/wave/today.ics` returns `text/calendar` for today’s tiny actions (times from `rhythm.hard_window`, durations from `heal.energy`) plus an optional soft Wave check-in when `rhythm.checkin` is scheduled. Same auth as chat (Clerk Bearer or `CHAT_DEV_BYPASS`). In `/app`, use **Add to calendar** on the Wave today panel.

`POST /api/cron/nudges` (alias `POST /api/nudges/run`) evaluates who is due from `rhythm.checkin` + soft `rhythm.hard_window`, skips crisis / day-done / `when_open`, and writes `nudge_log` rows with `sent_stub` (would-send). It does **not** call Resend, Twilio, or Meta. `GET /api/nudges` returns the next-check-in estimate + recent log for the current user.

`POST /api/chat` persists the turn + injects Wave/`user_facts`/active day plan into the reply context; `GET` returns history + prefs. With `stream: true` or `Accept: text/event-stream`, the response is SSE (`meta` → `delta`* → `done`); otherwise JSON `{ ok, reply, mode, … }`. Safety (`functions/lib/safety.ts`) classifies input (`crisis` / `edge-safety` / `jailbreak` / `sexual` / `ok`) before generate and moderates output after — blocked turns use fixed templates (988, hotline, refuse). `mode` may be `crisis`, `edge-safety`, `jailbreak`, `sexual`, `stub`, or `anthropic`. Set `ANTHROPIC_API_KEY` in `.dev.vars` for real model replies. **Never enable `CHAT_DEV_BYPASS` in Cloudflare production.**

With the heyzuly Chrome profile:

```bash
npm run pages:dev:open
```

## Chrome heyzuly profile

Hey Zuly local tooling opens Google Chrome with a dedicated profile so sessions, extensions, and logins stay separate from personal browsing.

### Create the profile (one-time)

1. Open Chrome → top-right avatar → **Add** (or **Add Chrome profile**).
2. Name it **heyzuly** (or **Hey Zuly** / **heyzuly.com** — detection matches any name containing `heyzuly`).
3. Sign in or configure that profile however you want for Hey Zuly work.

### Detect and save local config

```bash
npm run chrome:detect
npm run chrome:detect -- --write
```

`--write` creates `heyzuly.chrome.json` (gitignored) with your Chrome path and `profileDirectory` (e.g. `Profile 5`).

You can also copy the example and edit manually:

```bash
copy heyzuly.chrome.json.example heyzuly.chrome.json
```

Or set environment variables instead of the config file:

| Variable | Purpose |
|---|---|
| `HEYZULY_CHROME_PROFILE` | Profile folder name (`Profile 5`, `Default`, …) |
| `HEYZULY_CHROME_PATH` | Path to `chrome.exe` / Chrome binary |
| `HEYZULY_CHROME_URL` | Default URL for open scripts |

### npm scripts

| Script | What it does |
|---|---|
| `npm run chrome:detect` | List Chrome profiles; highlight heyzuly match |
| `npm run chrome:heyzuly` | Open [heyzuly.com](https://heyzuly.com) in heyzuly profile |
| `npm run dev:heyzuly` | Astro dev + open `http://localhost:4321` in heyzuly profile |
| `npm run dev:open` | Same as `dev:heyzuly` |
| `npm run pages:dev:open` | Pages dev + open `http://localhost:8788` in heyzuly profile |

`npm run dev` is unchanged — it does not open Chrome.

## Cursor / automated setup (recommended)

One command for agents or local dev — idempotent, safe to re-run:

```bash
npm run setup:waitlist
```

This script (`scripts/setup-waitlist.mjs`) will:

1. Check `wrangler whoami` (auth status)
2. Run **local** D1 migration (always — no login required)
3. If logged in: find or create `heyzuly-waitlist`, update `wrangler.toml` `database_id`, run **remote** migration
4. Create `.dev.vars` from `.dev.vars.example` with generated `WAITLIST_EXPORT_SECRET` and `WAITLIST_IP_SALT`

**One-time manual step (cannot be automated):**

```bash
npx wrangler login
```

Then re-run `npm run setup:waitlist`. To push production secrets after login:

```bash
npm run setup:waitlist -- --push-secrets
```

| Step | Agent can run | Requires `wrangler login` once |
|---|---|---|
| Local D1 migration | ✓ | No |
| Create/find remote D1 + update `wrangler.toml` | ✓ | Yes |
| Remote D1 migration | ✓ | Yes |
| Generate `.dev.vars` secrets | ✓ | No |
| Push Pages secrets (`--push-secrets`) | ✓ | Yes |
| `npm run deploy:pages` | ✓ | Yes |
| Git push auto-deploy | ✓ (if repo connected) | No (uses Git, not wrangler) |

See [`docs/CLOUDFLARE-SETUP.md`](./docs/CLOUDFLARE-SETUP.md) for dashboard fallbacks (D1 binding, env vars).

## Build & deploy

```bash
npm run build   # outputs to dist/
npm run preview # serve dist/ statically (no API)
npm run deploy:pages   # build + wrangler pages deploy (direct upload)
```

Cloudflare Pages auto-deploys on push to `main` when the build command is `npm run build` and output directory is `dist/`. Pages Functions in `functions/` deploy automatically with the project.

## Cloudflare D1 setup (manual fallback)

Prefer **`npm run setup:waitlist`** (see above). Manual steps if needed:

Run from the project root after `npx wrangler login`:

```bash
# 1. Create the database
npx wrangler d1 create heyzuly-waitlist
```

Copy the `database_id` from the output into `wrangler.toml` (replace `REPLACE_WITH_D1_DATABASE_ID`).

```bash
# 2. Apply schema to remote D1
npm run db:migrate:remote

# 3. Bind D1 to the Pages project (dashboard)
# Workers & Pages → heyzuly → Settings → Functions → D1 database bindings
# Variable name: DB  |  Database: heyzuly-waitlist

# 4. Set secrets / env vars (dashboard → Settings → Environment variables)
# WAITLIST_EXPORT_SECRET  — random string for GET /api/waitlist/export
# WAITLIST_IP_SALT        — optional; salts IP hashes (recommended in production)
```

### Manual D1 query (no export secret)

```bash
npx wrangler d1 execute heyzuly-waitlist --remote --command "SELECT email, created_at FROM waitlist ORDER BY created_at DESC LIMIT 50"
```

### Admin export

```bash
curl -H "Authorization: Bearer YOUR_EXPORT_SECRET" https://heyzuly.com/api/waitlist/export
curl -H "Accept: text/csv" -H "Authorization: Bearer YOUR_EXPORT_SECRET" https://heyzuly.com/api/waitlist/export -o waitlist.csv
```

**Optional (not in Phase 2 scope):** sync new signups to Resend or ConvertKit via a Worker webhook — see `docs/Dev-Roadmap.md`.

## Project structure

```
src/
  components/   # Hero, Pillars, Waitlist, etc.
  layouts/      # BaseLayout.astro
  pages/        # index.astro, 404.astro
  styles/       # global.css (ported from production)
functions/
  api/waitlist/ # POST /api/waitlist, GET /api/waitlist/export
  api/users/    # POST /api/users/sync, /api/users/onboarding
  api/invite/   # POST /api/invite/grant (admin stub)
  api/chat.ts   # POST /api/chat (Phase 4 stub)
  api/wave.ts   # GET/POST /api/wave
  api/wave/     # POST /api/wave/today, POST /api/wave/build-from-talk, GET /api/wave/today.ics
  lib/          # validation, rate limit, auth, users, chat, safety, waves, ics
migrations/     # D1 SQL schema (waitlist + users + chat + facts + waves)
src/pages/app/  # protected preview shell (/app)
src/pages/sign-in.astro, sign-up.astro
public/         # favicon.svg, robots.txt
dist/           # build output (deployed to Pages)
docs/           # roadmap, persona spec, brand docs
wrangler.toml   # D1 binding + Pages output dir
```

## Docs

- [`HANDOFF.md`](./HANDOFF.md) — infrastructure continuity
- [`docs/Dev-Roadmap.md`](./docs/Dev-Roadmap.md) — phased development plan
- [`docs/Zuly-Entity-Demographic-Proposal.md`](./docs/Zuly-Entity-Demographic-Proposal.md) — entity voice & copy
- [`docs/Zuly-Persona-Spec.md`](./docs/Zuly-Persona-Spec.md) — voice anchors & starter exemplars
- [`docs/Onda-Zuly-Brand-Architecture.md`](./docs/Onda-Zuly-Brand-Architecture.md) — brand system
- [`docs/CLOUDFLARE-SETUP.md`](./docs/CLOUDFLARE-SETUP.md) — Pages deploy guide

## Notes

- Waitlist form POSTs to `/api/waitlist` with honeypot + rate limiting (5/min/IP)
- Auth: Clerk at `/sign-in` and `/sign-up`; preview app at `/app` (Phase 3)
- Chat: `POST`/`GET /api/chat` + D1 persistence + SSE + safety classifier/moderation (Phase 4); local `CHAT_DEV_BYPASS` / `PUBLIC_CHAT_DEV_BYPASS`
- Wave + day plan: `GET`/`POST /api/wave`, `POST /api/wave/today`, `POST /api/wave/build-from-talk`; ICS export `GET /api/wave/today.ics`
- Evals: `npm run eval:offline` (113 goldens + 24 holdouts + safety smoke); holdouts only: `npm run eval:holdouts`; human dry-run: `npm run eval:dry-run` (see `docs/evals/dry-run.md`)
- Brand is **entity-led** — no founder biography on site
- No ad trackers on health-related flows
