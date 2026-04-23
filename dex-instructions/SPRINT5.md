# UKCP — Sprint 5: Navigation & Rendering Fixes

> Each topic is its own session. Ali specs, Dex delivers, proves, rebuilds. Pick up from where the previous session closed.

---

## Context

Sprint 4 produced working code but there are rendering and logic defects in the running app. Sprint 5 resolves them one topic at a time. Note: S5T1 speccing was initially based on the wrong source folder — corrected handoff is `dex-instructions/S5T1-hierarchy-fix.md`.

---

## Topic Status

| # | Topic | Status | Handoff |
|---|-------|--------|---------|
| S5T1 | Places gate level + off-by-one + stale session | **Ready for Dex** | `dex-instructions/S5T1-hierarchy-fix.md` |
| S5T2 | Nav header redesign — label + options array spec | **Ready for Dex** | `dex-instructions/S5T2-header-nav-ui.md` |
| S5T3 | PageLayout section gaps | Pending | `dex-instructions/S5T3-layout-gaps.md` |
| S5T4 | Any remaining rendering issues post-S5T1–T3 | Pending | TBD |

---

## Topic Summaries

### S5T1 — Places Gate, Off-by-One, Stale Session (CORRECTED)

**Files in scope:** `src/components/LocationNav.jsx`, `src/pages/Locations.jsx`, `src/components/PlacesCard.jsx`, `src/hooks/useNavigation.js`

**Bug 1 — Off-by-one active highlight (LocationNav.jsx line 88):**
`path[path.length]?.value === item` — `path[path.length]` is always undefined (index out of bounds). Should be `path[path.length - 1]?.value`. Only affects active item highlight in panel2.

**Bug 2 — Places gate at wrong level (Locations.jsx):**
`constituencyActive = path.some(p => p.level === 'constituency')` gates PlacesCard. But `usePlacesFilter` filters places by county (not constituency), so places could populate as soon as a county is selected. Gate should use `countyActive` from `usePlacesFilter`, not `constituencyActive`.

**Bug 3 — PlacesCard prompt mismatch (PlacesCard.jsx):**
Message reads "Navigate to a constituency to see places." After fix #2, this should read "Navigate to a county to see places."

**Bug 4 — Stale sessionStorage (useNavigation.js):**
`useNavigation` restores path from `UKCP_NAV_PATH` sessionStorage on mount. If a prior session had a broken/wrong path (e.g. `North West` pushed at every level), that stale data is restored, corrupting the stepper and crumb trail on load. Fix: validate the restored path against the loaded hierarchy before accepting it. If any segment is not found in the hierarchy at that depth, discard the path and start fresh.

---

### S5T2 — Nav Header Redesign

**The spec (from Phil):** The navigation header should be a single row with two fields:
- Field 1: Level label (e.g. "Countries", "Regions", "Counties", "Areas", "Constituencies")
- Field 2: Horizontal scrollable list of options at the current level

Clicking an option advances the level. The label updates to the next level name. Below this row: a clickable crumb trail (`England › North West › Lancashire`).

**Current state:** `SiteHeaderRow3.jsx` renders a Mantine Stepper (6 steps showing hierarchy depth) plus a plain breadcrumb text. The Stepper shows which levels are completed — it does NOT show the options at the current level. `LocationNav.jsx` in the mid pane shows the actual options as two scrollable panels, which is separate from the header.

**Required change:** Replace or supplement `SiteHeaderRow3` with a layout that matches the spec. The Stepper could be kept as a visual indicator if useful, but the primary interaction — label + clickable options array — must appear in the header row. The mid pane `LocationNav` may be removed or repurposed.

**Files:** `src/components/Header/SiteHeaderRow3.jsx`, `src/components/LocationNav.jsx`, `src/pages/Locations.jsx`, `src/components/Header/SiteHeaderRow3.module.css`

---

### S5T3 — PageLayout Section Gaps

**Problem:** No visible gaps between page sections (header, mid pane columns, footer). The background canvas should be visible around all edges and between columns.

**Investigation needed:** Check `src/components/PageLayout.module.css` — the `AppShell.Main` and column CSS may have zero padding/margin. Mantine `Grid gutter="md"` should give column gaps but may need CSS to also give vertical spacing between header/body/footer zones.

**Files:** `src/components/PageLayout.jsx`, `src/components/PageLayout.module.css`, `src/components/Layout/PageBackground.jsx`, `src/components/Layout/PageBackground.module.css`

---

### S5T4 — Post-Review Fix Session

Raised after S5T1–T3 are accepted by Phil. Topics determined by Phil's visual review of :3000.

---

## Rules for All Topics
- One topic per session. Close and hand off before starting the next.
- Dex must prove the fix (see each handoff for acceptance conditions).
- Dex must rebuild (`npm run build`) and confirm :3000 reflects the latest code before marking done.
- Ali reviews visual output from screenshot before accepting.
