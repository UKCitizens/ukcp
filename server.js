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

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer as createHttpsServer } from 'https'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { MongoClient, ObjectId } from 'mongodb'
import cookieParser        from 'cookie-parser'
import { createClient }    from '@supabase/supabase-js'
import { randomUUID }      from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// --- MongoDB ---
// One client, one connection, reused for all requests.
// If Mongo is unavailable at startup, server continues — only Mongo-backed routes degrade.

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'
const mongoClient = new MongoClient(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:          10000,
  connectTimeoutMS:         5000,
})
let db = null

async function connectMongo() {
  try {
    await mongoClient.connect()
    db = mongoClient.db('ukcp')
    await db.collection('geo_content').createIndex({ type: 1, slug: 1 }, { unique: true })
    await db.collection('users').createIndex({ supabase_id: 1 }, { unique: true })
    await db.collection('users').createIndex({ email: 1 }, { unique: true })
    await db.collection('anon_device_cookies').createIndex({ token: 1 }, { unique: true })
    await db.collection('anon_device_cookies').createIndex({ user_id: 1 })
    console.log('MongoDB connected')
  } catch (err) {
    console.error('[mongo] connection failed — continuing without MongoDB:', err.message)
    db = null
  }
}

// --- Supabase Admin Client ---
// Used server-side only for JWT validation and user creation. Service role key required.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/** Returns the geo_content collection, or null if Mongo is unavailable. */
function geoContent() {
  return db ? db.collection('geo_content') : null
}

/** Returns the places collection, or null if Mongo is unavailable. */
function placesCol() {
  return db ? db.collection('places') : null
}

/** Returns the users collection, or null if Mongo is unavailable. */
function usersCol() {
  return db ? db.collection('users') : null
}

/** Returns the anon_device_cookies collection, or null if Mongo is unavailable. */
function anonCookiesCol() {
  return db ? db.collection('anon_device_cookies') : null
}

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }))
app.use(express.json())

// --- Cookie parser ---
app.use(cookieParser())

// --- Device cookie middleware ---
// Runs on every request. Sets a long-lived device cookie if not present.
// Creates an anon_device_cookies record in Mongo.
// Does not block the request -- failure is silent (cookie features degrade gracefully).

const DEVICE_COOKIE_NAME    = 'ukcp_device'
const DEVICE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000

async function deviceCookieMiddleware(req, res, next) {
  try {
    let token = req.cookies[DEVICE_COOKIE_NAME]

    if (!token) {
      token = randomUUID()
      res.cookie(DEVICE_COOKIE_NAME, token, {
        httpOnly:  true,
        sameSite:  'lax',
        maxAge:    DEVICE_COOKIE_MAX_AGE,
        secure:    process.env.NODE_ENV === 'production',
      })

      const col = anonCookiesCol()
      if (col) {
        await col.insertOne({
          token,
          user_id:    null,
          created_at: new Date(),
          last_seen:  new Date(),
          ip:         req.ip ?? null,
        })
      }
    } else {
      const col = anonCookiesCol()
      if (col) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        await col.updateOne(
          { token, last_seen: { $lt: oneHourAgo } },
          { $set: { last_seen: new Date() } }
        )
      }
    }

    req.deviceToken = token
  } catch (err) {
    console.error('[device-cookie]', err.message)
  }

  next()
}

app.use(deviceCookieMiddleware)

// --- Auth middleware ---
// Validates the Supabase JWT via the admin client (handles ECC P-256 automatically).
// On valid token: looks up or creates the MongoDB users record, attaches to req.user.
// On invalid token: 401.

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.slice(7)

  const { data: { user: sbUser }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !sbUser) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const supabase_id = sbUser.id
  const col = usersCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  let user = await col.findOne({ supabase_id })

  if (!user) {
    const email = sbUser.email ?? null
    const now   = new Date()

    const doc = {
      supabase_id,
      email,
      display_name:            email ? email.split('@')[0] : 'citizen',
      username:                null,
      avatar_url:              null,
      bio:                     null,
      access_tier:             'seen',
      is_verified:             false,
      verification_method:     null,
      home_ward_gss:           null,
      home_constituency_gss:   null,
      default_post_visibility: 'anonymous',
      device_cookie_id:        null,
      is_active:               true,
      is_suspended:            false,
      created_at:              now,
      updated_at:              now,
    }

    const result = await col.insertOne(doc)
    user = { ...doc, _id: result.insertedId }

    const cookieCol = anonCookiesCol()
    if (cookieCol && req.deviceToken) {
      await cookieCol.updateOne(
        { token: req.deviceToken, user_id: null },
        { $set: { user_id: result.insertedId } }
      )
      await col.updateOne(
        { _id: result.insertedId },
        { $set: { device_cookie_id: req.deviceToken } }
      )
    }
  }

  req.user = user
  next()
}

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
            contentType:  doc.summary ? 'curated' : 'wiki',
            summary:      doc.summary ?? null,
            extract:      doc.extract ?? null,
            thumbnail:    doc.thumbnail ?? null,
            title:        doc.name ?? slug,
            wikiUrl:      doc.wikiUrl ?? null,
            mpName:       null,
            party:        null,
            partyColour:  null,
            population:   doc.population ?? null,
            area:          doc.area          ?? null,
            elevation:     doc.elevation     ?? null,
            website:       doc.website       ?? null,
            notable_facts: doc.notable_facts ?? [],
            category_tags: doc.category_tags ?? [],
            gather_status: doc.gather_status ?? 'none',
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
        headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
        signal: AbortSignal.timeout(8000),
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
          const wdResp = await fetch(wdUrl, {
            headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
            signal: AbortSignal.timeout(8000),
          })
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
      headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
      signal: AbortSignal.timeout(8000),
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
      const wdResp = await fetch(wdUrl, {
        headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
        signal: AbortSignal.timeout(8000),
      })
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
      contentType:   'wiki',
      extract:       wiki.extract   ?? null,
      thumbnail:     wiki.thumbnail?.source ?? null,
      title:         wiki.title     ?? slug,
      wikiUrl:       wiki.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${slug}`,
      mpName:        null,
      party:         null,
      partyColour:   null,
      population,
      area:          null,
      elevation:     null,
      website:       null,
      notable_facts: [],
      category_tags: [],
      gather_status: 'none',
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
    const resp = await fetch(nomisUrl, {
      headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
      signal: AbortSignal.timeout(8000),
    })
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
app.get('/api/places/search', async (req, res) => {
  try {
    const { q = '', limit = '10' } = req.query
    const term = q.trim()
    if (term.length < 2) return res.json([])
    const lim = Math.min(20, parseInt(limit, 10) || 10)
    const results = []

    // --- Geo entries first (countries, regions, counties) ---
    try {
      const geoPath = join(__dirname, 'public', 'data', 'geo-content.json')
      const geoData = JSON.parse(readFileSync(geoPath, 'utf8'))
      for (const [key, entry] of Object.entries(geoData)) {
        if (!entry.name || !entry.name.toLowerCase().includes(term.toLowerCase())) continue
        const [level] = key.split(':')           // 'country' | 'region' | 'county'
        results.push({ resultType: 'geo', level, value: entry.name, name: entry.name })
        if (results.length >= lim) return res.json(results)
      }
    } catch (_) { /* geo-content unavailable — skip */ }

    // --- Place rows from MongoDB ---
    const col = placesCol()
    if (col) {
      const remaining = lim - results.length
      const docs = await col
        .find({ name: { $regex: term, $options: 'i' } })
        .limit(remaining)
        .project({ name:1, place_type:1, country:1, region:1, ctyhistnm:1, county_gss:1,
                   lad_name:1, lad_gss:1, constituency:1, con_gss:1, ward:1, ward_gss:1,
                   lat:1, lng:1, summary:1 })
        .toArray()
      for (const { _id, ...fields } of docs) {
        results.push({ resultType: 'place', id: _id, ...fields })
      }
    }
    return res.json(results)
  } catch (e) {
    console.error('[places/search] error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

// --- Admin: places search + corrections (MongoDB) ---

const PLACE_EDITABLE = new Set(['place_type','summary','constituency','con_gss','ward','ward_gss','county_gss','area','elevation','website','notable_facts','category_tags','gather_status'])

/**
 * GET /api/admin/places
 * Query params: q, country, type (place_type), missing (constituency|type|county_gss|summary), page, limit
 * Returns: { total, page, limit, results[] }
 */
app.get('/api/admin/places', async (req, res) => {
  const col = placesCol()
  if (!col) return res.status(503).json({ error: 'MongoDB unavailable' })
  try {
    const { q = '', country = '', type = '', missing = '', page = '0', limit = '50' } = req.query
    const pg  = Math.max(0, parseInt(page, 10)  || 0)
    const lim = Math.min(200, parseInt(limit, 10) || 50)

    const query = {}
    if (q.trim())                   query.name         = { $regex: q.trim(), $options: 'i' }
    if (country)                    query.country      = country
    if (type)                       query.place_type   = type
    if (missing === 'constituency') query.constituency = ''
    if (missing === 'type')         query.place_type   = ''
    if (missing === 'county_gss')   query.county_gss   = ''
    if (missing === 'summary')      query.summary      = ''

    const total   = await col.countDocuments(query)
    const rawDocs = await col.find(query).skip(pg * lim).limit(lim).toArray()
    const results = rawDocs.map(({ _id, ...fields }) => ({ id: _id, ...fields }))
    return res.json({ total, page: pg, limit: lim, results })
  } catch (e) {
    console.error('[places] search error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

/**
 * GET /api/admin/places/corrections
 * Returns map of { id: { correctedFields } } for all places flagged _corrected: true.
 * Used by PlaceCorrector to render "edited" badge on finder entries.
 */
app.get('/api/admin/places/corrections', async (req, res) => {
  const col = placesCol()
  if (!col) return res.status(503).json({ error: 'MongoDB unavailable' })
  try {
    const docs = await col
      .find({ _corrected: true })
      .project({ place_type:1, summary:1, constituency:1, con_gss:1, ward:1, ward_gss:1, county_gss:1 })
      .toArray()
    const map = {}
    for (const { _id, ...fields } of docs) map[_id] = fields
    return res.json(map)
  } catch (e) {
    console.error('[places] corrections error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

/**
 * PATCH /api/admin/places/:id
 * Updates editable fields on the places document in MongoDB.
 * Sets _corrected: true so the corrections endpoint can identify touched records.
 */
app.patch('/api/admin/places/:id', async (req, res) => {
  const col = placesCol()
  if (!col) return res.status(503).json({ error: 'MongoDB unavailable' })
  const { id }  = req.params
  const updates = req.body
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ error: 'Body must be a plain object' })
  }
  try {
    const safe = {}
    for (const [k, v] of Object.entries(updates)) {
      if (PLACE_EDITABLE.has(k)) safe[k] = v
    }
    const result = await col.updateOne(
      { _id: id },
      { $set: { ...safe, _corrected: true } }
    )
    if (result.matchedCount === 0) return res.status(404).json({ error: `Place not found: ${id}` })
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
const GEO_CONTENT_MONGO_EDITABLE = new Set(['summary', 'extract', 'thumbnail', 'wikiUrl', 'geoData', 'notable_facts', 'category_tags', 'gather_status'])

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

// --- Auth check ---

/**
 * GET /api/auth/check
 * Called by the login page on mount. Reads the httpOnly device cookie and
 * returns whether this device has a record in anon_device_cookies.
 * No auth required — the whole point is to check before the user logs in.
 */
app.get('/api/auth/check', async (req, res) => {
  const token = req.cookies[DEVICE_COOKIE_NAME]
  if (!token) return res.json({ known: false })
  const col = anonCookiesCol()
  if (!col) return res.json({ known: false })
  try {
    const doc = await col.findOne({ token })
    return res.json({ known: !!doc })
  } catch {
    return res.json({ known: false })
  }
})

// --- Admin: user management ---

const USER_EDITABLE = new Set([
  'display_name', 'username', 'avatar_url', 'bio', 'access_tier',
  'is_verified', 'verification_method', 'home_ward_gss', 'home_constituency_gss',
  'default_post_visibility', 'is_active', 'is_suspended', 'status',
])

/**
 * GET /api/admin/users
 * Query params: q (email/display_name search), page, limit
 * Returns: { total, page, limit, results[] }
 */
app.get('/api/admin/users', async (req, res) => {
  const col = usersCol()
  if (!col) return res.status(503).json({ error: 'MongoDB unavailable' })
  try {
    const { q = '', page = '0', limit = '50' } = req.query
    const pg  = Math.max(0, parseInt(page, 10) || 0)
    const lim = Math.min(200, parseInt(limit, 10) || 50)
    const query = q.trim()
      ? { $or: [
          { email:        { $regex: q.trim(), $options: 'i' } },
          { display_name: { $regex: q.trim(), $options: 'i' } },
        ] }
      : {}
    const total   = await col.countDocuments(query)
    const rawDocs = await col.find(query).skip(pg * lim).limit(lim)
      .sort({ created_at: -1 }).toArray()
    const results = rawDocs.map(({ _id, ...fields }) => ({ id: String(_id), ...fields }))
    return res.json({ total, page: pg, limit: lim, results })
  } catch (e) {
    console.error('[admin/users] list error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

/**
 * PATCH /api/admin/users/:id
 * Updates editable fields on a users document. id is the Mongo _id string.
 */
app.patch('/api/admin/users/:id', async (req, res) => {
  const col = usersCol()
  if (!col) return res.status(503).json({ error: 'MongoDB unavailable' })
  let oid
  try { oid = new ObjectId(req.params.id) } catch { return res.status(400).json({ error: 'Invalid id' }) }
  const updates = req.body
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ error: 'Body must be a plain object' })
  }
  try {
    const safe = { updated_at: new Date() }
    for (const [k, v] of Object.entries(updates)) {
      if (USER_EDITABLE.has(k)) safe[k] = v
    }
    const result = await col.updateOne({ _id: oid }, { $set: safe })
    if (result.matchedCount === 0) return res.status(404).json({ error: 'User not found' })
    console.log(`[admin/users] updated: ${req.params.id}`)
    return res.json({ ok: true })
  } catch (e) {
    console.error('[admin/users] patch error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

/**
 * DELETE /api/admin/users/:supabaseId/auth
 * Hard-deletes the user from Supabase auth. Mongo record is untouched --
 * caller should have already set status:'deleted' via PATCH before calling this.
 */
app.delete('/api/admin/users/:supabaseId/auth', async (req, res) => {
  const { supabaseId } = req.params
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(supabaseId)
    if (error) {
      console.error('[admin/users] supabase delete error:', error.message)
      return res.status(502).json({ error: error.message })
    }
    console.log(`[admin/users] supabase auth deleted: ${supabaseId}`)
    return res.json({ ok: true })
  } catch (e) {
    console.error('[admin/users] auth delete error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

// --- Profile routes ---

// GET /api/profile -- returns the authenticated user's profile
app.get('/api/profile', requireAuth, (req, res) => {
  const { _id, email, display_name, username, bio, access_tier,
          is_verified, home_ward_gss, home_constituency_gss,
          default_post_visibility, created_at } = req.user

  res.json({
    id: _id,
    email,
    display_name,
    username,
    bio,
    access_tier,
    is_verified,
    home_ward_gss,
    home_constituency_gss,
    default_post_visibility,
    created_at,
  })
})

// PATCH /api/profile -- update editable profile fields
app.patch('/api/profile', requireAuth, async (req, res) => {
  const allowed = [
    'display_name', 'username', 'bio',
    'default_post_visibility', 'home_ward_gss', 'home_constituency_gss',
  ]

  const update = {}
  for (const field of allowed) {
    if (req.body[field] !== undefined) update[field] = req.body[field]
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' })
  }

  if (update.default_post_visibility &&
      !['anonymous', 'named'].includes(update.default_post_visibility)) {
    return res.status(400).json({ error: 'default_post_visibility must be anonymous or named' })
  }

  update.updated_at = new Date()

  const col = usersCol()
  await col.updateOne({ _id: req.user._id }, { $set: update })

  res.json({ ok: true })
})

// --- SPA catch-all ---
// Any route not matched above returns index.html
// React Router handles routing on the client
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

// --- Start ---
// In local development, run HTTPS if cert.pem and key.pem exist in the project root.
// Generate with: openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
// Browser will warn once on first visit -- click "proceed anyway".
// In production (Railway) the certs are absent and HTTP runs as normal (Railway handles SSL termination).

connectMongo().then(() => {
  const certPath = join(__dirname, 'cert.pem')
  const keyPath  = join(__dirname, 'key.pem')

  if (existsSync(certPath) && existsSync(keyPath)) {
    const HTTPS_PORT = process.env.HTTPS_PORT || 3443
    createHttpsServer(
      { cert: readFileSync(certPath), key: readFileSync(keyPath) },
      app
    ).listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`UKCP running on https://localhost:${HTTPS_PORT} (local SSL)`)
    })
  } else {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`UKCP running on http://localhost:${PORT}`)
    })
  }
})
