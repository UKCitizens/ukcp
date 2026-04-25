# Dex Instruction File — Right-Pane Walker Mode
> Session: 25 Apr 2026 | Ali
> Read this file in full before making any changes.

---

## Objective

Add walker mode to the right pane (ConstituencyPane) matching the pattern already working in the left pane (PlacesCard). Clicking constituencies/wards in walker mode sets pending state without committing to path. No path change = no scope collapse, no ancestor resolution, no cascade.

Three files change. No new files. No hook changes.

---

## File 1 — `src/pages/Locations.jsx`

### 1a. New state vars (add after `const [walkerMode, setWalkerMode]` line ~65)

```js
const [rightWalkerMode,     setRightWalkerMode]     = useState(false)
const [pendingConstituency, setPendingConstituency] = useState(null)
const [pendingWard,         setPendingWard]         = useState(null)
```

---

### 1b. Modify `handleSelect` — add walker branch

Replace the entire `handleSelect` function:

```js
const handleSelect = useCallback((level, value) => {
  if (rightWalkerMode) {
    if (level === 'constituency') {
      setPendingConstituency(value)
      setPendingWard(null)
    } else if (level === 'ward') {
      setPendingWard(value)
    }
    return
  }
  dismissPending()
  const ancestors = level === 'constituency' ? resolveConstituencyAncestors(value) : []
  selectMany([...ancestors, { level, value }])
  setMidTab('map')
}, [rightWalkerMode, dismissPending, selectMany, resolveConstituencyAncestors])
```

---

### 1c. Modify `handleSelectMany` — add walker branch

Replace the entire `handleSelectMany` function:

```js
const handleSelectMany = useCallback((pairs) => {
  if (rightWalkerMode) {
    const conPair  = pairs.find(p => p.level === 'constituency')
    const wardPair = pairs.find(p => p.level === 'ward')
    if (conPair)  setPendingConstituency(conPair.value)
    if (wardPair) setPendingWard(wardPair.value)
    return
  }
  dismissPending()
  const conPair   = pairs.find(p => p.level === 'constituency')
  const ancestors = conPair ? resolveConstituencyAncestors(conPair.value) : []
  selectMany([...ancestors, ...pairs])
  setMidTab('map')
}, [rightWalkerMode, dismissPending, selectMany, resolveConstituencyAncestors])
```

---

### 1d. Clear pending geo on navigation

In `handleGoTo` — add two clears inside the callback body:
```js
const handleGoTo = useCallback((index) => {
  goTo(index)
  dismissPending()
  setPendingConstituency(null)   // add
  setPendingWard(null)           // add
  setWalkerOpen(true)
}, [goTo, dismissPending])
```

In `handleReset` — add two clears:
```js
const handleReset = useCallback(() => {
  reset()
  dismissPending()
  setPendingConstituency(null)   // add
  setPendingWard(null)           // add
  setWalkerOpen(true)
  setViewMode('browse')
  setMidTab('map')
}, [reset, dismissPending])
```

In `handleNavSelect` — add two clears:
```js
function handleNavSelect(level, value) {
  dismissPending()
  setPendingConstituency(null)   // add
  setPendingWard(null)           // add
  select(level, value)
}
```

---

### 1e. Extend `contentContext`

Replace the `contentContext` useMemo. Add `pendingWard` and `pendingConstituency` above the existing `constituency` branch. Also add both to the dependency array.

```js
const contentContext = useMemo(() => {
  if (pendingPlace)          return {
    type:  pendingPlace.place_type.toLowerCase(),
    slug:  pendingPlace.name.replace(/ /g, '_'),
    label: pendingPlace.name,
  }
  if (pendingWard)           return { type: 'ward',          slug: pendingWard.replace(/ /g, '_'),          label: pendingWard          }
  if (pendingConstituency)   return { type: 'constituency',  slug: pendingConstituency.replace(/ /g, '_'),  label: pendingConstituency  }
  if (constituency)          return { type: 'constituency',  slug: constituency.replace(/ /g, '_'),         label: constituency         }
  if (county)                return { type: 'county',        slug: county.replace(/ /g, '_'),               label: county               }
  if (region)                return { type: 'region',        slug: region.replace(/ /g, '_'),               label: region               }
  if (country)               return { type: 'country',       slug: country.replace(/ /g, '_'),              label: country              }
  return { type: 'country', slug: 'United_Kingdom', label: 'United Kingdom' }
}, [pendingPlace, pendingWard, pendingConstituency, constituency, county, region, country])
```

---

### 1f. Extend `contextCoords`

In the `contextCoords` useMemo, add a `pendingConstituency` branch immediately after the `pendingPlace` branch (before the `ward` branch). Use the same centroid averaging logic already used for `constituency`:

```js
const contextCoords = useMemo(() => {
  if (pendingPlace?.lat && pendingPlace?.lng)
    return { lat: +pendingPlace.lat, lng: +pendingPlace.lng }

  // pending constituency centroid (walker mode)
  if (pendingConstituency && wards) {
    const needle = pendingConstituency.trim().toLowerCase()
    const rows = wards.filter(w => w.constituency?.trim().toLowerCase() === needle)
                      .filter(w => w.lat && w.lng && !isNaN(+w.lat))
    if (rows.length) return {
      lat: rows.reduce((s, w) => s + +w.lat, 0) / rows.length,
      lng: rows.reduce((s, w) => s + +w.lng, 0) / rows.length,
    }
  }

  if (ward && wards) {
    const hit = wards.find(w => w.ward === ward)
    if (hit?.lat) return { lat: +hit.lat, lng: +hit.lng }
  }
  if (constituency && wards) {
    const rows = wards.filter(w => w.constituency === constituency)
                      .filter(w => w.lat && w.lng && !isNaN(+w.lat))
    if (rows.length) return {
      lat: rows.reduce((s, w) => s + +w.lat, 0) / rows.length,
      lng: rows.reduce((s, w) => s + +w.lng, 0) / rows.length,
    }
  }
  if (county)   return NAV_COORDS[county]   ?? null
  if (region)   return NAV_COORDS[region]   ?? null
  if (country)  return NAV_COORDS[country]  ?? null
  return NAV_COORDS['United Kingdom']
}, [pendingPlace, pendingConstituency, ward, constituency, county, region, country, wards])
```

Add `pendingConstituency` to the dependency array.

---

### 1g. Extend crumb trail

In the `crumbs` useMemo, after the `if (pendingPlace)` block, add:

```js
if (pendingConstituency && !pendingPlace) {
  items.push({ label: pendingConstituency, onClick: undefined })
}
if (pendingWard && !pendingPlace) {
  items.push({ label: `${pendingWard} (Ward)`, onClick: undefined })
}
```

Add `pendingConstituency` and `pendingWard` to the dependency array.

---

### 1h. Pass new props to ConstituencyPane

In the JSX `<ConstituencyPane ... />` block, add three props:

```jsx
<ConstituencyPane
  containment={containment}
  path={path}
  hierarchy={hierarchy}
  wards={wards}
  select={handleSelect}
  selectMany={handleSelectMany}
  paneTitle={`Constituencies with wards in ${scopeLabel}`}
  onWalkerModeChange={setRightWalkerMode}          {/* add */}
  pendingConstituency={pendingConstituency}         {/* add */}
  pendingWard={pendingWard}                         {/* add */}
/>
```

---

### 1i. Pass activeConstituency and activeWard to MidPaneMap

In the JSX `<MidPaneMap ... />` block, add two props:

```jsx
<MidPaneMap
  places={places}
  wards={wards}
  path={path}
  pendingPlace={pendingPlace}
  onMarkerClick={handleMarkerClick}
  flyTo={flyTo}
  invalidateTrigger={invalidateTrigger}
  activeConstituency={pendingConstituency ?? constituency}   {/* add */}
  activeWard={pendingWard ?? ward}                           {/* add */}
/>
```

---

## File 2 — `src/components/ConstituencyPane.jsx`

### 2a. Accept new props

```js
export default function ConstituencyPane({
  containment, path, hierarchy, wards, select, selectMany, paneTitle,
  onWalkerModeChange,    // add
  pendingConstituency,   // add
  pendingWard,           // add
}) {
```

---

### 2b. Derived active values

After the existing derived values (country, region, county, constituency, ward from path), add:

```js
const activeConstituency = pendingConstituency ?? constituency
const activeWard         = pendingWard         ?? ward
```

---

### 2c. Don't collapse list when pending is set

In the `constituencies` useMemo, change the collapse guard:

```js
// before
if (constituency) return all.filter(c => c.name === constituency)

// after — only collapse when path-committed AND not in walker mode (no pending)
if (constituency && !pendingConstituency) return all.filter(c => c.name === constituency)
```

---

### 2d. displayConstituency — remove auto-preview of first item

```js
// before
const displayConstituency = constituency ?? filtered[0]?.name ?? null

// after — show ward panel only when user has explicitly selected a constituency
const displayConstituency = activeConstituency ?? null
```

---

### 2e. Ward list — use pendingWard for active highlight

The `selectedWards` useMemo currently uses `ward` (from path). Change to `activeWard`:

```js
// before
const selectedWards = useMemo(
  () => ward ? allWards.filter(w => w === ward) : allWards,
  [allWards, ward]
)

// after
const selectedWards = useMemo(
  () => activeWard ? allWards.filter(w => w === activeWard) : allWards,
  [allWards, activeWard]
)
```

---

### 2f. Add All button to A-Z strip

In the A-Z strip JSX, prepend an All button before the `.map(l => ...)`:

```jsx
<div className={classes.alphaRow}>
  <button
    className={[classes.alphaBtn, activeLetter === null ? classes.alphaBtnActive : ''].join(' ')}
    onClick={() => { setActiveLetter(null); onWalkerModeChange?.(true) }}
    title="Show all — walker mode"
  >All</button>
  {ALL_LETTERS.filter(l => availableLetters.has(l)).map(l => (
    <button
      key={l}
      className={[classes.alphaBtn, l === activeLetter ? classes.alphaBtnActive : ''].join(' ')}
      onClick={() => { setActiveLetter(l); onWalkerModeChange?.(false) }}
    >
      {l}
    </button>
  ))}
</div>
```

Note: the existing letter buttons don't call `onWalkerModeChange` — add that call to each letter's onClick.

---

### 2g. Update constituency button active class

```jsx
// before
className={[classes.constBtn, c.name === constituency ? classes.constBtnActive : ''].join(' ')}

// after
className={[classes.constBtn, c.name === activeConstituency ? classes.constBtnActive : ''].join(' ')}
```

---

### 2h. Update ward button active class

```jsx
// before
className={[classes.wardBtn, w === ward ? classes.wardBtnActive : ''].join(' ')}

// after
className={[classes.wardBtn, w === activeWard ? classes.wardBtnActive : ''].join(' ')}
```

---

## File 3 — `src/components/MidPaneMap.jsx`

### 3a. Accept new props

```js
// Add to the destructured props list
export default function MidPaneMap({
  places, wards, path, pendingPlace, onMarkerClick, flyTo, invalidateTrigger,
  activeConstituency,   // add
  activeWard,           // add
}) {
```

---

### 3b. Update `politicalLayerRef` effect

The effect currently reads `path` to extract `wardEntry` and `constituencyEntry`. Replace with prop-driven values. Change the effect as follows:

```js
// ── Selected constituency/ward highlight — always visible, ignores layer toggles ──
useEffect(() => {
  const map = mapRef.current
  if (!map) return

  if (politicalLayerRef.current) {
    map.removeLayer(politicalLayerRef.current)
    politicalLayerRef.current = null
  }

  if (!activeWard && !activeConstituency) return

  let lat = null, lng = null, label = '', sublabel = ''
  let zoom = 10

  if (activeWard && Array.isArray(wards)) {
    const needle = activeWard.trim().toLowerCase()
    const hit = wards.find(w => w.name?.trim().toLowerCase() === needle)
    if (hit && hasCoords(hit)) {
      lat = +hit.lat; lng = +hit.lng
      label    = activeWard
      sublabel = `Ward${activeConstituency ? ` · ${activeConstituency}` : ''}`
      zoom     = 12
    }
  }

  if (lat === null && activeConstituency) {
    const needle = activeConstituency.trim().toLowerCase()
    const centroid = constituencyCentroids.find(c => c.name?.trim().toLowerCase() === needle)
    if (centroid && hasCoords(centroid)) {
      lat = +centroid.lat; lng = +centroid.lng
      label    = activeConstituency
      sublabel = 'Constituency'
      zoom     = 10
    }
  }

  if (lat === null) return

  const group  = L.layerGroup()
  const marker = L.circleMarker([lat, lng], {
    radius: 11, color: '#862e9c', fillColor: '#ffd43b',
    fillOpacity: 0.92, weight: 3,
  })
  marker.bindTooltip(
    `<strong>${label}</strong><br/><span style="color:#868e96;font-size:11px">${sublabel}</span>`,
    { direction: 'top', sticky: false, offset: L.point(0, -16) }
  )
  marker.addTo(group)
  group.addTo(map)
  politicalLayerRef.current = group

  map.flyTo([lat, lng], zoom, { duration: 0.6 })
}, [activeConstituency, activeWard, wards, constituencyCentroids])
```

Key change: dependency array was `[path, wards, constituencyCentroids]` — now `[activeConstituency, activeWard, wards, constituencyCentroids]`. The `path.find(...)` calls are replaced by the prop values directly.

---

## Build & Test

```
cd C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP
npm run build
node server.js
```

**Test sequence:**
1. Load `/locations`. Right pane shows constituency list (no All button yet — add it).
2. Click "All" → list stays open showing all constituencies for current scope.
3. Click a constituency → highlights in list, ward panel appears, map gold marker flies to it, crumb shows it. Path unchanged (walker in header still shows same depth).
4. Click a ward → ward highlights, crumb shows constituency + ward. No path change.
5. Click a letter → exits walker mode, clears pending.
6. Confirm left pane walker still works as before.
7. Confirm standard drill (non-walker) still commits to path and collapses list as before.
