# Cloudflare setup — Hey Zuly Phase 2 (waitlist + D1)

Automated setup for Cursor/agents and local development. Minimal manual PowerShell.

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
| `npm run db:migrate:local` | Local D1 only |
| `npm run db:migrate:remote` | Remote D1 only (needs login) |
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
