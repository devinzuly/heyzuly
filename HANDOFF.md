# Hey Zuly — Development Handoff

*Reconstructed July 12, 2026 from live site, Cloudflare/DNS inspection, and prior Claude Cowork sessions. Use this as the continuity doc until the original Claude handoff is recovered.*

---

## What exists today

| Asset | Status |
|---|---|
| **Domain** | `heyzuly.com` — live, DNS on Cloudflare (`104.21.17.71`, `172.67.223.57`) |
| **Landing page** | Live at https://heyzuly.com — Astro static build (`/_astro/index.G1kGsk2a.css`) |
| **Source repo** | **None locally** — deployed to Cloudflare Pages only (per owner) |
| **Waitlist** | **Client-side only** — form shows success message; emails are **not persisted** |
| **Preview login** | Links to Claude artifact: `https://claude.ai/code/artifact/97c6ff4a-c496-488c-bf1a-d587866ae8b4` |
| **Local project** | `C:\Users\1devi\Projects\heyzuly` (this repo) — git init, snapshot + docs |

---

## Product vision (from live site + brand sessions)

**Zuly** is a warm AI wellness guide for women in a season of transformation — founded by Lupe "Zuly" Fuentes (born Cali, raised Madrid). Not another content library; a **relationship** that learns your whole life and turns it into a day you can actually do.

### Four pillars (grounded frameworks)

1. **Meditation** — MBSR/MBCT; short daily practice
2. **Self-healing** — CBT & expressive writing; journaling, reframing
3. **Physical wellness** — progressive, periodized movement
4. **Life guidance** — relationships, work, money, self; habit & behavior design

### Core loop

1. Talk to her (goals, day, what's weighing on you)
2. She learns your life (pillars, rhythms, what matters)
3. She builds your day (custom routine)
4. Your calendar fills (weekly tracks)
5. She checks in (nudge, reframe, plan)

### Channels (planned / marketed)

- **In-app** — most private, E2E encrypted
- **WhatsApp** — voice & chat
- **SMS** — quick capture via private number per user

### Program model

- Dynamically generated **Waves** (4- and 8-week tracks), not a static content shelf
- Courses built from conversation → personalized calendar

---

## Brand architecture (July 2026 decision path)

See `docs/Onda-Zuly-Brand-Architecture.md` for full detail.

**Recommended path (Path A):** **Zuly** as master brand; "onda" / wave / ∞ as identity language (not legal trademark).

| Element | Name | Role |
|---|---|---|
| Platform | Zuly (was "Onda" in exploration) | The app / company |
| Guide | Zuly | AI guide in Lupe's voice |
| Phase 2 guide (men) | Cruz | Second persona |
| Program unit | A Wave (or A Set) | Dynamic course Zuly builds |
| Domains | Pillars | Mind, Body, Money, Purpose, etc. |

**Taglines to test:** *What's your onda?* · *Talk to Zuly.* · *Someone who's actually been there.*

**Audience evolution:** Research initially favored men-first (whitespace); founder story + live site copy skew **women-first** (transformation, reinvention, "mija", "Para ti").

---

## Market & regulatory context

See `docs/AI-Wellness-Platform-Research.md` for citations.

**Key constraints for v1:**

- Position as **wellness guide**, not therapist or medical device
- No third-party ad trackers on health/journal data (FTC enforcement pattern)
- Self-harm detection + 988 crisis routing from day one
- AI disclosure required in multiple states (IL, NV, UT, CA, NY trends)
- Long-term **memory** is the core product moat and conversion lever
- Build on frontier APIs (Claude/GPT-class); differentiate on memory, prompts, UX, safety
- Suggested stack direction: **pgvector** (Supabase/Neon) + **mem0** or **Zep** for memory

**Pricing direction:** ~$70–100/yr annual-first subscription; monthly at launch (per waitlist copy).

---

## Live site technical notes

- **Framework:** Astro (static output)
- **Hosting:** Cloudflare Pages (confirmed by DNS + `cloudflareinsights` beacon)
- **Theme:** Light/dark toggle via `data-theme` on `<html>` (session only, not persisted)
- **Waitlist JS:** Prevents default submit; validates email; hides form; shows "You're in" — **no API call**
- **Cloudflare account on this machine:** Wrangler cache points to `Info@supplyparcel.com's Account` (`6e9a0668bd7d99087e5c839947b74581`) — confirm this is the correct account for heyzuly Pages project

### Snapshot in this repo

`snapshot/` contains a crawl of the production HTML/CSS/favicon as of handoff date — use to rebuild the Astro project until Pages source is exported.

---

## What's NOT built yet

- [ ] Git repo connected to Cloudflare Pages (or source recovered from Pages)
- [ ] Waitlist backend (DB, email service, or Cloudflare Worker + KV/D1)
- [ ] Auth / preview accounts (artifact-only today)
- [ ] Zuly chat / memory / pillar engine
- [ ] WhatsApp / SMS integrations
- [ ] App store presence
- [x] Privacy policy + Terms **drafts** (`/privacy`, `/terms`) — counsel review before paid launch / Stripe
- [ ] Privacy/ToS counsel-final + HIPAA-adjacent review (do **not** claim HIPAA)
- [ ] Analytics beyond Cloudflare Web Analytics (no ad pixels — by design)

---

## Suggested development phases

### Phase 0 — Reconnect (now)

1. Export or recreate Astro source from `snapshot/` + Cloudflare Pages dashboard
2. Link repo → Cloudflare Pages for CI deploys
3. Document env secrets (API tokens, waitlist provider)

### Phase 1 — Landing + waitlist

1. Working email capture (options: Cloudflare Worker + D1, Resend + Worker, Supabase, ConvertKit)
2. Remove placeholder "Log in" or wire to real auth
3. Privacy policy + footer compliance copy

### Phase 2 — Preview app shell

1. Auth (Clerk, Supabase Auth, or Cloudflare Access)
2. Minimal chat UI with Zuly system prompt
3. Onboarding survey → first "Wave" stub

### Phase 3 — Core product

1. Memory layer (pgvector + summarization)
2. Calendar / practice scheduling
3. Pillar content generation
4. Channel integrations (WhatsApp Business API, Twilio SMS)

---

## Info needed from you to proceed

Please share (can paste in chat — redact secrets if posting publicly):

1. **Cloudflare Pages** project name for heyzuly + whether deploy is direct upload or git-connected
2. **Cloudflare API token** or confirm wrangler login on this machine
3. **Waitlist destination** preference: email only, spreadsheet, Supabase, ConvertKit, other
4. **Claude artifact** — can you open/export the preview app artifact?
5. **Any other handoff notes** from the prior Claude session (screenshots, docs, Figma)
6. **"Other" priority** you selected — what did you have in mind beyond the handoff doc?

---

## Claude session artifacts recovered

From Cowork session `local_8226762a` (trademark / brand work, July 2026):

- `docs/Onda-Zuly-Brand-Architecture.md`
- `docs/AI-Wellness-Platform-Research.md`

Prior conversation topics in that session: Loop vs Onda vs Zuly naming, men vs women audience, dynamic "Waves" courses, regulatory landscape, femtech competitive research.

---

## Quick commands (once Astro project is scaffolded)

```bash
cd C:\Users\1devi\Projects\heyzuly
npm install
npm run dev
# deploy (after wrangler/pages setup)
npx wrangler pages deploy dist
```

---

*This handoff will be updated as Cloudflare access and source recovery progress.*

---

## Active state (2026-07-14)

Canonical ordered sequence: [`docs/Dev-Roadmap.md`](docs/Dev-Roadmap.md) § **Ordered sequence**.

| Area | Status |
|---|---|
| Phase 2 waitlist | Done (prod verified) |
| Phase 3 Clerk | Coded; **vendor-blocked** on keys + prod smoke |
| Phase 4 chat | Stub + D1 messages + history UI; `CHAT_DEV_BYPASS` works |
| Phase 4 memory | D1 `user_facts` + Wave/pillar inject **shipped** |
| Phase 4 onboarding | Micro-flow + optional survey banks for **selected** pillars (Self-healing / Meditation / Body / Life) **shipped** |
| Phase 4 SSE | Streaming chat **shipped** (`stream: true` / `Accept: text/event-stream`) |
| Phase 5 Grow stub | Grow tab week 1–4 + today completion + **Wave complete celebration** **shipped** |
| Phase 5a curricula | 4-week templates all pillars + week advance + complete/next Wave **shipped** |
| Phase 5b Talk→build | `POST /api/wave/build-from-talk` + ChatPanel confirm/edit **shipped** |
| Phase 5d nudge stubs | `nudge_log` + cron dry-run + channel length helpers **shipped** (no vendor send) |
| Offline evals | `npm run eval:offline` — 113 goldens + 24 holdouts + safety smoke; `eval:holdouts` alone |
| Human dry-run (#12) | **Passed** 2026-07-14 — 20/20 (voice ≥85%, crisis 100%); see `docs/evals/dry-run.md` |

### Deferred / vendor holds

| Item | Status |
|---|---|
| Exemplar paraphrases / holdouts (~20%) | **Done** — 24 in `docs/evals/holdouts/` |
| Eval harness — **live** model / judge | Deferred (needs Anthropic) |
| Skipped golden themes | **Done** (`ex-102`–`ex-105`) |
| Cultural depth suite | Deferred |
| **Love Languages module** | **Deferred / Backlog** — optional Life deep-dive, conversational, multi-preference, never day-1, never framed as science; elaborate later (see `docs/Onboarding-Survey-Spec.md` §4) |
| **#11 Lighthouse + copy sign-off** | **Deferred / skipped for now** — a11y/nav polish shipped; human mobile Lighthouse ≥90 + stakeholder copy before soft launch (walkthrough: `docs/evals/lighthouse-copy-signoff.md`) |
| Resend / ConvertKit email | Vendor-blocked |
| Clerk keys + Phase 3 prod smoke | Vendor-blocked |
| Supabase/pgvector + mem0 | Vendor-blocked (after D1 facts) |
| Stripe / Twilio / WhatsApp Meta | Vendor-blocked |

**Unlocked next (no new vendor):** hold vendor email/SMS; counsel review of Privacy/ToS before Stripe. Phase 5a curricula + completion celebration + 5b Talk→build **shipped**. Nudge **logic** stubs + WA/SMS helpers shipped — real email/SMS = Resend/Twilio hold. **#12 passed**. **#11 deferred** until soft-launch prep.

