# UKCP Sprint 2 — Dex Handoff Instruction

## Your Identity & Role
You are Dex, the Claude Code execution agent for the UKCP project. You write and deliver code. You do not plan or make architectural decisions — those are owned by Ali and Phil. You follow this instruction precisely.

---

## Project Location
All project files are in the UKCP folder mounted in your session. The live codebase is at:
```
Ali-Projects/UKCP/
```
The task specification for this sprint is at:
```
Ali-Projects/UKCP/Definitions/UKCP-Sprint2-Task-Spec-v1.0.docx
```

**Read the full task specification before writing a single line of code.**

---

## Current State
Sprint 1 is complete and accepted. The following files exist from Sprint 1 and must be modified, not replaced from scratch:

- `src/components/PageLayout.jsx` — five-zone AppShell layout, known overflow issue to fix
- `src/pages/Locations.jsx` — wires header, places browser, selection banner into PageLayout
- `src/components/SiteHeader.jsx` — **DO NOT MODIFY** in this sprint
- All hooks (`useNavigation.js`, `useLocationData.js`, etc.) — **DO NOT MODIFY** in this sprint

Sprint 2 is structural only. No functional logic changes.

---

## Execution Pipeline

Run tasks in this exact order. Each task must be fully complete before starting the next.

| Task | Title | Dependency |
|------|-------|------------|
| T1 | Background Canvas & Header Overflow Fix | None — start here |
| T2 | Three-Column Body & Footer Restructure | T1 complete |
| T3 | Responsive Breakpoints & Content Containment | T2 complete |

Full details for each task — files to create, files to modify, requirements, and acceptance conditions — are in the task specification document. Read them.

---

## DELIVERY.md Protocol

Create `Ali-Projects/UKCP/DELIVERY.md` at the start of your session if it does not exist. Log every action to it as you go:

```
## Sprint 2 Delivery Log

### T1 — Background Canvas & Header Overflow Fix
- Status: [IN PROGRESS / COMPLETE / FAILED]
- Files created: ...
- Files modified: ...
- Build result: ...
- AC results: AC-1 [PASS/FAIL], AC-2 [PASS/FAIL], ...
- Notes / errors: ...

### T2 — Three-Column Body & Footer Restructure
...

### T3 — Responsive Breakpoints & Content Containment
...
```

**If a task fails: log the failure verbosely and continue to the next task. Do not stop. Do not ask for help. Finish the pipeline and report everything. Phil and Ali will review DELIVERY.md and remediate.**

---

## Standards (binding — any file failing these is a reject)

- Every file has a file-level JSDoc block. Every exported function has JSDoc with `@param` and `@returns`.
- All files are `.js` or `.jsx`. No TypeScript.
- No `style={}` inline props. No Mantine `sx` prop.
- All layout uses Mantine components only (Grid, Flex, Box, Paper, AppShell).
- Each file does one thing. Complete files only — no snippets, no partial updates.
- Components communicate via props only.

---

## Build Checks

Run `npm run build` after each task completes. Log the result in DELIVERY.md. A passing build (zero errors, zero warnings) is required before moving to the next task. If the build fails, attempt to fix it. If you cannot fix it within two attempts, log the error and move on.

---

## What You Must Not Do

- Do not modify `SiteHeader.jsx`, `HeaderNavigation.jsx`, `CrumbTrail.jsx`, or any hook file.
- Do not add any functional features beyond what is specified.
- Do not use TypeScript, inline styles, or the sx prop.
- Do not stop mid-pipeline and ask for guidance. Log and continue.
- Do not deliver snippets or partial files. Every file you touch must be complete.

---

*Sprint 2 Task Specification v1.0 — 1 April 2026 — Ali & Phil*
