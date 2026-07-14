# Onboarding Survey Spec — Hey Zuly

> **Status:** Draft v1 | **Date:** July 14, 2026 | **Audience:** Product, prompt, Phase 4–5 engineering  
> **Brand claim to honor:** *Evidence-informed* (MBSR/CBT/behavior design) — **not** clinical assessment, **not** “diagnosed by quiz.”

---

## Relationship to shipping work

| Layer | Status (2026-07-14) | Role |
|---|---|---|
| **AI disclosure** (`OnboardingDisclosure` in `AppShell`) | Shipped | Legal/trust floor — AI wellness guide, not therapist; 988 |
| **#7 Onboarding micro-flow** (name → pillar → rhythm → seed fact) | Shipped | **Day-1 activation** — enough to talk + seed `user_facts` |
| **Soft-launch Self-healing survey** (G1, G2, S1, S2, S3) | Shipped (optional, skippable) | Day-1 pack when Self-healing is selected; seeds survey facts |
| **Full pillar survey banks** (Meditation / Body / Life modules) | Spec only — Phase 4.5+ | Progressive profiling; do not block Talk |
| **Wave / `day_plans`** | Stub + canned branching on survey facts | Consumes survey facts as plan constraints |

### Deferred / Backlog (discoverable)

| Item | Status | Notes |
|---|---|---|
| **Love Languages module** | **Deferred / Backlog** | Optional Life deep-dive, conversational, multi-preference, **never day-1**, **never framed as science**; elaborate later. Keep §4 **EXCLUDE** verdict for scored quizzes. Prefer L3 `life.support_pref` / L6 until then. |

**Alignment rule:** Micro-flow ships first. This survey extends it as **Phase 4.5 / Phase 5a warm-up** — optional depth modules locked to selected pillars, never a 40-question gate before first chat.

**Marketing language note:** Landing uses **Evidence-informed** / “Real frameworks, not vibes” / MBSR · CBT · behavior design — **not** the phrase “Backed by science.” Survey UX and copy must stay at that honesty bar. Do not label Chapman's Love Languages (or any pop-psych typology) as science-backed.

---

## 1. Pillar definitions (true design)

Canonical names (product + landing): **Meditation · Self-healing · Body · Life guidance**.

Codes for `user_facts` / Wave prefs: `meditation` | `self-healing` | `body` | `life-guidance`.

Soft-launch beachhead Wave (roadmap): **4-week Self-healing** (CBT-flavored + expressive writing). Other pillars still collect prefs so chat and future Waves stay coherent.

### 1.1 Meditation

| | |
|---|---|
| **IS** | Short, keepable grounding / breath / attention practice that fits a real day; entry into the relationship loop, not the product itself |
| **IS NOT** | A Calm/Headspace audio shelf; 20–45 min sits on day 1; spiritual reinvention; clinical mindfulness therapy |
| **Honest anchors** | **MBSR / MBCT-inspired practices** (breath, body scan lite, open monitoring lite) — we ship *practices informed by* these traditions, not a certified MBSR course or a treatment for depression/anxiety |
| **Plan inputs survey should produce** | Session length budget; time-of-day friction; experience level; restlessness / mind-wandering tolerance |

### 1.2 Self-healing

| | |
|---|---|
| **IS** | Reflection, journaling, gentle reframe, self-compassion micro-steps; CBT-*flavored* and expressive-writing *inspired* moves; beachhead First Wave |
| **IS NOT** | Therapy, diagnosis, PHQ/GAD scoring-as-diagnosis, full CBT protocols, trauma processing, “treatment plans” |
| **Honest anchors** | **CBT skills lite** (thought→feeling→one behavior), **expressive writing / journaling** (Pennebaker-adjacent, short timed write), optional **ACT-flavored** values/willingness later — all framed as *wellness practices*, never clinical assessment |
| **Plan inputs** | What feels heavy (themes, not diagnoses); preferred reflection mode; energy for writing vs talk; one values-adjacent hook |

### 1.3 Body

| | |
|---|---|
| **IS** | Gentle progressive / periodized movement paced to capacity and goals; rest-aware; shame-free |
| **IS NOT** | Weight-loss primary, punish-exercise, weigh-in accountability, ED-adjacent plans, medical rehab, HRV-as-diagnosis |
| **Honest anchors** | Progressive overload / periodization *principles* for non-athletes; sleep hygiene & capacity (behavioral); optional breath as *calming practice* — **no medical claims**, no “HRV training cures X” |
| **Plan inputs** | Movement preference; current capacity; pain/injury *deferral* flag (route out); energy window; aversion to metrics |

### 1.4 Life guidance

| | |
|---|---|
| **IS** | Relationships, work, money-*feel*, habits, identity — small behavior-design moves that compound; day-shaping |
| **IS NOT** | Legal/financial/medical advice; couples therapy; relationship typology that overclaims science; productivity-bro optimization |
| **Honest anchors** | **Habit & behavior design** (implementation intentions, friction, tiny habits); **behavioral activation** (schedule small valued actions when stuck); **values clarification** (ACT-adjacent, non-clinical); support / appreciation preferences (**not** Chapman's Five as validated science) |
| **Plan inputs** | Season & domains under pressure; check-in friction; partner status *optional*; how they want support from Zuly and humans |

---

## 2. Onboarding survey philosophy

### What to measure at signup vs later

| When | Measure | Why |
|---|---|---|
| **Day 0 (disclosure)** | AI-not-therapist; crisis floor | Trust + compliance |
| **Day 0 (micro-flow #7)** | Preferred name; 1–2 pillars; check-in rhythm; 1 seed fact | Activation → first useful chat; max ~4 inputs |
| **Day 0–1 (survey modules)** | Only **must** questions for *selected* pillars (≤6–8 total) | Enough to shape First Wave / first day plan without personality theater |
| **Week 1–2 (progressive)** | Should / later banks via chat or Grow tab | Rapport earns depth; facts stay fresher and less performative |

**Not personality theater:** Every question must map to a `user_facts` key that changes day-plan JSON, check-in timing, or Zuly’s next suggested practice. If it only produces a cute label (“You’re a Words of Affirmation type!”), cut it.

### Soft-launch length budget

| Stage | Max questions | Notes |
|---|---|---|
| Micro-flow | 3–4 steps | Name, pillars (1–2), rhythm, optional free-text seed |
| Day-1 survey add-on | **≤ 6** additional (after pillar pick) | 2 global + ≤2 per selected pillar |
| Per-pillar deep bank | Unlocked later | Chat-led or “Go deeper” on Grow |

**Gate:** Soft-launch users who skip survey still get a **generic Self-healing First Wave** + chat. Survey improves fit; it never blocks Talk.

### How answers feed product systems

| Fact class | Example keys | Consumed by |
|---|---|---|
| Identity | `profile.preferred_name` | Chat greeting |
| Focus | `pillar.primary`, `pillar.secondary`, `wave.*` | Wave + prompt inject |
| Rhythm | `rhythm.checkin`, `rhythm.hard_window` | Nudges, day plan slots |
| Meditation | `med.length_min`, `med.time_pref`, `med.experience` | Meditation items in `day_plans` |
| Self-healing | `heal.mode`, `heal.theme`, `heal.energy` | First Wave template branching |
| Body | `body.modality`, `body.capacity`, `body.avoid_metrics` | Body items; ED-safe defaults |
| Life | `life.domains`, `life.support_pref`, `life.partner` (opt) | Life tasks; optional partner tone |
| Season | `season.label` | Framing copy only |

Store as D1 `user_facts` (`source: onboarding` | `survey` | `chat`). Never invent clinical scores.

### Disclosure (must stay in UX)

Reuse / extend disclosure language:

1. **Zuly is an AI wellness guide, not a therapist or clinician.**
2. Surveys are **preferences for your Wave**, not a clinical assessment or diagnosis.
3. Practices are **science-informed** (MBSR/CBT/behavior design inspired) — not treatments.
4. Crisis: **988** / findahelpline.com.

---

## 3. Proposed survey by module

Scales reused:

- **Freq-4:** Rarely · Sometimes · Often · Most days  
- **Likert-5:** Strongly disagree → Strongly agree  
- **Pick-1 / Pick-up-to-2**  
- **Free short** (≤120 chars)

### 3.0 Global (all users) — after pillar pick

| ID | Priority | Question | Scale | Why / science rationale | `user_facts` |
|---|---|---|---|---|---|
| G1 | **must** | What season are you in right now? | Pick-1: Stretching at work · Healing something heavy · Getting my body back · Straightening life/relationships · A mix / unsure | Frames growth without rebuild language; persona `ex-010` | `season.label` |
| G2 | **must** | When is life usually hardest to show up for yourself? | Pick-1: Mornings · Midday · Evenings · Late night · It depends | Circadian / context for plan slots; sleep-hygiene adjacent without medical claim | `rhythm.hard_window` |
| G3 | **should** | How do you want Zuly to show up? | Pick-1: Gentle cheerleader · Direct and short · Ask good questions · Mix it up | Coaching style preference (not personality type) | `coach.style` |
| G4 | **later** | Anything Zuly should never push? | Multi: Intense workouts · Deep journaling · Early alarms · Talking about weight · Talking about money · Talking about family | Safety + autonomy; ED / boundary aware | `boundaries.avoid` (JSON/list) |

### 3.1 Meditation module (only if pillar selected)

| ID | Priority | Question | Scale | Why / science rationale | `user_facts` |
|---|---|---|---|---|---|
| M1 | **must** | How long can you realistically practice most days? | Pick-1: 2 min · 5 · 10 · 15+ · Not sure yet | Dose realism; MBSR starts accessible; anti–Headspace overcommit | `med.length_min` |
| M2 | **must** | What’s true for you with quiet practice? | Pick-1: Brand new · Tried apps, fell off · Decent habit · Love it but inconsistent | Experience → difficulty of practice prompts | `med.experience` |
| M3 | **should** | Prefer which flavor first? | Pick-1: Breath · Body scan / feel the body · Sounds / open awareness · Guided count · No idea — pick for me | MBSR/MBCT technique families, lite | `med.modality` |
| M4 | **should** | When you sit still, what usually happens? | Pick-1: Mind races · I get sleepy · I feel calmer · I get restless / fidgety · Mixed | Restlessness is normal; shame-free beginner path (`ex-022`) | `med.friction` |
| M5 | **later** | Breath practices OK for you right now? | Pick-1: Yes · Prefer body/movement instead · Skip breath for now | Trauma / panic sensitivity without probing trauma history | `med.breath_ok` |

**Do not ask day 1:** “Rate your anxiety”; HRV device data; “Are you enlightened?”

### 3.2 Self-healing module (beachhead — prioritize)

| ID | Priority | Question | Scale | Why / science rationale | `user_facts` |
|---|---|---|---|---|---|
| S1 | **must** | What’s weighing on you most lately? (theme, not diagnosis) | Pick-up-to-2: Rumination / replaying · Self-criticism · Overwhelm · Low mood stretch · Conflict hangover · Numb / flat · Other | Themes for Wave weeks; **not** DSM | `heal.theme` |
| S2 | **must** | How do you prefer to process? | Pick-1: Write privately · Talk it out with Zuly · Mix · Small actions first, words later | Expressive writing vs conversational CBT-lite vs behavioral activation | `heal.mode` |
| S3 | **should** | Energy for reflection most days? | Pick-1: 2 min · 5–10 · 15+ · Only when I need it | Prevents worksheet theater (`ex-061`) | `heal.energy` |
| S4 | **should** | When stuck, what helps more? | Pick-1: Name the thought · Feel it and breathe · Do one tiny next step · All three lightly | Maps CBT / mindfulness / behavioral activation without naming therapies as treatments | `heal.lever` |
| S5 | **later** | One value you want days to honor more? | Free short or Pick-1: Care · Courage · Rest · Honesty · Creativity · Connection · Steady work | ACT-adjacent values clarification (Hayes) — light, non-clinical | `heal.value` |
| S6 | **later** | Writing prompts: how deep? | Pick-1: Light check-in · Honest but short · Longer journal when ready | Pennebaker-style depth pacing | `heal.write_depth` |

**Do not ask day 1:** PHQ-9 / GAD-7 as scored clinical tools; “How traumaed are you?”; medication lists; “Diagnose me.”

### 3.3 Body module

| ID | Priority | Question | Scale | Why / science rationale | `user_facts` |
|---|---|---|---|---|---|
| B1 | **must** | What kind of movement feels least like punishment? | Pick-1: Walk · Stretch / mobility · Strength lite · Dance / fun · Yoga-ish · Mix · Rest-first for now | Capacity + preference; progressive principles | `body.modality` |
| B2 | **must** | Right now your body capacity feels… | Pick-1: Low energy · Okay if short · Ready to build · Recovery / pain — go easy · Prefer not to say | Periodization start point; pain → gentle / defer | `body.capacity` |
| B3 | **should** | Best window for movement? | Pick-1: Morning · Lunch · Evening · Weekend bursts · Whenever I can steal it | Scheduling for day plans | `body.window` |
| B4 | **should** | How should we talk about progress? | Pick-1: How I feel · Minutes moved · Consistency only · No numbers please | Anti–weigh-in / ED-safe (`ex-053`) | `body.metric_pref` |
| B5 | **later** | Sleep: what’s the bigger drain? | Pick-1: Falling asleep · Staying asleep · Not enough hours · Schedule chaos · Sleep’s fine | Sleep hygiene *behaviors* (not insomnia diagnosis) | `body.sleep_friction` |
| B6 | **later** | Any clinician-advised limits we should honor? | Free short optional | Boundary; not medical advice | `body.clinical_limit_note` |

**Do not ask day 1:** Weight, BMI, calories, “ideal body,” cycle data (Tier 2C later), wearable HRV uploads.

### 3.4 Life guidance module

| ID | Priority | Question | Scale | Why / science rationale | `user_facts` |
|---|---|---|---|---|---|
| L1 | **must** | Which life domains need the most support this Wave? | Pick-up-to-2: Work / career · Relationships · Home / family load · Money feel (not advice) · Habits / routines · Self / identity | Behavior design targets | `life.domains` |
| L2 | **must** | What’s one small change that would make days 10% lighter? | Free short | Implementation-intention fodder; `ex-001` pattern | `life.lighter_10` |
| L3 | **should** | When you need support, what lands best? | Pick-up-to-2: Kind words · Someone showing up / time · Help with tasks · Practical ideas · Space alone first | **Appreciation / support preferences** — relational maintenance research; **not** Chapman primary-language scoring | `life.support_pref` |
| L4 | **should** | Relationship context (optional) | Pick-1: Partnered · Dating · Single · It’s complicated · Prefer not to say | Tone only; no couple quiz | `life.partner_status` |
| L5 | **later** | At work, what’s the sticky pattern? | Pick-1: Overcommit · Avoid hard tasks · Imposter spiral · Boundary leaks · N/A | Behavioral activation / values at work | `life.work_pattern` |
| L6 | **later** | Attachment-adjacent needs (soft) | Pick-1: I want more reassurance · I want more space · I want clearer plans with people · I’m good / skip | Needs language without attachment-style diagnosis | `life.rel_need` |

**Do not ask day 1:** Forced Love Languages quiz; ethnicity/Spanish assumption; detailed partner conflict inventory; legal/custody facts.

---

## 4. Five Love Languages — recommendation

> **Deferred / Backlog:** Love Languages module (optional Life deep-dive, conversational, multi-preference, never day-1, never framed as science; elaborate later). Discoverable here and in `docs/Dev-Roadmap.md` product backlog + `HANDOFF.md`.

### Verdict: **EXCLUDE from day-1 onboarding. Defer indefinitely as a scored survey. Optional later as conversational metaphor only.**

### Why

1. **Product fit:** Soft launch is a **wellness Wave** (Self-healing beachhead), not a couples app. Life guidance includes relationships among work/habits/money — not “fix your partner’s language.”
2. **Beachhead (women 28–42):** Popular culture familiarity is real; that does **not** mean the quiz belongs in a science-informed onboarding. They can discover preferences in chat without pseudo-diagnostic branding.
3. **Evidence quality:** Chapman’s model is a **popular lay framework**. Relationship-science review (Impett, Park, & Muise, 2024, *Current Directions in Psychological Science*) finds weak support for core claims: a single primary language, exactly five languages, and matching languages → better relationships. People typically value **multiple** expressions of care; “balanced diet” metaphor fits better than typology.
4. **Brand risk:** Landing promises **Evidence-informed — MBSR, CBT, and behavior design**. Shipping a Love Languages *assessment* as part of that stack invites “backed by science” overclaim and undercuts Trust (“Built on real frameworks”).
5. **Persona risk:** Scored labels push Zuly toward therapy-theater / pop-psych guru — outside hard boundaries.

### If ever INCLUDE (only with constraints)

| Rule | Detail |
|---|---|
| **When** | Life pillar deep-dive, **Week 2+**, optional; user opts in (“Curious about how you like to feel cared for?”) |
| **How** | Conversation, not forced-choice quiz; offer **multiple** preferences (aligns with evidence) |
| **Partner** | Optional; never required for Wave start |
| **Copy** | “A popular framework some people find useful — not a scientific test, and not a diagnosis of your relationship.” |
| **Storage** | `life.support_pref` multiselect — **no** `love_language.primary` score used for matching claims |

### Prefer instead (day-1 / Week 1)

- **L3 support preferences** (words / time / help / ideas / space)  
- **L6 soft relational needs** (reassurance / space / clarity) — attachment-*adjacent*, not adult attachment interview  
- **Values** (S5) + **behavioral activation** (tiny next step)  
- **Domain pick** (L1) so day plans stay concrete  

---

## 5. Recommended day-1 flow vs progressive profiling

```
[Sign-in / invite]
    → AI disclosure (shipped)
    → Micro-flow #7: name → pick 1–2 pillars → rhythm → optional seed sentence
    → Seed user_facts + optional wave.pillar
    → First chat (persona English-primary; no mija)
    → Soft prompt: “Want 5 quick questions so today’s plan fits you?” [Skip → Start talking]
         → Global G1–G2 (+ G3 if energy)
         → Modules ONLY for selected pillars (must items only)
         → Write survey.* facts
    → Phase 5: First Wave (default Self-healing if that pillar selected / soft-launch default)
    → Progressive: should/later via chat check-ins or Grow → You
```

### Phase map

| Phase | Survey work |
|---|---|
| **4 / #7** | Micro-flow only |
| **4.5** | Day-1 optional survey shell + global + Self-healing must bank (soft-launch default) — **shipped** (G1/G2/S1–S3 when Self-healing selected) |
| **5a** | Wire facts → Wave template / first `day_plans` JSON — **partial** (canned build-today branching shipped; 4-week UI backlog) |
| **5b+** | Progressive banks; Life L3; still **no** Love Languages assessment |

---

## 6. What NOT to ask on day 1

| Never / not day 1 | Reason |
|---|---|
| PHQ-9, GAD-7, PCL, clinical inventories as diagnosis | Wellness-not-therapy; regulatory; persona never-diagnose |
| “What’s your attachment style?” forced typology | Overclaim; therapy theater |
| Five Love Languages scored quiz | Empirically contested; couples-app gravity |
| Ethnicity, assume Spanish, “Are you Latina?” | Marketing English-primary; cultural depth deferred; preference later opt-in |
| Trauma narrative (“Tell us your worst…”) | Safety; not equipped; crisis floor ≠ processing |
| Weight, BMI, calorie targets, weigh-in cadence | ED risk; body pillar is gentleness |
| Medication list / “Should I quit therapy?” | Hard refusal |
| Full financial details / legal case facts | Hard refusal; Life is feel + habits only |
| All four pillar banks at once | Pillar overload (`ex-034`, `ex-063`) |
| Partner’s phone number / couple dual onboarding | Out of scope |

---

## 7. Soft-launch default packs

**If user picks Self-healing (recommended soft-launch nudge):**  
Micro-flow + G1, G2, S1, S2, S3 → **5 survey Qs** + existing micro-flow.

**If user picks Meditation + Body:**  
G1, G2, M1, M2, B1, B2 → **6 Qs**.

**If user picks Life only:**  
G1, G2, L1, L2, L3 → **5 Qs** — still start a **light Self-healing or Life** Wave stub; do not invent Love Languages.

**Skip path:** `pillar.primary` + `rhythm.checkin` + generic week-1 Self-healing template.

---

## 8. Copy snippets (English-primary)

**Survey intro:**  
“These aren’t a test. They help me build a day you can actually do — preferences only, not a diagnosis.”

**Skip:**  
“Skip for now — we can learn as we talk.”

**Science honesty footer (once):**  
“Practices draw on mindfulness, CBT-style skills, and habit research. I’m still an AI guide, not a clinician.”

---

## 9. Open decisions

1. Soft-launch: force-nudge Self-healing Wave even if user picked only Body? (**Recommendation:** allow Body Wave stub later; if only one template exists, map Body→gentle recovery week inside Self-healing or delay Body Wave UI.)
2. Multi-select secondary pillar: survey max 2 modules even if they tap 2 pillars.
3. Whether Grow tab hosts “Go deeper” packs vs purely chat-extracted facts.

---

*Spec v1 — July 14, 2026. Aligns with Dev-Roadmap Phase 4 micro-flow + Phase 5 Waves; entity proposal evidence-informed positioning; Impett et al. (2024) on Love Languages.*
