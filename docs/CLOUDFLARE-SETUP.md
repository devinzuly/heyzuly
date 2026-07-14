# Cloudflare setup — Hey Zuly (waitlist + auth)

Automated setup for Cursor/agents and local development. Minimal manual PowerShell.

**Phase 2:** waitlist + D1 · **Phase 3:** Clerk auth + preview app at `/app` · **Phase 4:** `POST /api/chat` stub

---

## Quick start (one command)

```bash
npm install
npm run setup:waitlist
```

Safe to re-run anytime. The script is idempotent.

### What the agent can do without you

| Action | Command / script |
|---|---|
| Local D1 schema | `npm run setup:waitlist` (always) |
| Generate local secrets | Creates `.dev.vars` from `.dev.vars.example` |
| Local API dev | `npm run pages:dev` |
| Build static site | `npm run build` |

### What needs one-time `wrangler login` (browser)

Wrangler opens a browser OAuth flow. **Agents cannot complete this step** — you must run it once on your machine:

```bash
npx wrangler login
npx wrangler whoami   # verify
```

After login, re-run:

```bash
npm run setup:waitlist
```

This will (when authenticated):

1. List remote D1 databases (`wrangler d1 list --json`)
2. Use existing `heyzuly-waitlist` **or** create it (`wrangler d1 create heyzuly-waitlist`)
3. Write `database_id` into `wrangler.toml` (replaces `REPLACE_WITH_D1_DATABASE_ID`)
4. Apply remote migration (`npm run db:migrate:remote`)

Optional — push production secrets (non-interactive via stdin):

```bash
npm run setup:waitlist -- --push-secrets
```

---

## Project configuration

### `wrangler.toml`

```toml
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "heyzuly-waitlist"
database_id = "<auto-filled by setup>"
```

- **Binding name `DB`** must match `env.DB` in `functions/`.
- For **Git-connected Pages**, bindings in `wrangler.toml` sync on deploy.
- **Dashboard fallback:** Workers & Pages → **heyzuly** → Settings → Functions → D1 database bindings → Variable `DB` → Database `heyzuly-waitlist`.

### Local secrets (`.dev.vars`)

Never commit `.dev.vars`. Example template: `.dev.vars.example`.

```bash
WAITLIST_EXPORT_SECRET=<random hex>
WAITLIST_IP_SALT=<random hex>
```

Used by `wrangler pages dev` for `/api/waitlist/export` and IP hashing.

### Production secrets

Set on the Pages project `heyzuly`:

| Variable | Required | Purpose |
|---|---|---|
| `WAITLIST_EXPORT_SECRET` | Yes (for export) | Bearer token for `GET /api/waitlist/export` |
| `WAITLIST_IP_SALT` | Recommended | Salts IP hashes in D1 |
| `CLERK_SECRET_KEY` | Yes (Phase 3 auth) | Verifies Clerk sessions in Pages Functions |
| `INVITE_ADMIN_SECRET` | Optional | Bearer token for `POST /api/invite/grant` |
| `INVITE_REQUIRED` | Optional | Set `true` to gate sign-up to invited emails only |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes (Phase 3 build) | **Build env** on Pages (not a secret) — inlined at `npm run build` |
| `ANTHROPIC_API_KEY` | Optional (Phase 4) | Real chat replies; omit → canned stub |
| `CHAT_DEV_BYPASS` | **Local only** | Allow `/api/chat` without Clerk when `CLERK_SECRET_KEY` unset — **never set in production** |
| `PUBLIC_CHAT_DEV_BYPASS` | **Local build only** | Render `/app` chat shell without Clerk publishable key |

**Option A — script (after login):**

```bash
npm run setup:waitlist -- --push-secrets
```

**Option B — manual:**

```bash
echo YOUR_SECRET | npx wrangler pages secret put WAITLIST_EXPORT_SECRET --project-name=heyzuly
echo YOUR_SALT    | npx wrangler pages secret put WAITLIST_IP_SALT --project-name=heyzuly
```

**Option C — dashboard:** Pages → heyzuly → Settings → Environment variables (production).

---

## Deploy

### Direct upload (Wrangler)

```bash
npm run deploy:pages
# or
npm run deploy
```

Requires `wrangler login`.

### Git-connected Pages (recommended for CI)

1. Connect repo in Cloudflare dashboard (Build command: `npm run build`, Output: `dist`).
2. Ensure `wrangler.toml` has correct `database_id` and D1 binding.
3. Push to `main` — Pages builds and deploys Functions from `functions/`.

```bash
git push origin main
```

---

## Local development

### Astro UI only (no waitlist API)

```bash
npm run dev
```

Open http://localhost:4321

### Full site + waitlist API

```bash
npm run setup:waitlist   # once (local migration + .dev.vars)
npm run pages:dev
```

Open the URL wrangler prints (usually http://localhost:8788).

---

## Phase 3 — Clerk auth + preview app

### 1. Create Clerk application

1. Sign up at [clerk.com](https://clerk.com) → **Create application** (email + password is fine for preview).
2. Copy **Publishable key** (`pk_test_…` or `pk_live_…`) and **Secret key** (`sk_test_…`).

### 2. Local env files

| File | Variable | Purpose |
|---|---|---|
| `.env` (from `.env.example`) | `PUBLIC_CLERK_PUBLISHABLE_KEY` | Astro build — inlined into `/sign-in`, `/app` client bundles |
| `.env` | `PUBLIC_CHAT_DEV_BYPASS` | Local only — `/app` without Clerk UI |
| `.dev.vars` | `CLERK_SECRET_KEY` | Pages Functions — verify sessions at `/api/users/*` |
| `.dev.vars` | `CHAT_DEV_BYPASS` | Local only — `/api/chat` without Clerk when secret unset |
| `.dev.vars` | `ANTHROPIC_API_KEY` | Optional — real Anthropic replies |
| `.dev.vars` | `INVITE_ADMIN_SECRET` | Optional — grant invites via API |
| `.dev.vars` | `INVITE_REQUIRED` | Optional — `true` blocks non-invited emails |

```bash
copy .env.example .env
# edit .env — paste PUBLIC_CLERK_PUBLISHABLE_KEY

# .dev.vars: add CLERK_SECRET_KEY=sk_test_...
npm run db:migrate:auth:local   # users + invites tables
npm run pages:dev
```

### 3. Clerk dashboard paths

Under **Configure → Paths** (or **Account Portal**):

| Setting | Value |
|---|---|
| Sign-in URL | `/sign-in` |
| Sign-up URL | `/sign-up` |
| After sign-in | `/app` |
| After sign-up | `/app` |

Under **Configure → Domains** (or **Allowed origins**), add:

- `http://localhost:8788` (Pages dev)
- `http://localhost:4321` (Astro dev — auth UI only, no API)
- `https://heyzuly.com`
- `https://preview.heyzuly.com` (optional branch preview subdomain)

Session duration: Clerk default is fine (7+ days with refresh). No extra config needed for Phase 3 exit criteria.

### 4. D1 auth migration (remote)

After `wrangler login`:

```bash
npm run db:migrate:auth:remote
# or full: npm run db:migrate:remote
```

### 5. Production / preview env (Cloudflare Pages)

**Build variable** (Settings → Environment variables → **Build**):

| Name | Example |
|---|---|
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` |

**Runtime secrets** (Settings → **Production** / **Preview**):

```bash
echo sk_live_xxx | npx wrangler pages secret put CLERK_SECRET_KEY --project-name=heyzuly
echo your-invite-secret | npx wrangler pages secret put INVITE_ADMIN_SECRET --project-name=heyzuly
```

Optional preview gate:

```bash
# Dashboard or wrangler — set INVITE_REQUIRED=true on preview only
```

### 6. Invite stub (early access)

Grant an invite (email must match Clerk sign-up):

```bash
curl -X POST https://heyzuly.com/api/invite/grant \
  -H "Authorization: Bearer YOUR_INVITE_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\"}"
```

When `INVITE_REQUIRED` is not set (default), anyone can sign up — fine for local dev.

### 7. Preview environment

- **Branch previews:** Cloudflare Pages auto-creates `*.pages.dev` URLs per PR. Set the same Clerk keys + `PUBLIC_CLERK_PUBLISHABLE_KEY` on the **Preview** environment in Pages settings.
- **Custom subdomain (optional):** DNS `preview.heyzuly.com` → Pages branch alias; add domain in Clerk allowed origins.

---

## Phase 4 — Chat API stub (local without Clerk)

`POST /api/chat` accepts `{ "messages": [{ "role", "content" }], "wave"?, "memory"? }`.
On success it persists the last user turn + assistant reply in D1 (`conversations` + `messages`), upserts Wave/memory into `user_facts`, and injects known facts into the stub/Anthropic system context.

`GET /api/chat` returns recent messages + `prefs` (Wave + facts) for the authenticated / bypass user (`?limit=` optional, default 50).

`GET`/`POST /api/memory` reads or upserts `user_facts` / Wave prefs without sending a chat turn.

| Auth | Behavior |
|---|---|
| `CLERK_SECRET_KEY` set | Require `Authorization: Bearer <Clerk JWT>` |
| Secret unset + `CHAT_DEV_BYPASS=true` | Allow unauthenticated local stub (`user_id=dev-bypass`) |
| Neither | `401 unauthorized` |

| Model key | Behavior |
|---|---|
| No `ANTHROPIC_API_KEY` | Canned Zuly-voiced stub; safety classifier may return crisis / edge / refuse templates before stub |
| Key set | Anthropic Messages API + embedded system prompt v1; same input classify + output moderation |

**Safety (`functions/lib/safety.ts`):** Before generate, classify user text as `crisis` \| `edge-safety` \| `jailbreak` \| `sexual` \| `ok` (keyword/phrase rules aligned with eval suite; figurative “die of embarrassment” etc. skipped). Blocked categories return a fixed template (988 / thehotline / NEDA / refuse). After generate, scan the reply for diagnosis claims, meds dosing, method detail, romantic engagement, or jailbreak compliance — on fail, replace with the safe template. Applies to both JSON and SSE paths. Smoke: `npm run eval:safety` (also chained from `eval:offline`).

**Local UI:** set `PUBLIC_CHAT_DEV_BYPASS=true` in `.env`, rebuild, open `/app`.

**D1 chat tables (once):**

```bash
npm run db:migrate:chat:local      # conversations + messages
npm run db:migrate:memory:local    # user_facts (Wave/pillar prefs)
# or full stack: npm run db:migrate:local
npm run db:migrate:chat:remote
npm run db:migrate:memory:remote   # after wrangler login
```

**Production:** do **not** set `CHAT_DEV_BYPASS` or `PUBLIC_CHAT_DEV_BYPASS`. Use Clerk + optional `ANTHROPIC_API_KEY` as a Pages secret. Run chat + memory remote migrates before relying on history/prefs.

**Streaming:** `POST /api/chat` with `"stream": true` or `Accept: text/event-stream` returns SSE (`data: {"type":"meta"| "delta"| "done"| "error",…}`). Default remains JSON `{ ok, reply, mode, persisted, prefs, stream: false }` for curl.

---

## Manual D1 queries

```bash
npx wrangler d1 execute heyzuly-waitlist --remote --command "SELECT email, created_at FROM waitlist ORDER BY created_at DESC LIMIT 50"
```

## Admin export

```bash
curl -H "Authorization: Bearer YOUR_EXPORT_SECRET" https://heyzuly.com/api/waitlist/export
curl -H "Accept: text/csv" -H "Authorization: Bearer YOUR_EXPORT_SECRET" https://heyzuly.com/api/waitlist/export -o waitlist.csv
```

---

## Setup script reference

| Script | Purpose |
|---|---|
| `npm run setup:waitlist` | Full idempotent setup (Node, cross-platform) |
| `scripts/setup-waitlist.ps1` | Windows wrapper → same Node script |
| `npm run db:migrate:local` | Local D1 (waitlist + auth + chat messages) |
| `npm run db:migrate:remote` | Remote D1 (needs login) |
| `npm run db:migrate:chat:local` | Local D1: `conversations` + `messages` only |
| `npm run db:migrate:chat:remote` | Remote D1: chat tables only |
| `npm run pages:dev` | Build + `wrangler pages dev dist` |
| `npm run deploy:pages` | Build + `wrangler pages deploy` |

### Flags

```bash
npm run setup:waitlist -- --push-secrets   # pipe secrets to Pages (production)
npm run setup:waitlist -- --skip-local     # skip local migration
npm run setup:waitlist -- --skip-remote    # skip remote steps even if logged in
```

Exit code `2` = not authenticated (local steps may still have succeeded).

---

## Historical note: direct upload → Git

The site was originally deployed via **Direct Upload** (static `dist/` only). Phase 2 adds Pages Functions and D1. Connecting Git is still recommended so `npm run build` runs on every push. See git history in this doc’s prior revision for step-by-step Git connection if the dashboard is not yet linked.
