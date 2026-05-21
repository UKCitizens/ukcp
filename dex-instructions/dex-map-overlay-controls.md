# Dex Sprint -- Map Overlay Controls + Pane Search Bars

## Goal

Two changes, both scoped to the nav/map context (paneMode === 'nav' or midTab === 'map').

1. Move the place-type filter buttons (City/Town/Village/Hamlet) and the
   political/layer toggles (Constituency/Ward + content layers) OFF the left/right
   nav panes and onto the map surface as transparent overlays.

2. Remove LocationSearch from the MidPaneTabs tab strip. Add a place search to the
   top of the left nav pane, and a constituency/ward search to the top of the right
   nav pane.

Desktop and mobile both benefit. Pane content on other tabs (Groups, News, Civic etc.)
is untouched -- those panes change anyway when a non-nav tab is active.

---

## Part 1 -- Map overlay controls

### Where the controls live now

In Locations.jsx:

  navLeftSection1  -- PLACE_TYPES toggle buttons (City/Town/Village/Hamlet)
                      rendered at top of left pane under a borderBottom separator.

  navRightSection1 -- POLITICAL_TYPES toggles (Constituency/Ward) + CONTENT_LAYER_DEFS
                      layer pills (Schools/Committees etc.)
                      rendered at top of right pane under a borderBottom separator.

Both are passed into locationNav.left and locationNav.right, then into
activeLeftPane / activeRightPane, then into PageLayout leftPane/rightPane.

### What to build

New component: `src/components/Map/MapOverlayControls.jsx`

This component renders two transparent control panels as absolutely-positioned
overlays on the map surface. It receives the same props that navLeftSection1 and
navRightSection1 currently use.

Props:
  visibleTypes      {object}   -- same as Locations.jsx visibleTypes state
  onToggle          {Function} -- same as toggleNavFilter
  layers            {object}   -- same as Locations.jsx layers state
  onLayerToggle     {Function} -- same as toggleLayer
  contentLayerDefs  {Array}    -- same as CONTENT_LAYER_DEFS

Renders:

LEFT OVERLAY (place type filters):
  position: absolute, top: 8px, left: 8px, z-index: 400.
  Semi-transparent white background: rgba(255,255,255,0.88).
  Border-radius: 6px. Padding: 6px 8px.
  Box-shadow: 0 1px 4px rgba(0,0,0,0.18).
  Contents: PLACE_TYPES.map -> MapTypeToggle buttons, flexWrap, gap 4.
  Import PLACE_TYPES from MapTypeToggle.jsx.

RIGHT OVERLAY (political + layer toggles):
  position: absolute, top: 8px, right: 8px, z-index: 400.
  Same styling as left overlay.
  Contents:
    Row 1: POLITICAL_TYPES.map -> MapTypeToggle buttons.
    Divider: 1px solid #f1f3f5, margin 4px 0.
    Row 2: contentLayerDefs.map -> existing layer pill buttons (inline from
            Locations.jsx navRightSection1 -- extract the button markup verbatim).

The map container (MidPaneMap.jsx) already uses position:relative or the Leaflet
container fills its parent. The overlays are children of the Leaflet wrapper div,
not of the Leaflet map itself, so they sit above tiles without Leaflet knowing about
them. Leaflet's own zoom controls are top-left -- the left overlay goes top-left too,
but Leaflet zoom is at left:10, top:10 by default. Offset the left overlay to sit
below the zoom controls: top: 80px, left: 8px. (Or move Leaflet zoom to bottom-left
to free the top -- see note below.)

NOTE on Leaflet zoom position: In MidPaneMap.jsx, when the Leaflet map is initialised,
pass zoomControl: false to L.map() options, then add
  L.control.zoom({ position: 'bottomleft' }).addTo(map)
This frees top-left and top-right for overlay controls. Verify current zoom control
position before changing -- if it's already bottomleft, skip this.

### Wire MapOverlayControls into MidPaneMap

MidPaneMap.jsx currently renders the Leaflet container. The overlay controls need to
render inside the same positioned div, not inside Leaflet's tile pane.

In MidPaneMap.jsx, the outermost div (position:relative, width/height 100%) should
have the Leaflet container as a child AND accept an optional `overlayControls` prop:

  <div style={{ position:'relative', width:'100%', height:'100%' }}>
    <div ref={mapRef} style={{ width:'100%', height:'100%' }} />
    {overlayControls}
  </div>

In Locations.jsx, pass the MapOverlayControls element as `overlayControls` to
MidPaneMap inside the mapPane useMemo:

  import MapOverlayControls from '../components/Map/MapOverlayControls.jsx'

  const mapPane = useMemo(() => (
    <MidPaneMap
      {...navMapProps}
      contentMode
      schools={loadedSchools}
      layers={layers}
      onLayerToggle={toggleLayer}
      centerOn={contentMapCenter}
      overlayControls={
        <MapOverlayControls
          visibleTypes={visibleTypes}
          onToggle={toggleNavFilter}
          layers={layers}
          onLayerToggle={toggleLayer}
          contentLayerDefs={CONTENT_LAYER_DEFS}
        />
      }
    />
  ), [navMapProps, loadedSchools, layers, toggleLayer, contentMapCenter,
      visibleTypes, toggleNavFilter, CONTENT_LAYER_DEFS])

### Remove navLeftSection1 and navRightSection1 from the nav panes

In Locations.jsx locationNav:

  locationNav.left:  remove the flexShrink:0 borderBottom div that wraps navLeftSection1.
                     Left pane is now just the PlacesCard list (navLeftSection2) with
                     a search bar above it (see Part 2).

  locationNav.right: remove the flexShrink:0 borderBottom div that wraps navRightSection1.
                     Right pane is now just ConstituencyPane (navRightSection2) with
                     a search bar above it (see Part 2).

navLeftSection1 and navRightSection1 variables can be deleted from Locations.jsx once
the overlayControls wiring is confirmed.

Also remove navLeftSection1/navRightSection1 from the MobileNavPanel sections in the
mobilePanelEl block (if that block still exists post drawer sprint -- if it has been
removed, skip this).

---

## Part 2 -- Search bars in nav panes

### Current state

LocationSearch is imported in MidPaneTabs.jsx and rendered in the tab strip:
  {onPlaceSelect && <LocationSearch onPlaceSelect={onPlaceSelect} onGeoSelect={onGeoSelect} />}

It handles both place search and geo (location) search in one component.

### Change 1: Remove LocationSearch from MidPaneTabs

In MidPaneTabs.jsx:
  - Remove the {onPlaceSelect && <LocationSearch ... />} line from the tab strip.
  - Remove the `onPlaceSelect` and `onGeoSelect` props from MidPaneTabs.
  - Remove the LocationSearch import.

In Locations.jsx:
  - Remove `onPlaceSelect={handlePlaceSelect}` and `onGeoSelect={handleSelect}`
    from the MidPaneTabs JSX.

### Change 2: Add place search to left nav pane

Read LocationSearch.jsx first to understand its current API and whether it can be
scoped. LocationSearch currently searches both places and geo entries.

For the left pane, we want place search only (newplace.csv entries -- cities, towns,
villages, hamlets). The existing onPlaceSelect handler (handlePlaceSelect) selects
a place and triggers map navigation. This is correct for the left pane.

If LocationSearch accepts a `mode` prop or similar to restrict results to places only,
use it. If not, pass onPlaceSelect but not onGeoSelect -- the component will only
trigger place results. Check the component source and use the simplest approach that
scopes results to places.

In Locations.jsx locationNav.left:
  - Add LocationSearch above the PlacesCard list, inside the flex column:

    left: (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ flexShrink:0, padding:'8px 10px', borderBottom:'1px solid #f1f3f5' }}>
          <LocationSearch onPlaceSelect={handlePlaceSelect} placesOnly />
        </div>
        <div style={{ flex:1, overflow:'auto' }}>
          {navLeftSection2}
        </div>
      </div>
    )

  (If LocationSearch does not accept a placesOnly prop, just pass onPlaceSelect and
  leave onGeoSelect undefined -- geo results simply won't trigger.)

### Change 3: Add constituency/ward search to right nav pane

For the right pane, we want to search constituencies and wards. ConstituencyPane
already has an internal A-Z strip for navigation. A search bar above it should filter
the constituency list by name.

Check ConstituencyPane.jsx -- if it already accepts a `filter` or `search` prop, use
it. If not, add a controlled search input above ConstituencyPane that passes a
`filterText` prop down, and add filtering inside ConstituencyPane.

ConstituencyPane currently renders an A-Z strip + two-panel list/ward view.
Adding a text filter: when filterText is non-empty, bypass the A-Z strip and show
a filtered flat list of constituency names that match. When filterText is empty,
show the normal A-Z view.

In Locations.jsx locationNav.right:
  - Add a local search state (constituencySearch) or pass it as a prop:

    right: (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ flexShrink:0, padding:'8px 10px', borderBottom:'1px solid #f1f3f5' }}>
          <input
            type="search"
            placeholder="Search constituencies..."
            value={constituencySearch}
            onChange={e => setConstituencySearch(e.target.value)}
            style={{
              width:'100%', boxSizing:'border-box',
              padding:'5px 8px', borderRadius:4,
              border:'1px solid #ced4da', fontSize:13,
            }}
          />
        </div>
        <div style={{ flex:1, overflow:'auto' }}>
          <ConstituencyPane
            ...existing props...
            filterText={constituencySearch}
          />
        </div>
      </div>
    )

  Add `const [constituencySearch, setConstituencySearch] = useState('')` near other
  nav state in Locations.jsx.

In ConstituencyPane.jsx:
  - Accept optional `filterText` prop (default '').
  - When filterText is non-empty (trimmed), render a filtered flat list:
    filter the constituencies list (whatever the current data structure is) by
    name.toLowerCase().includes(filterText.toLowerCase()).
    Show as a simple scrollable list with the same click handler as the normal A-Z view.
  - When filterText is empty, render the existing A-Z + two-panel view unchanged.

---

## Constraints

- No TypeScript. ES modules throughout.
- No new npm packages.
- CONTENT_LAYER_DEFS remains defined in Locations.jsx (do not move to a separate
  module in this sprint). Pass it as a prop to MapOverlayControls.
- The overlays must not interfere with Leaflet map interaction -- pointer-events on
  the overlay divs should be auto (default), not none. Leaflet handles its own tiles
  underneath.
- Leaflet zoom position change is optional -- only do it if top-left is clearly
  conflicted. If zoom is already bottom-left, skip.
- Desktop only concern for overlay controls -- on mobile the overlays will still
  render on the map tab which is fine, the drawer handles the nav pane content.

---

## Test checklist

1. Nav/map context (paneMode === 'nav'):
   - Left pane: search bar at top, PlacesCard list below. No type filter buttons in pane. [PASS]
   - Right pane: search bar at top, ConstituencyPane below. No layer toggles in pane. [PASS]
   - Map surface: City/Town/Village/Hamlet buttons top-left of map. [PASS]
   - Map surface: Constituency/Ward + layer pills top-right of map. [PASS]
   - Toggle buttons still control map markers (visibleTypes state wired). [PASS]
   - Layer pills still control map layers. [PASS]

2. Place search (left pane):
   - Typing in left search produces place suggestions. [PASS]
   - Selecting a place selects it and navigates map. [PASS]

3. Constituency search (right pane):
   - Typing filters constituency list by name. [PASS]
   - Clearing search restores A-Z view. [PASS]

4. MidPaneTabs tab strip:
   - No LocationSearch component in tab strip. Tab labels and expand arrow only. [PASS]

5. Other tabs (Groups / News / Civic):
   - Switching tab changes pane content as before. [PASS]
   - No breakage in those panes. [PASS]

6. Desktop -- left/right columns visible, overlays on map, search bars in panes. [PASS]
7. Mobile -- map tab shows overlays on map surface. Drawer handles still work. [PASS]
