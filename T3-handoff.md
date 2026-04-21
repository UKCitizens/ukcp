# UKCP — T3 Handoff: Hierarchy Navigation & Crumb Trail

> Ignore any prior session context. Fresh task only.

---

## Your Identity & Role

You are Dex (Claude Code). You execute. You do not plan or deliberate. Ali (Cowork) has already planned this task and specified every file, behaviour, and acceptance condition below. You deliver exactly what is specified — no more, no less.

---

## Project Location

All work lives in: `C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\`

This is an Express-served React 18 / Vite 5 / Mantine v7 app. The dev server is started separately — your job is to deliver clean files and a passing build, not to run the server.

---

## Status: What Is Already Done

**T1 (Page Layout Shell) — ACCEPTED.**
**T2 (Data Loader Hook) — ACCEPTED.**

These files exist and are complete. Do not touch them except where T3 explicitly requires wiring them in:

```
src/components/PageLayout.jsx     ← T1, do not edit
src/pages/Locations.jsx           ← currently placeholder, T3 replaces content
src/app.jsx                       ← routing already configured, do not edit
src/hooks/useLocationData.js      ← T2, do not edit
src/utils/buildHierarchy.js       ← T2, do not edit
src/utils/cacheKeys.js            ← T2, do not edit
```

The `useLocationData` hook exposes: `{ hierarchy, places, loading, error }`.

The `hierarchy` object shape (built by `buildHierarchy.js`) is:
```js
{
  [country]: {
    regions: {
      [region]: {
        counties: {
          [county]: {
            areas: {
              [area]: {
                constituencies: {
                  [constituency]: {
                    names: [ { nameid, name, lat, long } ]
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## T3 Task: Hierarchy Navigation & Crumb Trail

**Branch:** `sprint1/T3-navigation`

**Goal:** Build the two-panel navigation header and crumb trail. The user can drill from region → county → area → constituency → locale names, return to any prior level via the crumb trail, and the full selection path is persisted to sessionStorage.

---

## Files To Create

### 1. `src/hooks/useNavigation.js`

Navigation state hook. Manages the selection path, current panel content, and sessionStorage persistence.

**Exports (named):** `useNavigation`

**Signature:**
```js
/**
 * @returns {{
 *   path:   Array<{ level: string, value: string }>,
 *   panel1: string[],
 *   panel2: string[],
 *   select: (level: string, value: string) => void,
 *   goTo:   (index: number) => void,
 *   reset:  () => void
 * }}
 */
export function useNavigation(hierarchy) { ... }
```

**Behaviour:**
- `path` is the current selection trail: e.g. `[{ level: 'region', value: 'East Midlands' }, { level: 'county', value: 'Lincolnshire' }]`
- `panel1` is always the list of English regions (see Scotland/Wales/NI note below). Static — does not change once loaded.
- `panel2` is the list of children at the current path depth. Empty array before first selection.
- `select(level, value)` appends to the path and recomputes `panel2`.
- `goTo(index)` truncates the path to `index + 1` and recomputes `panel2`.
- `reset()` clears the path and empties `panel2`.
- On every path change, serialise the full path array to sessionStorage under key `UKCP_NAV_PATH`.
- On mount, read `UKCP_NAV_PATH` from sessionStorage and restore path and panel2 if present.
- All sessionStorage reads/writes must be wrapped in try/catch. Failures are silently swallowed (no thrown errors, no error state).

**TODO comment (required — AC-7):**
```js
// TODO: Open Decision 4 — Scotland, Wales, and Northern Ireland hierarchy
// is excluded from panel1 until the hierarchy differences are resolved.
// panel1 currently filters to English regions only.
// Reference: UKCP Technical Specification v1.0 Section 9, Decision 4.
```

---

### 2. `src/utils/getChildren.js`

Pure utility. Given the hierarchy and a path array, returns the child list for the next level down.

**Exports (named):** `getChildren`

**Signature:**
```js
/**
 * @param {object}                              hierarchy - Full hierarchy from buildHierarchy.
 * @param {Array<{ level: string, value: string }>} path - Current selection path.
 * @returns {string[]} Array of child names at the next level.
 *                     Empty array if path is empty, invalid, or at leaf level.
 */
export function getChildren(hierarchy, path) { ... }
```

**Level sequence:** region → county → area → constituency → names (locale names)

At the `constituency` level, `getChildren` returns the `name` strings from the `names` array (not the full objects — the display list is names only).

No side effects. No imports other than nothing (pure JS). Must never throw — return `[]` on any unexpected input.

---

### 3. `src/components/HeaderNavigation.jsx`

Two-panel navigation component. Renders Panel 1 and Panel 2 side by side. Controlled entirely by `useNavigation`.

**Props:**
```js
/**
 * @param {{ hierarchy: object, visible: boolean }} props
 */
```

- Renders nothing (or `null`) when `visible` is `false`.
- Panel 1: list of regions from `panel1`. Each item is clickable. The currently selected region (if any — `path[0]?.value`) is visually highlighted.
- Panel 2: list from `panel2`. Each item is clickable. The currently selected item at this depth (if any) is visually highlighted.
- Clicking a Panel 1 item calls `select('region', value)`.
- Clicking a Panel 2 item calls `select` with the appropriate level label for the current depth:
  - After region selected → `select('county', value)`
  - After county selected → `select('area', value)`
  - After area selected → `select('constituency', value)`
  - After constituency selected → `select('locale', value)`
- Panel labels: Panel 1 = "Regions", Panel 2 label changes to reflect current depth ("Counties", "Areas", "Constituencies", "Localities").
- Use Mantine `ScrollArea` for both panels — both panels may have long lists.
- No inline styles. No `sx` prop. Mantine utility classes / `className` only.

**TODO comment (required — AC-7):**
```js
// TODO: Open Decision 4 — Scotland, Wales, and Northern Ireland excluded from Panel 1.
// Panel 1 shows English regions only until the hierarchy differences are resolved.
// Reference: UKCP Technical Specification v1.0 Section 9, Decision 4.
```

---

### 4. `src/components/CrumbTrail.jsx`

Renders the current navigation path as a horizontal trail of clickable labels.

**Props:**
```js
/**
 * @param {{
 *   path:  Array<{ level: string, value: string }>,
 *   goTo:  (index: number) => void,
 *   reset: () => void
 * }} props
 */
```

- Renders nothing if `path` is empty.
- Each crumb displays the `value` of that path entry.
- Clicking a crumb calls `goTo(index)` for that crumb's index in the array.
- Separator between crumbs (e.g. `›`). The last crumb is not a link (it is the current selection).
- A "Clear" or "×" control at the start or end calls `reset()`.
- Horizontal, wrapping layout. Mantine `Group` or `Breadcrumbs` are suitable.
- No inline styles. No `sx` prop.

---

### 5. `src/components/SiteHeader.jsx`

Top-level header. Contains logo area, a Places nav icon, and renders `HeaderNavigation` below the bar when the Places icon is active.

**Props:** none (reads no props — all state is internal or from hooks)

**Behaviour:**
- Maintains a boolean `navOpen` state (default: `false`).
- Clicking the Places icon toggles `navOpen`.
- Renders `<HeaderNavigation hierarchy={hierarchy} visible={navOpen} />` below the header bar.
- Renders `<CrumbTrail path={path} goTo={goTo} reset={reset} />` below `HeaderNavigation` (always, not toggled).
- Uses `useLocationData` to get `hierarchy`.
- Uses `useNavigation` to get `path`, `goTo`, `reset`.
- Shows a loading indicator (Mantine `Loader` or text) while `loading` is true from `useLocationData`.
- Logo area: text "UKCP" in the brand green (`#2E7D32`) or theme primary colour. No image asset required.
- Places icon: Mantine `ActionIcon` with a suitable Mantine/Tabler icon (e.g. `IconMapPin`). Aria label: "Navigate places".
- No inline styles. No `sx` prop.

---

### 6. `src/pages/Locations.jsx` (update)

Replace placeholder with wired layout. This is the only T1 file that T3 modifies.

Replace the entire file content:

```jsx
/**
 * @file Locations.jsx
 * @description Locations page — UKCP Sprint 1.
 * Renders PageLayout with SiteHeader wired in. MidPane and RightPane
 * remain as placeholders pending T4.
 */

import { Group, Text, Center } from '@mantine/core'
import PageLayout from '../components/PageLayout.jsx'
import SiteHeader from '../components/SiteHeader.jsx'

function MidPanePlaceholder() {
  return (
    <Center p="xl">
      <Text fw={500} c="dimmed">Mid Pane — Places Browser in T4</Text>
    </Center>
  )
}

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
  return (
    <PageLayout
      header={<SiteHeader />}
      leftPane={null}
      midPane={<MidPanePlaceholder />}
      rightPane={<RightPanePlaceholder />}
      footer={<FooterContent />}
    />
  )
}
```

> Note: `leftPane={null}` is intentional. The left pane is not used in Sprint 1.
> If `PageLayout` does not handle a null leftPane prop gracefully, make a minimal defensive adjustment to `PageLayout.jsx` only — do not restructure it.

---

## Scotland / Wales / NI Filter

The `hierarchy` object from `useLocationData` contains countries including `England`, `Scotland`, `Wales`, and `Northern Ireland` (exact key names may vary — inspect the data).

For `panel1`, filter `Object.keys(hierarchy)` to English regions only. The safest approach is to get `hierarchy['England']?.regions` and use `Object.keys()` of that — this gives you English regions directly without needing to filter out other nations by name.

---

## sessionStorage Key

Navigation path persists under key: `UKCP_NAV_PATH`

Value: JSON-serialised `path` array — `[{ level: string, value: string }, ...]`

---

## Standards (binding — any violation is a rejection)

| Standard | Requirement |
|---|---|
| JSDoc | File-level `@file` and `@description` block on every file. Every exported function has `@param` and `@returns`. |
| File naming | Components: PascalCase.jsx · Hooks: camelCase with `use` prefix · Utils: camelCase |
| No TypeScript | `.js` and `.jsx` only. |
| No inline styles | No `style={}` props. No `sx` prop. Mantine `className` only. |
| Complete files | Full file content delivered. No snippets. No "add this block" instructions. |
| One responsibility | Each file does one thing. |
| Props only | Components communicate via props. No component reaches into another's state. |

---

## Acceptance Conditions

| AC | Condition |
|---|---|
| AC-1 | Clicking the Places icon reveals Panel 1 with all English regions listed. |
| AC-2 | Selecting a region populates Panel 2 with counties. Panel 1 shows the selected region highlighted. |
| AC-3 | Selecting a county populates Panel 2 with areas. Selection continues through to constituency. |
| AC-4 | At constituency level, Panel 2 shows the LOC locale names within that constituency. |
| AC-5 | CrumbTrail renders after first selection. Clicking any crumb returns to that level correctly. |
| AC-6 | Refreshing the page restores the crumb trail and Panel 2 from sessionStorage. |
| AC-7 | TODO comment referencing Open Decision 4 is present in both `HeaderNavigation.jsx` and `useNavigation.js`. |
| AC-8 | No direct DOM manipulation. No inline event handlers. All state via `useNavigation` hook. |

---

## Build Check

After all files are written, run:

```bash
npm run build
```

from `C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\`

Build must complete with 0 errors and 0 warnings. If it fails, fix before marking task complete.

---

## Delivery

When all files are written and the build is clean, write a file:

`C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\DELIVERY.md`

Contents:

```markdown
# T3 Delivery

**Status:** Complete
**Date:** [today's date]

## Files Delivered
- src/hooks/useNavigation.js — created
- src/utils/getChildren.js — created
- src/components/HeaderNavigation.jsx — created
- src/components/CrumbTrail.jsx — created
- src/components/SiteHeader.jsx — created
- src/pages/Locations.jsx — updated

## Build Result
[paste npm run build output summary here]

## Notes
[any deviations or observations]
```

Do not start T4. Do not modify any other files. Task is complete when DELIVERY.md is written.
