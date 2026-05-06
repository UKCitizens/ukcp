# Dex instruction -- nearby places sprint
> Ali, 06 May 2026.

---

## What this delivers

On-demand nearby context for three entity types -- place, ward, constituency.
Ensures almost every entry has at least one meaningful "near to" result.

Computed on access, cached in L1 localStorage alongside existing place content.
No pre-population, no batch pipeline.

### Per entity type

**Place** (Hamlet/Village/Town/City):
- 3 nearest peers (same place_type, spatial)
- First hit walking up the hierarchy (spatial)

**Ward**:
- Up to 5 Hamlets or Villages within the ward (GSS field match)
- Up to 2 nearest Towns (spatial -- may cross ward boundary)
- 1 nearest City (spatial)

**Constituency**:
- All Towns and Cities where con_gss matches (GSS field match, no limit)

Query approach: GSS field match for within-boundary counts (accurate, uses existing indexes).
Spatial ($nearSphere) only where the query intentionally crosses boundaries (nearest town/city from ward, hierarchy walk from place).

---

## place_type hierarchy (ascending)

Hamlet -> Village -> Town -> City

---

## Part 1 -- MongoDB: add GeoJSON location field + 2dsphere index

### Migration script: `scripts/migrate-place-location.js`

Reads all place records, adds `location: { type: "Point", coordinates: [lng, lat] }`
where lat/lng are present and non-empty. Skips records with missing coordinates.

```js
/**
 * @file scripts/migrate-place-location.js
 * @description One-time migration: adds GeoJSON location field to all place records.
 * Run once against local MongoDB, then again against Atlas before deploy.
 * Usage: node scripts/migrate-place-location.js
 */

import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DB_NAME   = 'ukcp'

async function run() {
  const client = new MongoClient(MONGO_URI)
  await client.connect()
  const col = client.db(DB_NAME).collection('places')

  const cursor = col.find({ lat: { $exists: true, $ne: '' }, lng: { $exists: true, $ne: '' } })
  let updated = 0, skipped = 0

  while (await cursor.hasNext()) {
    const doc = await cursor.next()
    const lat = parseFloat(doc.lat)
    const lng = parseFloat(doc.lng)
    if (isNaN(lat) || isNaN(lng)) { skipped++; continue }
    await col.updateOne(
      { _id: doc._id },
      { $set: { location: { type: 'Point', coordinates: [lng, lat] } } }
    )
    updated++
  }

  console.log(`Done -- updated: ${updated}, skipped: ${skipped}`)
  await client.close()
}

run().catch(console.error)
```

### Edit: `db/mongo.js`

Add 2dsphere index inside the ensureIndexes block (after the schools 2dsphere line):
```js
await db.collection('places').createIndex({ location: '2dsphere' }, { sparse: true })
```

---

## Part 2 -- Express: nearby endpoints

### 2a -- Place: GET /api/places/:id/nearby

Edit `routes/places.js` (check server.js for mount point). Add:

```js
/**
 * GET /api/places/:id/nearby
 * Returns 3 nearest peers (same place_type) and first hit up the hierarchy.
 * No auth required.
 */
router.get('/:id/nearby', asyncHandler(async (req, res) => {
  const col = placesCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  const place = await col.findOne({ id: req.params.id })
  if (!place) return res.status(404).json({ error: 'Place not found' })

  if (!place.location) {
    return res.json({ peers: [], hierarchy: null })
  }

  const HIERARCHY = ['Hamlet', 'Village', 'Town', 'City']
  const placeRank = HIERARCHY.indexOf(place.place_type)

  // 3 nearest peers -- same place_type, exclude self
  const peers = await col.find({
    location:   { $nearSphere: { $geometry: place.location, $maxDistance: 50000 } },
    place_type: place.place_type,
    id:         { $ne: place.id },
  }).limit(3).project({ id: 1, name: 1, place_type: 1 }).toArray()

  // Walk up hierarchy -- nearest place of each higher type
  let hierarchyHit = null
  for (let i = placeRank + 1; i < HIERARCHY.length; i++) {
    const hit = await col.findOne({
      location:   { $nearSphere: { $geometry: place.location, $maxDistance: 100000 } },
      place_type: HIERARCHY[i],
    }, { projection: { id: 1, name: 1, place_type: 1 } })
    if (hit) { hierarchyHit = hit; break }
  }

  res.json({ peers, hierarchy: hierarchyHit })
}))
```

---

### 2b -- Ward: GET /api/nearby/ward/:gss

Add to a new file `routes/nearby.js`, mounted at `/api/nearby` in server.js.

```js
/**
 * @file routes/nearby.js
 * @description Nearby context endpoints for ward and constituency entities.
 * No auth required.
 */

import { Router } from 'express'
import { placesCol } from '../db/mongo.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = Router()

/**
 * GET /api/nearby/ward/:gss
 * Returns up to 5 Hamlets/Villages within the ward (GSS match),
 * up to 2 nearest Towns (spatial), 1 nearest City (spatial).
 * Requires a representative point: ?lat=&lng= query params (use ward centroid or first place).
 */
router.get('/ward/:gss', asyncHandler(async (req, res) => {
  const col = placesCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  const { gss } = req.params
  const lat = parseFloat(req.query.lat)
  const lng = parseFloat(req.query.lng)

  // Settlements within ward -- GSS match
  const settlements = await col.find({
    ward_gss:   gss,
    place_type: { $in: ['Hamlet', 'Village'] },
  }).limit(5).project({ id: 1, name: 1, place_type: 1 }).toArray()

  // Nearest towns and city -- spatial from provided centroid
  let towns = [], city = null
  if (!isNaN(lat) && !isNaN(lng)) {
    const point = { type: 'Point', coordinates: [lng, lat] }
    towns = await col.find({
      location:   { $nearSphere: { $geometry: point, $maxDistance: 50000 } },
      place_type: 'Town',
    }).limit(2).project({ id: 1, name: 1, place_type: 1 }).toArray()

    city = await col.findOne({
      location:   { $nearSphere: { $geometry: point, $maxDistance: 150000 } },
      place_type: 'City',
    }, { projection: { id: 1, name: 1, place_type: 1 } })
  }

  res.json({ settlements, towns, city })
}))

/**
 * GET /api/nearby/constituency/:gss
 * Returns all Towns and Cities where con_gss matches.
 */
router.get('/constituency/:gss', asyncHandler(async (req, res) => {
  const col = placesCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  const places = await col.find({
    con_gss:    req.params.gss,
    place_type: { $in: ['Town', 'City'] },
  }).project({ id: 1, name: 1, place_type: 1 }).toArray()

  res.json({ places })
}))

export default router
```

### Edit: `server.js`

Add import:
```js
import nearbyRouter from './routes/nearby.js'
```

Add mount:
```js
app.use('/api/nearby', nearbyRouter)
```

---

## Part 3 -- React: useNearby hook

### New file: `src/hooks/useNearby.js`

Single hook handles all three entity types. Caller passes `{ entityType, id, gss, lat, lng }`.

```js
/**
 * @file hooks/useNearby.js
 * @description Fetches nearby context for a place, ward, or constituency.
 * Caches result in localStorage under nearby:v1:<entityType>:<id>, 30-day TTL.
 *
 * @param {Object} params
 * @param {string} params.entityType -- 'place' | 'ward' | 'constituency'
 * @param {string} [params.id]       -- place id (entityType = 'place')
 * @param {string} [params.gss]      -- GSS code (entityType = 'ward' | 'constituency')
 * @param {number} [params.lat]      -- centroid lat (entityType = 'ward', optional)
 * @param {number} [params.lng]      -- centroid lng (entityType = 'ward', optional)
 */

import { useState, useEffect } from 'react'

const CACHE_VERSION = 'v1'
const CACHE_TTL_MS  = 30 * 24 * 60 * 60 * 1000

export function useNearby({ entityType, id, gss, lat, lng } = {}) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let url, cacheKey

    if (entityType === 'place' && id) {
      url      = `/api/places/${id}/nearby`
      cacheKey = `nearby:${CACHE_VERSION}:place:${id}`
    } else if (entityType === 'ward' && gss) {
      const params = (lat != null && lng != null) ? `?lat=${lat}&lng=${lng}` : ''
      url      = `/api/nearby/ward/${gss}${params}`
      cacheKey = `nearby:${CACHE_VERSION}:ward:${gss}`
    } else if (entityType === 'constituency' && gss) {
      url      = `/api/nearby/constituency/${gss}`
      cacheKey = `nearby:${CACHE_VERSION}:constituency:${gss}`
    } else {
      return
    }

    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) ?? 'null')
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        setData(cached.data)
        return
      }
    } catch {}

    setLoading(true)
    fetch(url)
      .then(r => r.json())
      .then(d => {
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: d }))
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [entityType, id, gss, lat, lng])

  return { data, loading, error }
}
```

---

## Part 4 -- Wire into display

### Place
Find where individual place content is rendered (likely PlacesCard.jsx or a place detail panel).
Call `useNearby({ entityType: 'place', id: place.id })`.

Display (plain text, style to match existing UI):
- peers present: "Near [name1], [name2] and [name3]"
- hierarchyHit present: "Nearest [place_type]: [name]"

### Ward
Where ward detail is shown, call `useNearby({ entityType: 'ward', gss: ward.gss, lat, lng })`.
lat/lng: use the ward's first known place centroid if available, else omit (settlements-only result).

Display:
- settlements: "Includes [name1], [name2]..."
- towns: "Nearby towns: [name1], [name2]"
- city: "Nearest city: [name]"

### Constituency
Where constituency detail is shown, call `useNearby({ entityType: 'constituency', gss: con.gss })`.

Display:
- places list: "Towns and cities: [name1], [name2]..."

### All cases
Do not block the main entity render on this -- loads independently.
Render nothing if data is null or loading. No empty state.

---

## Smoke test sequence

1. Run migration: `node scripts/migrate-place-location.js` -- confirm updated count ~54K
2. Restart server -- 2dsphere index creates on startup
3. `GET /api/places/GBP1/nearby` -- confirm peers array and hierarchyHit in response
4. `GET /api/nearby/ward/[any ward_gss from newplace.csv]` -- confirm settlements/towns/city
5. `GET /api/nearby/constituency/[any con_gss from newplace.csv]` -- confirm places array
6. Open a place in the UI -- confirm nearby text renders below place info
7. Open a ward -- confirm nearby text renders
8. Open a constituency -- confirm towns/cities list renders
9. Check localStorage -- confirm nearby:v1:place:GBP1 key present
10. Report back to Ali: result counts for each entity type, any errors
