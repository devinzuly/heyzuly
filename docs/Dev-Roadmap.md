# Hey Zuly ? Development Roadmap

> **Status:** Active | **Date:** July 13, 2026 | **Scope:** Now ? Launch  
> **Audience:** Solo/small-team development | **Brand:** Entity-led (Zuly Comadre Guide; no founder biography)

---

## Progress tracking

| Phase | Status | Notes |
|---|---|---|
| **Phase 1** ? Astro rebuild + entity rebrand | ? **COMPLETE** | Deployed on Cloudflare Pages; Astro source + entity rebrand live |
| **Phase 1.5** ? Broad-lead copy pass (Option A) | ? **COMPLETE** | English-primary marketing; growth framing; Spanish/comadre in-product only |
| Phase 2 ? Waitlist backend | ?? **IN PROGRESS** | D1 schema + Pages Functions + form wired |
| Phase 3 ? Auth + preview app shell | ? Not started | |
| Phase 4 ? Zuly core (chat, memory) | ? Not started | |
| Phase 5 ? Waves, pillars & calendar loop | ? Not started | |
| Phase 6 ? Channels (WhatsApp, SMS) | ? Not started | |
| Phase 7 ? Monetization, compliance & launch | ? Not started | |

### Phase 1 checklist

- [x] Scaffold Astro project (`src/`, `astro.config`, `package.json`)
- [x] Componentize landing page (Hero, Meet Zuly, How It Works, Pillars, Waitlist, Footer, Theme toggle)
- [x] Remove founder name, photo, biography, DJ/music references
- [x] Implement entity-led copy (hero, Meet Zuly, trust strip, loop steps, footer/legal stubs)
- [x] Retire Lupe-attributed taglines; adopt *"Talk to Zuly."* / growth-led hero (retired customer-facing *onda*)
- [x] Four pillars: Meditation, Self-healing, Body, Life guidance
- [x] Crisis footer stub: 988 + wellness-not-therapy disclaimer
- [x] Build outputs to `dist/`; `npm run build` configured
- [x] README updated with dev commands
- [x] Draft Zuly persona doc (`docs/Zuly-Persona-Spec.md`)
- [ ] Lighthouse performance ? 90 on landing (mobile)
- [ ] Stakeholder sign-off on hero + Meet Zuly copy (Phase 1.5 draft ready for review)
- [x] Verify deploy matches prior URL structure after first build push

### Phase 1.5 checklist (Option A ? broad lead, cultural depth in product)

- [x] Hero: English-primary headline; eyebrow *"A guide for the whole of you"*; retire *"What's your onda?"*
- [x] Phone mockup: neutral warm greeting (*"Good morning"*) ? no *mija* / Spanish on landing
- [x] Meet Zuly: growth-season entity story; remove cultural/Latino-specific framing
- [x] Grep `src/` clean: no *Para ti*, *onda*, *mija*, *Zuleidy*, *Lupe*, Spanish marketing phrases
- [x] MeetZulyChat + Waitlist: remove Spanish fragments from marketing UI
- [x] Meta/OG: broad appeal description (women 28?42, growth season)
- [x] `docs/Zuly-Persona-Spec.md`: marketing vs in-product voice; language mirroring rules
- [x] `npm run build` succeeds
- [ ] Stakeholder sign-off on Phase 1.5 copy

### Phase 2 checklist (waitlist backend)

- [x] D1 schema + migration (`migrations/0001_create_waitlist.sql`)
- [x] `wrangler.toml` with D1 binding
- [x] `POST /api/waitlist` ? validate, dedupe, rate limit, honeypot
- [x] `GET /api/waitlist/export` ? secret-protected
- [x] Waitlist form wired to API with error states
- [x] README: D1 setup + wrangler commands
- [ ] Create remote D1 + bind to Pages project (dashboard)
- [ ] Set `WAITLIST_EXPORT_SECRET` (+ optional `WAITLIST_IP_SALT`) in Pages env
- [ ] Production smoke test: signup ? export within 60s
- [ ] Rate limit verified (>5/min/IP blocked)

### Product positioning (Phase 1.5 ? locked)

- **Marketing / landing:** English-primary, broad growth appeal. No *mija*, no *onda*, no Spanish-led headlines or cultural gatekeeping on the site.
- **In-app chat (after rapport):** Comadre warmth, bilingual mirroring, and earned terms (*mija*, conversational *?qu? onda?*) ? **chat-based only**, never reused as landing or acquisition copy.
- **Alignment:** Any in-flight Phase 1.5 copy or UI pass must keep marketing English-primary; cultural depth stays in product chat per `docs/Zuly-Persona-Spec.md`.

### Product backlog (future ? not Phase 1.5)

| Item | Target phase | Status | Scope (brief) |
|---|---|---|---|
| **Ethnicity / cultural language enhancement** | Post?Phase 4 (eval + privacy review) | **Backlog** | User-selectable or carefully inferred cultural/language preference; adaptive persona that mirrors the user's background with deeper Spanish and culturally warm *feeling* in **chat only** ? not marketing. Includes exemplar expansion, opt-in/consent for inference, and eval rubrics to avoid stereotyping. **Deferred:** not in current sprint. |

---

## 1. Overview

### Vision

**Zuly** is a bounded, warm AI wellness guide for women 28?42 in a season of growth. She is not a content library, therapist, or romantic companion. She is a **programmed persona** ? the Comadre Guide ? who learns your life across four pillars (meditation, self-healing, body, life guidance), turns conversation into a day you can actually do, and rides the **talk ? learn ? build day ? calendar ? check-in** loop over 4?8 week **Waves**.

The product moat is **relationship + memory + calendar integration**, not meditation audio shelves. The brand is **entity-led**: Zuly is the face; no celebrity or founder biography on site or in product.

### Launch definition

**Launch** means a **public paid beta** ? not a waitlist-only landing page, not a free-only app.

| Launch milestone | What ships |
|---|---|
| **Soft launch** | Invite-only paid beta (50?200 users from waitlist); web app with chat, memory, one 4-week Wave, calendar export, app push nudges; annual subscription live; compliance floor in place |
| **Public launch** | Open signup; same core product + WhatsApp channel; marketing site entity-rebranded; App Store optional (web-first) |

Soft launch validates retention (D7, D30) and paid conversion before scaling acquisition. Public launch follows soft-launch metrics hitting decision gates (see ?10).

### Timeline estimate

| Scenario | Duration | Calendar |
|---|---|---|
| **Solo dev, focused** | 22?26 weeks | ~Late Dec 2026 ? Jan 2027 |
| **Solo dev, part-time (~20 hrs/wk)** | 32?40 weeks | ~Mar?May 2027 |
| **Small team (2 devs + design)** | 16?20 weeks | ~Nov?Dec 2026 |

Assumes no major regulatory blockers, no App Store review delays (web-first), and frontier API availability. Add 2?4 weeks buffer for legal review and persona eval iteration.

**Critical path:** Phase 1 ? 2 ? 3 ? 4 ? 5 ? 7 (channels in Phase 6 can overlap with Phase 5 tail and Phase 7 prep).

---

## 2. Current Baseline (Done)

| Item | Status | Notes |
|---|---|---|
| Domain `heyzuly.com` | ? Live | Cloudflare DNS |
| Cloudflare Pages hosting | ? Live | Direct upload ? Git-connected |
| GitHub `devinzuly/heyzuly` | ? Synced | `dist/` tracked; auto-deploy on push |
| Local project | ? `C:\Users\1devi\Projects\heyzuly` | Docs + `dist/` snapshot |
| Compiled Astro site | ? `dist/` | Built output only ? **no editable Astro source yet** |
| Waitlist UI | ? Wired to API | Form POSTs to `/api/waitlist` (Pages Functions) |
| Entity/demographic strategy | ? Documented | `docs/Zuly-Entity-Demographic-Proposal.md` |
| Brand architecture | ? Documented | `docs/Onda-Zuly-Brand-Architecture.md` |
| Cloudflare setup guide | ? Documented | `docs/CLOUDFLARE-SETUP.md` |

### Not built

- Waitlist backend deployed to prod D1 (code in repo; bind D1 + secrets in Pages)
- Auth, user accounts, preview app
- Zuly chat, memory, safety layer
- Waves, pillars, calendar loop
- WhatsApp, SMS channels
- Monetization (Stripe), privacy policy, terms
- Persona system prompt + exemplar library (production)

### Brand debt to clear

- Remove all **Lupe Fuentes** / founder biography from site and docs
- Replace founder-trust copy with **entity-led** copy per proposal ?8
- Retire tagline *"Someone who's actually been there"*
- Defer **Cruz** (male guide) until post-launch metrics prove Zuly PMF

---

## 3. Phases

---

### Phase 1: Astro Rebuild + Entity Rebrand

**Goal:** Editable Astro source repo with entity-led landing page; Lupe/founder content removed; deploy pipeline unchanged.

| | |
|---|---|
| **Duration** | 2?3 weeks |
| **Prerequisites** | Current `dist/` snapshot; entity proposal copy (?8); Git + Pages CI working |
| **Depends on** | Baseline (done) |

#### Deliverables

- [ ] Scaffold Astro project (`src/`, `astro.config`, `package.json`) from `dist/` / `snapshot/`
- [ ] Componentize: Hero, Meet Zuly, How It Works, Pillars, Waitlist, Footer, Theme toggle
- [ ] Remove all founder name, photo, biography, DJ/music references
- [ ] Implement entity-led copy: hero, Meet Zuly, trust strip, loop steps, footer/legal stubs
- [ ] Retire Lupe-attributed taglines; adopt *"What's your onda?"* / *"Talk to Zuly."*
- [ ] Four pillars labeled: **Meditation, Self-healing, Body, Life guidance**
- [ ] Crisis footer stub: 988 + wellness-not-therapy disclaimer
- [ ] Build outputs to `dist/`; Git push auto-deploys to Pages
- [ ] Local dev: `npm run dev` works; README updated with dev commands
- [ ] Draft Zuly persona doc (`docs/Zuly-Persona-Spec.md`) ? voice anchors, boundaries, 10 starter exemplars

#### Exit criteria (measurable)

- [ ] Zero grep hits for `Lupe`, `Fuentes`, `founder`, `DJ` in `src/` and deployed `dist/`
- [ ] Lighthouse performance ? 90 on landing (mobile)
- [ ] `npm run build` succeeds; deploy matches prior URL structure (no broken links)
- [ ] Stakeholder sign-off on hero + Meet Zuly copy

#### Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Site framework | **Astro 5** (static) | Matches existing build; fast, SEO-friendly |
| Styling | Existing CSS ported to Astro scoped/global | Preserve live look; refactor later |
| Hosting | **Cloudflare Pages** (Git) | Already live; zero migration |
| Fonts/assets | Port from `dist/` | Parity with production |

#### Risks

- Reconstructed source may miss edge-case styles ? visual regression
- Copy changes without legal review of disclaimers ? mitigate with proposal ?8 footer language

---

### Phase 2: Waitlist Backend

**Goal:** Persist waitlist signups; owner can export list; form on live site calls real API.

| | |
|---|---|
| **Duration** | 1?2 weeks |
| **Prerequisites** | Phase 1 Astro source; Cloudflare account access |
| **Depends on** | Phase 1 (form lives in Astro components) |

#### Deliverables

- [x] Cloudflare **Worker** + **D1** table: `waitlist (id, email, created_at, source, utm_json)`
- [x] `POST /api/waitlist` ? validate email, dedupe, rate-limit (IP + email)
- [x] Honeypot + basic bot resistance (no CAPTCHA v1 unless abuse appears)
- [x] Wire Astro waitlist form to Worker endpoint
- [x] Admin export: Wrangler D1 query or simple password-protected `GET /api/waitlist/export`
- [ ] Optional: **Resend** or **ConvertKit** sync on signup (webhook from Worker)
- [x] Error states in UI: duplicate email, network failure
- [x] Environment secrets documented (not committed): `WRANGLER_*`, API keys

#### Exit criteria (measurable)

- [ ] Test signup persists in D1; visible in export within 60s
- [ ] Duplicate email returns friendly message; no duplicate rows
- [ ] 10 consecutive signups succeed without error
- [ ] Rate limit blocks >5 signups/min/IP

#### Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| API | **Cloudflare Workers** | Same platform as Pages; low ops |
| Database | **D1** (SQLite) | Free tier; sufficient for waitlist |
| Email sync (optional) | **Resend** or **ConvertKit** | Owner preference; not blocking |
| Secrets | Wrangler secrets / Pages env | Standard CF pattern |

#### Risks

- D1 cold starts / binding misconfig ? test in preview Workers before prod
- Spam signups ? rate limit + honeypot; upgrade to Turnstile if needed

---

### Phase 3: Auth + Preview App Shell

**Goal:** Authenticated web app shell at `/app`; waitlist users can eventually be invited; minimal chat UI placeholder.

| | |
|---|---|
| **Duration** | 2?3 weeks |
| **Prerequisites** | Phase 2; domain SSL on Cloudflare |
| **Depends on** | Phase 1 (site), Phase 2 (waitlist ? invite list) |

#### Deliverables

- [ ] Auth provider integrated: sign-up, sign-in, sign-out, password reset
- [ ] `/app` route (Astro SSR or separate Vite/React island ? see stack)
- [ ] Protected layout: sidebar/header, chat pane stub, profile menu
- [ ] "Log in" on landing ? real auth (remove Claude artifact link)
- [ ] User record in DB: `users (id, auth_provider_id, email, created_at, onboarding_complete)`
- [ ] Invite flow stub: waitlist email ? magic link or manual invite flag
- [ ] AI disclosure in onboarding: "Zuly is an AI wellness guide, not a therapist"
- [ ] Crisis resources link persistent in app chrome
- [ ] Deploy preview env (`preview.heyzuly.com` or CF Pages branch previews)

#### Exit criteria (measurable)

- [ ] New user can sign up, land in `/app`, sign out, sign back in
- [ ] Unauthenticated `/app` redirects to login
- [ ] Auth session persists across refresh (7-day session minimum)
- [ ] Claude artifact link removed from production

#### Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Auth | **Clerk** | Fast solo-dev integration; social login later; good React components |
| Alt | Supabase Auth | If consolidating DB on Supabase in Phase 4 |
| App UI | **React** islands in Astro or **Vite + React** SPA at `/app` | Chat UI needs interactivity |
| API routes | Cloudflare Workers (Hono) | Unified edge API |
| User DB | **D1** (v1) ? migrate to Supabase in Phase 4 if needed | Start simple |

**Decision gate:** If Phase 4 memory lands on Supabase, switch auth to Supabase Auth in Phase 3 to avoid dual user stores. Recommended: **Clerk for Phase 3**, sync `user_id` to Supabase on Phase 4 start.

#### Risks

- Astro + SPA auth routing complexity ? document `/app` as SPA catch-all
- Clerk cost at scale ? acceptable for beta; revisit at 1K+ MAU

---

### Phase 4: Zuly Core (Onboarding, Chat, Memory)

**Goal:** First real conversation with Zuly; onboarding in her voice; memory persists across sessions; safety floor live.

| | |
|---|---|
| **Duration** | 4?6 weeks |
| **Prerequisites** | Phase 3 auth; Anthropic API key; persona spec draft |
| **Depends on** | Phase 3 (authenticated users) |

This is the **highest-risk, highest-value** phase. Nothing else matters if chat feels generic or unsafe.

#### Deliverables

- [ ] **Persona system prompt** v1: Comadre Guide anchors, boundaries, never-say rules (proposal ?3)
- [ ] **50 annotated exemplars** across user states (overwhelmed, motivated, stuck, crisis, celebrating)
- [ ] Chat API: `POST /api/chat` ? stream responses via **Anthropic API** (Claude Sonnet class)
- [ ] Conversation storage: `messages (id, user_id, role, content, channel, created_at)`
- [ ] **Memory layer:**
  - Short-term: last N messages in context
  - Long-term: **Supabase Postgres + pgvector** + **mem0** (or Zep) for facts, preferences, rhythms
  - Memory write after session; memory read on session start
- [ ] **Safety layer:**
  - Crisis keyword + classifier pass on user input
  - Hard template response + 988 routing; no continued coaching in crisis state
  - Never-diagnose / never-romantic guardrails in system prompt
  - Output moderation pass (secondary check on model output)
- [ ] **Onboarding flow** (Zuly voice):
  1. ?Qu? onda? ? name, what season are you in?
  2. Pillar interest (pick 1?2 to start)
  3. Rhythm: when do you want check-ins?
  4. First micro-conversation ? seeds memory
- [ ] Chat UI: streaming, message history, typing indicator
- [ ] Persona eval suite: 20 test prompts; target >85% pass (human review rubric)
- [ ] Privacy: conversations encrypted at rest (Supabase); no ad trackers

#### Exit criteria (measurable)

- [ ] 5 beta testers complete onboarding; Zuly references onboarding facts in session 2
- [ ] Crisis test prompts trigger 988 response 100% of time (no exceptions in eval)
- [ ] Persona eval pass rate ? 85% on voice rubric (warmth, directness, no therapy claims)
- [ ] P95 chat response start < 3s (streaming first token)
- [ ] Memory retrieval adds < 500ms to session start

#### Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| LLM | **Anthropic API** (Claude) | Strong instruction-following; safety; brand chose frontier API |
| Memory | **Supabase** (Postgres + pgvector) + **mem0** | Proposal stack; mem0 abstracts memory ops |
| API | **Cloudflare Workers** + Hono | Edge latency; secrets for API keys |
| Streaming | SSE or WebSocket from Worker | Standard chat pattern |
| Evals | Custom script + spreadsheet rubric | v1 manual; automate later |

#### Risks

- Persona drift over long conversations ? summarization + periodic persona re-injection
- Memory hallucination / wrong-user bleed ? strict `user_id` scoping; integration tests
- API cost at scale ? token budgets, conversation summarization, model routing (Haiku for nudges)
- Regulatory: AI disclosure ? onboarding + footer + per-message subtle indicator

---

### Phase 5: Waves, Pillars & Calendar Loop

**Goal:** Complete the core product loop: talk ? learn ? **build day** ? **calendar** ? check-in. One 4-week Wave template.

| | |
|---|---|
| **Duration** | 4?5 weeks |
| **Prerequisites** | Phase 4 chat + memory working |
| **Depends on** | Phase 4 |

#### Deliverables

- [ ] **Wave data model:** `waves (id, user_id, pillar, duration_weeks, status, start_date)`
- [ ] **Day plan model:** `day_plans (id, wave_id, date, items_json)` ? meditation, self-healing, body, life tasks
- [ ] **Talk ? build day:** After conversation, Zuly proposes today's plan (structured JSON); user confirms/edits
- [ ] **One Wave template:** 4-week **Self-healing** Wave (CBT + expressive writing focus) ? beachhead pillar
- [ ] Wave progress UI: week/day indicator, completion checkboxes
- [ ] **Calendar export:** ICS file generation; Google Calendar "add via link" flow
- [ ] **Daily check-in nudge:** app notification or email at user-preferred time (v1: email via Resend if no PWA push yet)
- [ ] Pillar content generation: Zuly generates practice prompts, not pre-recorded audio library
- [ ] Loop copy in app matches landing: Talk ? Learn ? Build ? Calendar ? Check in
- [ ] Wave completion celebration message (Zuly voice; no guilt mechanics)

#### Exit criteria (measurable)

- [ ] User completes onboarding ? starts 4-week Wave ? receives day plan within 1 conversation
- [ ] ICS export imports successfully into Google Calendar and Apple Calendar (manual test)
- [ ] Check-in nudge fires within ?5 min of scheduled time
- [ ] 3 internal testers complete Week 1 of Wave without blocking bugs
- [ ] Day plan reflects memory from prior sessions (e.g., "evenings are hard" ? wind-down task)

#### Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Scheduling | Worker cron triggers + D1/Supabase job table | Check-in nudges |
| Calendar | ICS generation (server-side) | Export-first per proposal; API sync later |
| Notifications v1 | **Resend** email | Push requires PWA/service worker ? Phase 5b |
| Notifications v2 | **Web Push** (PWA) | Add if email open rates < 20% |
| Plan generation | Claude structured output (JSON mode) | Same API; pillar-specific prompt modules |

#### Risks

- Calendar export-only feels weak vs. competitors ? messaging emphasizes "day you can actually do"; two-way sync is Phase 2 post-launch
- Wave abandonment ? Zuly reframes misses without shame; track completion for Phase 7 metrics
- JSON plan parsing failures ? schema validation + retry + fallback generic plan

---

### Phase 6: Channels (WhatsApp, SMS)

**Goal:** Zuly reaches users on WhatsApp (primary) and SMS (capture); persona adapts per channel.

| | |
|---|---|
| **Duration** | 3?4 weeks |
| **Prerequisites** | Phase 4 memory + Phase 5 check-in loop; Meta Business verification |
| **Depends on** | Phase 4 (core brain); can start Meta verification in parallel during Phase 4 |

#### Deliverables

- [ ] **WhatsApp Business API** (via Meta Cloud API or **Twilio** / **MessageBird**)
- [ ] Webhook: inbound WhatsApp ? same chat/memory pipeline; outbound replies
- [ ] Channel adapter prompts: shorter messages, fragment OK, voice-note friendly (proposal ?3)
- [ ] User links phone number in app settings; OTP verify
- [ ] **SMS** via **Twilio**: quick check-in prompts; reply capture ? memory
- [ ] Channel field on messages; unified conversation history in app
- [ ] Rate limits + opt-out (STOP); TCPA compliance for SMS
- [ ] WhatsApp template messages for proactive nudges (Meta pre-approval)
- [ ] Per-channel persona eval: 10 WhatsApp exemplars pass rubric

#### Exit criteria (measurable)

- [ ] User links WhatsApp ? sends message ? Zuly responds in < 10s with memory context
- [ ] SMS check-in ? user reply stored and visible in app history
- [ ] STOP on SMS halts messages within 1 min
- [ ] WhatsApp persona eval ? 85% pass (shorter, warmer, same boundaries)

#### Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| WhatsApp | **Meta Cloud API** (direct) or Twilio | Twilio faster setup; Meta cheaper at scale |
| SMS | **Twilio** | Industry standard; TCPA tooling |
| Webhooks | Cloudflare Workers | Same API surface |
| Phone verify | Twilio Verify | OTP standard |

#### Risks

- Meta Business verification delays (1?4 weeks) ? **start application during Phase 4**
- WhatsApp template approval slows proactive nudges ? use session messages within 24h window first
- SMS cost per user ? limit SMS to opt-in quick capture; WhatsApp primary
- Cross-channel persona inconsistency ? separate channel adapters; shared memory core

**Launch note:** WhatsApp required for **public launch** per proposal; soft launch can be **app-only** if Meta verification slips.

---

### Phase 7: Monetization, Compliance & Launch

**Goal:** Paid subscription live; legal docs published; soft launch ? public launch with metrics gates.

| | |
|---|---|
| **Duration** | 3?4 weeks |
| **Prerequisites** | Phases 4?5 minimum; Phase 6 for public launch |
| **Depends on** | Phase 4, 5; Phase 6 for full public launch |

#### Deliverables

- [ ] **Stripe** integration: annual plan **$79/yr** + monthly **$12.99/mo** (proposal ?10)
- [ ] Free tier: usable chat + 1 Wave; **memory/personalization paywall** after 7 days or session limit
- [ ] Billing portal: upgrade, cancel, annual default emphasized in UI
- [ ] **Privacy Policy** + **Terms of Service** (wellness-not-therapy, AI disclosure, data retention)
- [ ] Footer + in-app disclaimers finalized; 988 crisis resources
- [ ] Cookie/consent banner if analytics added (Cloudflare Web Analytics = privacy-friendly default)
- [ ] Security: API key rotation doc; Supabase RLS policies audited
- [ ] Soft launch playbook: invite 50?200 waitlist users; feedback channel (email or in-app)
- [ ] Launch metrics dashboard: D1/D7/D30 retention, conversion, Wave completion
- [ ] App Store: **defer** unless web retention proves out (proposal de-prioritizes)
- [ ] Remove "beta" badges when public launch criteria met

#### Exit criteria (measurable)

- [ ] Stripe test ? live payment succeeds; subscription gates memory feature
- [ ] Legal review sign-off on privacy + terms (or documented self-review checklist)
- [ ] Soft launch: ? 50 paying users onboarded within 2 weeks
- [ ] Soft launch D7 retention ? 12% (internal cohort)
- [ ] Zero P0 safety failures in first 30 days (crisis mishandling, data leak)
- [ ] Public launch: D30 retention ? 8%, paid conversion ? 3% (see ?10)

#### Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Payments | **Stripe** Checkout + Customer Portal | Standard; annual-first |
| Entitlements | Supabase `subscriptions` table + Worker middleware | Feature gates |
| Analytics | **Cloudflare Web Analytics** + optional **Plausible** | No ad trackers on health data |
| Legal | Termly / iubenda templates + counsel review | Wellness app disclaimers |
| Support | Email (support@heyzuly.com) + FAQ page | v1 manual support |

#### Risks

- Paywall too aggressive ? kills conversion; A/B free tier depth (proposal open decision #5)
- Legal exposure on therapy claims ? never-diagnose prompts + counsel review
- Chargebacks / refund policy unclear ? document in ToS before soft launch

---

## 4. Launch Definition

### What "launch" is

| Stage | Definition | Audience | Revenue |
|---|---|---|---|
| **Pre-launch** (now ? Phase 3) | Marketing site + waitlist | Public | None |
| **Soft launch** (Phase 7a) | Paid beta; app + memory + 1 Wave + calendar | Waitlist invitees (50?200) | Annual subscription required |
| **Public launch** (Phase 7b) | Open signup; WhatsApp live; marketing push | Women 28?42, US-first | Free tier + paid |

**Launch is NOT:**
- Waitlist-only page (that's pre-launch)
- Free unlimited memory forever (unsustainable; memory is paywall)
- Cruz / male guide (deferred)
- Full four-pillar content library
- App Store presence (optional post-public launch)

### Success metrics at public launch (30-day post-launch window)

| Metric | Target | Action if missed |
|---|---|---|
| D1 retention | > 25% | Iterate onboarding + first Wave hook |
| D7 retention | > 12% | Improve check-in nudges + day plan relevance |
| D30 retention | > 8% | Pause acquisition; fix loop before spend |
| Free ? paid conversion | > 3% | Adjust paywall depth / trial length |
| Annual plan mix | > 60% of paid | UI nudge annual default |
| 4-week Wave completion | > 40% | Simplify Wave; reduce daily plan friction |
| Crisis routing accuracy | 100% | Block launch expansion until fixed |

---

## 5. MVP vs Full Launch

### Soft launch MVP (minimum to charge money)

| Required | Not required |
|---|---|
| Entity-rebranded landing + waitlist | WhatsApp / SMS |
| Auth + `/app` | Multi-pillar Waves (self-healing only OK) |
| Zuly chat with memory | Calendar two-way sync |
| Safety layer (crisis, 988, boundaries) | Voice/TTS |
| 4-week Self-healing Wave | Spanish-dominant variant |
| Day plan generation + ICS export | Therapist weekly export |
| Email check-in nudges | App Store app |
| Stripe annual subscription | Cruz |
| Privacy policy + terms + disclaimers | Community features |

### Public launch (full v1)

Everything in MVP **plus:**

| Required | Still deferred |
|---|---|
| WhatsApp channel live | Cruz |
| SMS quick capture (opt-in) | Two-way calendar sync |
| PWA push notifications (or proven email nudges) | 8-week multi-pillar Waves |
| 50+ paying users with soft-launch metrics hitting gates | App Store |
| User testimonial or outcome quote (? 3) | B2B / employer |
| Persona eval ? 90% | Full meditation audio library |

---

## 6. Tech Stack Recommendation

### Summary architecture

```
???????????????????????????????????????????????????????????????
?  Cloudflare Pages (Astro landing + /app SPA)                ?
?  Cloudflare Workers (Hono API: chat, waitlist, webhooks)  ?
?  Cloudflare D1 (waitlist, job queue v1)                     ?
???????????????????????????????????????????????????????????????
?  Clerk (auth)  ?  user_id synced to Supabase                ?
?  Supabase (Postgres + pgvector + RLS)                       ?
?  mem0 (long-term memory orchestration)                      ?
?  Anthropic API (Claude ? chat, plan generation, safety)     ?
???????????????????????????????????????????????????????????????
?  Stripe (billing)  ?  Resend (email)  ?  Twilio (SMS/WA)    ?
?  Cloudflare Web Analytics (no ad pixels)                      ?
???????????????????????????????????????????????????????????????
```

### Component rationale

| Component | Choice | Why | Alt considered |
|---|---|---|---|
| Landing | Astro static | SEO, speed, matches existing site | Next.js (heavier) |
| App shell | React SPA in `/app` | Chat UX needs state | Remix on CF |
| API | CF Workers + Hono | Edge, co-located with Pages | Supabase Edge Functions |
| Auth | Clerk | Solo speed; best DX | Supabase Auth (if single DB) |
| Primary DB | Supabase Postgres | pgvector, RLS, mature | Neon, PlanetScale |
| Vector memory | pgvector + mem0 | Proposal direction; memory moat | Zep, Pinecone |
| LLM | Anthropic Claude | Safety, persona consistency | OpenAI GPT-4 class |
| Waitlist | D1 | Simple, free, already on CF | ConvertKit only |
| Email | Resend | Transactional + nudges | Postmark |
| WhatsApp/SMS | Twilio or Meta direct | Reliability | MessageBird |
| Payments | Stripe | Subscriptions, portal | Lemon Squeezy |
| Hosting | Cloudflare Pages | Already live | Vercel |
| CI/CD | GitHub ? CF Pages | Already working | ? |

### What we are NOT using (v1)

- Firebase (health data + Google ad ecosystem concerns)
- Third-party ad/analytics pixels (Meta Pixel, Google Ads on app)
- Self-hosted LLM (persona quality risk)
- HIPAA BAA infrastructure (wellness positioning, not healthcare)

---

## 7. Team & Resource Assumptions

### Solo dev pacing (40 hrs/week)

| Phase | Weeks | Cumulative |
|---|---|---|
| 1 ? Astro + rebrand | 2.5 | 2.5 |
| 2 ? Waitlist | 1.5 | 4 |
| 3 ? Auth shell | 2.5 | 6.5 |
| 4 ? Zuly core | 5 | 11.5 |
| 5 ? Waves/calendar | 4.5 | 16 |
| 6 ? Channels | 3.5 | 19.5 |
| 7 ? Monetize + launch | 3.5 | 23 |
| **Buffer (legal, bugs, eval)** | 3 | **26** |

### Part-time solo (~20 hrs/week): double phase durations ? ~40 weeks

### Recommended external spend (monthly at beta)

| Service | Est. cost |
|---|---|
| Anthropic API | $50?300 (usage-dependent) |
| Supabase Pro | $25 |
| Clerk | $0?25 (free tier ? Pro) |
| Cloudflare | $0?5 (Workers free tier) |
| Twilio WhatsApp/SMS | $50?200 |
| Stripe | 2.9% + $0.30 per charge |
| Resend | $0?20 |
| Legal template + review | $500?2,000 one-time |
| **Total beta** | **~$150?600/mo** + legal one-time |

### Skills required

- TypeScript, React, Astro
- Cloudflare Workers / wrangler
- SQL (Supabase, D1)
- Prompt engineering + eval rubrics (not optional ? core product skill)
- Basic Stripe + webhook security
- No dedicated DevOps role needed at this scale

### When to add a second person

| Trigger | Role |
|---|---|
| Phase 4 start | Part-time prompt engineer / wellness copy reviewer |
| Phase 6 start | Someone to own Meta Business verification + Twilio ops |
| Public launch | Customer support (part-time) + legal counsel |
| D30 > 8% + 1K paid | Full-time second engineer |

---

## 8. Risk Register

| # | Phase | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|---|
| R1 | 1 | Visual regression rebuilding from `dist/` | Medium | Medium | Side-by-side screenshot diff; keep `snapshot/` reference |
| R2 | 2 | Waitlist spam / bot signups | Low | High | Rate limit, honeypot, Turnstile if needed |
| R3 | 3 | Auth vendor lock-in (Clerk) | Low | Low | Export `user_id` mapping; abstract auth interface |
| R4 | 4 | Crisis mishandling | **Critical** | Medium | Dedicated eval suite; 100% pass gate; no launch without |
| R5 | 4 | Persona drift / generic responses | High | High | 50 exemplars; eval rubric; channel-specific adapters |
| R6 | 4 | Memory wrong-user bleed | **Critical** | Low | RLS policies; integration tests; `user_id` on every query |
| R7 | 4 | LLM API cost overrun | Medium | Medium | Token budgets; Haiku for nudges; conversation summarization |
| R8 | 5 | Users don't complete Wave | High | High | Shame-free reframes; shorter daily plans; email nudges |
| R9 | 5 | Calendar export feels "cheap" | Medium | Medium | Position as v1; roadmap two-way sync; nail day plan quality |
| R10 | 6 | Meta WhatsApp verification delay | Medium | High | Start verification in Phase 4; soft launch app-only |
| R11 | 6 | TCPA SMS violation | High | Low | Explicit opt-in; STOP handling; legal review |
| R12 | 7 | Therapy/regulatory conflation | High | Medium | Wellness copy everywhere; counsel review; never-diagnose |
| R13 | 7 | Paywall kills activation | High | Medium | Finch-soft free tier; 7-day memory trial |
| R14 | 7 | Low retention (meditation-app gravity ~5% D30) | High | High | Relationship loop + calendar + WhatsApp; Waves create commitment |
| R15 | All | Solo burnout / scope creep | High | Medium | This roadmap; defer Cruz, App Store, 8-week Waves |
| R16 | All | "AI girlfriend" press framing | Medium | Medium | Proactive wellness-guide positioning; entity boundaries in PR |

---

## 9. Milestones & Decision Gates

### Milestone map

```
NOW ??? M1 ??? M2 ??? M3 ??? M4 ??? M5 ??? M6 ??? LAUNCH
        ?      ?      ?      ?      ?      ?
     Rebrand  Wait   Auth   Chat   Loop   Channels  Paid beta
```

| Milestone | Week (solo) | Gate to proceed |
|---|---|---|
| **M0 ? Baseline** | 0 | ? Done (Pages, Git, dist) |
| **M1 ? Entity site live** | ~3 | Lupe removed; entity copy live; Astro source in repo |
| **M2 ? Waitlist working** | ~4 | ? 1 real signup persisted; export works |
| **M3 ? Auth shell** | ~7 | Login ? `/app` works; artifact link gone |
| **M4 ? Chat + memory** | ~12 | 5 testers; memory across sessions; crisis eval 100% |
| **M5 ? Wave loop** | ~17 | 4-week Wave end-to-end; ICS export; check-in fires |
| **M6 ? Channels** | ~20 | WhatsApp bidirectional OR explicit defer to public launch |
| **M7 ? Soft launch** | ~23 | Stripe live; 50 paying users invited |
| **M8 ? Public launch** | ~26+ | Soft-launch metrics pass (below) |

### Hard pause gates (do NOT proceed until resolved)

| Gate | Condition | Blocks |
|---|---|---|
| **Safety gate** | Crisis eval < 100% pass | Any paid users |
| **Memory gate** | Cross-user data in testing | Any beta users |
| **Retention gate** | D7 < 8% after 100 soft-launch users | Public launch marketing spend |
| **Conversion gate** | Paid conversion < 1% after 30 days soft launch | Paywall redesign |

### Expansion decision gates (from proposal)

| Expansion | Greenlight when | Do not |
|---|---|---|
| **Cruz (male guide)** | D30 > 8%, >1K paid, Wave completion > 40%, persona eval > 90% | Build or market in v1 |
| **Men's marketing** | Cruz persona complete + separate eval suite | Market Zuly to men pre-launch |
| **Spanish-dominant variant** | Tier 2A demand signal; US Latina cohort > 15% of users | Block English launch |
| **8-week multi-pillar Waves** | 4-week single-pillar completion > 40% | Ship complexity before loop works |
| **App Store native app** | D30 > 8% on web; PWA insufficient | App Store before web PMF |
| **Two-way calendar sync** | Export adoption > 50% of active users | Delay launch for sync |
| **Therapy weekly export** | Tier 2B demand; privacy counsel sign-off | Ship without opt-in consent flow |
| **B2B / employer** | Public launch + 5K paid | Any pre-launch focus |

---

## 10. Parallel Workstreams

What can run concurrently to compress timeline:

```
Week:  1    2    3    4    5    6    7    8    9   10   11   12 ...
       ????? Phase 1: Astro + rebrand ?????
                    ?? Phase 2: Waitlist ??
                         ????? Phase 3: Auth shell ?????
       [Persona exemplars + eval rubric ??????????????????????????]
       [Legal: privacy/toS draft ??????????????????????????????????]
                              ????????? Phase 4: Core ?????????????????
                              [Meta Business verification ??????????????]
                                        ????? Phase 5: Waves ?????????
                                        ????? Phase 6: Channels ??????
                                                  ?? Phase 7: Launch ?
```

| Workstream | Parallel with | Owner | Notes |
|---|---|---|---|
| **Persona exemplars + eval rubric** | Phases 1?4 | Dev + copy review | Start Week 1; blocks Phase 4 exit |
| **Privacy policy / ToS draft** | Phases 2?6 | Dev + legal template | Don't wait until Phase 7 |
| **Meta WhatsApp Business verification** | Phases 4?5 | Dev | 1?4 week external delay |
| **Stripe account + product setup** | Phase 5 | Dev | Test mode during Phase 5 |
| **Soft-launch user recruitment** | Phase 5?6 | Dev/marketing | Email waitlist cohort |
| **Cloudflare Worker API scaffold** | Phase 2?3 | Dev | Hono router; add routes per phase |
| **Supabase schema design** | Phase 3?4 | Dev | Design in Phase 3; populate Phase 4 |
| **Brand creative (Wave visuals)** | Phase 1?5 | Design (optional) | Can use CSS placeholders initially |

### Cannot parallelize (sequential dependencies)

1. Auth shell before chat (need `user_id`)
2. Chat + memory before Waves (plans need conversation context)
3. Waves before meaningful channel nudges (need content to nudge about)
4. Core safety before any paid user exposure
5. Entity rebrand before marketing spend (brand consistency)

---

## 11. Immediate Next Actions (Week 1)

1. **Scaffold Astro project** from `dist/` ? preserve live styling
2. **Grep and remove** all Lupe/founder references; paste entity copy from proposal ?8
3. **Create** `docs/Zuly-Persona-Spec.md` with voice anchors + 10 starter exemplars
4. **Begin** privacy policy draft (Termly template)
5. **Initialize** `workers/` directory with Hono + wrangler.toml for Phase 2 API
6. **Confirm** Cloudflare account + Pages project name for Worker bindings

---

## 12. Document Index

| Doc | Purpose |
|---|---|
| `HANDOFF.md` | Infrastructure continuity (update as phases complete) |
| `docs/Zuly-Entity-Demographic-Proposal.md` | Entity, demographic, strategic decisions |
| `docs/Onda-Zuly-Brand-Architecture.md` | Brand naming, Cruz deferral, Wave vocabulary |
| `docs/CLOUDFLARE-SETUP.md` | Pages, Git, wrangler deploy |
| `docs/AI-Wellness-Platform-Research.md` | Regulatory + competitive citations |
| `docs/Dev-Roadmap.md` | This document |

---

*Roadmap v1 ? July 13, 2026. Aligns with entity-led brand (no Lupe Fuentes). Cruz deferred. Beachhead: women 28?42, Comadre Guide, growth season. Update at each milestone gate.*
