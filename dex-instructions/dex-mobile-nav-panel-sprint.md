# DEX INSTRUCTION FILE -- Mobile Nav Panel Sprint
# Author: Ali | Date: 2026-05-05
# Status: READY FOR EXECUTION

---

## Goal

Replace the current two-drawer mobile approach (separate Places / Filters drawers) with a single
unified MobileNavPanel. The panel is always structured the same way:

  GREEN bar at top  = left pane content  ("Places" side)
  BLUE bar below    = right pane content ("Admin / Political" side)

Each bar is a collapsible header. Under each header, each logical section of that pane is a
further collapsible. This gives users immediate recognition of what is available without having
to open multiple drawers or infer causal chains.

FIXED RULES -- these never change, never have exceptions:
  - Left pane content is ALWAYS at the top of the panel, under GREEN.
  - Right pane content is ALWAYS at the bottom of the panel, under BLUE.
  - If a pane has no content in the current state, its bar is omitted entirely.

Colours (use exactly):
  GREEN : #2E7D32  (UKCP brand green, matches primaryColor shade 8)
  BLUE  : #1864ab  (Mantine blue-8 equivalent)

Bar style: slim accent header (not full-bleed heavy block). Suggest: 28px height,
background tinted at 10% opacity of the bar colour, left border 3px solid bar colour,
label text in bar colour, chevron right-aligned. Collapsed state shows bar only.

---

## 1. New Component: MobileNavPanel.jsx

Path: src/components/Layout/MobileNavPanel.jsx

Props interface:
  leftLabel    : string | null       -- header text for the green bar (omit bar if null)
  leftSections : Array<Section> | null  -- sections under green bar
  rightLabel   : string | null       -- header text for the blue bar (omit bar if null)
  rightSections: Array<Section> | null  -- sections under blue bar

  Section shape: { label: string, content: ReactNode, defaultOpen?: boolean }

Behaviour:
  - PanelBar (green or blue) is always collapsed by default on mount.
  - Each Section under a bar defaults to open (defaultOpen: true unless specified).
  - Use plain React state (useState) -- no Mantine accordion. Keeps it self-contained.
  - All styling inline or module.css -- no Mantine components in this file.
  - Only renders on mobile (below sm breakpoint = 48em). On desktop display:none.

Structure sketch (no framework dependency):

  <div class="mobileNavPanel">
    {leftLabel && (
      <div>
        <PanelBar colour={GREEN} label={leftLabel} open={leftOpen} onToggle={...} />
        {leftOpen && leftSections.map(s => <Section ... />)}
      </div>
    )}
    {rightLabel && (
      <div>
        <PanelBar colour={BLUE} label={rightLabel} open={rightOpen} onToggle={...} />
        {rightOpen && rightSections.map(s => <Section ... />)}
      </div>
    )}
  </div>

Section sub-collapsible bar style: 24px, plain #f8f9fa background, #495057 text,
light bottom border when open. Simpler than the main PanelBar.

---

## 2. PageLayout.jsx Changes

Add new prop: mobilePanel (ReactNode | null)

In the midZone JSX, above the midCol div, add:

  {mobilePanel && (
    <div className={styles.mobilePanelSlot}>
      {mobilePanel}
    </div>
  )}

In PageLayout.module.css, add:

  .mobilePanelSlot {
    display: none;
  }
  @media (max-width: 48em) {
    .mobilePanelSlot {
      display: block;
      width: 100%;
      flex-shrink: 0;
    }
  }

The midZone is already flex-direction:column on mobile (leftCol/rightCol hidden via existing
media queries). mobilePanelSlot sits above midCol in that column flow.

Do NOT remove the existing leftCol/rightCol mobile hiding CSS -- desktop rendering is unchanged.

---

## 3. Locations.jsx Changes

### 3a. Extract locationNav.left into sections array

Replace the current locationNav.left JSX blob with two named variables:

  const navLeftSection1 = (
    <div style={{ padding: '8px 10px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {PLACE_TYPES.map(type => (
        <MapTypeToggle key={type} type={type} active={visibleTypes[type]} onToggle={toggleNavFilter} />
      ))}
    </div>
  )

  const navLeftSection2 = (
    <PlacesCard
      grouped={grouped}
      scopeKey={scopeKey}
      onPlaceSelect={handleLeftPlaceSelect}
      paneTitle={`Places in ${scopeLabel}`}
      focusPlace={pendingPlace}
      onWalkerModeChange={setWalkerMode}
    />
  )

Reassemble locationNav.left as before (both stacked in a flex column div) -- desktop unchanged.

### 3b. Extract locationNav.right into sections array

  const navRightSection1 = (
    <div style={{ padding: '8px 10px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {POLITICAL_TYPES.map(type => (
          <MapTypeToggle key={type} type={type} active={visibleTypes[type]} onToggle={toggleNavFilter} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6, paddingTop: 6, borderTop: '1px solid #f8f9fa' }}>
        {CONTENT_LAYER_DEFS.map(def => { ... existing layer button JSX ... })}
      </div>
    </div>
  )

  const navRightSection2 = (
    <ConstituencyPane
      containment={containment}
      path={path}
      hierarchy={hierarchy}
      wards={wards}
      select={handleSelect}
      selectMany={handleSelectMany}
      paneTitle={`Constituencies with wards in ${scopeLabel}`}
      onWalkerModeChange={(active) => setRightWalkerMode(active)}
      walkerMode={rightWalkerMode}
      onConstituencyPending={(name) => { setPendingConstituency(name); setPendingWard(null) }}
      onWardPending={(con, w) => { setPendingConstituency(con); setPendingWard(w) }}
      pendingConstituency={pendingConstituency}
      pendingWard={pendingWard}
    />
  )

Reassemble locationNav.right as before -- desktop unchanged.

### 3c. Compute mobilePanel

Add this block near the bottom of Locations.jsx, before the return statement,
alongside where activeLeftPane / activeRightPane are computed:

  import MobileNavPanel from '../components/Layout/MobileNavPanel.jsx'

  let mobilePanelEl = null

  if (activeNetwork === 'at-the-school-gates' && midTab === 'groups') {
    mobilePanelEl = (
      <MobileNavPanel
        leftLabel="Schools Near You"
        leftSections={[{ label: 'School List', content: activeLeftPane, defaultOpen: true }]}
        rightLabel="Groups"
        rightSections={[{ label: 'Filters & Networks', content: activeRightPane, defaultOpen: true }]}
      />
    )
  } else if (paneMode === 'nav' || midTab === 'map') {
    mobilePanelEl = (
      <MobileNavPanel
        leftLabel={`Places in ${scopeLabel}`}
        leftSections={[
          { label: 'Place Filters', content: navLeftSection1, defaultOpen: true },
          { label: 'Places',        content: navLeftSection2, defaultOpen: true },
        ]}
        rightLabel="Explore"
        rightSections={[
          { label: 'Map Layers',     content: navRightSection1, defaultOpen: true },
          { label: 'Constituencies', content: navRightSection2, defaultOpen: true },
        ]}
      />
    )
  } else if (midTab === 'groups') {
    mobilePanelEl = (
      <MobileNavPanel
        leftLabel={null}
        leftSections={null}
        rightLabel="Groups"
        rightSections={[{ label: 'Filters & Networks', content: activeRightPane, defaultOpen: true }]}
      />
    )
  } else if (midTab === 'news') {
    mobilePanelEl = (
      <MobileNavPanel
        leftLabel="News"
        leftSections={[{ label: 'Sources', content: activeLeftPane, defaultOpen: true }]}
        rightLabel="News"
        rightSections={[{ label: 'Options', content: activeRightPane, defaultOpen: true }]}
      />
    )
  } else if (midTab === 'traders') {
    mobilePanelEl = (
      <MobileNavPanel
        leftLabel="Traders"
        leftSections={[{ label: 'Filter', content: activeLeftPane, defaultOpen: true }]}
        rightLabel="Traders"
        rightSections={[{ label: 'Options', content: activeRightPane, defaultOpen: true }]}
      />
    )
  } else if (midTab === 'civic') {
    mobilePanelEl = (
      <MobileNavPanel
        leftLabel="Civic"
        leftSections={[{ label: 'Navigation', content: activeLeftPane, defaultOpen: true }]}
        rightLabel="Civic"
        rightSections={[{ label: 'Options', content: activeRightPane, defaultOpen: true }]}
      />
    )
  }

### 3d. Pass mobilePanel to PageLayout

In the Locations.jsx return:

  <PageLayout
    ...existing props...
    mobilePanel={mobilePanelEl}
  />

---

---

## 5. Desktop Verification

After build, desktop layout must be pixel-identical to pre-sprint. Spot check:
  - Nav mode: left pane shows place filters + places list. Right pane shows map layers + constituencies.
  - Tab: groups, news, traders, civic -- left/right panes render as before.
  - School Gates: SchoolsLeftNav in left, GroupsRightNav in right.

Mobile verification (resize browser to < 768px or use DevTools mobile viewport):
  - Nav mode: green bar visible (collapsed), blue bar visible (collapsed).
  - Tap green bar -- expands. Place Filters collapsible visible and functional.
  - Tap Place Filters -- collapses/expands. Places collapsible visible.
  - Tap blue bar -- expands. Map Layers and Constituencies collapsibles visible.
  - Mid pane (map/tab content) renders below the panel.
  - leftCol and rightCol not visible (existing CSS behaviour preserved).
  - Groups tab (no School Gates): green bar absent, blue bar present.

---

## 6. Build Command

  cd C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP
  npm run build

0 errors 0 warnings required. Report DELIVERY.md with results.
