# Dex Instructions -- At the School Gates POC

## Objective

When a user selects the "At the School Gates" community network tile, the entire
three-pane layout pivots to serve that network. Left pane becomes a school chooser,
mid pane becomes school-scoped content, right pane becomes school detail + actions.
This is a self-contained POC using mock data. No DB calls for school data in this run.

---

## Files to create

1. `src/data/mock-schools.js`
2. `src/components/SchoolGates/SchoolsLeftNav.jsx`
3. `src/components/SchoolGates/SchoolGatesMid.jsx`
4. `src/components/SchoolGates/SchoolsRightNav.jsx`

## Files to modify

5. `src/components/Groups/CommunityNetworksSection.jsx`
6. `src/components/TabNavs/GroupsRightNav.jsx`
7. `src/pages/Locations.jsx`

---

## 1. src/data/mock-schools.js

Create this file with the exported array. No imports required.

```js
/**
 * @file src/data/mock-schools.js
 * @description Mock school data (GIAS extract) for At the School Gates POC.
 * Fields: urn, la, name, type, type_group, phase, gender,
 *         street, town, postcode, website, phone, head, head_role,
 *         ward_gss, ward_name, con_gss, con_name
 */
export const MOCK_SCHOOLS = [
  {
    urn: '100045', la: 'Camden',
    name: "St Patrick's Catholic Primary School",
    type: 'Voluntary aided school', type_group: 'Local authority maintained schools',
    phase: 'Primary', gender: 'Mixed',
    street: 'Holmes Road', town: 'London', postcode: 'NW5 3AH',
    website: 'http://www.stpatricks.camden.sch.uk/', phone: '02072671200',
    head: 'Miss Chloe Toop', head_role: 'Headteacher',
    ward_gss: 'E05013664', ward_name: 'Kentish Town South',
    con_gss: 'E14001290', con_name: 'Holborn and St Pancras',
  },
  {
    urn: '100046', la: 'Camden',
    name: "St Paul's Church of England Primary School",
    type: 'Voluntary aided school', type_group: 'Local authority maintained schools',
    phase: 'Primary', gender: 'Mixed',
    street: 'Elsworthy Road', town: 'London', postcode: 'NW3 3DS',
    website: 'http://www.stpauls.camden.sch.uk', phone: '02077227381',
    head: 'Mr Clive Hale', head_role: 'Headteacher',
    ward_gss: 'E05013667', ward_name: 'Primrose Hill',
    con_gss: 'E14001265', con_name: 'Hampstead and Highgate',
  },
  {
    urn: '100047', la: 'Camden',
    name: 'St Eugene de Mazenod Roman Catholic Primary School',
    type: 'Voluntary aided school', type_group: 'Local authority maintained schools',
    phase: 'Primary', gender: 'Mixed',
    street: 'Mazenod Avenue', town: 'London', postcode: 'NW6 4LS',
    website: 'http://www.steugene.camden.sch.uk/', phone: '02076244837',
    head: 'Ms Rebecca Smith', head_role: 'Headteacher',
    ward_gss: 'E05013665', ward_name: 'Kilburn',
    con_gss: 'E14001265', con_name: 'Hampstead and Highgate',
  },
  {
    urn: '100049', la: 'Camden',
    name: 'Haverstock School',
    type: 'Community school', type_group: 'Local authority maintained schools',
    phase: 'Secondary', gender: 'Mixed',
    street: '24 Haverstock Hill', town: 'London', postcode: 'NW3 2BQ',
    website: 'http://www.haverstock.camden.sch.uk/', phone: '02072670975',
    head: 'Ms Katie Metselaar', head_role: 'Headteacher',
    ward_gss: 'E05013660', ward_name: 'Haverstock',
    con_gss: 'E14001290', con_name: 'Holborn and St Pancras',
  },
  {
    urn: '100052', la: 'Camden',
    name: 'Hampstead School',
    type: 'Community school', type_group: 'Local authority maintained schools',
    phase: 'Secondary', gender: 'Mixed',
    street: 'Westbere Road', town: 'London', postcode: 'NW2 3RT',
    website: 'http://www.hampsteadschool.org.uk/', phone: '02077948133',
    head: 'Mr Matthew Sadler', head_role: 'Head',
    ward_gss: 'E05013656', ward_name: 'Fortune Green',
    con_gss: 'E14001265', con_name: 'Hampstead and Highgate',
  },
  {
    urn: '100060', la: 'Camden',
    name: "Children's Hospital School at Gt Ormond Street and UCH",
    type: 'Foundation special school', type_group: 'Special schools',
    phase: 'Not applicable', gender: 'Mixed',
    street: 'Great Ormond Street', town: 'London', postcode: 'WC1N 3JH',
    website: 'https://www.goshschool.org/', phone: '02078138269',
    head: 'Ms Neela Moorghen', head_role: 'Headteacher',
    ward_gss: 'E05013662', ward_name: 'Holborn & Covent Garden',
    con_gss: 'E14001290', con_name: 'Holborn and St Pancras',
  },
  {
    urn: '100061', la: 'Camden',
    name: "St Christopher's School",
    type: 'Other independent school', type_group: 'Independent schools',
    phase: 'Not applicable', gender: 'Girls',
    street: '32 Belsize Lane', town: 'London', postcode: 'NW3 5AE',
    website: 'www.stchristophers.london', phone: '02074351521',
    head: 'Mr Mark Maddocks', head_role: 'Headteacher',
    ward_gss: 'E05013652', ward_name: 'Belsize',
    con_gss: 'E14001265', con_name: 'Hampstead and Highgate',
  },
  {
    urn: '100062', la: 'Camden',
    name: "St Margaret's School",
    type: 'Other independent school', type_group: 'Independent schools',
    phase: 'Not applicable', gender: 'Girls',
    street: '18 Kidderpore Gardens', town: 'London', postcode: 'NW3 7SR',
    website: 'http://www.st-margarets.co.uk/', phone: '02074352439',
    head: 'Mr Mark Webster', head_role: 'Principal',
    ward_gss: 'E05013657', ward_name: 'Frognal',
    con_gss: 'E14001265', con_name: 'Hampstead and Highgate',
  },
  {
    urn: '100067', la: 'Camden',
    name: "St Mary's School, Hampstead",
    type: 'Other independent school', type_group: 'Independent schools',
    phase: 'Not applicable', gender: 'Girls',
    street: "47 Fitzjohn's Avenue", town: 'London', postcode: 'NW3 6PG',
    website: 'http://www.stmh.co.uk/', phone: '02074351868',
    head: 'Miss Charlotte Owen', head_role: 'Headteacher',
    ward_gss: 'E05013652', ward_name: 'Belsize',
    con_gss: 'E14001265', con_name: 'Hampstead and Highgate',
  },
  {
    urn: '100070', la: 'Camden',
    name: "St Anthony's School for Boys",
    type: 'Other independent school', type_group: 'Independent schools',
    phase: 'Not applicable', gender: 'Boys',
    street: "90 Fitzjohn's Avenue", town: 'London', postcode: 'NW3 6NP',
    website: 'www.stanthonysprep.org.uk', phone: '02074353597',
    head: 'Mr Richard Berlie', head_role: 'Headmaster',
    ward_gss: 'E05013659', ward_name: 'Hampstead Town',
    con_gss: 'E14001265', con_name: 'Hampstead and Highgate',
  },
  {
    urn: '100073', la: 'Camden',
    name: 'Hampstead Hill School',
    type: 'Other independent school', type_group: 'Independent schools',
    phase: 'Not applicable', gender: 'Mixed',
    street: "St Stephen's", town: 'London', postcode: 'NW3 2PP',
    website: 'www.hampsteadhillschool.co.uk', phone: '02074356262',
    head: 'Mrs A Taylor', head_role: 'Headteacher',
    ward_gss: 'E05013658', ward_name: 'Gospel Oak',
    con_gss: 'E14001265', con_name: 'Hampstead and Highgate',
  },
  {
    urn: '100076', la: 'Camden',
    name: 'South Hampstead High School',
    type: 'Other independent school', type_group: 'Independent schools',
    phase: 'Not applicable', gender: 'Girls',
    street: '3 Maresfield Gardens', town: 'London', postcode: 'NW3 5SS',
    website: 'http://www.shhs.gdst.net/', phone: '02074352899',
    head: 'Mrs Anna Paul', head_role: 'Headmistress',
    ward_gss: 'E05013652', ward_name: 'Belsize',
    con_gss: 'E14001265', con_name: 'Hampstead and Highgate',
  },
  {
    urn: '100081', la: 'Camden',
    name: 'Broadhurst School',
    type: 'Other independent school', type_group: 'Independent schools',
    phase: 'Not applicable', gender: 'Mixed',
    street: '19 Greencroft Gardens', town: 'London', postcode: 'NW6 3LP',
    website: 'www.broadhurstschool.com', phone: '02073284280',
    head: 'Miss Danica Belzer', head_role: 'Head Mistress',
    ward_gss: 'E05013670', ward_name: 'South Hampstead',
    con_gss: 'E14001265', con_name: 'Hampstead and Highgate',
  },
  {
    urn: '100090', la: 'Camden',
    name: 'Southbank International School Hampstead',
    type: 'Other independent school', type_group: 'Independent schools',
    phase: 'Not applicable', gender: 'Mixed',
    street: '16 Netherhall Gardens', town: 'London', postcode: 'NW3 5TH',
    website: 'http://www.southbank.org/', phone: '07753745948',
    head: 'Mr Stuart Bain', head_role: 'Principal',
    ward_gss: 'E05013652', ward_name: 'Belsize',
    con_gss: 'E14001265', con_name: 'Hampstead and Highgate',
  },
  {
    urn: '100165', la: 'Greenwich',
    name: 'Christ Church Church of England Primary School',
    type: 'Voluntary aided school', type_group: 'Local authority maintained schools',
    phase: 'Primary', gender: 'Mixed',
    street: '45 Commerell Street', town: 'London', postcode: 'SE10 0DZ',
    website: 'www.koinoniafederation.com', phone: '02088583974',
    head: 'Victoria Wainwright / Claire Harrison', head_role: 'Federation Co-Headteacher',
    ward_gss: 'E05014076', ward_name: 'East Greenwich',
    con_gss: 'E14001257', con_name: 'Greenwich and Woolwich',
  },
  {
    urn: '100166', la: 'Greenwich',
    name: 'Christ Church Church of England Primary School, Shooters Hill',
    type: 'Voluntary aided school', type_group: 'Local authority maintained schools',
    phase: 'Primary', gender: 'Mixed',
    street: 'Shooters Hill', town: 'London', postcode: 'SE18 3RS',
    website: 'www.ccshprimary.org.uk', phone: '02088564513',
    head: 'Mrs Anne-Marie Bahlol', head_role: 'Headteacher',
    ward_gss: 'E05014089', ward_name: 'Shooters Hill',
    con_gss: 'E14001229', con_name: 'Erith and Thamesmead',
  },
]
```

---

## 2. src/components/SchoolGates/SchoolsLeftNav.jsx

Props: `selectedUrns` (string[]), `focusUrn` (string|null), `onFocusSchool` (urn => void),
`onToggleSchool` (urn => void), `onBack` (() => void)

Behaviour:
- "Back" link at top returns to normal Groups nav (calls onBack)
- "All schools" / "My schools" radio toggle at top
  - All: shows full MOCK_SCHOOLS list filtered by search
  - My: shows only schools where selectedUrns.includes(school.urn)
- Search input filters by school name (case-insensitive includes)
- Scrollable list of school rows below
- Each row: school name (12px), type_group badge (10px, greyed), checkbox on right
  - Checkbox checked = urn is in selectedUrns
  - Clicking anywhere on the row calls onFocusSchool(urn)
  - Clicking checkbox calls onToggleSchool(urn) AND onFocusSchool(urn)
  - Active/focused row (focusUrn === urn) highlighted with left border in green (#2f9e44)
- If "My schools" and selectedUrns is empty: show "No schools selected yet."
- Import MOCK_SCHOOLS from '../../data/mock-schools.js'
- No external dependencies

Style notes -- compact, no full-width buttons:
- Section header: 11px uppercase grey, same pattern as other navs
- Row: padding 5px 8px, fontSize 12px, cursor pointer, borderLeft 2px solid transparent
  (active: borderLeft 2px solid #2f9e44, background #f8f9fa)
- Checkbox: float right, margin 0, cursor pointer
- Type badge: 10px, color #adb5bd, display block, marginTop 1px

---

## 3. src/components/SchoolGates/SchoolGatesMid.jsx

Props: `focusSchool` (school object or null), `selectedUrns` (string[])

This is a stub mid-pane. Renders content area for the selected school.

Layout (top to bottom):
- If no focusSchool: show centred message "Select a school from the left to view its community."
- If focusSchool:
  - Small breadcrumb bar: "At the School Gates > {school.name}" -- 11px grey, padding 8px 16px,
    borderBottom 1px solid #f1f3f5
  - Tab strip with two tabs: "Community" (active) | "Notices" (stub)
    - Same tab style as MidPaneTabs: 12px, green underline on active, grey otherwise
  - Community panel (active tab):
    - Intro line: 12px grey italic -- "Community posts for {school.name} will appear here."
    - Stub post cards x2: grey bordered placeholder cards, 12px text, lorem-style content
      e.g. "Parking on Holmes Road at pick-up time -- can we coordinate a walking bus?"
      and "After-school club spaces available -- contact the office."
    - Each stub card: border 1px solid #dee2e6, borderRadius 6, padding 12, marginBottom 10,
      fontSize 12, color #495057
  - Notices tab (when active): "School notices coming soon." in grey

No fetch calls. Pure mock render.

---

## 4. src/components/SchoolGates/SchoolsRightNav.jsx

Props: `focusSchool` (school object or null), `selectedUrns` (string[]),
`onToggleSchool` (urn => void), `session` (Supabase session or null)

Layout:
- If no focusSchool:
  show "Select a school to view details." in grey, 12px, padding 16px

- If focusSchool:

  **School detail card** (border 1px solid #dee2e6, borderRadius 6, padding 12, margin 10):
  - School name: 13px fontWeight 600, color #212529, margin 0 0 2px
  - Type + phase: 11px color #868e96 -- e.g. "Primary -- Voluntary aided school"
  - Gender: 11px color #868e96
  - Address: 12px color #495057, marginTop 6 -- street, postcode on separate lines
  - Head: 11px color #868e96 -- "{head_role}: {head}"
  - Ward / Constituency: 11px color #adb5bd, marginTop 4
    "Ward: {ward_name} | Con: {con_name}"
  - Joined/Follow button row: if urn in selectedUrns show green "Following" badge,
    else show small "Follow" button (same style as joinBtn in GroupsTab)

  **Divider** -- 1px solid #f1f3f5, margin 10 0

  **Capabilities** section header: 11px uppercase grey "Actions"

  Three action rows (each: padding 6px 0, borderBottom 1px solid #f8f9fa):
  - "Message school" -- 12px, icon placeholder [msg], stub -- onClick: alert('Message school -- coming soon')
  - "Raise a survey" -- 12px, stub -- onClick: alert('Raise a survey -- coming soon')
  - "Organise an event" -- 12px, stub -- onClick: alert('Organise an event -- coming soon')

  Each action row: display flex, alignItems center, gap 8, cursor pointer, color #1971c2,
  fontSize 12. Hover: color #1864ab. No button borders -- just text + icon.
  Use simple unicode placeholders for icons: [msg] = "✉", survey = "?", event = "cal" =
  Actually use plain text labels only -- no emoji (house style). Prefix with a small
  grey right-arrow chevron ">" or just a bullet.

---

## 5. Modify CommunityNetworksSection.jsx

Add `onNetworkSelect` prop. When a CommunityNetworkCard tile is clicked AND
the network slug matches a known network mode, call `onNetworkSelect(slug)` instead
of (or in addition to) setting local selectedId.

Network slug derivation: slugify the nationalGroup.name --
`nationalGroup.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')`

Currently CommunityNetworkCard onClick sets selectedId in local state. Change so that:
- If the network has a dedicated mode (slug === 'at-the-school-gates'), call onNetworkSelect(slug)
- Otherwise keep existing behaviour (selectedId expand/collapse)

Define the set of network-mode slugs as a constant at the top of the file:
```js
const NETWORK_MODE_SLUGS = new Set(['at-the-school-gates'])
```

Signature change:
```js
export default function CommunityNetworksSection({ locationType, locationSlug, session, onNetworkSelect })
```

---

## 6. Modify GroupsRightNav.jsx

Read this file first. It renders CommunityNetworksSection. Pass onNetworkSelect through:

```jsx
<CommunityNetworksSection
  locationType={locationType}
  locationSlug={locationSlug}
  session={session}
  onNetworkSelect={onNetworkSelect}
/>
```

Add `onNetworkSelect` to GroupsRightNav props and pass it down.

---

## 7. Modify Locations.jsx

### New state

```js
const [activeNetwork,    setActiveNetwork]    = useState(null)   // null | 'at-the-school-gates'
const [selectedSchoolUrns, setSelectedSchoolUrns] = useState([]) // string[]
const [focusSchoolUrn,   setFocusSchoolUrn]   = useState(null)   // string|null
```

### Derived value

```js
import { MOCK_SCHOOLS } from '../data/mock-schools.js'
const focusSchool = MOCK_SCHOOLS.find(s => s.urn === focusSchoolUrn) ?? null
```

### School helper handlers

```js
function handleFocusSchool(urn)   { setFocusSchoolUrn(urn) }
function handleToggleSchool(urn)  {
  setSelectedSchoolUrns(prev =>
    prev.includes(urn) ? prev.filter(u => u !== urn) : [...prev, urn]
  )
}
function handleNetworkSelect(slug) { setActiveNetwork(slug); setFocusSchoolUrn(null) }
function handleNetworkBack()       { setActiveNetwork(null) }
```

### Pane swap logic

Currently Locations.jsx builds `activeLeftPane` and `activeRightPane` based on
`showTabNav` and `midTab`. Extend this so that when `activeNetwork === 'at-the-school-gates'`
AND `midTab === 'groups'`, the panes override to network-specific components.

Find the section that builds `activeLeftPane` and `activeRightPane`. Wrap the existing
assignment in a condition:

```js
let activeLeftPane, activeRightPane

if (activeNetwork === 'at-the-school-gates' && midTab === 'groups') {
  activeLeftPane = (
    <SchoolsLeftNav
      selectedUrns={selectedSchoolUrns}
      focusUrn={focusSchoolUrn}
      onFocusSchool={handleFocusSchool}
      onToggleSchool={handleToggleSchool}
      onBack={handleNetworkBack}
    />
  )
  activeRightPane = (
    <SchoolsRightNav
      focusSchool={focusSchool}
      selectedUrns={selectedSchoolUrns}
      onToggleSchool={handleToggleSchool}
      session={session}
    />
  )
} else {
  // existing showTabNav / locationNav logic here (unchanged)
}
```

### Mid pane for Groups tab in network mode

The groupsPane prop passed to MidPaneTabs should also swap when in network mode.
Find where `groupsPane` is defined/assigned and extend:

```js
const groupsPaneContent = (activeNetwork === 'at-the-school-gates')
  ? <SchoolGatesMid focusSchool={focusSchool} selectedUrns={selectedSchoolUrns} />
  : <GroupsTab locationType={activeLocationType} locationSlug={activeLocationSlug} filter={groupsFilter} />
```

Pass `groupsPaneContent` as the `groupsPane` prop to MidPaneTabs.

### GroupsRightNav onNetworkSelect wiring

Find where GroupsRightNav is rendered (inside the existing right pane logic for groups tab)
and add `onNetworkSelect={handleNetworkSelect}`.

### Imports to add at top of Locations.jsx

```js
import { MOCK_SCHOOLS }   from '../data/mock-schools.js'
import SchoolsLeftNav     from '../components/SchoolGates/SchoolsLeftNav.jsx'
import SchoolGatesMid     from '../components/SchoolGates/SchoolGatesMid.jsx'
import SchoolsRightNav    from '../components/SchoolGates/SchoolsRightNav.jsx'
```

---

## Notes

- No CSS module files needed for this POC -- inline styles throughout, matching house style
- No fetch calls -- all school data from MOCK_SCHOOLS
- The three action stubs (Message / Survey / Event) use alert() for now -- wired properly
  in a later sprint
- `selectedSchoolUrns` is ephemeral (session state only) -- persistence comes later
- The `activeNetwork` state only activates the swap when `midTab === 'groups'`. If the user
  switches to another tab (News, Map etc.) while in network mode, those tabs behave normally.
  Returning to Groups re-enters network mode if activeNetwork is still set.
- Do NOT modify MidPaneTabs -- the pane swap is entirely driven by what Locations.jsx
  passes as groupsPane / activeLeftPane / activeRightPane
