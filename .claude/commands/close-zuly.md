# /close-zuly — End of Day: HeyZuly

Run this at the end of a work session on HeyZuly.

## Step 1 — Review changes

`git status --short` and `git diff` to see what changed this session.

## Step 2 — Sanity check before committing

If any `.astro`/`.ts`/`.tsx` files changed, run `npm run build` to confirm it still builds cleanly
(catches type/build errors before they hit Cloudflare Pages' own build).

## Step 3 — Commit

Stage only the specific paths actually changed this session (never `git add -A`/`git add .`).
Commit with a message describing what shipped.

## Step 4 — Push

`git push origin main`. This repo's remote is scoped to the `devinzuly` credential
(`credential.https://github.com.username=devinzuly`), so this should not prompt for auth — if it
does, see `/start-zuly` Step 2 for the fix. **Cloudflare Pages auto-deploys from `main` on push**
(git-integration build) — a push here is a real production deploy, not just a commit.

**Dual-machine:** never skip this push if you might switch machines — the other machine only sees
`origin`.

## Step 5 — Verify the deploy (if pushed)

Cloudflare Pages builds take a minute or two. If it's worth confirming live: check
`https://heyzuly.com` loads and reflects the change, or `npx wrangler pages deployment list
--project-name=heyzuly` for the latest build status.

## Step 6 — Future enhancements

(none yet — add end-of-session steps here, e.g. running `eval:offline` before pushing if
conversation-handling logic changed.)

## Step 7 — Report

```
## Session Close — HeyZuly — YYYY-MM-DD

### Shipped
- [what changed]

### Build
- npm run build / skipped (no frontend changes)

### Committed + pushed
- [commit hash] — [message]

### Deployed
- Cloudflare Pages: pushed to main, auto-deploy triggered / skipped (no push)

### Open items for next session
- [anything left]
```
