# #11 — Mobile Lighthouse + copy sign-off

**Status: DEFERRED / SKIPPED FOR NOW (2026-07-14).** Not abandoned — human gate before soft launch. Code a11y/nav polish already in tree; walkthrough below still applies when you close the gate.

Close later when (1) mobile Lighthouse **Performance ≥ 90** is recorded and (2) stakeholder signs hero + Meet Zuly / Phase 1.5 copy.

> **Roadmap:** [`../Dev-Roadmap.md`](../Dev-Roadmap.md) §A **#11**  
> **Chrome profile:** [`.cursor/rules/heyzuly-chrome.md`](../../.cursor/rules/heyzuly-chrome.md)  
> **Pattern:** same human-gate style as [`dry-run.md`](./dry-run.md) (#12)

---

## Pass criteria (what “≥90” means)

| Gate | Target | Source |
|---|---|---|
| **Lighthouse Performance (mobile)** | **≥ 90** | Phase 1 checklist + Phase 1 exit: *“Lighthouse performance ≥ 90 on landing (mobile)”* |
| **Accessibility / Best Practices / SEO** | Strongly recommended ≥90; **not** the formal #11 number | #11 code pass fixed contrast, skip link, mobile nav, meta — re-check, but Performance is the gate |
| **Copy sign-off** | Stakeholder **approve** on checklist below | Phase 1 + Phase 1.5 checklists |

**Performance note:** Mobile Performance is flaky (throttling, CPU, extensions, cold cache). Run **2–3 times**; keep the best sober run (incognito / heyzuly profile, no other tabs fighting CPU). If Performance lands 85–89 once and ≥90 on a clean retry, record both and still mark pass if a clean run hits ≥90.

---

## Part A — Mobile Lighthouse ≥90

### A0. Always start in the project root (not System32)

In **PowerShell**:

```powershell
cd C:\Users\1devi\Projects\heyzuly
pwd   # should show ...\Projects\heyzuly
```

If Chrome profile is not set up yet:

```powershell
npm run chrome:detect
npm run chrome:detect -- --write
```

Create a Chrome profile named **heyzuly** if detect finds none (Chrome → avatar → Add profile), then re-run detect.

### A1. Which URL to audit — recommend local for this gate

| Target | When | Why |
|---|---|---|
| **Local `npm run pages:dev`** (recommended for #11) | Closing the gate against **current repo** (a11y/nav polish already in source) | Matches what’s in git; production may lag until you deploy |
| **https://heyzuly.com** | Confirming **live** after deploy | Use for post-deploy smoke; not enough alone if #11 CSS/nav isn’t pushed yet |

**Recommendation for this sign-off:** run Lighthouse against **local Pages** (`http://localhost:8788` or whatever Wrangler prints), then optionally re-check production after deploy.

### A2. Start local (heyzuly Chrome profile)

**Terminal 1 — serve site + Functions:**

```powershell
cd C:\Users\1devi\Projects\heyzuly
npm run pages:dev
```

Wait until Wrangler prints the local URL (typically `http://localhost:8788`). Leave this running.

**Open with heyzuly Chrome profile (preferred):**

```powershell
# new terminal, same project root
cd C:\Users\1devi\Projects\heyzuly
npm run pages:dev:open
```

Or open production profile-only:

```powershell
npm run chrome:heyzuly
```

Or any custom URL:

```powershell
node scripts/open-heyzuly-chrome.mjs http://localhost:8788
```

| Script | What it does |
|---|---|
| `npm run pages:dev` | `astro build` + `wrangler pages dev dist` |
| `npm run pages:dev:open` | Same + opens heyzuly Chrome profile |
| `npm run chrome:heyzuly` | Opens https://heyzuly.com in heyzuly profile |
| `npm run dev:heyzuly` | Astro-only dev (no Functions) — **don’t use for this gate** |

Do **not** use Cursor’s embedded browser for this audit; use the heyzuly Chrome profile.

### A3. Run Lighthouse (Chrome DevTools — primary)

1. In the heyzuly Chrome window, open the landing URL (`http://localhost:8788/` or `https://heyzuly.com/`).
2. **F12** (or menu → More tools → Developer tools).
3. Open the **Lighthouse** panel: DevTools » **»** (More tools) → **Lighthouse**  
   (On older Chrome: three-dot menu inside DevTools → Lighthouse.)
4. Settings:
   - **Mode:** Navigation
   - **Device:** **Mobile**
   - **Categories:** enable at least **Performance**, plus **Accessibility**, **Best Practices**, **SEO** (run all four for the sign-off note)
5. Click **Analyze page load**.
6. Wait for the report.

**Record:**

| Field | Value |
|---|---|
| Date | |
| URL audited | |
| Performance | /100 |
| Accessibility | /100 |
| Best Practices | /100 |
| SEO | /100 |
| Pass? (Perf ≥90) | Y / N |
| Notes (2nd run, etc.) | |

### A4. Save / report the score

Pick one:

1. **Screenshot** the Lighthouse summary (four category scores visible).
2. In the Lighthouse report UI: **flow menu** → download **HTML** or **JSON** report → save under something like `docs/evals/artifacts/lighthouse-mobile-YYYY-MM-DD.html` (create `artifacts/` if needed; optional, local-only).
3. Paste the four scores into the score table above (or into chat when telling the agent “#11 passed”).

### A5. Optional — Lighthouse CLI (not in this repo)

There is **no** `lighthouse` script or dependency in `package.json`. One-shot CLI if you want numbers without the UI:

```powershell
cd C:\Users\1devi\Projects\heyzuly
# ensure pages:dev is already serving
npx --yes lighthouse http://localhost:8788/ `
  --preset=desktop `
  --form-factor=mobile `
  --only-categories=performance,accessibility,best-practices,seo `
  --output=html `
  --output-path=docs/evals/lighthouse-mobile-report.html `
  --chrome-flags="--headless"
```

For a true mobile emulation preset, prefer:

```powershell
npx --yes lighthouse http://localhost:8788/ `
  --screenEmulation.mobile=true `
  --form-factor=mobile `
  --throttling-method=simulate `
  --only-categories=performance,accessibility,best-practices,seo `
  --output=html `
  --output-path=docs/evals/lighthouse-mobile-report.html `
  --view
```

CLI is optional; **DevTools Lighthouse on Mobile** is enough for the human gate.

### A6. If Performance flunks

Re-check against the 2026-07-14 code pass already in tree (contrast tokens, skip link, mobile Menu, meta trim, footer Privacy/Terms). Common flukes: extensions, heavy machine load, first paint after cold build. Retry clean; only open a fix task if a sober run stays &lt;90.

---

## Part B — Copy sign-off checklist

Approve in the **heyzuly** Chrome window on the same URL you Lighthouse’d. Pass = growth language (not rebuild/founder bio), **no Lupe**, **no mija / onda** on marketing, **brand-first** (Zuly is the hero signal).

### Brand / positioning checks

- [ ] **Brand-first:** First viewport reads as Zuly (eyebrow + name in hero body / CTAs); not a generic wellness SaaS after mentally removing nav.
- [ ] **Growth language:** “season of growth”, “grow on your own terms”, Waves/pillars — **not** “rebuild your life”, founder biography, or “someone who’s actually been there.”
- [ ] **No Lupe / Fuentes / founder** on marketing.
- [ ] **No mija / onda / Spanish gatekeeping** on landing (phone mock = “Good morning”; English-primary).
- [ ] Cultural depth stays **in-product chat only** (Phase 1.5 Option A).

### Hero (`src/components/Hero.astro`) — approve line-by-line

| # | Element | Current copy | Approve? |
|---|---|---|---|
| H1 | Eyebrow | A guide for the whole of you | ☐ |
| H2 | Headline | Grow on your *own terms* | ☐ |
| H3 | Sub | Zuly is your AI wellness guide — warm, direct, and always on your side. She learns your life across meditation, self-healing, body, and life guidance, then builds a day you can actually do. Not a content library. A relationship. | ☐ |
| H4 | CTAs | Join the waitlist · See how it works | ☐ |
| H5 | Trust strip | Evidence-informed — MBSR, CBT, and behavior design, not buzzwords | ☐ |
| H6 | Trust strip | Private by design — encrypted conversations; no ad tracking on your wellness data | ☐ |
| H7 | Trust strip | Wellness, not therapy — Zuly supports your growth; she's not a clinician | ☐ |
| H8 | Phone greeting | Good morning · Tuesday · a lighter day | ☐ |
| H9 | Phone quote | "Let's protect your morning before the noise. One small thing, just for you." | ☐ |

### Idea band (`IdeaBand.astro`) — optional but visible above fold adjacent

| # | Copy | Approve? |
|---|---|---|
| I1 | You're carrying a lot. *Zuly carries it with you.* | ☐ |
| I2 | Not another app that adds to your list. A guide who takes in your whole life — the inner work and the world around it — and helps you grow through it, one day at a time. | ☐ |

### Meet Zuly (`WhyZuly.astro` — `#meet-zuly`) — required

| # | Element | Current copy | Approve? |
|---|---|---|---|
| M1 | Section label | Meet Zuly | ☐ |
| M2 | Lead | I'm your wellness guide — not a therapist, not a chatbot, not a content library. If you're in a season of growth — developing work, relationships, health, and identity on your own terms — I'm the voice that checks in, remembers what you told me last Tuesday, and helps you turn it into a day that fits your real life. | ☐ |
| M3 | Body | We work across four pillars: **meditation**, **self-healing**, **body**, and **life guidance**. Tell me what's going on. I'll build your **Wave** — a personalized 4–8 week program — and put it on your calendar. Check in via app, WhatsApp, or text. Show up messy. I don't judge. | ☐ |
| M4 | Tag | Let's start with today. | ☐ |

### Pillars (`Pillars.astro`) — Phase 1.5 alignment

| # | Title | Blurb | Approve? |
|---|---|---|---|
| P0 | Section | Real frameworks, not *vibes*. / Zuly starts with a conversation… | ☐ |
| P1 | Meditation | Grounding, breath, and calm you can keep — short daily practice that fits a real life. · Built on MBSR / MBCT | ☐ |
| P2 | Self-healing | Journaling, reframing, and self-compassion to move through what's heavy — with Zuly to talk to. · CBT & expressive writing | ☐ |
| P3 | Body | Movement that builds over weeks, not punishes — paced to your body and your goals. · Progressive, periodized | ☐ |
| P4 | Life guidance | Relationships, work, money, self — small guided principles that compound into change. · Habit & behavior design | ☐ |

### Meta (quick)

- [ ] Default description (BaseLayout): *Zuly is your AI wellness guide for women in a season of growth — warm, direct, always on your side. Meditation, self-healing, body, and life guidance in one relationship.*

### Sign-off block (fill when done)

```
Copy sign-off: APPROVED / CHANGES NEEDED
Reviewer:
Date:
URL reviewed:
Notes / requested edits:
```

---

## Part C — How to mark pass

### Tell the agent (paste when both gates pass)

```
#11 PASSED
- Lighthouse mobile Performance: XX (URL: …; date: …)
- Accessibility / BP / SEO: … / … / … (optional)
- Copy sign-off: APPROVED (hero + Meet Zuly / Phase 1.5)
Please mark #11 done in Dev-Roadmap + HANDOFF (same pattern as #12).
```

If copy needs edits: list the row IDs (e.g. `H2`, `M2`) and desired wording — do **not** mark #11 done until copy is approved.

### Docs / checklist updates (agent after your pass message)

Same pattern as #12 (`docs/evals/dry-run.md` → roadmap):

1. **`docs/Dev-Roadmap.md`**
   - §A row **#11** → **done / passed** + date + Perf score note
   - Phase 1 checklist: check *Lighthouse performance ≥ 90* and *Stakeholder sign-off on hero + Meet Zuly*
   - Phase 1.5: check *Stakeholder sign-off on Phase 1.5 copy*
   - §11 Immediate next actions: remove “Close #11”
2. **`HANDOFF.md`** — Active state: note #11 passed (Lighthouse + copy)
3. **This file** — set status line to **PASSED** with date + scores (like dry-run.md)

Optional: keep a screenshot or HTML report under `docs/evals/` (gitignore-friendly if large).

### What #11 does **not** unblock

Vendor holds (Clerk, Stripe, etc.) stay blocked. Next can-do items remain whatever the roadmap lists after #11 (no new vendor).

---

## Quick command cheat sheet

```powershell
cd C:\Users\1devi\Projects\heyzuly

# profile once
npm run chrome:detect -- --write

# local gate (recommended)
npm run pages:dev
# other terminal:
npm run pages:dev:open
# → DevTools → Lighthouse → Mobile → Analyze
# → visually approve Part B checklist

# production smoke (after deploy)
npm run chrome:heyzuly
```

---

*Human gate for Dev-Roadmap #11. **Deferred / skipped for now (2026-07-14)** — not abandoned; run before soft launch. Prep ≠ done — mark done only after human Lighthouse note + copy APPROVED.*
