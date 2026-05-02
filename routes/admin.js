/**
 * @file routes/admin.js
 * @description Admin routes for geo-content and user management.
 *
 * All routes in this file are Tier 2: requireAuth + requireRole('admin').
 *
 * Router mounted at /api/admin -- all routes below are relative to that prefix.
 *
 * PATCH /api/admin/geo-content/:key                -- Updates geo-content.json on disk.
 * PATCH /api/admin/geo-content-mongo/:type/:slug   -- Upserts geo_content in MongoDB.
 * GET   /api/admin/users                           -- Paginated user list.
 * PATCH /api/admin/users/:id                       -- Update editable user fields.
 * PUT   /api/admin/users/:supabaseId/claims        -- Set Supabase app_metadata claims
 *                                                     (platform_role, affiliated_roles,
 *                                                     display_name, registration_complete)
 *                                                     and mirror to Mongo.
 * DELETE /api/admin/users/:supabaseId/auth         -- Hard-delete from Supabase auth.
 */

import { Router }                                  from 'express'
import { ObjectId }                                from 'mongodb'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath }                           from 'url'
import { dirname, join }                           from 'path'
import { geoContent, usersCol }                    from '../db/mongo.js'
import { supabaseAdmin, requireAuth, requireRole } from '../middleware/auth.js'
import { ALLOWED_CONTENT_TYPES }                   from '../config/constants.js'
import { contentCacheBust }                        from '../cache/contentCache.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const ROOT_DIR   = join(__dirname, '..')

const GEO_CONTENT_SRC  = join(ROOT_DIR, 'public', 'data', 'geo-content.json')
const GEO_CONTENT_DIST = join(ROOT_DIR, 'dist',   'data', 'geo-content.json')

const router = Router()

// Every route on this router is admin-only.
router.use(requireAuth, requireRole('admin'))

const PLATFORM_ROLES = new Set(['citizen', 'affiliated', 'admin'])

const GEO_CONTENT_MONGO_EDITABLE = new Set([
  'summary', 'extract', 'thumbnail', 'wikiUrl', 'geoData',
  'notable_facts', 'category_tags', 'gather_status',
  'b1',
])

const USER_EDITABLE = new Set([
  'display_name', 'username', 'avatar_url', 'bio', 'access_tier',
  'is_verified', 'verification_method', 'home_ward_gss', 'home_constituency_gss',
  'default_post_visibility', 'is_active', 'is_suspended', 'status',
])

// ── PATCH /api/admin/geo-content/:key ────────────────────────────────────────
// Merges field updates into geo-content.json on disk.
// Writes to public/data/ (source) and dist/data/ (served) if both exist.

router.patch('/geo-content/:key', (req, res) => {
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
    const json   = JSON.stringify(content, null, 2)
    if (existsSync(GEO_CONTENT_DIST)) writeFileSync(GEO_CONTENT_DIST, json, 'utf8')
    writeFileSync(GEO_CONTENT_SRC, json, 'utf8')
    console.log(`[admin] geo-content updated: ${key}`)
    return res.json({ ok: true })
  } catch (e) {
    console.error('[admin] geo-content patch error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

// ── PATCH /api/admin/geo-content-mongo/:type/:slug ───────────────────────────
// Upserts a geo_content document in MongoDB.
// Busts the in-memory content cache so edits surface immediately.

router.patch('/geo-content-mongo/:type/:slug', async (req, res) => {
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
    contentCacheBust(`${type}:${slug}`)
    console.log(`[admin] geo-content-mongo upserted: ${type}:${slug}`)
    return res.json({ ok: true })
  } catch (err) {
    console.error('[admin] geo-content-mongo patch error:', err.message)
    return res.status(500).json({ error: err.message })
  }
})

// ── GET /api/admin/users ──────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  const col = usersCol()
  if (!col) return res.status(503).json({ error: 'MongoDB unavailable' })
  try {
    const { q = '', page = '0', limit = '50' } = req.query
    const pg  = Math.max(0, parseInt(page,  10) || 0)
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

// ── PATCH /api/admin/users/:id ────────────────────────────────────────────────

router.patch('/users/:id', async (req, res) => {
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

// ── PUT /api/admin/users/:supabaseId/claims ───────────────────────────────────
// Writes platform claims to Supabase app_metadata (server-controlled, JWT-carried).
// Mirrors the same fields onto the Mongo users record so reads stay consistent
// without round-tripping to Supabase.

router.put('/users/:supabaseId/claims', async (req, res) => {
  const { supabaseId } = req.params
  const body = req.body ?? {}

  const platform_role         = body.platform_role
  const affiliated_roles      = body.affiliated_roles
  const display_name          = body.display_name
  const registration_complete = body.registration_complete

  if (!PLATFORM_ROLES.has(platform_role)) {
    return res.status(400).json({ error: `platform_role must be one of: ${[...PLATFORM_ROLES].join(', ')}` })
  }
  if (affiliated_roles !== undefined && !Array.isArray(affiliated_roles)) {
    return res.status(400).json({ error: 'affiliated_roles must be an array of strings' })
  }
  if (affiliated_roles && affiliated_roles.some(r => typeof r !== 'string')) {
    return res.status(400).json({ error: 'affiliated_roles must be an array of strings' })
  }

  const claims = {
    platform_role,
    affiliated_roles:      affiliated_roles ?? [],
    display_name:          typeof display_name === 'string' ? display_name : '',
    registration_complete: !!registration_complete,
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(supabaseId, {
      app_metadata: claims,
    })
    if (error) {
      console.error('[admin/users/claims] supabase update error:', error.message)
      return res.status(502).json({ error: error.message })
    }
  } catch (e) {
    console.error('[admin/users/claims] supabase update threw:', e.message)
    return res.status(502).json({ error: e.message })
  }

  // Mirror to Mongo. Best-effort -- Supabase is the source of truth for claims.
  const col = usersCol()
  if (col) {
    try {
      await col.updateOne(
        { supabase_id: supabaseId },
        {
          $set: {
            platform_role:         claims.platform_role,
            affiliated_roles:      claims.affiliated_roles,
            registration_complete: claims.registration_complete,
            updated_at:            new Date(),
            // Only mirror display_name if a non-empty value was supplied --
            // avoids overwriting an existing display_name with ''.
            ...(claims.display_name ? { display_name: claims.display_name } : {}),
          },
        }
      )
    } catch (e) {
      console.error('[admin/users/claims] mongo mirror error:', e.message)
    }
  }

  console.log(`[admin/users/claims] set: ${supabaseId} -> ${claims.platform_role}`)
  return res.json({ ok: true })
})

// ── DELETE /api/admin/users/:supabaseId/auth ──────────────────────────────────
// Hard-deletes from Supabase auth. Mongo record is untouched --
// caller should set status:'deleted' via PATCH before calling this.

router.delete('/users/:supabaseId/auth', async (req, res) => {
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

export default router
