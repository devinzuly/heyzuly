# /sync — Pull latest and get this computer ready (HeyZuly)

1. Confirm repo: `git rev-parse --is-inside-work-tree` in `Projects\heyzuly`.
2. `git status`; stash with `git stash push -u` if dirty and agreed; then `git pull origin main`.
3. If `node_modules` missing or lockfile changed: `npm install`.
4. If `.env` or `.dev.vars` missing: copy from `.env.example` / `.dev.vars.example`.
5. One-line summary: pull result, install/env actions.

Prefer `/start-zuly` for full start-of-day (dev server verify).
