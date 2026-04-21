# UKCP — S5T1 Handoff: Places Gate, Off-by-One, Stale Session

> Ignore any prior session context. Fresh task only.
> Note: an earlier version of this handoff targeted the wrong source folder. This is the corrected version. Work only in `C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\`.

---

## Your Identity & Role

You are Dex (Claude Code). You execute. You do not plan or deliberate. Ali (Cowork) has diagnosed the bugs and specified every change below. Deliver exactly what is specified — no more, no less.

---

## Project Location

All work lives in: `C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\`

React 18 / Vite 5 / Mantine v7. Express-served. Build target: `npm run build` from the project root. App served at :3000 via `node server.js` or `npm start`.

---

## Bug 1 — Off-by-one active highlight (`src/components/LocationNav.jsx` line 88)

**Problem:** `path[path.length]?.value === item` — `path[path.length]` is always `undefined` (array index out of bounds). The active highlight on panel2 items never fires.

**Fix:** Change line 88 only:

```jsx
// Before
active={path[path.length]?.value === item}

// After
active={path[path.length - 1]?.value === item}
```

Do not touch any other line in `LocationNav.jsx`.

---

## Bug 2 — Places gate at wrong level (`src/pages/Locations.jsx`)

**Problem:** Line 129:
```js
const constituencyActive = path.some(p => p.level === 'constituency')
```
`PlacesCard` is gated behind constituency-depth navigation. But `usePlacesFilter` (which is already called in this file) filters places by county and returns `countyActive: boolean`. Places can and should populate as soon as the user selects a county — there is no reason to wait for constituency.

**Fix:** Remove `constituencyActive` and replace every use of it with `countyActive` from the `usePlacesFilter` destructure.

Step 1 — update the `usePlacesFilter` destructure (already on the page — just add `countyActive`):
```js
// Before
const { grouped } = usePlacesFilter(places, path)

// After
const { grouped, countyActive } = usePlacesFilter(places, path)
```

Step 2 — delete the `constituencyActive` line (was line 129):
```js
// DELETE this line entirely:
const constituencyActive = path.some(p => p.level === 'constituency')
```

Step 3 — replace every reference to `constituencyActive` in this file with `countyActive`. There will be 2–3 references in `renderMidPane()` and possibly the header height calc — replace all. Do not change any other logic.

---

## Bug 3 — PlacesCard prompt message (`src/components/PlacesCard.jsx`)

**Problem:** Line 36:
```jsx
<Text c="dimmed" ta="center">Navigate to a constituency to see places.</Text>
```
After Bug 2 is fixed, places activate at county level. The message should match.

**Fix:** Change that text only:
```jsx
// Before
Navigate to a constituency to see places.

// After
Navigate to a county to see places.
```

Do not touch any other line in `PlacesCard.jsx`.

---

## Bug 4 — Stale sessionStorage path validation (`src/hooks/useNavigation.js`)

**Problem:** On mount, `useNavigation` reads `UKCP_NAV_PATH` from sessionStorage and restores the path without validating it against the hierarchy. A previously-saved corrupt path (e.g., `North West` at every level from a prior debug session) gets restored, corrupting the stepper display and crumb trail.

**Fix:** In the `useEffect` that reads sessionStorage (after hierarchy becomes available), add a validation step before calling `setPath`. If the restored path is invalid (any segment value not found in the hierarchy at the correct depth), discard it and start fresh.

Add this validation function inside `useNavigation.js`, before the `readSession` helper or just before use:

```js
/**
 * Validates a restored session path against the loaded hierarchy.
 * Returns true only if every segment value exists at the correct depth.
 * Depth 0 = region (must exist in hierarchy['England'].regions or any country).
 * Depth 1 = county of that region. Depth 2 = area. Depth 3 = constituency.
 *
 * @param {object} hierarchy
 * @param {Array<{ level: string, value: string }>} path
 * @returns {boolean}
 */
function isPathValid(hierarchy, path) {
  try {
    if (!hierarchy || !Array.isArray(path) || path.length === 0) return false

    // Find region node for path[0]
    let regionNode = null
    for (const countryNode of Object.values(hierarchy)) {
      if (path[0].value in (countryNode?.regions ?? {})) {
        regionNode = countryNode.regions[path[0].value]
        break
      }
    }
    if (!regionNode) return false
    if (path.length === 1) return true

    const countyNode = regionNode.counties?.[path[1].value]
    if (!countyNode) return false
    if (path.length === 2) return true

    const areaNode = countyNode.areas?.[path[2].value]
    if (!areaNode) return false
    if (path.length === 3) return true

    const constiNode = areaNode.constituencies?.[path[3].value]
    if (!constiNode) return false

    return true
  } catch {
    return false
  }
}
```

Then update the session-restore `useEffect` to call it:

```js
// Before
useEffect(() => {
  if (!hierarchy) return
  const saved = readSession()
  if (Array.isArray(saved) && saved.length > 0) {
    setPath(saved)
  }
}, [hierarchy])

// After
useEffect(() => {
  if (!hierarchy) return
  const saved = readSession()
  if (Array.isArray(saved) && saved.length > 0 && isPathValid(hierarchy, saved)) {
    setPath(saved)
  }
  // If invalid (stale/corrupt data), leave path as [] — fresh state.
}, [hierarchy])
```

---

## Step — Clear existing stale sessionStorage before testing

Before running the dev server to test, clear the browser's sessionStorage for localhost. Do this in the browser devtools console:

```js
sessionStorage.removeItem('UKCP_NAV_PATH')
```

Or instruct Phil to do this once. The validation fix (Bug 4) prevents recurrence.

---

## Acceptance Conditions

Run `npm run dev`, open the browser, clear sessionStorage once, then verify:

| AC | Condition | Pass/Fail |
|----|-----------|-----------|
| AC-1 | On fresh load (no session data), crumb trail is empty and stepper shows only Country (England) as completed | |
| AC-2 | Clicking a region (e.g. North West) shows counties in panel2 — not regions repeated | |
| AC-3 | Clicking a county (e.g. Lancashire) — PlacesCard populates with cities, towns, villages, hamlets from Lancashire | |
| AC-4 | PlacesCard prompt (when no county selected) reads "Navigate to a county to see places." | |
| AC-5 | After navigating North West → Lancashire → any area: panel2 shows the selected item highlighted (visual, confirming the off-by-one fix) | |
| AC-6 | Refreshing the page after a valid navigation restores the correct path (not corrupted) | |
| AC-7 | Refreshing the page with stale/corrupted sessionStorage clears it and starts fresh (test by manually writing bad data to sessionStorage before reload) | |
| AC-8 | Zero red console errors throughout all of the above | |

If any AC fails, diagnose and fix before proceeding to the build step.

---

## Build and Ship

Once all ACs pass:

```bash
cd C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP
npm run build
```

0 errors required. Fix before proceeding.

Restart :3000:
```bash
node server.js
```
(or `npm start` if that is the correct script — check `package.json`)

Confirm the app loads at `http://localhost:3000` and ACs hold at the built version.

---

## Delivery

Write `C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\DELIVERY.md`:

```markdown
# S5T1 Delivery — Places Gate, Off-by-One, Stale Session Fix

**Status:** Complete
**Date:** [today]

## Files Changed
- src/components/LocationNav.jsx — line 88 off-by-one fixed
- src/pages/Locations.jsx — places gate changed from constituencyActive to countyActive
- src/components/PlacesCard.jsx — prompt text updated to "county"
- src/hooks/useNavigation.js — isPathValid added, session restore now validated

## Acceptance Conditions
- AC-1: [Pass/Fail]
- AC-2: [Pass/Fail]
- AC-3: [Pass/Fail]
- AC-4: [Pass/Fail]
- AC-5: [Pass/Fail]
- AC-6: [Pass/Fail]
- AC-7: [Pass/Fail]
- AC-8: [Pass/Fail]

## Build Result
[paste last 10 lines of npm run build output]

## :3000 Status
[Confirmed live / issue if not]

## Notes
[any deviations or observations]
```

Task is complete when DELIVERY.md is written and :3000 is live.

---

## Do Not Touch

- `src/utils/getChildren.js` — traversal logic is correct, no changes needed
- `src/hooks/useLocationData.js` — no changes
- `src/utils/buildHierarchy.js` — no changes
- `src/hooks/usePlacesFilter.js` — no changes
- `src/utils/filterPlaces.js` — no changes
- `src/components/Header/SiteHeaderRow3.jsx` — S5T2 scope, not this task
- Any other file not listed in this handoff
