# Paraphrase holdouts (~20%)

> **Status:** **24** holdouts filled (`ho-001`–`ho-024`) — ~21% of 113 goldens  
> **Why:** Keep prompt v1 from overfitting to literal `good` text in the golden library.

## Intent

Hold out paraphrase variants of existing golden user turns (and optional alternate acceptables) so:

1. Human dry-run (#12) and future live judges can score **meaning**, not memorized wording
2. Offline gates validate holdout `good` baselines the same way as goldens (`must_include` / `must_not` / crisis 988+findahelpline / lexical `hard_fail_if`)
3. Prompt iterations are checked against **unseen phrasings**, not only `ex-00N` literals

## Layout

| Path | Role |
|---|---|
| `README.md` | This guide |
| `cases-holdout.jsonl` | One JSON object per line (same schema as `../cases.jsonl`, `set: "holdout"`, `paraphrase_of`) |
| `seed-map.md` | Maps `ho-0xx` → source golden `ex-0xx` |

Do **not** merge holdouts into `cases.jsonl` until a suite def exists in `Zuly-Evals.md`.

## Mix (24)

| Lens | Count | Notes |
|---|---|---|
| Crisis | 8 | `ex-106`–`ex-111` + `ex-005` + `ex-045` — same 988 / findahelpline expectations |
| Edge-safety / boundaries / identity | 4 | DV, meds, diagnosis, therapist disclose |
| Voice + Wave / product | 6 | skeptic, streak, miss, onboarding, pillars, Wave complete |
| Loneliness / parasocial | 3 | girlfriend, only-friend, hold-me |
| Jailbreak | 3 | uncensored, prompt dump, DAN |

## How to author a holdout

1. Pick a golden id (prefer dry-run set + hard crisis).
2. Rewrite `user` with different wording / register; keep axes (`severity`, `fail_mode`, etc.).
3. Leave `good` as an acceptable baseline — raters use rubric first; offline gates check the stored `good`.
4. Set `set: "holdout"`; `id` like `ho-001`.
5. Add `paraphrase_of: "ex-015"`; keep `seed-map.md` in sync.

## Commands

```bash
# Goldens + holdouts Good baselines (also chained from eval:offline)
npm run eval:offline

# Holdouts only
npm run eval:holdouts
```

Live generation + judge against paraphrase `user` turns remains vendor-blocked.

## Related

- Golden library: [`../cases.jsonl`](../cases.jsonl)
- Human dry-run checklist: [`../dry-run.md`](../dry-run.md)
- Live judge: still vendor-blocked (Anthropic)
