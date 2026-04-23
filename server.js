/**
 * server.js — UKCP Express server.
 *
 * Serves the Vite build (dist/) as static files.
 * Catch-all route returns index.html so React Router handles client-side navigation.
 * API routes are added here when backend features come into scope.
 *
 * Production: node server.js
 * Port: configured via .env PORT, defaults to 3000.
 */

import express from 'express'
import cors from 'cors'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { MongoClient } from 'mongodb'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// --- MongoDB ---
// One client, one connection, reused for all requests.
// If Mongo is unavailable at startup, server continues — only Mongo-backed routes degrade.

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'
const mongoClient = new MongoClient(MONGO_URI)
let db = null

async function connectMongo() {
  try {
    await mongoClient.connect()
    db = mongoClient.db('ukcp')
    await db.collection('geo_content').createIndex({ type: 1, slug: 1 }, { unique: true })
    console.log('MongoDB connected')
  } catch (err) {
    console.error('[mongo] connection failed — continuing without MongoDB:', err.message)
    db = null
  }
}

/** Returns the geo_content collection, or null if Mongo is unavailable. */
function geoContent() {
  return db ? db.collection('geo_content') : null
}

app.use(cors({ origin: process.env.CLIENT_ORIGIN }))
app.use(express.json())

// --- Static files ---
// Serve the Vite production build
app.use(express.static(join(__dirname, 'dist')))

// --- Content cache (in-memory, L2) ---
// Keyed by `type:slug`. TTL varies by type. LRU eviction at MAX_CACHE entries.

const CONTENT_TTL = {
  country:      90 * 24 * 60 * 60 * 1000,
  region:       90 * 24 * 60 * 60 * 1000,
  county:       30 * 24 * 60 * 60 * 1000,
  city:         14 * 24 * 60 * 60 * 1000,
  town:         14 * 24 * 60 * 60 * 1000,
  village:      14 * 24 * 60 * 60 * 1000,
  hamlet:       14 * 24 * 60 * 60 * 1000,
  constituency:  7 * 24 * 60 * 60 * 1000,
  ward:          7 * 24 * 60 * 60 * 1000,
}
const MAX_CACHE    = 5000
const contentCache = new Map()

function contentCacheGet(key) {
  const entry = contentCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { contentCache.delete(key); return null }
  return entry.data
}

function contentCacheSet(key, data, ttl) {
  if (contentCache.size >= MAX_CACHE) {
    contentCache.delete(contentCache.keys().next().value)
  }
  contentCache.set(key, { data, expiresAt: Date.now() + ttl })
}

// --- API routes ---

/**
 * GET /api/content/:type/:slug
 * Proxies Wikipedia REST Summary API. Caches by type TTL.
 * Returns { extract, thumbnail, title, wikiUrl } or error JSON.
 */
const ALLOWED_CONTENT_TYPES = new Set(['country', 'region', 'county', 'city', 'town', 'village', 'hamlet', 'constituency', 'ward'])

app.get('/api/content/:type/:slug', async (req, res) => {
  const { type, slug } = req.params
  if (!ALLOWED_CONTENT_TYPES.has(type)) {
    return res.status(400).json({ error: 'Invalid content type' })
  }

  const cacheKey = `${type}:${slug}`
  const cached = contentCacheGet(cacheKey)
  if (cached) return res.json(cached)

  try {
    const ttl = CONTENT_TTL[type] ?? CONTENT_TTL.county

    // ── Mongo local-first lookup (non-constituency types) ────────────────────
    // If a geo_content document exists with summary or extract, return it directly.
    if (type !== 'constituency') {
      const col = geoContent()
      if (col) {
        const doc = await col.findOne({ type, slug })
        if (doc && (doc.summary || doc.extract)) {
          const result = {
            contentType: doc.summary ? 'curated' : 'wiki',
            summary:     doc.summary ?? null,
            extract:     doc.extract ?? null,
            thumbnail:   doc.thumbnail ?? null,
            title:       doc.name ?? slug,
            wikiUrl:     doc.wikiUrl ?? null,
            mpName:      null,
            party:       null,
            partyColour: null,
            population:  doc.population ?? null,
          }
          contentCacheSet(cacheKey, result, ttl)
          return res.json(result)
        }
      }
    }

    // ── Constituency — Parliament Constituency Search API ────────────────────
    // Uses the Location/Constituency endpoint which returns the constituency
    // with currentRepresentation (current MP) attached. The Members/Search
    // endpoint filters by name not constituency, so always returned Abbott.
    if (type === 'constituency') {
      const searchName = slug.replace(/_/g, ' ')
      const conUrl = `https://members-api.parliament.uk/api/Location/Constituency/Search?searchText=${encodeURIComponent(searchName)}&skip=0&take=5`
      const conResp = await fetch(conUrl, {
        headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' }
      })
      if (!conResp.ok) return res.status(502).json({ error: 'Parliament API failed' })
      const conData = await conResp.json()

      // Find the closest name match from results (search may return partial matches)
      const normTarget = searchName.toLowerCase()
      const match = conData.items?.find(
        item => item.value?.name?.toLowerCase() === normTarget
      ) ?? conData.items?.[0]

      const member = match?.value?.currentRepresentation?.member?.value
      if (!member) return res.status(404).json({ error: 'No MP found' })

      const mpName = member.nameDisplayAs ?? member.nameFull ?? null
      if (!mpName) return res.status(404).json({ error: 'No MP name' })

      // ── Wikidata P1082 — constituency population ─────────────────────────
      // Try bare name first, then with _(UK_Parliament_constituency) suffix
      // (many constituency articles use the disambiguation form).
      let conPopulation = null
      try {
        const baseName = (match?.value?.name ?? searchName).replace(/ /g, '_')
        const slugsToTry = [baseName, `${baseName}_(UK_Parliament_constituency)`]
        for (const wdSlug of slugsToTry) {
          const wdUrl  = `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(wdSlug)}&props=claims&languages=en&format=json`
          const wdResp = await fetch(wdUrl, { headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' } })
          if (!wdResp.ok) continue
          const wdData  = await wdResp.json()
          const entity  = Object.values(wdData.entities ?? {})[0]
          if (entity?.missing) continue
          const claims  = entity?.claims?.P1082 ?? []
          const claim   = claims.find(c => c.rank === 'preferred') ?? claims.find(c => c.rank === 'normal')
          const amount  = claim?.mainsnak?.datavalue?.value?.amount
          if (amount) { conPopulation = Number(amount.replace('+', '')).toLocaleString('en-GB'); break }
        }
      } catch { /* population stays null */ }

      const result = {
        contentType:  'mp',
        mpName,
        party:        member.latestParty?.name ?? null,
        partyColour:  member.latestParty?.backgroundColour ?? null,
        thumbnail:    member.thumbnailUrl ?? null,
        title:        match?.value?.name ?? searchName,
        extract:      null,
        wikiUrl:      null,
        population:   conPopulation,
      }
      contentCacheSet(cacheKey, result, ttl)
      return res.json(result)
    }

    // ── All other types — Wikipedia REST Summary API ─────────────────────────
    const wikiUrl  = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`
    const response = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' }
    })
    if (!response.ok) {
      return res.status(response.status === 404 ? 404 : 502).json({ error: 'Wikipedia fetch failed' })
    }
    const wiki = await response.json()

    // ── Wikidata P1082 — population for place types ──────────────────────────
    // Fire alongside wiki fetch result. Fails silently — population stays null.
    let population = null
    try {
      const wdUrl  = `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(slug)}&props=claims&languages=en&format=json`
      const wdResp = await fetch(wdUrl, { headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' } })
      if (wdResp.ok) {
        const wdData   = await wdResp.json()
        const entity   = Object.values(wdData.entities ?? {})[0]
        const claims   = entity?.claims?.P1082 ?? []
        // Prefer rank=preferred, fall back to first normal rank
        const claim    = claims.find(c => c.rank === 'preferred') ?? claims.find(c => c.rank === 'normal')
        const amount   = claim?.mainsnak?.datavalue?.value?.amount
        if (amount) population = Number(amount.replace('+', '')).toLocaleString('en-GB')
        console.log(`[wikidata] ${slug} → population: ${population}`)
      }
    } catch (e) { console.error(`[wikidata] ${slug} error:`, e.message) }

    const result = {
      contentType: 'wiki',
      extract:     wiki.extract   ?? null,
      thumbnail:   wiki.thumbnail?.source ?? null,
      title:       wiki.title     ?? slug,
      wikiUrl:     wiki.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${slug}`,
      mpName:      null,
      party:       null,
      partyColour: null,
      population,
    }

    // Cache the Wikipedia result in Mongo for future local-first hits
    const col = geoContent()
    if (col && (result.extract || result.thumbnail || result.title)) {
      col.updateOne(
        { type, slug },
        { $set: { type, slug, name: result.title, extract: result.extract,
                  thumbnail: result.thumbnail, wikiUrl: result.wikiUrl,
                  population: result.population ?? null, updatedAt: new Date() } },
        { upsert: true }
      ).catch(err => console.error(`[mongo] upsert failed for ${type}:${slug}:`, err.message))
    }

    contentCacheSet(cacheKey, result, ttl)
    return res.json(result)
  } catch (err) {
    console.error('[content proxy] fetch error:', err.message)
    return res.status(502).json({ error: 'Fetch failed' })
  }
})

// --- Population endpoint ---

/**
 * GET /api/population/:gss
 * Returns Census 2021 usual resident population for a ward or constituency.
 * Uses Nomis NM_2001_1 (TS001) dataset, queried by ONS GSS code.
 * Cached for 30 days — census data is static between releases.
 */
const popCache  = new Map()
const POP_TTL   = 30 * 24 * 60 * 60 * 1000
const GSS_RE    = /^[ENSW]\d{8}$/

app.get('/api/population/:gss', async (req, res) => {
  const { gss } = req.params
  if (!GSS_RE.test(gss)) return res.status(400).json({ error: 'Invalid GSS code' })

  const cached = popCache.get(gss)
  if (cached && Date.now() < cached.expiresAt) return res.json(cached.data)

  try {
    const nomisUrl = `https://www.nomisweb.co.uk/api/v01/dataset/NM_2001_1.data.json?geography=${gss}&cell=0&measures=20100&select=obs_value`
    const resp = await fetch(nomisUrl, { headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' } })
    if (!resp.ok) return res.status(502).json({ error: 'Nomis API failed' })
    const data  = await resp.json()
    const value = data.obs?.[0]?.obs_value?.value
    if (value == null) return res.status(404).json({ error: 'No population data' })
    const result = { population: Number(value).toLocaleString('en-GB') }
    popCache.set(gss, { data: result, expiresAt: Date.now() + POP_TTL })
    return res.json(result)
  } catch (err) {
    console.error('[population proxy] error:', err.message)
    return res.status(502).json({ error: 'Fetch failed' })
  }
})

// --- Public: place typeahead search ---

/**
 * GET /api/places/search?q=[term]&limit=[n]
 * Returns geo entries (country/region/county) and place rows matching the term.
 * Geo entries are prepended so London/Inner London etc surface before place rows.
 * Minimum 2 characters required. Used by the mid-pane location search box.
 * Result shape:
 *   resultType 'geo'   → { resultType, level, value, name, geoType }
 *   resultType 'place' → { resultType, id, name, place_type, country, region, … }
 */
app.get('/api/places/search', (req, res) => {
  try {
    ensurePlacesLoaded()
    const { q = '', limit = '10' } = req.query
    const term = q.toLowerCase().trim()
    if (term.length < 2) return res.json([])
    const lim = Math.min(20, parseInt(limit, 10) || 10)
    const results = []

    // --- Geo entries first (countries, regions, counties) ---
    try {
      const geoPath = join(__dirname, 'public', 'data', 'geo-content.json')
      const geoData = JSON.parse(readFileSync(geoPath, 'utf8'))
      for (const [key, entry] of Object.entries(geoData)) {
        if (!entry.name || !entry.name.toLowerCase().includes(term)) continue
        const [level] = key.split(':')           // 'country' | 'region' | 'county'
        const value   = entry.name               // e.g. 'Inner London'
        results.push({ resultType: 'geo', level, value, name: entry.name })
        if (results.length >= lim) return res.json(results)
      }
    } catch (_) { /* geo-content unavailable — skip */ }

    // --- Place rows ---
    for (const row of _placesRows) {
      if (row.name.toLowerCase().includes(term)) {
        results.push({
          resultType:   'place',
          id:           row.id,
          name:         row.name,
          place_type:   row.place_type,
          country:      row.country,
          region:       row.region,
          ctyhistnm:    row.ctyhistnm,
          county_gss:   row.county_gss,
          lad_name:     row.lad_name,
          lad_gss:      row.lad_gss,
          constituency: row.constituency,
          con_gss:      row.con_gss,
          ward:         row.ward,
          ward_gss:     row.ward_gss,
          lat:          row.lat,
          lng:          row.lng,
          summary:      row.summary,
        })
        if (results.length >= lim) break
      }
    }
    return res.json(results)
  } catch (e) {
    console.error('[places/search] error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

// --- Admin: places search + corrections ---

/**
 * Places index — loaded once from newplace.csv on first search request.
 * Stored as Array for ordered iteration; id → index Map for fast lookup.
 */
let _placesRows  = null
let _placesById  = null

const PLACES_CSV       = join(__dirname, 'public', 'data', 'newplace.csv')
const CORRECTIONS_SRC  = join(__dirname, 'public', 'data', 'place-corrections.json')
const CORRECTIONS_DIST = join(__dirname, 'dist',   'data', 'place-corrections.json')

const CSV_HEADER = ['id','name','type','place_type','country','country_gss','region','region_gss',
                    'ctyhistnm','county_gss','lad_name','lad_gss','constituency','con_gss',
                    'ward','ward_gss','lat','lng','summary']

/** Minimal quoted-CSV line parser. Handles double-quote escaping. */
function parseCSVLine(line) {
  const out = []; let cur = ''; let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { if (q && line[i+1] === '"') { cur += '"'; i++ } else q = !q }
    else if (ch === ',' && !q) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}

/** Serialise a field value for CSV — quote if it contains comma, quote, or newline. */
function csvField(val) {
  const s = String(val ?? '')
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? `"${s.replace(/"/g, '""')}"` : s
}

function ensurePlacesLoaded() {
  if (_placesRows) return
  const src  = readFileSync(PLACES_CSV, 'utf8')
  const lines = src.split('\n')
  _placesRows = []
  _placesById = new Map()
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = parseCSVLine(line)
    const row  = {}
    CSV_HEADER.forEach((h, j) => { row[h] = cols[j] ?? '' })
    if (!row.id) continue
    _placesRows.push(row)
    _placesById.set(row.id, row)
  }
  console.log(`[places] loaded ${_placesRows.length} rows`)
}

function readCorrections() {
  try {
    return existsSync(CORRECTIONS_SRC) ? JSON.parse(readFileSync(CORRECTIONS_SRC, 'utf8')) : {}
  } catch { return {} }
}

function writeCorrections(data) {
  const json = JSON.stringify(data, null, 2)
  if (existsSync(CORRECTIONS_DIST)) writeFileSync(CORRECTIONS_DIST, json, 'utf8')
  writeFileSync(CORRECTIONS_SRC, json, 'utf8')
}

/**
 * GET /api/admin/places
 * Query params: q, country, type (place_type), missing (constituency|type|county_gss|summary), page, limit
 * Returns: { total, page, limit, results[] }
 */
app.get('/api/admin/places', (req, res) => {
  try {
    ensurePlacesLoaded()
    const { q = '', country = '', type = '', missing = '', page = '0', limit = '50' } = req.query
    const pg  = Math.max(0, parseInt(page, 10)  || 0)
    const lim = Math.min(200, parseInt(limit, 10) || 50)
    const term = q.toLowerCase().trim()

    const filtered = _placesRows.filter(row => {
      if (term    && !row.name.toLowerCase().includes(term))   return false
      if (country && row.country !== country)                  return false
      if (type    && row.place_type !== type)                  return false
      if (missing === 'constituency' && row.constituency)      return false
      if (missing === 'type'         && row.place_type)        return false
      if (missing === 'county_gss'   && row.county_gss)        return false
      if (missing === 'summary'      && row.summary)           return false
      return true
    })

    const results = filtered.slice(pg * lim, pg * lim + lim)
    return res.json({ total: filtered.length, page: pg, limit: lim, results })
  } catch (e) {
    console.error('[places] search error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

/**
 * GET /api/admin/places/corrections
 * Returns the full corrections map.
 */
app.get('/api/admin/places/corrections', (req, res) => {
  return res.json(readCorrections())
})

/**
 * PATCH /api/admin/places/:id
 * Writes corrected fields to:
 *   1. In-memory row index (immediate search reflection)
 *   2. place-corrections.json (per-record current state — dirty data audit/backup)
 *   3. newplace.csv (master dataset — full file rewrite)
 * corrections.json holds the current corrected state for each touched record,
 * not a history. Each save overwrites the previous state for that record.
 */
const PLACE_EDITABLE = new Set(['place_type','summary','constituency','con_gss','ward','ward_gss','county_gss'])
const PLACES_CSV_DIST = join(__dirname, 'dist', 'data', 'newplace.csv')

/** Serialise all in-memory rows back to CSV.
 *  dist/ is the live path — written first. public/ is source-of-record for rebuilds.
 */
function writeCSV() {
  const lines = [CSV_HEADER.join(',')]
  for (const row of _placesRows) {
    lines.push(CSV_HEADER.map(h => csvField(row[h] ?? '')).join(','))
  }
  const out = lines.join('\n') + '\n'
  if (existsSync(PLACES_CSV_DIST)) writeFileSync(PLACES_CSV_DIST, out, 'utf8')
  writeFileSync(PLACES_CSV, out, 'utf8')
}

app.patch('/api/admin/places/:id', (req, res) => {
  const { id }  = req.params
  const updates = req.body
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ error: 'Body must be a plain object' })
  }
  try {
    ensurePlacesLoaded()
    if (!_placesById.has(id)) return res.status(404).json({ error: `Place not found: ${id}` })

    // Strip non-editable keys
    const safe = {}
    for (const [k, v] of Object.entries(updates)) {
      if (PLACE_EDITABLE.has(k)) safe[k] = v
    }

    // 1. Update in-memory row
    const row = _placesById.get(id)
    Object.assign(row, safe)

    // 2. Write delta file — current corrected state per record, overwrites previous
    const corr = readCorrections()
    corr[id] = { ...(corr[id] ?? {}), ...safe }
    writeCorrections(corr)

    // 3. Commit to master CSV
    writeCSV()

    console.log(`[places] committed: ${id}`)
    return res.json({ ok: true })
  } catch (e) {
    console.error('[places] patch error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

// --- Admin: geo-content editor ---

/**
 * PATCH /api/admin/geo-content/:key
 * Merges field updates into geo-content.json.
 * Writes to public/data/ (source) and dist/data/ (served) if both exist.
 * key format: type:slug  e.g. county:Aberdeenshire
 */
const GEO_CONTENT_SRC  = join(__dirname, 'public', 'data', 'geo-content.json')
const GEO_CONTENT_DIST = join(__dirname, 'dist',   'data', 'geo-content.json')

app.patch('/api/admin/geo-content/:key', (req, res) => {
  const { key }   = req.params
  const updates   = req.body
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ error: 'Body must be a plain object' })
  }
  try {
    if (!existsSync(GEO_CONTENT_SRC)) {
      return res.status(500).json({ error: 'geo-content.json source not found' })
    }
    const content = JSON.parse(readFileSync(GEO_CONTENT_SRC, 'utf8'))
    if (!content[key]) {
      return res.status(404).json({ error: `Key not found: ${key}` })
    }
    content[key] = { ...content[key], ...updates }
    const json = JSON.stringify(content, null, 2)
    if (existsSync(GEO_CONTENT_DIST)) writeFileSync(GEO_CONTENT_DIST, json, 'utf8')
    writeFileSync(GEO_CONTENT_SRC, json, 'utf8')
    console.log(`[admin] geo-content updated: ${key}`)
    return res.json({ ok: true })
  } catch (e) {
    console.error('[admin] geo-content patch error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

// --- Admin: MongoDB geo-content upsert ---

/**
 * PATCH /api/admin/geo-content-mongo/:type/:slug
 * Upserts a geo_content document in MongoDB.
 * Body may include any subset of: summary, extract, thumbnail, wikiUrl, geoData.
 * Always sets updatedAt. Returns { ok: true } or error JSON.
 */
const GEO_CONTENT_MONGO_EDITABLE = new Set(['summary', 'extract', 'thumbnail', 'wikiUrl', 'geoData'])

app.patch('/api/admin/geo-content-mongo/:type/:slug', async (req, res) => {
  const { type, slug } = req.params
  if (!ALLOWED_CONTENT_TYPES.has(type)) {
    return res.status(400).json({ error: 'Invalid content type' })
  }
  const updates = req.body
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ error: 'Body must be a plain object' })
  }
  const col = geoContent()
  if (!col) return res.status(503).json({ error: 'MongoDB unavailable' })

  try {
    const safe = { updatedAt: new Date() }
    for (const [k, v] of Object.entries(updates)) {
      if (GEO_CONTENT_MONGO_EDITABLE.has(k)) safe[k] = v
    }
    await col.updateOne(
      { type, slug },
      { $set: { type, slug, ...safe } },
      { upsert: true }
    )
    // Bust in-memory cache so next request reflects the new data
    contentCache.delete(`${type}:${slug}`)
    console.log(`[admin] geo-content-mongo upserted: ${type}:${slug}`)
    return res.json({ ok: true })
  } catch (err) {
    console.error('[admin] geo-content-mongo patch error:', err.message)
    return res.status(500).json({ error: err.message })
  }
})

// --- SPA catch-all ---
// Any route not matched above returns index.html
// React Router handles routing on the client
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

// --- Start ---
connectMongo().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`UKCP running on http://localhost:${PORT}`)
  })
})
