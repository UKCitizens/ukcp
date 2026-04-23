# UKCP — T4 Handoff: Places Browser

> Ignore any prior session context. Fresh task only.

---

## Your Identity & Role

You are Dex (Claude Code). You execute. You do not plan or deliberate. Ali (Cowork) has already planned this task and specified every file, behaviour, and acceptance condition below. You deliver exactly what is specified — no more, no less.

---

## Project Location

All work lives in: `C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\`

React 18 / Vite 5 / Mantine v7. Express-served. Build target: `npm run build` from the project root.

---

## Status: What Is Already Done

**T1, T2, T3 — ALL ACCEPTED.**

These files exist and are complete. Do not touch them unless T4 explicitly requires wiring:

```
src/components/PageLayout.jsx         ← T1, do not edit
src/components/SiteHeader.jsx         ← T3, do not edit
src/components/HeaderNavigation.jsx   ← T3, do not edit
src/components/CrumbTrail.jsx         ← T3, do not edit
src/hooks/useNavigation.js            ← T3, do not edit
src/hooks/useLocationData.js          ← T2, do not edit
src/utils/buildHierarchy.js           ← T2, do not edit
src/utils/getChildren.js              ← T3, do not edit
src/utils/cacheKeys.js                ← T2, do not edit
src/pages/Locations.jsx               ← T3 updated, you will update this again
```

---

## What You Need to Know About Existing Data & State

**`useLocationData`** exposes: `{ hierarchy, places, loading, error }`
- `places` is a flat array of objects from `place.csv`.
- Each object has these columns (raw, may have leading/trailing whitespace): `PlaceName`, `Lat`, `Lng`, `Type`, `County`, `AdCounty`, `District`, `UniAuth`, `Country`
- `Type` values: `City`, `Town`, `Village`, `Hamlet`
- `County` is a soft string — normalise (trim, lowercase) before any comparison.

**`useNavigation`** (from `useNavigation.js`) exposes: `{ path, panel1, panel2, select, goTo, reset }`
- `path` is `Array<{ level: string, value: string }>`
- e.g. after selecting East Midlands → Lincolnshire: `[{ level: 'region', value: 'East Midlands' }, { level: 'county', value: 'Lincolnshire' }]`
- The county value is at `path.find(p => p.level === 'county')?.value`

**`sessionStorage` keys in use:**
- `UKCP_NAV_PATH` — navigation path (T3, do not overwrite)
- T4 adds: `UKCP_SELECTED_PLACE` — the confirmed place selection object

---

## T4 Task: Places Browser

**Branch:** `sprint1/T4-places-browser`

**Goal:** Render the physical places browser below the navigation panels. Places are filtered to the current county in the navigation path. Selecting a place name shows a SelectionBanner. Clicking Select writes the selection to sessionStorage and updates the header to show the confirmed place name.

---

## Files To Create

### 1. `src/utils/filterPlaces.js`

Pure utility. Filters and groups the places array by county match.

**Exports (named):** `filterPlaces`

**Signature:**
```js
/**
 * @param {object[]} places  - Flat array from place.csv (useLocationData places).
 * @param {string}   county  - County name from navigation path. May be null/undefined.
 * @returns {{
 *   City:    object[],
 *   Town:    object[],
 *   Village: object[],
 *   Hamlet:  object[]
 * }} Filtered places grouped by Type, each group alphabetically sorted by PlaceName.
 *    All groups always present (empty array if no matches). Empty object returned if
 *    county is null/undefined/empty.
 */
export function filterPlaces(places, county) { ... }
```

**Filter logic:**
- If `county` is null, undefined, or empty string: return `{ City: [], Town: [], Village: [], Hamlet: [] }`.
- Match: `place.County.trim().toLowerCase()` against `county.trim().toLowerCase()`. Use equality (`===`), not `includes()` — the county string from navigation is already specific.
- Skip any row where `PlaceName` or `Type` is missing/empty — do not throw.
- Group results: `City`, `Town`, `Village`, `Hamlet`. Any `Type` value not in those four is silently discarded.
- Within each group, sort ascending by `PlaceName` (case-insensitive).
- No side effects. No imports. Must never throw.

---

### 2. `src/hooks/usePlacesFilter.js`

Reactive hook. Derives the filtered places from the current navigation path.

**Exports (named):** `usePlacesFilter`

**Signature:**
```js
/**
 * @param {object[]}                            places - From useLocationData.
 * @param {Array<{ level: string, value: string }>} path - From useNavigation.
 * @returns {{
 *   grouped:      { City: object[], Town: object[], Village: object[], Hamlet: object[] },
 *   countyActive: boolean
 * }}
 */
export function usePlacesFilter(places, path) { ... }
```

**Behaviour:**
- Extracts county from `path`: `path.find(p => p.level === 'county')?.value ?? null`
- Calls `filterPlaces(places, county)` to get `grouped`.
- `countyActive` is `true` when a county is present in the path, `false` otherwise.
- Recomputes whenever `places` or `path` changes (useMemo or useEffect).
- Returns stable references where possible — do not reconstruct objects on every render if inputs haven't changed.

---

### 3. `src/components/PlacesCard.jsx`

Renders the filtered places list, grouped by type.

**Props:**
```js
/**
 * @param {{
 *   grouped:         { City: object[], Town: object[], Village: object[], Hamlet: object[] },
 *   countyActive:    boolean,
 *   onPlaceSelect:   (place: object) => void
 * }} props
 */
```

**Behaviour:**
- If `countyActive` is `false`: render a single prompt message — "Navigate to a county to see places." Centred, dimmed text. No list.
- If `countyActive` is `true` but all groups are empty: render "No places found for this county." Same style.
- Otherwise: render groups in order — City, Town, Village, Hamlet. Only render a group heading if that group has entries.
- Group heading: the type name (e.g. "Cities", "Towns", "Villages", "Hamlets" — pluralise). Use Mantine `Text` with a subtle weight or size distinction.
- Each place entry: `PlaceName` as clickable text (Mantine `Anchor` or `UnstyledButton`). Clicking calls `onPlaceSelect(place)` passing the full place object.
- Use Mantine `ScrollArea` to constrain the list height — the list can be very long.
- No inline styles. No `sx` prop.

---

### 4. `src/components/SelectionBanner.jsx`

Banner shown when a place has been clicked but not yet confirmed.

**Props:**
```js
/**
 * @param {{
 *   place:     object|null,
 *   path:      Array<{ level: string, value: string }>,
 *   onConfirm: () => void,
 *   onDismiss: () => void
 * }} props
 */
```

**Behaviour:**
- Renders nothing if `place` is null.
- When visible: shows `place.PlaceName`, `place.Type`, and the crumb context (formatted from `path` as a short readable string, e.g. "East Midlands › Lincolnshire").
- Two actions: a "Select" button (calls `onConfirm`) and a "Cancel" / dismiss control (calls `onDismiss`).
- Visually prominent — use Mantine `Paper` or `Alert` with the brand green (`#2E7D32`) as accent. Full-width or near-full-width.
- No inline styles. No `sx` prop. Use Mantine `className` or CSS modules.

---

### 5. `src/hooks/useSelectionState.js`

Manages pending and confirmed place selection, and sessionStorage persistence.

**Exports (named):** `useSelectionState`

**Signature:**
```js
/**
 * @returns {{
 *   pendingPlace:    object|null,
 *   confirmedPlace:  object|null,
 *   setPending:      (place: object) => void,
 *   confirmPlace:    () => void,
 *   dismissPending:  () => void,
 *   clearSelection:  () => void
 * }}
 */
export function useSelectionState() { ... }
```

**Behaviour:**
- `setPending(place)` sets `pendingPlace`. Does not write to sessionStorage.
- `confirmPlace()` moves `pendingPlace` to `confirmedPlace`, writes to sessionStorage under `UKCP_SELECTED_PLACE`, clears `pendingPlace`.
- `dismissPending()` clears `pendingPlace` without touching `confirmedPlace` or sessionStorage.
- `clearSelection()` clears both states and removes `UKCP_SELECTED_PLACE` from sessionStorage.
- On mount: read `UKCP_SELECTED_PLACE` from sessionStorage and restore `confirmedPlace` if present.
- All sessionStorage operations wrapped in try/catch. Failures silently swallowed.
- sessionStorage value written on `confirmPlace`: `{ placeName: place.PlaceName, type: place.Type, county: place.County, crumbTrail: path }` — path passed in at confirm time (see wiring in Locations.jsx below).

---

### 6. `src/pages/Locations.jsx` (update)

Wire all T4 components into the layout. Replace MidPanePlaceholder with the places browser. Add confirmed location display to header area.

Replace the entire file:

```jsx
/**
 * @file Locations.jsx
 * @description Locations page — UKCP Sprint 1.
 * Wires T3 navigation (SiteHeader) and T4 places browser (PlacesCard,
 * SelectionBanner) into PageLayout. MidPane renders the filtered places list.
 * RightPane remains a placeholder pending a future task.
 */

import { Group, Text, Center, Box } from '@mantine/core'
import PageLayout from '../components/PageLayout.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import PlacesCard from '../components/PlacesCard.jsx'
import SelectionBanner from '../components/SelectionBanner.jsx'
import { useLocationData } from '../hooks/useLocationData.js'
import { useNavigation } from '../hooks/useNavigation.js'
import { usePlacesFilter } from '../hooks/usePlacesFilter.js'
import { useSelectionState } from '../hooks/useSelectionState.js'

function RightPanePlaceholder() {
  return (
    <Center p="xl">
      <Text fw={500} c="dimmed">Right Pane</Text>
    </Center>
  )
}

function FooterContent() {
  return (
    <Group h="100%" px="md" justify="center">
      <Text size="sm" c="dimmed">UK Citizens Portal · v0.1.0</Text>
    </Group>
  )
}

export default function Locations() {
  const { places, loading } = useLocationData()
  const { path } = useNavigation(/* hierarchy passed via SiteHeader — see note */)
  const { grouped, countyActive } = usePlacesFilter(places, path)
  const {
    pendingPlace,
    confirmedPlace,
    setPending,
    confirmPlace,
    dismissPending,
  } = useSelectionState()

  return (
    <PageLayout
      header={<SiteHeader confirmedPlace={confirmedPlace} />}
      leftPane={null}
      midPane={
        <Box>
          <SelectionBanner
            place={pendingPlace}
            path={path}
            onConfirm={() => confirmPlace(path)}
            onDismiss={dismissPending}
          />
          <PlacesCard
            grouped={grouped}
            countyActive={countyActive}
            onPlaceSelect={setPending}
          />
        </Box>
      }
      rightPane={<RightPanePlaceholder />}
      footer={<FooterContent />}
    />
  )
}
```

> **Important wiring note:** `useNavigation` requires `hierarchy` as its argument. `SiteHeader` currently calls `useNavigation` internally. This creates a problem: `Locations.jsx` also needs `path` from that same hook instance to drive `usePlacesFilter`. You must lift `useNavigation` out of `SiteHeader` into `Locations.jsx` so there is a single shared state instance. Pass `path`, `panel1`, `panel2`, `select`, `goTo`, `reset` as props into `SiteHeader`. Update `SiteHeader.jsx` to accept these as props rather than calling `useNavigation` internally. This follows the same pattern Dex used in T3 for state lifting. `useLocationData` is called in both `SiteHeader` (for hierarchy) and `Locations` (for places) — that is fine, the hook reads from localStorage on second call so there is no double-fetch.

---

## `SiteHeader.jsx` — Required Update

Refactor to accept navigation state as props rather than owning it. The hook call moves to `Locations.jsx`.

Updated prop signature:
```js
/**
 * @param {{
 *   path:           Array<{ level: string, value: string }>,
 *   panel1:         string[],
 *   panel2:         string[],
 *   select:         (level: string, value: string) => void,
 *   goTo:           (index: number) => void,
 *   reset:          () => void,
 *   confirmedPlace: object|null
 * }} props
 */
```

- Remove the `useNavigation` call from inside `SiteHeader`.
- Add `confirmedPlace` prop. When not null, display `confirmedPlace.placeName` as the active location label in the header bar (replacing or supplementing the logo area text, or as a subtle badge — your choice, keep it clean).
- Pass `path`, `panel1`, `panel2`, `select` down to `HeaderNavigation` as before.
- Pass `path`, `goTo`, `reset` to `CrumbTrail` as before.

---

## sessionStorage Keys Summary

| Key | Owner | Value |
|---|---|---|
| `UKCP_NAV_PATH` | T3 / useNavigation | `Array<{ level, value }>` |
| `UKCP_SELECTED_PLACE` | T4 / useSelectionState | `{ placeName, type, county, crumbTrail }` |

---

## Standards (binding)

| Standard | Requirement |
|---|---|
| JSDoc | File-level `@file` + `@description`. Every exported function has `@param` + `@returns`. |
| File naming | Components: PascalCase.jsx · Hooks: camelCase with `use` prefix · Utils: camelCase |
| No TypeScript | `.js` and `.jsx` only. |
| No inline styles | No `style={}`. No `sx` prop. Mantine `className` only. |
| Complete files | Full file content only. No snippets. |
| One responsibility | Each file does one thing. |
| Props only | Components communicate via props. No component reaches into another's state. |

---

## Acceptance Conditions

| AC | Condition |
|---|---|
| AC-1 | With a county selected in navigation, PlacesCard renders places filtered to that county, grouped and alphabetically sorted. |
| AC-2 | With no county selected, PlacesCard shows "Navigate to a county to see places." |
| AC-3 | Clicking a place name shows SelectionBanner with correct place name, type, and crumb context. |
| AC-4 | Clicking Select writes the correct object to sessionStorage under `UKCP_SELECTED_PLACE`. No page reload occurs. |
| AC-5 | After selection, the header reflects the confirmed place name. |
| AC-6 | Dismissing the banner without clicking Select does not write to sessionStorage. |
| AC-7 | `filterPlaces.js` is a pure function. No side effects. Importable independently. |
| AC-8 | Encoding anomalies and empty County fields in place.csv do not crash the filter. Affected rows are skipped. |

---

## Build Check

After all files are written, run:

```bash
npm run build
```

from `C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\`

0 errors, 0 warnings. Fix before marking complete.

---

## Delivery

Write `C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\DELIVERY.md`:

```markdown
# T4 Delivery

**Status:** Complete
**Date:** [today's date]

## Files Delivered
- src/utils/filterPlaces.js — created
- src/hooks/usePlacesFilter.js — created
- src/components/PlacesCard.jsx — created
- src/components/SelectionBanner.jsx — created
- src/hooks/useSelectionState.js — created
- src/pages/Locations.jsx — updated
- src/components/SiteHeader.jsx — updated (state lifting)

## Build Result
[paste npm run build output]

## Notes
[any deviations or observations]
```

Do not start any further tasks. Task is complete when DELIVERY.md is written.
