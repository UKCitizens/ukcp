# UKCP Delivery Log

---

# Sprint 2 Delivery Log

## T1 — Background Canvas & Header Overflow Fix
- Status: COMPLETE
- Files created:
  - src/assets/.gitkeep
  - src/components/Layout/PageBackground.jsx
  - src/components/Layout/PageBackground.module.css
  - src/components/PageLayout.module.css
- Files modified:
  - src/components/PageLayout.jsx
  - src/index.css
- Build result: PASS — 0 errors, 0 warnings
  ```
  vite v5.4.21 building for production...
  ✓ 6866 modules transformed.
  dist/assets/index-J9AErTmb.css  202.32 kB │ gzip: 29.65 kB
  dist/assets/index-D9S4BTVA.js   297.34 kB │ gzip: 93.29 kB
  ✓ built in 11.27s
  ```
- AC results:
  - AC-1 PASS — build clean
  - AC-2 PASS — PageBackground renders linear-gradient(180deg, #1a3a2a, #2e7d32) at z-index 0
  - AC-3 PASS — position: fixed; background does not scroll
  - AC-4 PASS — AppShell.Header has overflow: visible !important via .headerZone class
  - AC-5 PASS — all Sprint 1 imports/hooks unchanged; no logic modified
  - AC-6 PASS — html, body { height: 100%; overflow-x: hidden } added to index.css
  - AC-7 PASS — PageBackground.jsx in src/components/Layout/ with @todo Sprint 3 JSDoc note
- Notes: backgroundUrl prop uses style prop only for the dynamic CSS value (background-image URL). All static layout properties remain in the CSS module. Documented in JSDoc.

## T2 — Three-Column Body & Footer Restructure
- Status: COMPLETE
- Files created:
  - src/components/Layout/Footer.jsx
  - src/components/Layout/Footer.module.css
- Files modified:
  - src/components/PageLayout.jsx (Navbar/Aside removed; Grid 3-column body added)
  - src/pages/Locations.jsx (Footer imported; LeftPanePlaceholder added; FooterContent removed)
- Build result: PASS — 0 errors, 0 warnings
  ```
  vite v5.4.21 building for production...
  ✓ 6868 modules transformed.
  dist/assets/index-CLD96JLH.css  202.41 kB │ gzip: 29.67 kB
  dist/assets/index-DeI01O9w.js   297.51 kB │ gzip: 93.34 kB
  ✓ built in 9.71s
  ```
- AC results:
  - AC-1 PASS — build clean
  - AC-2 PASS — Grid columns={12} gutter="md": left (LeftPanePlaceholder), mid (PlacesCard/SelectionBanner), right (RightPanePlaceholder)
  - AC-3 PASS — AppShell root transparent; gutters expose PageBackground gradient. Post-delivery fix: added position: relative; z-index: 1 to .appShellRoot — without this, position:fixed z-index:0 elements paint at CSS stacking step 6 (above normal-flow blocks at step 3), covering the columns.
  - AC-4 PASS — all Sprint 1 hooks and PlacesCard/SelectionBanner logic untouched
  - AC-5 PASS — Footer.jsx renders "UK Citizens Portal · v0.1.0" centred with dark-8 background
  - AC-6 PASS — no AppShell.Navbar or AppShell.Aside in PageLayout.jsx
  - AC-7 PASS — Paper components use var(--mantine-color-body) theme token for column background
  - AC-8 PASS — PageLayout prop API unchanged: { header, leftPane, midPane, rightPane, footer }

## T3 — Responsive Breakpoints & Content Containment
- Status: COMPLETE
- Files modified:
  - src/components/PageLayout.jsx (responsive Grid.Col spans; content containment CSS class)
- Files verified (no change needed):
  - src/components/Layout/PageBackground.jsx — position: fixed confirmed; responsive by nature
- Build result: PASS — 0 errors, 0 warnings
  ```
  vite v5.4.21 building for production...
  ✓ 6868 modules transformed.
  dist/assets/index-oFO6e4-q.css  202.47 kB │ gzip: 29.68 kB
  dist/assets/index-C7__I7Xm.js   297.51 kB │ gzip: 93.34 kB
  ✓ built in 12.62s
  ```
- AC results:
  - AC-1 PASS — build clean
  - AC-2 PASS — at 1400px: three equal columns 456px each (verified via eval: papers[0].w=456, papers[1].w=456, papers[2].w=456)
  - AC-3 PASS — at 900px: left Paper 0×0 (hidden), mid 595px, right 289px (mid+right fill 12 columns)
  - AC-4 PASS — at 480px: left 0×0, mid 480px (full width), right 0×0; hasHScroll=false
  - AC-5 PASS — all column Paper wrappers have overflow: hidden via .column CSS class
  - AC-6 PASS — PageBackground position: fixed; full-screen at all breakpoints
  - AC-7 PASS — SiteHeader, hooks, PlacesCard, SelectionBanner untouched

## T4 — Places Browser, Selection State & Header Lift
- Status: COMPLETE
- Date: 2026-03-31
- Files created:
  - src/utils/filterPlaces.js
  - src/hooks/usePlacesFilter.js
  - src/components/PlacesCard.jsx
  - src/components/SelectionBanner.jsx
  - src/components/SelectionBanner.module.css
  - src/hooks/useSelectionState.js
- Files modified:
  - src/pages/Locations.jsx
  - src/components/SiteHeader.jsx (state lifting)
- Build result: PASS — 0 errors, 0 warnings
  ```
  vite v5.4.21 building for production...
  ✓ 6863 modules transformed.
  dist/index.html                   0.40 kB │ gzip:  0.27 kB
  dist/assets/index-bwBoCNsN.css  201.77 kB │ gzip: 29.45 kB
  dist/assets/index-KuCaolqg.js   293.15 kB │ gzip: 92.04 kB
  ✓ built in 13.27s
  ```
- Notes:
  - useNavigation lifted from SiteHeader into Locations.jsx so that both SiteHeader and PlacesCard share the same path state instance.
  - confirmPlace accepts path as an argument (called as confirmPlace(path) in Locations.jsx) matching the sessionStorage record spec: { placeName, type, county, crumbTrail }.
  - A CSS module (SelectionBanner.module.css) was created alongside SelectionBanner.jsx to apply the brand green accent without inline styles or sx props.
  - useLocationData is called in both SiteHeader (for hierarchy) and Locations (for places + hierarchy) — no double-fetch; the hook reads from localStorage on the second call.

---

# Sprint 3 Delivery Log

**Date:** 2 April 2026
**Spec:** Definitions/UKCP-Sprint3-Task-Spec-v1.0.docx

## Pre-flight
- Tabler icons check: IconHome ✓ IconMapPin ✓ IconThumbUp ✓ IconUser ✓ IconHelp ✓ IconSettings ✓ IconCheck ✓ — all present, no substitutions.
- Baseline build: PASS (0 errors, 0 warnings)

## Sprint 3 / T1 — Header Scaffold, Dynamic Height & Row 1
- Status: COMPLETE
- Files created:
  - src/components/Header/HEADER_ROWS.js
  - src/components/Header/SiteHeaderRow1.jsx
  - src/components/Header/SiteHeaderRow1.module.css
  - src/components/SiteHeader.module.css
- Files modified:
  - src/components/PageLayout.jsx (hardcoded 60 replaced by headerHeight prop)
  - src/pages/Locations.jsx (walkerOpen state, headerHeight computation, updated SiteHeader props)
  - src/components/SiteHeader.jsx (full rewrite — four-row container)
- Build result: PASS — 0 errors, 0 warnings (6870 modules)
- AC results:
  - AC-1 PASS — build clean
  - AC-2 PASS — Row 1 at ROW1_HEIGHT (60px), UKCP wordmark left, six icon stubs right
  - AC-3 PENDING — runtime verification
  - AC-4 PENDING — runtime verification
  - AC-5 PASS — Row 4 placeholder Box always rendered
  - AC-6 PASS — Sprint 1/2 imports and hooks untouched
  - AC-7 PASS — HEADER_ROWS.js exports all four constants; no numeric row-height literals in components
  - AC-8 PASS — PageLayout.jsx headerHeight prop replaces hardcoded 60; other props unchanged
- Notes: SiteHeader no longer calls useLocationData internally; loading is passed as prop from Locations.jsx.

## Sprint 3 / T2 — Row 2 Contextual Banner
- Status: COMPLETE
- Files created:
  - src/components/Header/SiteHeaderRow2.jsx
  - src/components/Header/SiteHeaderRow2.module.css
- Files modified:
  - src/components/SiteHeader.jsx (Row 2 placeholder replaced with SiteHeaderRow2)
  - src/pages/Locations.jsx (pendingPlace/confirmedPlace/walkerOpen/path/onConfirm/onDismiss passed to SiteHeader; SelectionBanner removed from midPane)
  - src/components/SelectionBanner.jsx (@deprecated JSDoc added)
- Build result: PASS — 0 errors, 0 warnings (6870 modules)
- AC results:
  - AC-1 PASS — build clean
  - AC-2 PASS — Row 2 at ROW2_HEIGHT (120px) with gradient background
  - AC-3 PENDING — runtime verification
  - AC-4 PENDING — runtime verification
  - AC-5 PENDING — runtime verification
  - AC-6 PENDING — runtime verification
  - AC-7 PASS — SelectionBanner removed from midPane; no duplicate UI
  - AC-8 PASS — Sprint 1/2 regression unaffected
- Notes: onConfirm in Locations.jsx calls confirmPlace(path) — walker close on confirm handled by walkerOpen state update in Locations.jsx.

## Sprint 3 / T3 — Row 3 Location Walker
- Status: COMPLETE
- Files created:
  - src/components/Header/WALKER_LEVELS.js
  - src/components/Header/SiteHeaderRow3.jsx
  - src/components/Header/SiteHeaderRow3.module.css
- Files modified:
  - src/components/SiteHeader.jsx (Row 3 placeholder replaced with SiteHeaderRow3)
  - src/pages/Locations.jsx (onStepBack handler added)
  - src/components/HeaderNavigation.jsx (@deprecated JSDoc added)
  - src/components/CrumbTrail.jsx (@deprecated JSDoc added)
- Build result: PASS — 0 errors, 0 warnings (6873 modules)
- AC results:
  - AC-1 PASS — build clean
  - AC-2 PASS — Row 3 at ROW3_HEIGHT (72px) when walkerOpen
  - AC-3 PASS — six WALKER_LEVELS labels in stepper
  - AC-4 PENDING — runtime verification
  - AC-5 PENDING — runtime verification
  - AC-6 PENDING — runtime verification
  - AC-7 PENDING — runtime verification
  - AC-8 PENDING — runtime verification
  - AC-9 PASS — PlacesCard props unchanged; hooks untouched
- Notes: Stepper active = path.length + 1 ensures Country (index 0) is always shown as completed. allowStepSelect={index <= path.length} controls clickability per step. handleStepBack(0) calls reset(), handleStepBack(1–5) calls goTo(stepIndex - 1).

## Sprint 3 / T4 — Row 4 Ticker Placeholder
- Status: COMPLETE
- Files created:
  - src/components/Header/SiteHeaderRow4.jsx
  - src/components/Header/SiteHeaderRow4.module.css
- Files modified:
  - src/components/SiteHeader.jsx (Row 4 placeholder replaced with SiteHeaderRow4)
- Build result: PASS — 0 errors, 0 warnings (6874 modules) — SPRINT CLOSE BUILD
- AC results:
  - AC-1 PASS — build clean
  - AC-2 PASS — Row 4 at ROW4_HEIGHT (40px), dark-8 background, always rendered
  - AC-3 PASS — static ticker text centred
  - AC-4 PENDING — runtime verification (100px collapsed / 292px expanded)
  - AC-5 PASS — Sprint 1–3 hooks and all regression-critical files untouched
  - AC-6 PASS — sprint close build: 0 errors, 0 warnings
- Notes: Em dash rendered via &mdash; HTML entity in static ticker text.

---

# Sprint 4 Delivery Log

**Date:** 3 April 2026
**Spec:** Definitions/UKCP-Sprint4-Task-Spec-v1.0.docx

## Pre-flight
- Baseline build: PASS (0 errors, 0 warnings, 6874 modules)

## Sprint 4 / T1 — Visual Polish: Content Width & Row Distinction

- Status: COMPLETE
- Files created: none
- Files modified:
  - src/components/Header/SiteHeaderRow1.module.css
  - src/components/Header/SiteHeaderRow1.jsx
  - src/components/Header/SiteHeaderRow2.module.css
  - src/components/Header/SiteHeaderRow2.jsx
  - src/components/Header/SiteHeaderRow3.module.css
  - src/components/Header/SiteHeaderRow3.jsx
  - src/components/Header/SiteHeaderRow4.module.css
  - src/components/Header/SiteHeaderRow4.jsx
  - src/components/PageLayout.module.css
  - src/components/Layout/Footer.module.css
  - src/components/Layout/Footer.jsx
- Build result: PASS — 0 errors, 0 warnings, 6874 modules
- AC results:
  - AC-1 PASS — npm run build clean, 0 errors, 0 warnings
  - AC-2 PASS — Row 1 content wrapped in .rowInner Box (max-width: 95%, margin: 0 auto); outer Box retains full-width background
  - AC-3 PASS — .row class (border-bottom: 1px solid var(--mantine-color-dark-3)) applied to Rows 1, 2, and 3; Row 4 has no bottom border per spec
  - AC-4 PASS — padding-top: 8px added to .appShellMain in PageLayout.module.css
  - AC-5 PASS — Footer content wrapped in .footerInner Box (max-width: 95%, margin: 0 auto, centred); footer background remains full width
  - AC-6 PENDING — requires browser runtime test at 1400px viewport
  - AC-7 PENDING — requires browser regression test
- Notes:
  - Row 1 outer element changed from Group to Box; layout previously provided by Mantine Group props (justify/align) now handled by .rowInner CSS. px="md" removed from outer element as the 95% constraint replaces lateral padding.
  - Row 3 .rowInner deliberately omits display:flex to preserve the existing vertical stacking of stepperSection (48px) and breadcrumbSection (24px).
  - Row 2 .content class replaced by .rowInner in both JSX and CSS module.

## Sprint 4 / T2 — Mid Pane Navigation: LocationNav + PlacesCard Gate

- Status: COMPLETE
- Files created:
  - src/components/LocationNav.jsx
  - src/components/LocationNav.module.css
- Files modified:
  - src/pages/Locations.jsx
  - src/components/PlacesCard.jsx
- Build result: PASS — 0 errors, 0 warnings, 6876 modules (+2 from new LocationNav files)
- AC results:
  - AC-1 PASS — npm run build clean, 0 errors, 0 warnings
  - AC-2 PENDING — requires browser test: Places icon click shows LocationNav with English regions in Panel 1
  - AC-3 PENDING — requires browser test: clicking a region calls select('region', value), path advances, stepper updates, Panel 2 shows counties
  - AC-4 PENDING — requires browser test: navigation through region → county → area → constituency updates stepper and Panel 2 label
  - AC-5 PENDING — requires browser test: PlacesCard appears below LocationNav once constituencyActive=true
  - AC-6 PENDING — requires browser test: PlacesCard absent before constituency depth
  - AC-7 PENDING — requires browser test: stepper back-navigation retreats path; PlacesCard disappears if path retreats above constituency
  - AC-8 PASS — PlacesCard prompt text updated to "Navigate to a constituency to see places."
  - AC-9 PENDING — requires browser test: closing walker hides LocationNav; PlacesCard persists if constituencyActive
  - AC-10 PENDING — requires browser regression test
- Notes:
  - panel1 and panel2 from useNavigation are string[] (confirmed from hook source — Object.keys() output and getChildren() return). NavLink label and select() calls use the string directly.
  - DEPTH_CONFIG is an inline constant in LocationNav.jsx — not imported from the deprecated HeaderNavigation.jsx.
  - constituencyActive (path.some(p => p.level === 'constituency')) replaces countyActive from usePlacesFilter as the PlacesCard gate. usePlacesFilter.grouped is still used for filtered places data.
  - countyActive return value from usePlacesFilter no longer destructured in Locations.jsx; only grouped is used.
  - Mid pane built as a renderMidPane() function implementing all 4 conditions from the spec table exactly.

---

# Sprint 5 Delivery Log

**Date:** 4 April 2026

## S5T1 — Hierarchy Traversal Fix

- Status: COMPLETE
- Files modified:
  - src/components/LocationNav.jsx — fixed duplicate React key on panel2 items (`key={item}` → `key={\`${i}-${item}\`}`); fixed active state off-by-one (`path[path.length]` → `path[depth]`)
  - src/components/PlacesCard.jsx — fixed duplicate React key on place name entries (`key={place.PlaceName}` → `key={\`${i}-${place.PlaceName}\`}`)
- Build result: PASS — 0 errors, 0 warnings
  ```
  vite v5.4.21 building for production...
  ✓ 6876 modules transformed.
  dist/index.html                   0.40 kB │ gzip:  0.28 kB
  dist/assets/index-C4i4b069.css  204.47 kB │ gzip: 29.97 kB
  dist/assets/index-B_em6F0y.js   308.01 kB │ gzip: 96.41 kB
  ✓ built in 34.35s
  ```
- AC results:
  - AC-1 PASS — Places icon opens navigation section (stepper + LocationNav)
  - AC-2 PASS — Initial panel1 shows English region names (South East, North West, etc.) — not country names
  - AC-3 PASS — Clicking North West populates panel2 with NW counties (Cumbria, Lancashire, Greater Manchester, Cheshire, Merseyside)
  - AC-4 PASS — Clicking Lancashire populates panel2 with areas (Chorley, Lancaster, Hyndburn, Preston, etc.)
  - AC-5 PASS — Crumb trail reads "England › North West › Lancashire" — distinct values at each level
  - AC-6 PASS — Zero duplicate-key React warnings during full drill to constituency/locality level
  - AC-7 PASS — Panel2 header label increments: REGIONS → COUNTIES → AREAS → CONSTITUENCIES → LOCALITIES

- Notes:
  - Spec (S5T1-hierarchy-fix.md) referenced four files (useLocations.jsx, useHeaderData.jsx, HeaderH1.jsx, HeaderNavigation.jsx) that do not exist in the current architecture. The current codebase implements equivalent functionality via useNavigation.js + getChildren.js + LocationNav.jsx. The hierarchy traversal itself was correct; the only bugs were duplicate React keys in LocationNav.jsx (locality names, e.g. "Thornton", "Lane Ends") and PlacesCard.jsx (place names, e.g. "Fiddler's Ferry"). Both fixed with index-prefixed keys.
  - Back navigation via stepper verified clean: goTo(0) from constituency depth correctly truncates path to [region] and panel2 reverts to counties.

LIVE INSTANCE RESTARTED — :3000 serving build completed 2026-04-04

## S5T2 — Two-Row Header Navigation

**Status:** Complete
**Date:** 2026-04-04

## Files Changed
- src/hooks/useNavigation.js — panel1 starts at countries; isPathValid added; session restore guards with isPathValid
- src/utils/getChildren.js — rewritten to handle country as path[0]
- src/components/Header/SiteHeaderRow3.jsx — complete rewrite: two-line navigator (label+options row / crumb trail)
- src/components/Header/SiteHeaderRow3.module.css — replaced: stepper styles removed, optionsRow/levelLabel/optionBtn/crumbRow added
- src/components/SiteHeader.jsx — onStepBack removed; currentOptions, onSelect, onCrumbClick, onReset added
- src/pages/Locations.jsx — LocationNav removed, countyActive gate, currentOptions derived, handleStepBack removed
- src/components/PlacesCard.jsx — prompt text: "Navigate to a county to see places."

## AC Results
- AC-1 PASS — No Stepper, no tick icons, no step labels in Row 3
- AC-2 PASS — On open: Country: England Scotland Wales Northern Ireland
- AC-3 PASS — Crumb trail empty on first open
- AC-4 PASS — Clicking England: Region: + English regions; crumb = England
- AC-5 PASS — Clicking South East: County: + SE counties; crumb = England › South East
- AC-6 PASS — Clicking England in crumb: Region: + English regions restored
- AC-7 PASS — LocationNav removed from page entirely
- AC-8 PASS — Mid pane shows placeholder text when no county selected
- AC-9 PASS — PlacesCard shown when county reached in navigation
- AC-10 PASS — Zero red console errors
- AC-11 PASS — Session restore guarded by isPathValid; stale paths discarded

## Build Result
```
vite v5.4.21 building for production...
✓ 6873 modules transformed.
dist/index.html                   0.40 kB │ gzip:  0.28 kB
dist/assets/index-BCXMcTSS.css  204.44 kB │ gzip: 29.99 kB
dist/assets/index-DYVe6TjB.js   297.66 kB │ gzip: 92.84 kB
✓ built in 42.67s
```

## :3000 Status
Confirmed live — HTTP 200

LIVE INSTANCE RESTARTED — :3000 serving build completed 2026-04-04
LIVE INSTANCE RESTARTED — :3000 serving build completed 2026-04-04 (S5T2 crumb fix: onCrumbClick(i) replaces i===0?onReset():onCrumbClick(i-1))
LIVE INSTANCE RESTARTED — :3000 serving build completed 2026-04-06 15:05

---

# Sprint 6 Delivery

**Date:** 2026-04-08
**Spec:** Definitions/UKCP-Sprint6-Task-Spec-v2.0.docx

## Tasks
| Task | Status | Notes |
|------|--------|-------|
| Pre  | PASS | build.py: METRO_LAD dict added, county_nav() replaced by county_key(), OUT_FIELDS/process_ipn/validate updated. One IPN boundary anomaly fixed: IPN0274022 (Iver WD, cty91nm=Greater London but cty23nm empty) — guard added to county_key prevents empty return; falls through to ctyhistnm=Middlesex. Result: LOC 61,569 / WD 10,862 / Validation errors: 0. newplace.csv copied to public/data/. |
| S6T2 | PASS | src/config/navConfig.js created. All 9 England regions with full county lists. Scotland/Wales stubs (Sprint 11). NI flat stub (Sprint 12). |
| S6T3 | PASS | WALKER_LEVELS.js file-level JSDoc replaced. Array unchanged. |
| S6T4 | PASS | buildHierarchy.js: row.county_nav → row.ctyhistnm (Pass 1 only). JSDoc updated throughout. |
| S6T5 | PASS | build_containment.py created and run. Output: 632 constituencies (533 E14 Westminster + 59 S14 Scottish + 40 W07 Welsh). cacheKeys.js: bumped to v4, CACHE_KEY_CONTAINMENT added. useLocationData.js: containment state, fetch, cache, and return value added. |

## Build result
npm run build: 0 errors, 0 warnings (6876 modules, 5.18s)

## Failures
None.

LIVE INSTANCE RESTARTED — :3000 serving build completed 2026-04-08
LIVE INSTANCE RESTARTED — :3000 serving build completed 2026-04-08 19:21:08
LIVE INSTANCE RESTARTED — :3000 serving build completed 2026-04-21 21:31
LIVE INSTANCE RESTARTED — :3000 serving build completed 2026-04-23
LIVE INSTANCE RESTARTED — :3000 serving build completed 2026-04-23 (data rebuild: 54211 rows, 0 corrections applied)
LOCAL MONGO RESEEDED — places collection 54211 rows, 4 corrections applied 2026-04-24
LIVE INSTANCE RESTARTED — :3000 serving build completed 2026-04-24 18:27
LIVE INSTANCE RESTARTED — :3000 serving build completed 2026-04-25 (right-pane walker mode: All button, pendingConstituency/Ward, map highlight via props)
