# UKCP — S5T2 Handoff: Header Navigation — Two Rows

> Ignore any prior session context. Fresh task only.

---

## Your Identity & Role

You are Dex (Claude Code). You execute. Ali has specified every change. Deliver exactly this — no more, no less.

---

## Project Location

`C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\`

React 18 / Vite 5 / Mantine v7. Build: `npm run build`. Served at :3000.

---

## Exact UI Required

**Row 1 — the active selection row:**

On first open:
```
Country:  England   Scotland   Wales   Northern Ireland
```
User clicks England:
```
Region:   North West   South East   East Midlands   West Midlands  ...
```
User clicks South East:
```
County:   Kent   Surrey   East Sussex   West Sussex  ...
```
...and so on down the hierarchy. One row. Label on the left. Horizontal scrollable list of options on the right. Clicking an option replaces the entire row with the next level down.

**Row 2 — the crumb trail:**

Starts empty. Accumulates as user selects:
```
England
England › South East
England › South East › Kent
```
Non-last items are clickable links that navigate back to that level. Last item is plain text.

**That is all.** No stepper. No six labelled steps. No tick icons. No mid-pane location panels.

---

## Data layer fixes (do these first)

### Fix 1 — `src/hooks/useNavigation.js`

**A. panel1 must start at countries, not English regions.**

Find:
```js
const panel1 = hierarchy
  ? Object.keys(hierarchy['England']?.regions ?? {})
  : []
```
Replace with:
```js
const panel1 = hierarchy ? Object.keys(hierarchy) : []
```

**B. Add `isPathValid` and use it in session restore.**

Add this function (before the hook function body):

```js
function isPathValid(hierarchy, path) {
  try {
    if (!hierarchy || !Array.isArray(path) || path.length === 0) return false
    const countryNode = hierarchy[path[0].value]
    if (!countryNode) return false
    if (path.length === 1) return true
    const regionNode = countryNode.regions?.[path[1].value]
    if (!regionNode) return false
    if (path.length === 2) return true
    const countyNode = regionNode.counties?.[path[2].value]
    if (!countyNode) return false
    if (path.length === 3) return true
    const areaNode = countyNode.areas?.[path[3].value]
    if (!areaNode) return false
    if (path.length === 4) return true
    const constiNode = areaNode.constituencies?.[path[4].value]
    return !!constiNode
  } catch {
    return false
  }
}
```

Update the session-restore `useEffect`:
```js
useEffect(() => {
  if (!hierarchy) return
  const saved = readSession()
  if (Array.isArray(saved) && saved.length > 0 && isPathValid(hierarchy, saved)) {
    setPath(saved)
  }
}, [hierarchy])
```

### Fix 2 — `src/utils/getChildren.js`

The current function assumes `path[0]` is a region. It now must handle `path[0]` as a country.

Replace the entire file:

```js
/**
 * @file getChildren.js
 * @description Returns child names at the next hierarchy level given the current path.
 * path[0] = country, path[1] = region, path[2] = county, path[3] = area, path[4] = constituency.
 * Returns [] when path is empty, input is invalid, or the path is at leaf level.
 */

/**
 * @param {object} hierarchy - Full hierarchy from buildHierarchy.
 * @param {Array<{ level: string, value: string }>} path - Current selection path.
 * @returns {string[]}
 */
export function getChildren(hierarchy, path) {
  try {
    if (!hierarchy || !Array.isArray(path) || path.length === 0) return []

    const countryNode = hierarchy[path[0].value]
    if (!countryNode) return []
    if (path.length === 1) return Object.keys(countryNode.regions ?? {})

    const regionNode = countryNode.regions?.[path[1].value]
    if (!regionNode) return []
    if (path.length === 2) return Object.keys(regionNode.counties ?? {})

    const countyNode = regionNode.counties?.[path[2].value]
    if (!countyNode) return []
    if (path.length === 3) return Object.keys(countyNode.areas ?? {})

    const areaNode = countyNode.areas?.[path[3].value]
    if (!areaNode) return []
    if (path.length === 4) return Object.keys(areaNode.constituencies ?? {})

    const constiNode = areaNode.constituencies?.[path[4].value]
    if (!constiNode) return []
    if (path.length === 5) return (constiNode.names ?? []).map(n => n.name).filter(Boolean)

    return []
  } catch {
    return []
  }
}
```

---

## UI changes

### Fix 3 — `src/components/Header/SiteHeaderRow3.jsx` — complete rewrite

```jsx
/**
 * @file SiteHeaderRow3.jsx
 * @description Row 3 — two-line location navigator.
 * Line 1: level label + horizontal scrollable option list.
 * Line 2: clickable crumb trail (hidden when path is empty).
 */

import { Anchor, Box, Group, ScrollArea, Text, UnstyledButton } from '@mantine/core'
import { ROW3_HEIGHT } from './HEADER_ROWS.js'
import classes from './SiteHeaderRow3.module.css'

const NAV_LEVELS = [
  { label: 'Country',      nextLevel: 'country'      },
  { label: 'Region',       nextLevel: 'region'       },
  { label: 'County',       nextLevel: 'county'       },
  { label: 'Area',         nextLevel: 'area'         },
  { label: 'Constituency', nextLevel: 'constituency' },
  { label: 'Locality',     nextLevel: 'locale'       },
]

/**
 * @param {{
 *   currentOptions: string[],
 *   path:           Array<{ level: string, value: string }>,
 *   onSelect:       (level: string, value: string) => void,
 *   onCrumbClick:   (index: number) => void,
 *   onReset:        () => void
 * }} props
 */
export default function SiteHeaderRow3({ currentOptions, path, onSelect, onCrumbClick, onReset }) {
  const depth       = Math.min(path.length, NAV_LEVELS.length - 1)
  const levelConfig = NAV_LEVELS[depth]
  const crumbs      = path.map(p => p.value)

  return (
    <Box h={ROW3_HEIGHT} className={`${classes.row3} ${classes.row}`}>
      <Box className={classes.rowInner}>

        {/* Line 1 — label + options */}
        <Box className={classes.optionsRow}>
          <Text className={classes.levelLabel}>{levelConfig.label}:</Text>
          <ScrollArea type="auto" offsetScrollbars scrollbarSize={4} className={classes.optionsScroll}>
            <Group gap="xs" wrap="nowrap">
              {currentOptions.map(opt => (
                <UnstyledButton
                  key={opt}
                  className={classes.optionBtn}
                  onClick={() => onSelect(levelConfig.nextLevel, opt)}
                >
                  {opt}
                </UnstyledButton>
              ))}
            </Group>
          </ScrollArea>
        </Box>

        {/* Line 2 — crumb trail */}
        {crumbs.length > 0 && (
          <Group gap={4} className={classes.crumbRow} wrap="nowrap">
            {crumbs.map((crumb, i) => (
              <Group key={i} gap={4} wrap="nowrap">
                {i > 0 && <Text size="sm" c="dimmed">›</Text>}
                {i < crumbs.length - 1 ? (
                  <Anchor
                    component="button"
                    size="sm"
                    onClick={() => i === 0 ? onReset() : onCrumbClick(i - 1)}
                  >
                    {crumb}
                  </Anchor>
                ) : (
                  <Text size="sm" fw={500}>{crumb}</Text>
                )}
              </Group>
            ))}
          </Group>
        )}

      </Box>
    </Box>
  )
}
```

### Fix 4 — `src/components/Header/SiteHeaderRow3.module.css` — replace entirely

```css
.row3 {
  border-bottom: 1px solid var(--mantine-color-dark-3);
}

.row {
  width: 100%;
  background-color: var(--mantine-color-body);
}

.rowInner {
  max-width: 95%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  gap: 2px;
}

.optionsRow {
  display: flex;
  align-items: center;
  gap: var(--mantine-spacing-sm);
  min-height: 40px;
}

.levelLabel {
  font-weight: 700;
  font-size: var(--mantine-font-size-sm);
  white-space: nowrap;
  color: var(--mantine-color-green-7);
  min-width: 100px;
}

.optionsScroll {
  flex: 1;
}

.optionBtn {
  font-size: var(--mantine-font-size-sm);
  padding: 2px 10px;
  border-radius: var(--mantine-radius-sm);
  border: 1px solid var(--mantine-color-dark-4);
  color: var(--mantine-color-dark-1);
  white-space: nowrap;
  cursor: pointer;
}

.optionBtn:hover {
  background-color: var(--mantine-color-dark-6);
  color: var(--mantine-color-green-4);
}

.crumbRow {
  min-height: 24px;
}
```

### Fix 5 — `src/components/SiteHeader.jsx`

Remove `onStepBack` from props and its pass-through to SiteHeaderRow3.
Add `currentOptions` and `onSelect` to SiteHeader's prop signature and pass them to SiteHeaderRow3:

```jsx
<SiteHeaderRow3
  currentOptions={currentOptions}
  path={path}
  onSelect={onSelect}
  onCrumbClick={goTo}
  onReset={reset}
/>
```

### Fix 6 — `src/pages/Locations.jsx`

**A. Derive currentOptions:**
```js
const currentOptions = path.length === 0 ? panel1 : panel2
```

**B. onSelect handler:**
```js
function handleNavSelect(level, value) {
  select(level, value)
}
```

**C. Fix places gate to county level:**
```js
// Remove:
const constituencyActive = path.some(p => p.level === 'constituency')

// Change usePlacesFilter destructure to:
const { grouped, countyActive } = usePlacesFilter(places, path)
```
Replace every reference to `constituencyActive` with `countyActive`.

**D. Remove LocationNav:**
```js
// Delete this import line:
import LocationNav from '../components/LocationNav.jsx'
```

**E. Remove handleStepBack.** Delete the function entirely.

**F. Simplify renderMidPane():**
```js
function renderMidPane() {
  if (countyActive) {
    return (
      <PlacesCard
        grouped={grouped}
        countyActive={countyActive}
        onPlaceSelect={setPending}
      />
    )
  }
  return (
    <Center p="xl">
      <Text c="dimmed">Select a country, then drill down to a county to browse places.</Text>
    </Center>
  )
}
```

**G. Pass new props to SiteHeader:**
```jsx
<SiteHeader
  {/* keep all existing props */}
  currentOptions={currentOptions}
  onSelect={handleNavSelect}
/>
```

### Fix 7 — `src/components/PlacesCard.jsx`

Change the prompt text from `"Navigate to a constituency to see places."` to `"Navigate to a county to see places."`

---

## Acceptance Conditions

Clear sessionStorage before testing: browser devtools console → `sessionStorage.clear()` → reload.

| AC | Condition |
|----|-----------|
| AC-1 | Row 3 contains NO Mantine Stepper. No tick icons. No step labels (England/Region/County/Area/Constituency/Ward listed across the row). Gone entirely. |
| AC-2 | On open: Row 3 line 1 shows `Country:` followed by `England  Scotland  Wales  Northern Ireland` (or however many countries exist in the data) |
| AC-3 | Row 3 line 2 is empty on first open |
| AC-4 | Clicking "England" → line 1 becomes `Region:` + English regions. Line 2 becomes `England` |
| AC-5 | Clicking "South East" → line 1 becomes `County:` + SE counties. Line 2 becomes `England › South East` |
| AC-6 | Clicking "England" in the crumb navigates back: line 1 returns to `Region:` + English regions |
| AC-7 | No LocationNav two-panel component visible anywhere on the page |
| AC-8 | Mid pane shows placeholder text when no county selected |
| AC-9 | Mid pane shows PlacesCard populated with places when a county is reached in navigation |
| AC-10 | Zero red console errors |
| AC-11 | Reloading after navigation restores correct path (no corrupted crumbs) |

---

## Build and ship

```bash
npm run build
node server.js
```

Zero errors. Confirm :3000 live.

---

## Delivery

Append to `DELIVERY.md`:

```markdown
# S5T2 Delivery — Two-Row Header Navigation

**Status:** Complete
**Date:** [today]

## Files Changed
- src/hooks/useNavigation.js — panel1 starts at countries; isPathValid added
- src/utils/getChildren.js — rewritten to handle country as path[0]
- src/components/Header/SiteHeaderRow3.jsx — complete rewrite
- src/components/Header/SiteHeaderRow3.module.css — replaced
- src/components/SiteHeader.jsx — onStepBack removed, currentOptions/onSelect added
- src/pages/Locations.jsx — LocationNav removed, countyActive gate, currentOptions derived
- src/components/PlacesCard.jsx — prompt text fixed

## AC Results
[AC-1 through AC-11]

## Build Result
[last 10 lines]

## :3000 Status
[Confirmed live]
```

---

## Do Not Touch

- `src/utils/buildHierarchy.js`
- `src/utils/filterPlaces.js`
- `src/hooks/useLocationData.js`
- `src/hooks/usePlacesFilter.js`
- `src/hooks/useSelectionState.js`
- `src/components/LocationNav.jsx` (leave on disk — just remove the import)
- `src/components/Header/HEADER_ROWS.js`
- `src/components/Header/WALKER_LEVELS.js`
- `src/components/Header/SiteHeaderRow1.jsx`
- `src/components/Header/SiteHeaderRow2.jsx`
- `src/components/Header/SiteHeaderRow4.jsx`
- Anything not listed in Fixes 1–7
