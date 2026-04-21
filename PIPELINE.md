# Sprint 4 Pipeline — Handoff to Dex

**Date:** 3 April 2026
**Spec:** `Definitions/UKCP-Sprint4-Task-Spec-v1.0.docx`
**Delivery log:** append all results to `DELIVERY.md`

---

## Protocol

- Read the full spec before writing a single line of code.
- Run both tasks to completion regardless of individual failures.
- Do not stop on a failed task. Log the failure verbosely and continue.
- Do not restart the dev server or rebuild unless the task explicitly requires it.
- Deliver complete files only. No snippets, no partial updates.
- All standards from Section 6 of the spec are binding on every file.

---

## Execution order

| Step | Task | Dependency |
|------|------|------------|
| 1 | `npm run build` — confirm clean baseline before starting | None |
| 2 | T1 — Visual Polish: Content Width & Row Distinction | Baseline clean |
| 3 | `npm run build` — confirm T1 clean | T1 complete |
| 4 | T2 — Mid Pane Navigation: LocationNav + PlacesCard Gate | T1 build passing |
| 5 | Final `npm run build` — sprint close build | T2 complete |

---

## Delivery log instructions

For each task, append to `DELIVERY.md`:

```
## Sprint 4 / T[n] — [Task Title]
- Status: COMPLETE | FAILED
- Files created: ...
- Files modified: ...
- Build result: PASS / FAIL + output
- AC results: AC-1 PASS/FAIL — [reason if fail] ...
- Notes: [anything notable — deviations, substitutions, decisions made]
```

If a task fails, log the full error and continue to the next task.
