/**
 * @file routes/places.js
 * @description Place search and admin correction routes.
 *
 * GET  /api/places/search           -- Public typeahead. Searches geo-content.json
 *                                      (countries/regions/counties) then MongoDB places.
 * GET  /api/admin/places            -- Admin paginated search with filters.
 * GET  /api/admin/places/corrections -- All places flagged _corrected:true.
 * PATCH /api/admin/places/:id       -- Update editable fields on a places document.
 */

import { Router }   from 'express'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { placesCol } from '../db/mongo.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const ROOT_DIR   = join(__dirname, '..')

const router = Router()

const PLACE_EDITABLE = new Set([
  'place_type', 'summary', 'constituency', 'con_gss', 'ward', 'ward_gss',
  'county_gss', 'area', 'elevation', 'website', 'notable_facts', 'category_tags', 'gather_status',
])

// ── GET /api/places/search ────────────────────────────────────────────────────

router.get('/places/search', async (req, res) => {
  try {
    const { q = '', limit = '10' } = req.query
    const term = q.trim()
    if (term.length < 2) return res.json([])
    const lim     = Math.min(20, parseInt(limit, 10) || 10)
    const results = []

    // Geo entries first (countries, regions, counties) so named areas
    // like "London" surface above individual place rows.
    try {
      const geoPath = join(ROOT_DIR, 'public', 'data', 'geo-content.json')
      const geoData = JSON.parse(readFileSync(geoPath, 'utf8'))
      for (const [key, entry] of Object.entries(geoData)) {
        if (!entry.name || !entry.name.toLowerCase().includes(term.toLowerCase())) continue
        const [level] = key.split(':')
        results.push({ resultType: 'geo', level, value: entry.name, name: entry.name })
        if (results.length >= lim) return res.json(results)
      }
    } catch (_) { /* geo-content unavailable -- skip */ }

    // Place rows from MongoDB.
    const col = placesCol()
    if (col) {
      const remaining = lim - results.length
      const docs      = await col
        .find({ name: { $regex: term, $options: 'i' } })
        .limit(remaining)
        .project({
          name:1, place_type:1, country:1, region:1, ctyhistnm:1, county_gss:1,
          lad_name:1, lad_gss:1, constituency:1, con_gss:1, ward:1, ward_gss:1,
          lat:1, lng:1, summary:1,
        })
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

// ── GET /api/admin/places ─────────────────────────────────────────────────────

router.get('/admin/places', async (req, res) => {
  const col = placesCol()
  if (!col) return res.status(503).json({ error: 'MongoDB unavailable' })
  try {
    const { q = '', country = '', type = '', missing = '', page = '0', limit = '50' } = req.query
    const pg  = Math.max(0, parseInt(page,  10) || 0)
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

// ── GET /api/admin/places/corrections ────────────────────────────────────────

router.get('/admin/places/corrections', async (req, res) => {
  const col = placesCol()
  if (!col) return res.status(503).json({ error: 'MongoDB unavailable' })
  try {
    const docs = await col
      .find({ _corrected: true })
      .project({
        place_type:1, summary:1, constituency:1, con_gss:1, ward:1, ward_gss:1, county_gss:1,
      })
      .toArray()
    const map = {}
    for (const { _id, ...fields } of docs) map[_id] = fields
    return res.json(map)
  } catch (e) {
    console.error('[places] corrections error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

// ── PATCH /api/admin/places/:id ───────────────────────────────────────────────

router.patch('/admin/places/:id', async (req, res) => {
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

export default router
