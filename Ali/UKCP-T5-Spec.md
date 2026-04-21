# UKCP T5 — Full Location-Aware Page Context Sync
> Written: 16 Apr 2026. Updated: 17 Apr 2026. Load alongside ali-master-memory_1.md at session start.

---

## The goal

When the user selects any item on the Locations page — from any source — every control on
that page must update to represent that selection. The map is the primary visual output:
it must always reflect the current selection. All other controls are secondary derivatives
of the same shared context.

A selection from any source → path + pendingPlace updated → all consumers re-render.
No consumer should ever be out of sync with the last user action.

---

## The model

Single shared context = `path` (navigation path) + `pendingPlace` (selected place).
Everything else is derived. No new state needed.

**Context label** (for banner Row 2):
```
pendingPlace.name  →  path[last].value  →  'UK'
```

---

## The five sources — current write status

| Source | Mechanism | Status |
|---|---|---|
| Nav walker (Row 3 options) | `select(level, value)` | ✅ writes correctly |
| Nav crumb | `handleGoTo(i)` / `handleReset()` | ✅ mostly correct, edge cases |
| Left pane (PlacesCard) | `handlePlaceSelect` → truncates to county + `setPending` | ✅ correct |
| Right pane (ConstituencyPane) | `select('constituency')` / `selectMany([con, ward])` | ✅ correct |
| Map (MidPaneMap) | nothing — display only | ❌ not wired |

---

## The five consumers — current read status

| Consumer | Reads from | Status |
|---|---|---|
| Map (MidPaneMap) | `path` | ⚠️ reads path but filter scope needs verification — map is primary UI, must always show selected item |
| Banner (Row 2) | `pendingPlace` + `path` | ✅ tracks correctly |
| Crumb trail (Row 3) | `path` + `pendingPlace` | ⚠️ conditional bugs (see below) |
| Left pane (PlacesCard) | `scopeKey` from `usePlacesFilter` | ✅ correct |
| Right pane (ConstituencyPane) | `path` (country/region/county) | ✅ correct |

---

## Known crumb bugs to fix in T5

1. **Crumb accumulation on some lower-level items** — ward/constituency/place combinations
   can still build crumb incorrectly in edge cases. Root cause: not all context-setting
   paths clear the right crumb entries before appending.

2. **Back-nav crumb inconsistency** — clicking crumb items at certain depths reopens walker
   but crumb does not always trim to the correct depth.

3. **Place type missing from banner** — place_type field may be undefined in some place
   objects from the new v2 data schema. Banner shows name only; type not always appended
   to crumb label.

---

## T5 task breakdown

### T5-T1 — Map as primary context consumer
Audit MidPaneMap's current filtering against `path`. The map must zoom/filter to the
selected item at every nav depth: country → region → county → constituency → ward.
If a place is selected (pendingPlace set), the map must pin/highlight that place.
This is the highest-priority T5 task — map is the key visual.
Key file: `src/components/MidPaneMap.jsx`.

### T5-T2 — Map as context source
Wire marker click in `MidPaneMap.jsx` to write context back to Locations.
Requires: `onMarkerClick` callback prop passed from Locations.jsx.
On click: if place marker → `handlePlaceSelect(place)`. If constituency marker →
`select('constituency', name)`. If ward marker → `selectMany([constituency, ward])`.
Ward markers need constituency lookup — derive from `wards[]` flat array (wards have
`constituency` field).

### T5-T3 — Crumb trail systematic fix
Audit every context-setting code path and verify crumb is correctly built after each.
Fix any case where crumb does not represent exactly the last-clicked context.
Key file: `Locations.jsx` (crumbs useMemo), `useNavigation.js` (select/selectMany).

### T5-T4 — Banner and place_type edge cases
Ensure place_type always present in crumb label. Verify banner shows correct label for
all nav depths including ward and place. Fix place_type field lookup if v2 schema mismatch.

### T5-T5 — Full sync verification
Walk all 5 sources in sequence, verify all 5 consumers update correctly after each.
Verification matrix: 5×5 = 25 combinations. Map must be correct for every combination.
Document any failures.

---

## Files likely to change in T5

- `src/components/MidPaneMap.jsx` — filter/zoom logic, marker click events, onMarkerClick prop
- `src/pages/Locations.jsx` — crumb useMemo, onMarkerClick handler
- `src/hooks/useNavigation.js` — if any edge cases found in select/selectMany
- `src/components/Header/SiteHeaderRow3.jsx` — if crumb rendering needs fix

---

## Outstanding backlog (not T5)

- NI counties — deferred, hand-source required
- Data correction tool — deferred
- Multi-select / saved list (Group F from Phil's original list)
- Content enrichment — L1/L2 cache model agreed (PRG:50), spec not yet written
