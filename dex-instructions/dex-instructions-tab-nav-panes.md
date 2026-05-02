# Dex Instruction File: Tab-Specific Left/Right Nav Panes
> Sprint: Tab Nav Panes
> Prereq: Tab rename sprint complete (Groups/News/Local Traders/Civic/Map/Info tabs live)
> Execute top to bottom. Stop and confirm with Phil after each numbered section.

---

## Context

Locations.jsx currently renders fixed left (PlacesCard) and right (ConstituencyPane) panes
regardless of which mid-pane tab is active. The new behaviour is:

- Map tab and Info tab: keep location nav exactly as today (PlacesCard + ConstituencyPane)
- Groups / News / Local Traders / Civic tabs: swap left and right panes to tab-specific nav
  components -- but ONLY when a location is committed (contentContext slug is set).
  If no location is committed, both panes show a nudge: "Select a location first using Map or Info."

A location is "committed" when: contentContext?.slug is truthy. This is already computed
in Locations.jsx from the existing contentContext useMemo.

---

## Section 1 -- Create TabNavs directory and 8 nav components

Create directory: src/components/TabNavs/

Create all 8 files below. Use plain inline styles (no CSS modules needed -- these are nav
panels, compact content). All ASCII characters, straight quotes, no Unicode decoratives.

### 1a. src/components/TabNavs/GroupsLeftNav.jsx

Purpose: drives the filter on GroupsTab (replaces the internal filter strip in GroupsTab).
Receives `filter` (string) and `onFilterChange` (function) as props.

```jsx
/**
 * @file GroupsLeftNav.jsx
 * @description Left nav for the Groups tab. Filter selector: All / Groups /
 *   Local Spaces / Community Networks. Drives GroupsTab filter from outside.
 * Props: filter, onFilterChange
 */
export default function GroupsLeftNav({ filter, onFilterChange }) {
  const FILTERS = [
    { key: 'all',      label: 'All' },
    { key: 'groups',   label: 'Groups' },
    { key: 'spaces',   label: 'Local Spaces' },
    { key: 'networks', label: 'Community Networks' },
  ]
  return (
    <div style={{ padding: 8 }}>
      <p style={head}>Filter</p>
      {FILTERS.map(f => (
        <button
          key={f.key}
          style={filter === f.key ? { ...btn, ...btnActive } : btn}
          onClick={() => onFilterChange(f.key)}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
const head    = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 8px 0', letterSpacing: '0.05em' }
const btn     = { display: 'block', width: '100%', textAlign: 'left', fontSize: 12, padding: '5px 8px', marginBottom: 3, border: '1px solid #dee2e6', borderRadius: 4, background: '#fff', color: '#495057', cursor: 'pointer' }
const btnActive = { background: '#1971c2', color: '#fff', borderColor: '#1971c2' }
```

### 1b. src/components/TabNavs/GroupsRightNav.jsx

Purpose: national/geo-context groups visible at the current location scope.
Stub for now -- placeholder with explanatory text.

```jsx
/**
 * @file GroupsRightNav.jsx
 * @description Right nav for the Groups tab. Shows national networks and
 *   geo-content groups relevant to the current location scope.
 * Props: locationType, locationSlug (for future data fetch)
 */
export default function GroupsRightNav({ locationType, locationSlug }) {
  return (
    <div style={{ padding: 8 }}>
      <p style={head}>National & Regional</p>
      <p style={dim}>National networks and regional groups relevant to this location will appear here.</p>
    </div>
  )
}
const head = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 8px 0', letterSpacing: '0.05em' }
const dim  = { fontSize: 12, color: '#adb5bd', margin: 0, lineHeight: 1.5 }
```

### 1c. src/components/TabNavs/NewsLeftNav.jsx

Purpose: news source selector. Each source has an include checkbox. Sources are
seeded locally for now -- no API call. State is internal to this component for now;
will be lifted to Locations.jsx when NewsTab is built.

```jsx
/**
 * @file NewsLeftNav.jsx
 * @description Left nav for the News tab. News source list with include
 *   checkboxes. Drives the NewsTab aggregator (wired when NewsTab is built).
 */
import { useState } from 'react'

const DEFAULT_SOURCES = [
  { id: 'bbc',        label: 'BBC News',         included: true  },
  { id: 'guardian',   label: 'The Guardian',      included: true  },
  { id: 'itv',        label: 'ITV News',          included: false },
  { id: 'sky',        label: 'Sky News',          included: false },
  { id: 'localrss',   label: 'Local RSS (area)',  included: true  },
]

export default function NewsLeftNav() {
  const [sources, setSources] = useState(DEFAULT_SOURCES)

  function toggle(id) {
    setSources(prev => prev.map(s => s.id === id ? { ...s, included: !s.included } : s))
  }

  return (
    <div style={{ padding: 8 }}>
      <p style={head}>News Sources</p>
      {sources.map(s => (
        <label key={s.id} style={row}>
          <input
            type="checkbox"
            checked={s.included}
            onChange={() => toggle(s.id)}
            style={{ marginRight: 6 }}
          />
          <span style={{ fontSize: 12, color: '#495057' }}>{s.label}</span>
        </label>
      ))}
    </div>
  )
}
const head = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 8px 0', letterSpacing: '0.05em' }
const row  = { display: 'flex', alignItems: 'center', marginBottom: 6, cursor: 'pointer' }
```

### 1d. src/components/TabNavs/NewsRightNav.jsx

Purpose: keyword/topic selector. Tags the user can toggle to filter the news feed.
State is internal for now.

```jsx
/**
 * @file NewsRightNav.jsx
 * @description Right nav for the News tab. Keyword and topic selector.
 *   Tag chips the user toggles to filter the news aggregator.
 */
import { useState } from 'react'

const DEFAULT_TOPICS = [
  'Housing', 'Transport', 'Environment', 'Health', 'Education',
  'Planning', 'Crime', 'Local Politics', 'Economy', 'Community',
]

export default function NewsRightNav() {
  const [active, setActive] = useState([])

  function toggle(t) {
    setActive(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  return (
    <div style={{ padding: 8 }}>
      <p style={head}>Topics</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {DEFAULT_TOPICS.map(t => (
          <button
            key={t}
            style={active.includes(t) ? { ...chip, ...chipActive } : chip}
            onClick={() => toggle(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {active.length > 0 && (
        <button style={clearBtn} onClick={() => setActive([])}>Clear all</button>
      )}
    </div>
  )
}
const head     = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 8px 0', letterSpacing: '0.05em' }
const chip     = { fontSize: 11, padding: '3px 8px', border: '1px solid #dee2e6', borderRadius: 12, background: '#fff', color: '#495057', cursor: 'pointer' }
const chipActive = { background: '#1971c2', color: '#fff', borderColor: '#1971c2' }
const clearBtn = { marginTop: 8, fontSize: 11, padding: '3px 8px', border: 'none', background: 'none', color: '#1971c2', cursor: 'pointer', display: 'block' }
```

### 1e. src/components/TabNavs/TradersLeftNav.jsx

Purpose: trader type selector + text search. State internal for now.

```jsx
/**
 * @file TradersLeftNav.jsx
 * @description Left nav for the Local Traders tab. Trade type selector
 *   and text search. Drives the traders listing when built.
 */
import { useState } from 'react'

const TYPES = [
  'All', 'Food & Drink', 'Retail', 'Services',
  'Health & Beauty', 'Trades & Repairs', 'Other',
]

export default function TradersLeftNav() {
  const [activeType, setActiveType] = useState('All')
  const [search, setSearch]         = useState('')

  return (
    <div style={{ padding: 8 }}>
      <p style={head}>Type</p>
      {TYPES.map(t => (
        <button
          key={t}
          style={activeType === t ? { ...btn, ...btnActive } : btn}
          onClick={() => setActiveType(t)}
        >
          {t}
        </button>
      ))}
      <p style={{ ...head, marginTop: 12 }}>Search</p>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Trader name..."
        style={input}
      />
    </div>
  )
}
const head    = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 8px 0', letterSpacing: '0.05em' }
const btn     = { display: 'block', width: '100%', textAlign: 'left', fontSize: 12, padding: '4px 8px', marginBottom: 3, border: '1px solid #dee2e6', borderRadius: 4, background: '#fff', color: '#495057', cursor: 'pointer' }
const btnActive = { background: '#e8590c', color: '#fff', borderColor: '#e8590c' }
const input   = { width: '100%', fontSize: 12, padding: '5px 8px', border: '1px solid #dee2e6', borderRadius: 4, boxSizing: 'border-box' }
```

### 1f. src/components/TabNavs/TradersRightNav.jsx

Purpose: featured/national trader slots. Paid positions -- stub for now.

```jsx
/**
 * @file TradersRightNav.jsx
 * @description Right nav for the Local Traders tab. Featured and national
 *   trader slots (paid positions). Stub pending commercial model build.
 */
export default function TradersRightNav() {
  return (
    <div style={{ padding: 8 }}>
      <p style={head}>Featured Traders</p>
      <p style={dim}>National and featured trader listings will appear here.</p>
    </div>
  )
}
const head = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 8px 0', letterSpacing: '0.05em' }
const dim  = { fontSize: 12, color: '#adb5bd', margin: 0, lineHeight: 1.5 }
```

### 1g. src/components/TabNavs/CivicLeftNav.jsx

Purpose: constituency committee section + petitions and activist group links.
Links into existing CommitteeTab content. For now renders section headers with
stub links. The committee section will surface the committed constituency committee.

```jsx
/**
 * @file CivicLeftNav.jsx
 * @description Left nav for the Civic tab. Constituency committee section
 *   and civic action links (petitions, activist groups).
 * Props: locationType, locationSlug
 */
export default function CivicLeftNav({ locationType, locationSlug }) {
  return (
    <div style={{ padding: 8 }}>
      <p style={head}>Constituency Committee</p>
      <p style={dim}>
        {locationType === 'constituency'
          ? 'Your constituency committee and forum is in the main panel.'
          : 'Navigate to a constituency to access its committee.'}
      </p>
      <p style={{ ...head, marginTop: 12 }}>Civic Actions</p>
      <p style={{ ...dim, marginBottom: 6 }}>Petitions -- coming soon</p>
      <p style={dim}>Activist Groups -- coming soon</p>
    </div>
  )
}
const head = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 8px 0', letterSpacing: '0.05em' }
const dim  = { fontSize: 12, color: '#adb5bd', margin: '0 0 4px 0', lineHeight: 1.5 }
```

### 1h. src/components/TabNavs/CivicRightNav.jsx

Purpose: higher-level civic bodies relevant to the current location scope
(county council, regional assembly, national bodies). Stub for now.

```jsx
/**
 * @file CivicRightNav.jsx
 * @description Right nav for the Civic tab. Higher-level civic bodies
 *   relevant to the current location scope.
 * Props: locationType, locationSlug
 */
export default function CivicRightNav({ locationType, locationSlug }) {
  return (
    <div style={{ padding: 8 }}>
      <p style={head}>Local Authority</p>
      <p style={dim}>County council, regional and national civic bodies relevant to this location -- coming soon.</p>
    </div>
  )
}
const head = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 8px 0', letterSpacing: '0.05em' }
const dim  = { fontSize: 12, color: '#adb5bd', margin: 0, lineHeight: 1.5 }
```

---

## Section 2 -- Refactor GroupsTab to receive filter as prop

File: src/components/Groups/GroupsTab.jsx

GroupsTab currently manages filter state internally AND renders a filter strip.
Both need to change: filter state moves to Locations.jsx, filter strip is removed
(it now lives in GroupsLeftNav).

Changes:
1. Remove the `const [filter, setFilter] = useState('all')` line
2. Remove the FILTERS constant and the filter strip JSX block (the `<div style={filterStrip}>` section)
3. Change the function signature to accept filter as a prop:
   `export default function GroupsTab({ locationType, locationSlug, filter = 'all' }) {`
4. Remove the `filterStrip` entry from the inline styles object at the bottom

The rest of the component (data fetch, Section render, GroupCard) is unchanged.

---

## Section 3 -- Update Locations.jsx

File: src/pages/Locations.jsx

### 3a. Add imports at the top (after existing TabStubs imports)

```js
import GroupsLeftNav   from '../components/TabNavs/GroupsLeftNav.jsx'
import GroupsRightNav  from '../components/TabNavs/GroupsRightNav.jsx'
import NewsLeftNav     from '../components/TabNavs/NewsLeftNav.jsx'
import NewsRightNav    from '../components/TabNavs/NewsRightNav.jsx'
import TradersLeftNav  from '../components/TabNavs/TradersLeftNav.jsx'
import TradersRightNav from '../components/TabNavs/TradersRightNav.jsx'
import CivicLeftNav    from '../components/TabNavs/CivicLeftNav.jsx'
import CivicRightNav   from '../components/TabNavs/CivicRightNav.jsx'
```

### 3b. Add groupsFilter state

Add alongside the other useState declarations near the top of the component:

```js
const [groupsFilter, setGroupsFilter] = useState('all')
```

### 3c. Add NavNudge inline component

Add this constant just before the return statement (outside the component function
is fine -- it is stateless):

```js
const NavNudge = () => (
  <div style={{ padding: 12 }}>
    <p style={{ fontSize: 12, color: '#adb5bd', lineHeight: 1.5, margin: 0 }}>
      Select a location first using the Map or Info tab.
    </p>
  </div>
)
```

### 3d. Add isLocationSet derived value

Add just before the return statement:

```js
const isLocationSet = !!contentContext?.slug
```

### 3e. Add activeLeftPane and activeRightPane computed values

Add just before the return statement, after isLocationSet:

```js
const TAB_NAV_TABS = ['groups', 'news', 'traders', 'civic']
const useTabNav    = TAB_NAV_TABS.includes(midTab)

const activeLeftPane = useTabNav && isLocationSet
  ? midTab === 'groups'  ? <GroupsLeftNav  filter={groupsFilter} onFilterChange={setGroupsFilter} />
  : midTab === 'news'    ? <NewsLeftNav />
  : midTab === 'traders' ? <TradersLeftNav />
  : midTab === 'civic'   ? <CivicLeftNav   locationType={contentContext?.type} locationSlug={contentContext?.slug} />
  : null
  : useTabNav && !isLocationSet
  ? <NavNudge />
  : (
    <PlacesCard
      grouped={grouped}
      scopeKey={scopeKey}
      onPlaceSelect={handleLeftPlaceSelect}
      onCommitPlace={handlePlaceSelect}
      paneTitle={`Places in ${scopeLabel}`}
      focusPlace={pendingPlace}
      onWalkerModeChange={setWalkerMode}
    />
  )

const activeRightPane = useTabNav && isLocationSet
  ? midTab === 'groups'  ? <GroupsRightNav  locationType={contentContext?.type} locationSlug={contentContext?.slug} />
  : midTab === 'news'    ? <NewsRightNav />
  : midTab === 'traders' ? <TradersRightNav />
  : midTab === 'civic'   ? <CivicRightNav   locationType={contentContext?.type} locationSlug={contentContext?.slug} />
  : null
  : useTabNav && !isLocationSet
  ? <NavNudge />
  : (
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
      onCommitConstituency={(name) => { handleSelect('constituency', name); setRightWalkerMode(false) }}
      pendingConstituency={pendingConstituency}
      pendingWard={pendingWard}
    />
  )
```

### 3f. Replace the hardcoded leftPane and rightPane props on PageLayout

Find the existing `leftPane={...}` and `rightPane={...}` props on the PageLayout call.
Replace both with:

```jsx
leftPane={activeLeftPane}
rightPane={activeRightPane}
```

The PlacesCard and ConstituencyPane JSX that was previously inline in those props
is now inside the activeLeftPane/activeRightPane computed values above -- do not
duplicate it.

### 3g. Pass groupsFilter to GroupsTab

Find the existing groupsPane prop on MidPaneTabs:

```jsx
groupsPane={<GroupsTab locationType={contentContext?.type} locationSlug={contentContext?.slug} />}
```

Change to:

```jsx
groupsPane={<GroupsTab locationType={contentContext?.type} locationSlug={contentContext?.slug} filter={groupsFilter} />}
```

---

## Section 4 -- Verify and build

1. Run: npm run build
2. Fix any import or prop errors.
3. Start: node server.js
4. Confirm to Phil:
   - Map tab: left = PlacesCard, right = ConstituencyPane (unchanged)
   - Info tab: same as Map
   - Groups tab with no location selected: both panes show nudge
   - Groups tab with location selected: left = filter buttons, right = "National & Regional" stub
   - News tab with location selected: left = source checkboxes, right = topic chips
   - Traders tab with location selected: left = type selector + search, right = "Featured Traders" stub
   - Civic tab with location selected: left = committee/petitions nav, right = "Local Authority" stub
   - GroupsTab filter strip is gone from mid pane -- filter now driven from left nav

---

## Notes

- All 8 TabNav components are stubs or minimal functional. Full data wiring happens
  per-tab in later sprints.
- GroupsLeftNav is the only component that needs real wiring now (drives GroupsTab filter).
- News/Traders/Civic left+right navs hold their own state for now. Lift to Locations.jsx
  when the corresponding mid-pane content is built.
- No server.js changes in this sprint.
- Standard deploy: npm run build -> git add . -> git commit -> git push
