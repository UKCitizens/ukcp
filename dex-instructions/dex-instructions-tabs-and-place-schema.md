# Dex Instructions — Tab System Extension + Place Schema
> Scope: (1) Extend Mongo + server.js for City manifest fields. (2) Extend MidPaneTabs to 8-tab system with stubs. (3) Wire place type context into tab visibility.
> Content sourcing (Ollama pipeline) is NOT in scope — stub only.
> Run `npm run build && node server.js` to test after each section.

---

## Section 1 — Mongo schema: places collection

The `places` collection needs four new optional fields added. Mongo is schemaless so no migration script required — just ensure server.js reads/writes them and seed/export scripts handle them.

New fields per place document:
```
area          : String | null   (e.g. "142 km²")
elevation     : String | null   (e.g. "75m")
website       : String | null   (official URL)
notable_facts : [String]        (array, 0–4 items, empty array default)
category_tags : [String]        (array, e.g. ["Industrial","Cathedral"], empty array default)
gather_status : String          ('none'|'gathered'|'curated') — default 'none'
```

In `scripts/seed-places.js`, when building the document from CSV row, add:
```js
area:          null,
elevation:     null,
website:       null,
notable_facts: [],
category_tags: [],
gather_status: 'none',
```

In `scripts/export-places.js`, add the six new fields to the CSV column output if present (use empty string as null fallback). Keep CSV as L0 static bundle — these fields will mostly be empty until pipeline runs, that is fine.

---

## Section 2 — Mongo schema: geo_content collection

`geo_content` documents already have a rich field set. Add the same Ollama-pipeline fields for consistency and future use at geo level:

```
notable_facts : [String]        (empty array default)
category_tags : [String]        (empty array default)
gather_status : String          ('none'|'gathered'|'curated') — default 'none'
```

In `scripts/seed-geo-content.js`, add these three fields with defaults when upserting.

---

## Section 3 — server.js: field mapping updates

### GET /api/content/:type/:slug
This route returns content for LocationInfo. Extend the Mongo projection and response to include the new fields.

In the places branch of this route (city/town/village/hamlet), add to the returned object:
```js
area:          doc.area          ?? null,
elevation:     doc.elevation     ?? null,
website:       doc.website       ?? null,
notable_facts: doc.notable_facts ?? [],
category_tags: doc.category_tags ?? [],
gather_status: doc.gather_status ?? 'none',
```

In the geo_content branch (country/region/county/constituency/ward), add:
```js
notable_facts: doc.notable_facts ?? [],
category_tags: doc.category_tags ?? [],
gather_status: doc.gather_status ?? 'none',
```

### PATCH /api/admin/places/:id
The PlaceCorrector PATCH already writes editable fields. Add the new fields to the allowed update set so DataManager can manually set them:
```js
if (body.area          !== undefined) update.area          = body.area
if (body.elevation     !== undefined) update.elevation     = body.elevation
if (body.website       !== undefined) update.website       = body.website
if (body.notable_facts !== undefined) update.notable_facts = body.notable_facts
if (body.category_tags !== undefined) update.category_tags = body.category_tags
if (body.gather_status !== undefined) update.gather_status = body.gather_status
```

### PATCH /api/admin/geo-content/:key
Same pattern — add the three new fields to the allowed update set.

---

## Section 4 — useLocationContent.js: return new fields

`src/hooks/useLocationContent.js` maps API response to component props. Add the new fields to the returned object:

```js
area:          data.area          ?? null,
elevation:     data.elevation     ?? null,
website:       data.website       ?? null,
notable_facts: data.notable_facts ?? [],
category_tags: data.category_tags ?? [],
gather_status: data.gather_status ?? 'none',
```

---

## Section 5 — Tab system: MidPaneTabs.jsx

### Tab taxonomy
The 8 tabs are:

| Tab | ID | Shown for | Notes |
|-----|-----|-----------|-------|
| Info | `info` | All types | Existing |
| Map | `map` | All types | Existing |
| News | `news` | All types | Stub |
| Groups | `groups` | All types | Stub |
| Posts | `posts` | All types | Stub |
| People | `people` | All types | Stub |
| Government | `government` | Geo hierarchy only | Stub |
| Committee | `committee` | All levels including Ward | Stub |

Geo hierarchy = `country`, `region`, `county`, `constituency`, `ward`
Named places = `city`, `town`, `village`, `hamlet`

Government tab does NOT appear for named places.
Committee tab appears at all levels including Ward (ward is the participation floor).

### Changes to MidPaneTabs.jsx

**New props required:**
```
locationType   — string|null  (the current context type: 'city'|'town'|'village'|'hamlet'|'county'|etc.)
newsPane       — React.ReactNode
groupsPane     — React.ReactNode
postsPane      — React.ReactNode
peoplePane     — React.ReactNode
governmentPane — React.ReactNode
committeePane  — React.ReactNode
```

**Tab definitions** — replace the two hardcoded buttons with a tabs array. Add to the top of the component:

```js
const NAMED_PLACES = ['city', 'town', 'village', 'hamlet']
const isNamedPlace = NAMED_PLACES.includes((locationType ?? '').toLowerCase())

const tabs = [
  { id: 'info',       label: 'Info' },
  { id: 'map',        label: 'Map' },
  { id: 'news',       label: 'News' },
  { id: 'groups',     label: 'Groups' },
  { id: 'posts',      label: 'Posts' },
  { id: 'people',     label: 'People' },
  ...(!isNamedPlace ? [{ id: 'government', label: 'Government' }] : []),
  { id: 'committee',  label: 'Committee' },
]
```

**Tab strip** — replace the two hardcoded buttons with a map over `tabs`:
```jsx
{tabs.map(t => (
  <button key={t.id} style={tabStyle(t.id)} onClick={() => onTabChange(t.id)}>
    {t.label}
  </button>
))}
```

**Content area** — add panels for each new tab below the existing info panel. Same pattern: `position: absolute`, `inset: 0`, `zIndex: 2`, `background: #fff`, `overflowY: auto`, `display: activeTab === id ? 'block' : 'none'`.

Add after the info panel block:
```jsx
{/* News panel */}
<div style={{ position:'absolute', inset:0, zIndex:2, background:'#fff', overflowY:'auto', display: activeTab === 'news' ? 'block' : 'none' }}>
  {newsPane}
</div>

{/* Groups panel */}
<div style={{ position:'absolute', inset:0, zIndex:2, background:'#fff', overflowY:'auto', display: activeTab === 'groups' ? 'block' : 'none' }}>
  {groupsPane}
</div>

{/* Posts panel */}
<div style={{ position:'absolute', inset:0, zIndex:2, background:'#fff', overflowY:'auto', display: activeTab === 'posts' ? 'block' : 'none' }}>
  {postsPane}
</div>

{/* People panel */}
<div style={{ position:'absolute', inset:0, zIndex:2, background:'#fff', overflowY:'auto', display: activeTab === 'people' ? 'block' : 'none' }}>
  {peoplePane}
</div>

{/* Government panel — geo hierarchy only, not rendered for named places */}
{!isNamedPlace && (
  <div style={{ position:'absolute', inset:0, zIndex:2, background:'#fff', overflowY:'auto', display: activeTab === 'government' ? 'block' : 'none' }}>
    {governmentPane}
  </div>
)}

{/* Committee panel */}
<div style={{ position:'absolute', inset:0, zIndex:2, background:'#fff', overflowY:'auto', display: activeTab === 'committee' ? 'block' : 'none' }}>
  {committeePane}
</div>
```

---

## Section 6 — Stub components

Create `src/components/TabStubs.jsx`. Single file, named exports for each stub:

```jsx
import { Center, Text } from '@mantine/core'

const stub = (label) => (
  <Center style={{ height: '100%', minHeight: 120 }}>
    <Text size="sm" c="dimmed">{label} — coming soon</Text>
  </Center>
)

export const NewsStub       = () => stub('News')
export const GroupsStub     = () => stub('Groups')
export const PostsStub      = () => stub('Posts')
export const PeopleStub     = () => stub('People')
export const GovernmentStub = () => stub('Government')
export const CommitteeStub  = () => stub('Committee')
```

---

## Section 7 — Locations.jsx: wire new props

### Derive locationType
After line where `contentType` is derived (around line 202), add:

```js
// locationType — the current named place type or geo level for tab visibility
const locationType = pendingPlace
  ? pendingPlace.place_type?.toLowerCase() ?? null
  : contentType ?? null
```

### Import stubs
```js
import { NewsStub, GroupsStub, PostsStub, PeopleStub, GovernmentStub, CommitteeStub } from '../components/TabStubs.jsx'
```

### Guard handleTabChange
If user switches to a tab that doesn't apply to current context (e.g. they were on Government, then select a city), reset to 'info'. In the `locationType` derivation useEffect or derivation block, add:

```js
// If active tab is government but context is now a named place, reset to info
const NAMED_PLACES = ['city','town','village','hamlet']
if (midTab === 'government' && NAMED_PLACES.includes(locationType ?? '')) {
  setMidTab('info')
}
```

Place this in a `useEffect` watching `[locationType]`.

### Pass new props to MidPaneTabs
Add to the `<MidPaneTabs ... />` call:

```jsx
locationType={locationType}
newsPane={<NewsStub />}
groupsPane={<GroupsStub />}
postsPane={<PostsStub />}
peoplePane={<PeopleStub />}
governmentPane={<GovernmentStub />}
committeePane={<CommitteeStub />}
```

---

## Section 8 — LocationInfo.jsx: new City manifest fields

The wiki fallback render (bottom of the file, the named place path) currently shows population, summary, extract. Extend it to show the new fields when populated.

After the `wikiUrl` anchor block, add:

```jsx
{/* Area + Elevation stats row */}
{(placeData?.area || placeData?.elevation) && (
  <Group gap={0} style={{ borderTop: '1px solid #f1f3f5', marginTop: 8 }}>
    {placeData.area && (
      <div style={{ flex: 1, padding: '8px 0', borderRight: placeData.elevation ? '1px solid #f1f3f5' : 'none' }}>
        <Text size="10px" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.06em', marginBottom: 2 }}>Area</Text>
        <Text size="xs" fw={500}>{placeData.area}</Text>
      </div>
    )}
    {placeData.elevation && (
      <div style={{ flex: 1, padding: '8px 0', paddingLeft: 14 }}>
        <Text size="10px" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.06em', marginBottom: 2 }}>Elevation</Text>
        <Text size="xs" fw={500}>{placeData.elevation}</Text>
      </div>
    )}
  </Group>
)}

{/* Notable facts */}
{placeData?.notable_facts?.length > 0 && (
  <div style={{ borderTop: '1px solid #f1f3f5', marginTop: 8, paddingTop: 8 }}>
    <Text size="10px" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.06em', marginBottom: 6 }}>Notable</Text>
    {placeData.notable_facts.map((fact, i) => (
      <Text key={i} size="xs" style={{ lineHeight: 1.6, marginBottom: 2 }}>• {fact}</Text>
    ))}
  </div>
)}

{/* Category tags */}
{placeData?.category_tags?.length > 0 && (
  <div style={{ borderTop: '1px solid #f1f3f5', marginTop: 8, paddingTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {placeData.category_tags.map((tag, i) => (
      <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f1f3f5', color: '#495057' }}>{tag}</span>
    ))}
  </div>
)}

{/* Official website */}
{placeData?.website && (
  <div style={{ borderTop: '1px solid #f1f3f5', marginTop: 8, paddingTop: 8 }}>
    <Anchor href={placeData.website} target="_blank" rel="noopener noreferrer" size="xs" c="dimmed">
      Official website
    </Anchor>
  </div>
)}
```

`placeData` here is the prop bundle from `useLocationContent`. You will need to pass the new fields through as props to LocationInfo — add them to the destructure at the top of LocationInfo.jsx:

```js
export default function LocationInfo({
  contentType, summary, extract, thumbnail, title, wikiUrl,
  mpName, party, partyColour, population, geoData,
  loading, error, label, wardInfo, lat, lng, onMapClick,
  // New City manifest fields
  area, elevation, website, notable_facts, category_tags,
})
```

And construct a `placeData` object inside the component for the named-place render path:
```js
const placeData = { area, elevation, website, notable_facts, category_tags }
```

Pass the new fields from Locations.jsx into LocationInfo at the `<LocationInfo ... />` call site — they come from `useLocationContent` destructure.

---

## Test checklist

- [ ] `npm run build && node server.js` — no errors
- [ ] Walker nav to a county → Info tab renders geo data unchanged
- [ ] Walker nav to a ward → ward info renders unchanged
- [ ] Select a constituency → MP card renders unchanged
- [ ] Select a city/town from left pane → 6 tabs visible (no Government)
- [ ] Select a county or region → 8 tabs visible (Government present)
- [ ] Government tab click at county level → stub renders
- [ ] Committee tab click at any level → stub renders
- [ ] Tab auto-resets to Info when switching from geo → named place with Government active
- [ ] New fields (area/elevation/notable_facts/category_tags) render in Info panel when populated
- [ ] Git add . → git commit -m "feat: 8-tab system + City manifest fields" → git push
