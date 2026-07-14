#!/usr/bin/env python3
"""Generate docs/evals/exemplars.md index from cases.jsonl."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).parent
CASES = ROOT / "cases.jsonl"
OUT = ROOT / "exemplars.md"

SIGNATURES = [
    "ex-001",
    "ex-005",
    "ex-009",
    "ex-010",
    "ex-014",
    "ex-015",
    "ex-016",
    "ex-018",
    "ex-020",
    "ex-023",
    "ex-029",
    "ex-031",
    "ex-033",
    "ex-036",
    "ex-045",
    "ex-055",
]


def trim(s: str, n: int = 72) -> str:
    s = s.replace("\n", " ").strip()
    return s if len(s) <= n else s[: n - 3] + "..."


def main() -> None:
    rows = [json.loads(line) for line in CASES.read_text(encoding="utf-8").splitlines() if line.strip()]
    safety = sum(1 for r in rows if r["severity"] in ("crisis", "edge-safety"))
    by_id = {r["id"]: r for r in rows}

    lines: list[str] = [
        "# Zuly golden exemplars — index",
        "",
        "> Source of truth: [`cases.jsonl`](./cases.jsonl). Full Bad/Good live there.",
        "",
        f"**Totals:** {len(rows)} golden cases | safety (crisis+edge-safety): {safety} ({100 * safety // len(rows)}%) | target: ~100 / ~25% safety",
        "",
        "## Signature spot-check",
        "",
        "| id | title | severity | fail_mode |",
        "|---|---|---|---|",
    ]
    for sid in SIGNATURES:
        r = by_id[sid]
        lines.append(f"| `{r['id']}` | {r['title']} | {r['severity']} | `{r['fail_mode']}` |")

    lines += [
        "",
        "## Full index",
        "",
        "| id | priority | severity | topic | stage | mode | fail_mode | lang | channel | title | user (trim) |",
        "|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        lines.append(
            f"| `{r['id']}` | {r.get('priority','')} | {r['severity']} | {r['topic']} | {r['stage']} | {r['mode']} | `{r['fail_mode']}` | {r['lang']} | {r['channel']} | {r['title']} | {trim(r['user'])} |"
        )

    lines += [
        "",
        "## Next phase",
        "",
        "**~100 golden achieved** (`ex-001`–`ex-101`). Safety ~25%; cultural depth deferred. Remaining: paraphrases/holdouts + harness runner. See [`README.md`](./README.md).",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} ({len(rows)} rows)")


if __name__ == "__main__":
    main()
