/**
 * @file routes/posts.js
 * @description Posts API. Source of truth: UKCP/Ali/post-design-note.md.
 *
 *   GET    /api/posts/config          -- public, returns post_type_config docs
 *   GET    /api/posts                 -- public, list by origin
 *   POST   /api/posts                 -- auth, create
 *   PATCH  /api/posts/:id/react       -- auth, increment a reaction count
 *   POST   /api/posts/:id/flag        -- auth, flag (auto-shadow at threshold)
 *   DELETE /api/posts/:id             -- auth, soft-delete (author or admin)
 *
 * Anonymous posts: author.user_id is always stored for accountability and
 * scrubbed only in API responses (replaced with null + display_name 'Anonymous').
 */

import { Router }      from 'express'
import { ObjectId }    from 'mongodb'
import { requireAuth } from '../middleware/auth.js'
import {
  postsCol, postTypeConfigCol,
  schoolsCol, committeeForumsCol, networkChaptersCol, placesCol,
} from '../db/mongo.js'

const REACH_HIERARCHY       = ['origin', 'ward', 'constituency', 'county', 'region', 'national']
const REACTION_TYPES        = ['agree', 'disagree', 'support', 'flag_concern']
const FLAG_SHADOW_THRESHOLD = 5

const router = Router()

/** Returns the post with author identity scrubbed if it is anonymous. */
function scrubAuthor(post) {
  if (!post?.author?.is_anonymous) return post
  return {
    ...post,
    author: { ...post.author, user_id: null, display_name: 'Anonymous' },
  }
}

/**
 * Resolve a geo_scope from the entity record when the caller did not supply one.
 * Returns null if the entity_type is unsupported or the lookup yields nothing.
 *
 *   school          -- ward_gss / con_gss / la_gss read directly from the school doc
 *   committee       -- con_gss / region read directly from the committee_forum doc
 *   network_chapter -- chapter location_scope (slug-only) -> places lookup for GSS
 */
async function backfillGeoScope(entity_type, entity_id) {
  if (entity_type === 'school') {
    const col = schoolsCol(); if (!col) return null
    const sch = await col.findOne(
      { urn: String(entity_id) },
      { projection: { ward_gss: 1, con_gss: 1, la_gss: 1 } }
    )
    if (!sch) return null
    return {
      ward_gss:         sch.ward_gss ?? null,
      constituency_gss: sch.con_gss  ?? null,
      county_gss:       sch.la_gss   ?? null,
      region:           null,
      country:          null,
    }
  }
  if (entity_type === 'committee') {
    if (!ObjectId.isValid(entity_id)) return null
    const col = committeeForumsCol(); if (!col) return null
    const cf = await col.findOne(
      { _id: new ObjectId(entity_id) },
      { projection: { con_gss: 1, region: 1, country: 1 } }
    )
    if (!cf) return null
    return {
      ward_gss:         null,
      constituency_gss: cf.con_gss ?? null,
      county_gss:       null,
      region:           cf.region  ?? null,
      country:          cf.country ?? null,
    }
  }
  if (entity_type === 'network_chapter') {
    if (!ObjectId.isValid(entity_id)) return null
    const ncCol = networkChaptersCol(); if (!ncCol) return null
    const ch = await ncCol.findOne(
      { _id: new ObjectId(entity_id) },
      { projection: { location_scope: 1 } }
    )
    if (!ch?.location_scope?.slug) return null
    const placeName  = String(ch.location_scope.slug).replace(/_/g, ' ')
    const tier       = ch.location_scope.type
    const plCol      = placesCol(); if (!plCol) return null
    const placeQuery =
      tier === 'ward'         ? { ward:         placeName } :
      tier === 'constituency' ? { constituency: placeName } :
      tier === 'county'       ? { lad_name:     placeName } : null
    const pl = placeQuery
      ? await plCol.findOne(placeQuery, { projection: { ward_gss: 1, con_gss: 1, lad_gss: 1, region: 1, country: 1 } })
      : null
    return {
      ward_gss:         pl?.ward_gss ?? null,
      constituency_gss: pl?.con_gss  ?? null,
      county_gss:       pl?.lad_gss  ?? null,
      region:           pl?.region   ?? null,
      country:          pl?.country  ?? null,
    }
  }
  return null
}

/** Clamp a reach value into the [floor, ceiling] window. Returns null if value is unknown. */
function clampReach(value, floor, ceiling) {
  const idx = REACH_HIERARCHY.indexOf(value)
  if (idx < 0) return null
  const lo = Math.max(REACH_HIERARCHY.indexOf(floor),   0)
  const hiRaw = REACH_HIERARCHY.indexOf(ceiling)
  const hi = hiRaw < 0 ? REACH_HIERARCHY.length - 1 : hiRaw
  if (idx < lo) return REACH_HIERARCHY[lo]
  if (idx > hi) return REACH_HIERARCHY[hi]
  return value
}

// GET /api/posts/config -- Tier 0
router.get('/config', async (req, res) => {
  const cfgCol = postTypeConfigCol()
  if (!cfgCol) return res.status(503).json({ error: 'Database unavailable' })
  const configs = await cfgCol.find({}, { projection: { _id: 0 } }).toArray()
  res.json(configs)
})

// GET /api/posts -- Tier 0
router.get('/', async (req, res) => {
  const { entity_type, entity_id, reach } = req.query
  const page  = Math.max(parseInt(req.query.page  ?? '1',  10), 1)
  const limit = Math.min(Math.max(parseInt(req.query.limit ?? '20', 10), 1), 50)

  if (!entity_type || !entity_id) {
    return res.status(400).json({ error: 'entity_type and entity_id are required' })
  }

  const pstCol = postsCol()
  if (!pstCol) return res.status(503).json({ error: 'Database unavailable' })

  const filter = {
    'origin.entity_type': String(entity_type),
    'origin.entity_id':   String(entity_id),
    status:               'active',
  }
  if (reach) filter.reach_effective = String(reach)

  const total = await pstCol.countDocuments(filter)
  const posts = await pstCol.find(filter)
    .sort({ created_at: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray()

  res.json({ posts: posts.map(scrubAuthor), total, page, limit })
})

// POST /api/posts -- Tier 1
router.post('/', requireAuth, async (req, res) => {
  const { post_type, body, origin, reach_set, is_anonymous, meta } = req.body

  if (typeof body !== 'string' || body.trim().length === 0) {
    return res.status(400).json({ error: 'body is required' })
  }
  if (body.length > 2000) {
    return res.status(400).json({ error: 'body exceeds 2000 characters' })
  }
  if (!post_type || typeof post_type !== 'string') {
    return res.status(400).json({ error: 'post_type is required' })
  }
  if (!origin?.entity_type || !origin?.entity_id) {
    return res.status(400).json({ error: 'origin.entity_type and origin.entity_id are required' })
  }

  const cfgCol = postTypeConfigCol()
  const pstCol = postsCol()
  if (!cfgCol || !pstCol) return res.status(503).json({ error: 'Database unavailable' })

  // Resolve geo_scope: caller-supplied values win; fall back to entity lookup
  // for the well-known entity types (school / committee / network_chapter).
  const supplied = origin.geo_scope ?? {}
  let geoScope = {
    ward_gss:         supplied.ward_gss         ?? null,
    constituency_gss: supplied.constituency_gss ?? null,
    county_gss:       supplied.county_gss       ?? null,
    region:           supplied.region           ?? null,
    country:          supplied.country          ?? null,
  }
  if (!geoScope.ward_gss && !geoScope.constituency_gss && !geoScope.county_gss) {
    const backfill = await backfillGeoScope(origin.entity_type, origin.entity_id)
    if (backfill) geoScope = backfill
  }
  if (!geoScope.ward_gss && !geoScope.constituency_gss && !geoScope.county_gss) {
    return res.status(400).json({
      error: 'origin.geo_scope must include at least one of ward_gss, constituency_gss, county_gss',
    })
  }

  const config = await cfgCol.findOne({ post_type })
  if (!config) {
    return res.status(400).json({ error: `Unknown post_type: ${post_type}` })
  }

  if (config.affiliated_only && !['affiliated', 'admin'].includes(req.claims.platform_role)) {
    return res.status(403).json({ error: `post_type "${post_type}" requires affiliated or admin role` })
  }

  // Resolve reach. user_override=false -> always default. true -> clamped reach_set.
  let reach_effective = config.reach_default
  if (config.user_override && reach_set) {
    const clamped = clampReach(reach_set, config.reach_floor, config.reach_ceiling)
    if (!clamped) {
      return res.status(400).json({ error: `Invalid reach value: ${reach_set}` })
    }
    reach_effective = clamped
  }

  const now    = new Date()
  const isAnon = Boolean(is_anonymous)

  const doc = {
    post_type,
    body: body.trim(),
    author: {
      user_id:      req.user._id,
      display_name: req.claims.display_name || req.user.display_name || null,
      is_anonymous: isAnon,
      persona:      req.claims.platform_role === 'affiliated' ? 'affiliated' : 'citizen',
    },
    created_at: now,
    updated_at: now,
    edited:     false,

    origin: {
      entity_type: String(origin.entity_type),
      entity_id:   String(origin.entity_id),
      entity_name: origin.entity_name ?? null,
      geo_scope:   geoScope,
    },

    reach_default:   config.reach_default,
    reach_set:       (config.user_override && reach_set) ? reach_set : null,
    reach_effective,
    reach_floor:     config.reach_floor,
    reach_ceiling:   config.reach_ceiling,

    reaction_counts: {},
    reply_count:     0,
    reach_score:     0,

    status:                   'active',
    flagged_by:               [],
    national_feed_suppressed: false,

    meta: meta && typeof meta === 'object' ? meta : {},
  }

  const result = await pstCol.insertOne(doc)
  res.status(201).json(scrubAuthor({ ...doc, _id: result.insertedId }))
})

// PATCH /api/posts/:id/react -- Tier 1
router.patch('/:id/react', requireAuth, async (req, res) => {
  const { id }            = req.params
  const { reaction_type } = req.body

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid post id' })
  }
  if (!REACTION_TYPES.includes(reaction_type)) {
    return res.status(400).json({ error: `Invalid reaction_type. Allowed: ${REACTION_TYPES.join(', ')}` })
  }

  const pstCol = postsCol()
  if (!pstCol) return res.status(503).json({ error: 'Database unavailable' })

  const result = await pstCol.updateOne(
    { _id: new ObjectId(id), status: 'active' },
    {
      $inc: {
        [`reaction_counts.${reaction_type}`]: 1,
        reach_score:                          1,
      },
      $set: { updated_at: new Date() },
    }
  )

  if (result.matchedCount === 0) {
    return res.status(404).json({ error: 'Post not found or not active' })
  }
  res.json({ ok: true })
})

// POST /api/posts/:id/flag -- Tier 1
router.post('/:id/flag', requireAuth, async (req, res) => {
  const { id } = req.params
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid post id' })
  }

  const pstCol = postsCol()
  if (!pstCol) return res.status(503).json({ error: 'Database unavailable' })

  const updated = await pstCol.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $addToSet: { flagged_by: req.user._id },
      $inc:      { reach_score: -1 },
      $set:      { updated_at: new Date() },
    },
    { returnDocument: 'after' }
  )

  if (!updated) return res.status(404).json({ error: 'Post not found' })

  if (updated.status === 'active' && (updated.flagged_by?.length ?? 0) >= FLAG_SHADOW_THRESHOLD) {
    await pstCol.updateOne(
      { _id: updated._id },
      { $set: { status: 'shadow', updated_at: new Date() } }
    )
  }
  res.json({ ok: true })
})

// DELETE /api/posts/:id -- Tier 1
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid post id' })
  }

  const pstCol = postsCol()
  if (!pstCol) return res.status(503).json({ error: 'Database unavailable' })

  const post = await pstCol.findOne({ _id: new ObjectId(id) })
  if (!post) return res.status(404).json({ error: 'Post not found' })

  const isAuthor = post.author?.user_id && req.user._id.equals(post.author.user_id)
  const isAdmin  = req.claims.platform_role === 'admin'
  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  await pstCol.updateOne(
    { _id: post._id },
    { $set: { status: 'removed', updated_at: new Date() } }
  )
  res.json({ ok: true })
})

export default router
