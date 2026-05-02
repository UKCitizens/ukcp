# Dex Instructions -- Schools Full Data Implementation

## Objective

Replace the mock-schools POC with real GIAS data. Seed 27,000+ England schools into
MongoDB, expose a geo-scoped API endpoint, update SchoolsLeftNav to fetch from it,
wire real posts into SchoolGatesMid, and add coverage placeholders for Scotland,
Wales, and Northern Ireland.

---

## Source file

`UKCP/Ali/schools.csv` -- GIAS full England extract, latin-1 encoding, 51,497 rows
(~27,109 open). No header manipulation needed -- row 0 is the header.

Key column indices (0-based):
```
0   URN
2   LA (name)
4   EstablishmentName
6   TypeOfEstablishment (name)
8   EstablishmentTypeGroup (name)
10  EstablishmentStatus (name)   -- filter: 'Open' only
18  PhaseOfEducation (name)
27  Gender (name)
59  Street
62  Town
63  County (name)
64  Postcode
65  SchoolWebsite
66  TelephoneNum
67  HeadTitle (name)
68  HeadFirstName
69  HeadLastName
70  HeadPreferredJobTitle
106 AdministrativeWard (code)    -- ward_gss  e.g. E05009308
107 AdministrativeWard (name)    -- ward_name
108 ParliamentaryConstituency (code) -- con_gss e.g. E14001172
109 ParliamentaryConstituency (name) -- con_name
112 GSSLACode (name)             -- la_gss e.g. E09000001
113 Easting                      -- OS National Grid
114 Northing                     -- OS National Grid
125 OfstedRating (name)
```

---

## Files to create

1. `scripts/seed-schools.js`
2. `server/routes/schools.js`

## Files to modify

3. `server/index.js` -- mount new route
4. `src/components/SchoolGates/SchoolsLeftNav.jsx`
5. `src/components/SchoolGates/SchoolGatesMid.jsx`
6. `src/pages/Locations.jsx`

---

## 1. scripts/seed-schools.js

Read the CSV, convert OS grid refs to WGS84 lat/lng, upsert into `schools` collection.

```js
/**
 * @file scripts/seed-schools.js
 * @description Seeds England schools from GIAS CSV into MongoDB schools collection.
 * Run: node scripts/seed-schools.js
 */

require('dotenv').config()
const fs      = require('fs')
const path    = require('path')
const readline = require('readline')
const mongoose = require('mongoose')

const CSV_PATH = path.join(__dirname, '../Ali/schools.csv')

// ── OSGB36 Easting/Northing to WGS84 lat/lng ─────────────────────────────────
// Ordnance Survey "Concise" method -- accurate to ~5m across Great Britain.
function osgbToWgs84(E, N) {
  if (!E || !N || isNaN(E) || isNaN(N)) return null
  E = Number(E); N = Number(N)

  const a  = 6377563.396, b = 6356256.909
  const F0 = 0.9996012717
  const φ0 = 49 * Math.PI / 180
  const λ0 = -2 * Math.PI / 180
  const N0 = -100000, E0 = 400000
  const e2 = 1 - (b * b) / (a * a)
  const n  = (a - b) / (a + b), n2 = n*n, n3 = n*n*n

  let φ = φ0
  let M = 0
  do {
    φ = (N - N0 - M) / (a * F0) + φ
    const Ma = (1 + n + (5/4)*n2 + (5/4)*n3) * (φ - φ0)
    const Mb = (3*n + 3*n2 + (21/8)*n3) * Math.sin(φ-φ0) * Math.cos(φ+φ0)
    const Mc = ((15/8)*n2 + (15/8)*n3) * Math.sin(2*(φ-φ0)) * Math.cos(2*(φ+φ0))
    const Md = (35/24)*n3 * Math.sin(3*(φ-φ0)) * Math.cos(3*(φ+φ0))
    M = b * F0 * (Ma - Mb + Mc - Md)
  } while (Math.abs(N - N0 - M) >= 0.0001)

  const sinφ = Math.sin(φ), cosφ = Math.cos(φ), tanφ = Math.tan(φ)
  const ν   = a * F0 / Math.sqrt(1 - e2*sinφ*sinφ)
  const ρ   = a * F0 * (1-e2) / Math.pow(1 - e2*sinφ*sinφ, 1.5)
  const η2  = ν/ρ - 1
  const tan2 = tanφ*tanφ, tan4 = tan2*tan2
  const sec  = 1 / cosφ

  const VII  = tanφ / (2*ρ*ν)
  const VIII = tanφ / (24*ρ*ν*ν*ν) * (5 + 3*tan2 + η2 - 9*tan2*η2)
  const IX   = tanφ / (720*ρ*Math.pow(ν,5)) * (61 + 90*tan2 + 45*tan4)
  const X    = sec / ν
  const XI   = sec / (6*ν*ν*ν) * (ν/ρ + 2*tan2)
  const XII  = sec / (120*Math.pow(ν,5)) * (5 + 28*tan2 + 24*tan4)
  const XIIA = sec / (5040*Math.pow(ν,7)) * (61 + 662*tan2 + 1320*tan4 + 720*tan2*tan4)

  const dE = E - E0
  const lat = (φ - VII*dE*dE + VIII*Math.pow(dE,4) - IX*Math.pow(dE,6)) * 180/Math.PI
  const lng = (λ0 + X*dE - XI*Math.pow(dE,3) + XII*Math.pow(dE,5) - XIIA*Math.pow(dE,7)) * 180/Math.PI

  return { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) }
}

// ── Schema ────────────────────────────────────────────────────────────────────

const schoolSchema = new mongoose.Schema({
  urn:         { type: String, unique: true, index: true },
  name:        String,
  la:          String,
  la_gss:      String,
  type:        String,
  type_group:  String,
  phase:       String,
  gender:      String,
  street:      String,
  town:        String,
  county:      String,
  postcode:    String,
  website:     String,
  phone:       String,
  head:        String,
  head_role:   String,
  ward_gss:    { type: String, index: true },
  ward_name:   String,
  con_gss:     { type: String, index: true },
  con_name:    String,
  ofsted:      String,
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] },  // [lng, lat]
  },
  country:     { type: String, default: 'England' },
  is_placeholder: { type: Boolean, default: false },
})
schoolSchema.index({ location: '2dsphere' })
schoolSchema.index({ la_gss: 1 })

const School = mongoose.model('School', schoolSchema)

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected. Seeding schools...')

  // Clear existing England schools (not placeholders)
  await School.deleteMany({ country: 'England', is_placeholder: false })

  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH, { encoding: 'latin1' }),
    crlfDelay: Infinity,
  })

  // Simple CSV parser (handles quoted fields)
  function parseCsvLine(line) {
    const result = []
    let cur = '', inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    result.push(cur.trim())
    return result
  }

  let lineNum = 0, inserted = 0, skipped = 0
  const batch = []

  for await (const line of rl) {
    lineNum++
    if (lineNum === 1) continue  // header

    const r = parseCsvLine(line)
    if (r[10] !== 'Open') { skipped++; continue }

    const coords = osgbToWgs84(r[113], r[114])
    const head = [r[67], r[68], r[69]].filter(Boolean).join(' ')

    batch.push({
      urn:       r[0],
      name:      r[4],
      la:        r[2],
      la_gss:    r[112],
      type:      r[6],
      type_group: r[8],
      phase:     r[18] || 'Not applicable',
      gender:    r[27],
      street:    r[59] || '',
      town:      r[62] || '',
      county:    r[63] || '',
      postcode:  r[64] || '',
      website:   r[65] || '',
      phone:     r[66] || '',
      head,
      head_role: r[70] || 'Headteacher',
      ward_gss:  r[106] || '',
      ward_name: r[107] || '',
      con_gss:   r[108] || '',
      con_name:  r[109] || '',
      ofsted:    r[125] || '',
      location:  coords
        ? { type: 'Point', coordinates: [coords.lng, coords.lat] }
        : undefined,
      country:   'England',
    })

    if (batch.length >= 500) {
      await School.insertMany(batch, { ordered: false })
      inserted += batch.length
      batch.length = 0
      process.stdout.write(`\r  ${inserted} inserted...`)
    }
  }

  if (batch.length) {
    await School.insertMany(batch, { ordered: false })
    inserted += batch.length
  }

  console.log(`\nEngland schools: ${inserted} inserted, ${skipped} skipped (closed).`)

  // ── Country coverage placeholders ─────────────────────────────────────────
  // These are NOT real schools. They are sentinel records so the UI can detect
  // missing data coverage and show an appropriate message to the user.
  // REMOVE these and replace with real data when Scotland/Wales/NI sources are sourced.

  await School.deleteMany({ is_placeholder: true })

  await School.insertMany([
    {
      urn: 'PLACEHOLDER-SCOTLAND',
      name: '[PLACEHOLDER] Scotland school data not yet imported',
      country: 'Scotland',
      is_placeholder: true,
      la: 'Scotland', la_gss: 'S92000003',
      ward_gss: '', con_gss: '', location: undefined,
    },
    {
      urn: 'PLACEHOLDER-WALES',
      name: '[PLACEHOLDER] Wales school data not yet imported',
      country: 'Wales',
      is_placeholder: true,
      la: 'Wales', la_gss: 'W92000004',
      ward_gss: '', con_gss: '', location: undefined,
    },
    {
      urn: 'PLACEHOLDER-NIRELAND',
      name: '[PLACEHOLDER] Northern Ireland school data not yet imported',
      country: 'Northern Ireland',
      is_placeholder: true,
      la: 'Northern Ireland', la_gss: 'N92000002',
      ward_gss: '', con_gss: '', location: undefined,
    },
  ])

  console.log('Coverage placeholders inserted for Scotland, Wales, Northern Ireland.')
  await mongoose.disconnect()
  console.log('Done.')
}

seed().catch(err => { console.error(err); process.exit(1) })
```

---

## 2. server/routes/schools.js

```js
/**
 * @file server/routes/schools.js
 * @description Schools API. Filters by geo scope.
 *
 * GET /api/schools?scope=ward&gss=E05009308
 * GET /api/schools?scope=constituency&gss=E14001172
 * GET /api/schools?scope=county&gss=E09000001
 * GET /api/schools?scope=proximity&lat=53.4&lng=-2.9&radius=4000
 *
 * All queries exclude placeholder records.
 * Returns: array of school objects (fields sufficient for left nav + right detail).
 */

const express = require('express')
const router  = express.Router()
const mongoose = require('mongoose')

const School = mongoose.model('School')

const PROJECT = {
  urn: 1, name: 1, la: 1, type: 1, type_group: 1, phase: 1, gender: 1,
  street: 1, town: 1, postcode: 1, website: 1, phone: 1,
  head: 1, head_role: 1,
  ward_gss: 1, ward_name: 1, con_gss: 1, con_name: 1,
  ofsted: 1, location: 1, country: 1,
}

router.get('/', async (req, res) => {
  try {
    const { scope, gss, lat, lng, radius } = req.query
    let query = { is_placeholder: { $ne: true } }

    if (scope === 'ward')         query.ward_gss = gss
    else if (scope === 'constituency') query.con_gss = gss
    else if (scope === 'county')  query.la_gss   = gss
    else if (scope === 'proximity' && lat && lng) {
      const radiusMetres = Number(radius) || 4000
      const schools = await School.find({
        ...query,
        location: {
          $nearSphere: {
            $geometry:    { type: 'Point', coordinates: [Number(lng), Number(lat)] },
            $maxDistance: radiusMetres,
          },
        },
      }).select(PROJECT).limit(100).lean()
      return res.json(schools)
    } else {
      return res.status(400).json({ error: 'Invalid scope' })
    }

    const schools = await School.find(query).select(PROJECT).sort({ name: 1 }).limit(500).lean()
    res.json(schools)
  } catch (err) {
    console.error('schools route error', err)
    res.status(500).json({ error: 'Failed to load schools' })
  }
})

module.exports = router
```

---

## 3. server/index.js

Find where existing routes are mounted and add:

```js
const schoolsRouter = require('./routes/schools')
app.use('/api/schools', schoolsRouter)
```

---

## 4. src/components/SchoolGates/SchoolsLeftNav.jsx

Replace the static MOCK_SCHOOLS import with an API fetch driven by props from Locations.jsx.

New props signature:
```js
export default function SchoolsLeftNav({
  selectedUrns, focusUrn, onFocusSchool, onToggleSchool, onBack,
  locationScope,  // { scope: 'ward'|'constituency'|'county'|'proximity', gss, lat, lng }
})
```

Replace the MOCK_SCHOOLS import and static array with:

```js
import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

// Inside component:
const [schools,  setSchools]  = useState([])
const [loading,  setLoading]  = useState(false)
const [coverage, setCoverage] = useState(null)  // null | 'missing'

useEffect(() => {
  if (!locationScope?.scope || !locationScope?.gss) return
  let cancelled = false
  setLoading(true)
  setCoverage(null)

  const params = new URLSearchParams({ scope: locationScope.scope, gss: locationScope.gss })
  fetch(`${API_BASE}/api/schools?${params}`)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(data => {
      if (cancelled) return
      setSchools(data)
      setLoading(false)
    })
    .catch(() => {
      if (!cancelled) { setSchools([]); setLoading(false) }
    })

  return () => { cancelled = true }
}, [locationScope?.scope, locationScope?.gss])
```

Add a coverage notice at the bottom of the rendered list:

```jsx
{/* Coverage notice -- shown when navigating outside England */}
{coverage === 'missing' && (
  <p style={{ fontSize: 11, color: '#adb5bd', padding: '8px 10px', fontStyle: 'italic' }}>
    School data for this country is not yet available.
    England only at this time.
  </p>
)}
```

Remove the MOCK_SCHOOLS import entirely.

---

## 5. src/components/SchoolGates/SchoolGatesMid.jsx

Replace stub post cards with real PostsTab. The school's network_chapter is identified
by institution_type + institution_id (URN). The chapter document has a `_id` field
that PostsTab needs as `collectiveRef`.

Since we don't yet have a lookup endpoint for the chapter _id from a URN, use a
two-step approach:

Add a `chapterId` fetch at the top:

```js
import { useState, useEffect } from 'react'
import PostsTab from '../Posts/PostsTab.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export default function SchoolGatesMid({ focusSchool, selectedUrns }) {
  const [chapterId, setChapterId] = useState(null)

  useEffect(() => {
    if (!focusSchool?.urn) { setChapterId(null); return }
    let cancelled = false
    fetch(`${API_BASE}/api/community-networks/chapter-by-institution?type=school&id=${focusSchool.urn}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { if (!cancelled) setChapterId(d.chapter_id) })
      .catch(() => { if (!cancelled) setChapterId(null) })
    return () => { cancelled = true }
  }, [focusSchool?.urn])
```

Render:
- If no focusSchool: centred "Select a school from the left to view its community."
- If focusSchool but no chapterId yet: show breadcrumb + "Loading community..."
- If chapterId: show breadcrumb + tab strip + PostsTab with collectiveRef

```jsx
{chapterId && (
  <PostsTab
    locationType="school"
    locationSlug={focusSchool.urn}
    collectiveRef={{ collection: 'network_chapters', id: chapterId }}
  />
)}
```

Keep the stub Community/Notices tab strip structure from the POC -- just swap the
Community content from stub cards to PostsTab when chapterId is available.

---

### New API endpoint needed: chapter-by-institution

Add to `server/routes/community-networks.js` (or wherever that router lives):

```js
// GET /api/community-networks/chapter-by-institution?type=school&id=100045
router.get('/chapter-by-institution', async (req, res) => {
  try {
    const { type, id } = req.query
    if (!type || !id) return res.status(400).json({ error: 'type and id required' })
    const chapter = await NetworkChapter.findOne({
      institution_type: type,
      institution_id:   id,
    }).select('_id').lean()
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' })
    res.json({ chapter_id: chapter._id })
  } catch (err) {
    res.status(500).json({ error: 'Failed to find chapter' })
  }
})
```

---

## 6. src/pages/Locations.jsx

### Derive locationScope for SchoolsLeftNav

Locations.jsx already has access to the current path (country/region/county/
constituency/ward) and their GSS codes. Derive a `locationScope` object:

```js
// After path is resolved, derive school scope
// path entries have shape { level, value, gss } -- check your existing path structure
// and use whatever field holds the GSS code for each level.

const schoolLocationScope = useMemo(() => {
  if (!path?.length) return null

  const ward         = path.find(p => p.level === 'ward')
  const constituency = path.find(p => p.level === 'constituency')
  const county       = path.find(p => p.level === 'county')

  if (ward?.gss)         return { scope: 'ward',         gss: ward.gss }
  if (constituency?.gss) return { scope: 'constituency', gss: constituency.gss }
  if (county?.gss)       return { scope: 'county',       gss: county.gss }

  return null
}, [path])
```

NOTE: Check how GSS codes are stored on path entries in the existing code. They may be
stored as `gss`, `code`, or derived from the hierarchy data. Adapt accordingly.

Pass `locationScope={schoolLocationScope}` to SchoolsLeftNav.

---

## Notes

- Run `node scripts/seed-schools.js` once after deploy. ~27k records, ~2-3 minutes.
- The 2dsphere index is created by the schema definition -- Mongoose creates it on
  first connect if it does not exist.
- Scotland/Wales/NI placeholders are in the DB but never returned by the `/api/schools`
  route (excluded by `is_placeholder: { $ne: true }`). The frontend coverage notice
  is triggered separately based on the country in the navigation path -- wire that
  when those data sources are available.
- The `chapter-by-institution` endpoint will return 404 until chapters are seeded
  for schools. The SchoolGatesMid component handles this gracefully (stays on stub view).
- Do not delete `src/data/mock-schools.js` -- it is still imported by the POC until
  SchoolsLeftNav is fully wired. Remove the import from SchoolsLeftNav only.
