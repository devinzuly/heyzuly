# Soft-launch playbook — Hey Zuly

**Audience:** ops / founder checklist for first invite-gated cohort (app-only).  
**Date:** 2026-07-14  
**Scope:** Waitlist → invite → `/app` loop. Not public open signup. Not paid Stripe beta.

Related:

| Doc | Use |
|---|---|
| [`CLOUDFLARE-SETUP.md`](./CLOUDFLARE-SETUP.md) | Pages, D1, secrets, Clerk, waitlist→invite admin steps |
| [`evals/dry-run.md`](./evals/dry-run.md) | Human safety/voice dry-run (full 20 + how to run) |
| [`Onboarding-Survey-Spec.md`](./Onboarding-Survey-Spec.md) | Soft-launch survey banks + first Wave defaults |
| [`evals/lighthouse-copy-signoff.md`](./evals/lighthouse-copy-signoff.md) | #11 human Lighthouse / copy gate (can defer — see §8) |
| [`Dev-Roadmap.md`](./Dev-Roadmap.md) | Canonical sprint board |

---

## 1. Pre-flight

Do this before inviting anyone. Order matters.

### 1.1 Remote D1 migrations

On the production D1 (`heyzuly-waitlist`), apply the full stack once (idempotent for already-applied files; still verify):

```bash
npx wrangler login
npx wrangler whoami
npm run db:migrate:remote
```

Or stepwise if you prefer audit trails:

```bash
npm run db:migrate:auth:remote    # users + invites
npm run db:migrate:chat:remote    # conversations / messages
npm run db:migrate:memory:remote  # user_facts
npm run db:migrate:waves:remote   # waves / day_plans
npm run db:migrate:nudges:remote  # nudge_log
```

Confirm tables exist (optional):

```bash
npx wrangler d1 execute heyzuly-waitlist --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Expect at least: `waitlist`, `users`, `invites`, `conversations`, `messages`, `user_facts`, `waves`, `day_plans`, `nudge_log`.

### 1.2 Env vars matrix

Set on Cloudflare Pages project **heyzuly** (Production; mirror Preview if you invite there). Details: [`CLOUDFLARE-SETUP.md`](./CLOUDFLARE-SETUP.md) § Production secrets / Phase 3.

| Variable | Where | Soft launch | Notes |
|---|---|---|---|
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | **Build** env | **Required** | Inlined at `npm run build` |
| `CLERK_SECRET_KEY` | Runtime secret | **Required** | Session verify for `/api/*` |
| `WAITLIST_EXPORT_SECRET` | Runtime secret | **Required** | Export for invite picks |
| `WAITLIST_IP_SALT` | Runtime secret | Recommended | Already used in prod waitlist |
| `INVITE_ADMIN_SECRET` | Runtime secret | **Required** | `npm run invite:grant` / grant API |
| `INVITE_REQUIRED` | Runtime env | **`true`** | Gate non-invited emails |
| `ANTHROPIC_API_KEY` | Runtime secret | Optional | Omit → canned stub (still runs safety) |
| `CRON_SECRET` | Runtime secret | Optional | Prefer for `POST /api/cron/nudges` |
| `CHAT_DEV_BYPASS` | — | **NEVER in prod/preview** | Local `.dev.vars` only |
| `PUBLIC_CHAT_DEV_BYPASS` | — | **NEVER in prod/preview** | Local `.env` build only |

**Hard rule:** If `CHAT_DEV_BYPASS` or `PUBLIC_CHAT_DEV_BYPASS` appears in Pages Production or Preview, remove it before any invite. Soft launch = Clerk-only auth.

Clerk dashboard (pre-deploy):

- Paths: sign-in `/sign-in`, sign-up `/sign-up`, after auth `/app`
- Allowed origins: `https://heyzuly.com` (+ preview host if used)
- Sign-up email must match the granted invite email exactly

### 1.3 Local admin tooling

Keep matching secrets in local `.dev.vars` (never commit) so you can grant against prod:

```bash
# .dev.vars must have INVITE_ADMIN_SECRET identical to Pages
# WAITLIST_EXPORT_SECRET for export curls
```

---

## 2. Deploy / Pages

```bash
npm run build
npm run deploy:pages
# or: git push origin main  (if Git-connected Pages)
```

Post-deploy checks:

1. `https://heyzuly.com` loads; waitlist still works
2. `GET https://heyzuly.com/api/invite/status` → `{ "ok": true, "invite_required": true }`
3. `/sign-in` and `/sign-up` render Clerk (not blank / bypass shell)
4. Uninvited email cannot reach `/app` (early-access / not_invited gate)
5. D1 binding `DB` → `heyzuly-waitlist` still present on the Pages project

Full setup reference: [`CLOUDFLARE-SETUP.md`](./CLOUDFLARE-SETUP.md) § Deploy.

---

## 3. Grant first invitees

1. Export waitlist (Bearer `WAITLIST_EXPORT_SECRET`):

   ```bash
   curl -H "Authorization: Bearer YOUR_EXPORT_SECRET" \
     -H "Accept: text/csv" \
     https://heyzuly.com/api/waitlist/export -o waitlist.csv
   ```

2. Pick a small first batch (e.g. 5–15), not 200 on day one.
3. Grant each email:

   ```bash
   npm run invite:grant -- someone@example.com --prod
   ```

4. Message them privately (Resend deferred — personal email/SMS OK for ops):  
   *Sign up at heyzuly.com/sign-up with this exact email. You’re on early access.*
5. Track in a sheet: `email`, `invited_at`, grant status (`granted` / `exists`), first `/app` OK?

Admin detail: [`CLOUDFLARE-SETUP.md`](./CLOUDFLARE-SETUP.md) § Admin checklist — waitlist → invite.

---

## 4. Smoke path (one real invitee or founder account)

Run as a freshly invited user on **production** (not bypass).

| Step | Pass looks like |
|---|---|
| **Sign-up** | Clerk account with invited email → lands `/app`; uninvited blocked |
| **Onboarding** | Name → pillar → rhythm → seed; optional soft-launch survey for selected pillar ([`Onboarding-Survey-Spec.md`](./Onboarding-Survey-Spec.md)) |
| **Wave** | Active Wave / Self-healing default if that pillar selected; Grow shows week theme |
| **Chat (Talk)** | Reply (Anthropic or stub); history persists; crisis keyword returns 988 path |
| **Today** | Build / confirm day plan; mark done; miss copy shame-free |
| **Grow** | Week progress visible; no crash on empty/complete states |
| **Help / crisis** | Help sheet from header / Talk / You; 988 + findahelpline + not-a-therapist; support contact |

Also poke: Plan last-7 history, You (name / nudges toggle / Access row), SoftNotice retry if you force a network fail.

---

## 5. Safety dry-run subset (reminder)

Full suite already **passed** 2026-07-14 (20/20). Before each meaningful prod Anthropic toggle or prompt change, re-run a **subset** live on prod (or pages:dev with the same key/prompt):

| Must cover | Examples from dry-run set |
|---|---|
| Crisis (100%) | `ex-005`, `ex-019`, `ex-045` |
| Edge / boundaries | `ex-023`, `ex-009` |
| Jailbreak | `ex-080` or `ex-081` |
| Voice / Wave | `ex-003`, `ex-016` |

```bash
npm run eval:dry-run          # print curated User turns
# then paste into /app Talk — see docs/evals/dry-run.md
npm run eval:safety           # offline classifier smoke (CI-friendly)
```

Any crisis miss = **stop invites**, engage kill switches (§7), fix before continuing.

Guide: [`evals/dry-run.md`](./evals/dry-run.md).

---

## 6. What to monitor — first week

Keep it lightweight (Cloudflare Web Analytics + D1 + support inbox). No ad pixels on health data.

| Signal | Why |
|---|---|
| Sign-up failures / early-access gate spikes | Invite mismatch or Clerk misconfig |
| `/api/chat` 4xx/5xx (Workers logs) | Auth, Anthropic, or D1 pain |
| Crisis / Help sheet usage (qualitative + any support@ mail) | Safety + discoverability |
| Day-plan created vs abandoned (D1 `day_plans`) | Loop health |
| Wave started / week advance | Retention hook |
| Anthropic errors / latency (if key set) | Flip to stub if degraded |
| `nudge_log` stub volume (if cron wired) | Logic only — no real send yet |
| Unsolicited “I got a text/email” | Should be **zero** — channels not in soft launch |

Internal feedback: email `support@heyzuly.com` (or your chosen ops channel). No in-app feedback form required for first cohort.

Retention/conversion gates for a later **paid** soft launch still live in [`Dev-Roadmap.md`](./Dev-Roadmap.md) § Launch Definition — this invite cohort is the app-only precursor.

---

## 7. Kill switches

Use when something is wrong (safety, auth flood, model cost/errors). Prefer dashboard/env flips over code deploys when possible.

| Switch | Action | Effect |
|---|---|---|
| **Invite gate** | Set `INVITE_REQUIRED=true` (keep on for soft launch); stop running `invite:grant` | No new emails enter |
| **Open flood** | Keep invite-required; revoke/rotate `INVITE_ADMIN_SECRET` if leaked | Stops unauthorized grants |
| **Disable Anthropic → stub** | Remove / unset Pages secret `ANTHROPIC_API_KEY` | Canned replies; **safety classifier still runs** |
| **Nudges off** | Users: You → reminders off (`settings.nudges_enabled`); ops: do not call cron / unset `CRON_SECRET` | No stub cron writes; no real email/SMS exists yet |
| **Auth emergency** | Clerk dashboard: disable sign-ups | Stops new accounts even if invite exists |
| **Nuclear** | Cloudflare Pages → pause deploy / take site to maintenance | Last resort |

After a kill: re-run §5 crisis subset before reopening grants.

---

## 8. Explicitly **not** in this soft launch

Do **not** block invite cohort on these:

| Out of scope | Why |
|---|---|
| **WhatsApp / SMS send** | Meta/Twilio vendor; helpers only in repo |
| **Stripe / paid paywall** | Counsel on Privacy/ToS first; paid beta is a later Phase 7 step |
| **Resend / ConvertKit** | Waitlist confirm + marketing email deferred |
| **#11 Lighthouse ≥90 + stakeholder copy sign-off** | **Can still be deferred** into soft launch with caveat: ship invite cohort on current a11y pass; complete human mobile Lighthouse + copy sign-off before **paid / public** spend ([`evals/lighthouse-copy-signoff.md`](./evals/lighthouse-copy-signoff.md)) |
| Live eval judge harness | Offline gates enough for invite cohort |
| Open public signup | Keep `INVITE_REQUIRED=true` |

**Soft launch = app-only, invite-gated, wellness draft legal, founder support.** Public launch and Stripe come after metrics + counsel.

---

## 9. Ordered day-of checklist (print / paste)

- [ ] Remote migrations applied (`npm run db:migrate:remote`)
- [ ] Env matrix set; **no** `CHAT_DEV_BYPASS` / `PUBLIC_CHAT_DEV_BYPASS` on Pages
- [ ] `INVITE_REQUIRED=true`; Clerk paths + origins OK
- [ ] Deploy + `invite/status` shows invite required
- [ ] Export waitlist → grant first batch → private invite notes
- [ ] Smoke: sign-up → onboarding → Wave → chat → Today → Grow → Help/crisis
- [ ] Safety subset (crisis 100%) if Anthropic or prompt changed
- [ ] Monitoring watchlist for week 1 (§6)
- [ ] Kill switches known (§7); out-of-scope list acknowledged (§8)

---

*Playbook v1 — 2026-07-14. Update when Stripe invite-beta or channels enter scope.*
