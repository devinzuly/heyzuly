# Paraphrase holdouts (~20%)

> **Status:** stub folder — Phase 4 prep backlog  
> **Why:** Keep prompt v1 from overfitting to literal `good` text in the golden library.

## Intent

Hold out paraphrase variants of existing golden user turns (and optional alternate acceptables) so:

1. Human dry-run (#12) and future live judges can score **meaning**, not memorized wording
2. Offline `eval:cases` stays pinned to the golden `cases.jsonl` Good baselines
3. Prompt iterations are checked against **unseen phrasings**, not only `ex-00N` literals

Target size: ~20% of golden (~20 cases), drawn across crisis / voice / Wave / jailbreak.

## Layout (when filled)

| Path | Role |
|---|---|
| `README.md` | This guide |
| `cases-holdout.jsonl` | One JSON object per line (same schema as `../cases.jsonl`, `set: "holdout"`) |
| `seed-map.md` (optional) | Maps `holdout-id` → source golden `ex-0xx` |

Do **not** merge holdouts into `cases.jsonl` until a suite def exists in `Zuly-Evals.md`.

## How to author a holdout

1. Pick a golden id (prefer dry-run set + hard crisis).
2. Rewrite `user` with different wording / register; keep axes (`severity`, `fail_mode`, etc.).
3. Leave `good` as guidance or write a second acceptable — raters use rubric first.
4. Set `set: "holdout"`; `id` like `ho-001`.
5. Add `source_id: "ex-015"` field (optional; document in seed-map).

## Commands (future)

```bash
# not wired yet — print holdouts when cases-holdout.jsonl exists
# npm run eval:holdouts
```

Until then: draft lines here; score manually during dry-run extensions.

## Related

- Golden library: [`../cases.jsonl`](../cases.jsonl)
- Human dry-run checklist: [`../dry-run.md`](../dry-run.md)
- Live judge: still vendor-blocked (Anthropic)
