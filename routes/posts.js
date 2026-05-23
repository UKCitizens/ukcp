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

import { Router }                        from 'express'
import { ObjectId }                      from 'mongodb'
import { requireAuth, supabaseAdmin }    from '../middleware/auth.js'
import {
  postsCol, postTypeConfigCol,
  schoolsCol, committeeForumsCol, networkChaptersCol, placesCol,
  notificationsCol, veracityVotesCol, postReactionsCol, usersCol,
} from '../db/mongo.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const REACH_HIERARCHY       = ['origin', 'ward', 'constituency', 'county', 'region', 'national']
const REACTION_TYPES        = ['agree', 'disagree', 'support', 'flag_concern']
const FLAG_SHADOW_THRESHOLD = 5

const router = Router()

/** Returns the post with author identity scrubbed if it is anonymous. */
// viewerUserId: ObjectId or null. Adds is_mine flag; scrubs user_id only when anon AND not the author.
function scrubAuthor(post, viewerUserId = null) {
  const authorId   = post?.author?.user_id
  const isMine     = viewerUserId && authorId && viewerUserId.equals(authorId)
  const isAnon     = Boolean(post?.author?.is_anonymous)
  const scrubId    = isAnon && !isMine

  return {
    ...post,
    is_mine: Boolean(isMine),
    author:  scrubId
      ? { ...post.author, user_id: null, display_name: 'Anonymous' }
      : post.author,
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

// GET /api/posts/link-preview?url= -- Tier 0, no auth required
// Parses OG tags, JSON-LD, and title via node-html-parser (DOM queries, not regex).
// Priority: JSON-LD article data > OG > twitter > title. Entities decoded at extraction.
router.get('/link-preview', asyncHandler(async (req, res) => {
  const { url } = req.query
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'Invalid URL' })
  }
  try {
    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), 8000)
    const r = await fetch(url, {
      signal:  controller.signal,
      headers: {
        'User-Agent':      'Mozilla/5.0 (compatible; UKCPBot/1.0; +https://ukcitizensportal.org)',
        'Accept':          'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      redirect: 'follow',
    })
    clearTimeout(timeout)
    if (!r.ok) return res.status(422).json({ error: 'Could not fetch URL' })
    const html   = await r.text()
    const domain = new URL(url).hostname.replace(/^www\./, '')

    // Decode HTML entities at point of extraction.
    function decodeEntities(str) {
      if (!str) return null
      return str
        .replace(/&amp;/gi,  '&')
        .replace(/&lt;/gi,   '<')
        .replace(/&gt;/gi,   '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#x27;/gi, "'")
        .replace(/&#39;/gi,  "'")
        .replace(/&apos;/gi, "'")
        .replace(/&#(\d+);/g,        (_, n) => String.fromCharCode(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .trim() || null
    }

    // Parse DOM -- node-html-parser uses CSS selectors, handles attribute order/quotes/whitespace.
    const { parse } = await import('node-html-parser')
    const root = parse(html)

    function meta(selector) {
      return decodeEntities(root.querySelector(selector)?.getAttribute('content'))
    }

    // ── 1. JSON-LD -- highest fidelity for news/article pages ────────────────
    let ldTitle = null, ldDescription = null, ldImage = null
    const ldScripts = root.querySelectorAll('script[type="application/ld+json"]')
    for (const script of ldScripts) {
      try {
        const data  = JSON.parse(script.textContent)
        const nodes = Array.isArray(data?.['@graph']) ? data['@graph']
          : Array.isArray(data) ? data : [data]
        const article = nodes.find(n =>
          ['Article','NewsArticle','ReportageNewsArticle','BlogPosting','WebPage']
            .includes(n?.['@type'])
        ) ?? nodes[0]
        if (article) {
          if (!ldTitle)       ldTitle       = decodeEntities(article.headline || article.name)
          if (!ldDescription) ldDescription = decodeEntities(article.description)
          if (!ldImage) {
            const img = article.image
            ldImage = typeof img === 'string' ? img
              : img?.url ?? img?.contentUrl
              ?? (Array.isArray(img) ? (img[0]?.url ?? img[0]) : null)
            if (typeof ldImage !== 'string') ldImage = null
          }
        }
      } catch { /* malformed ld+json -- skip */ }
      if (ldTitle && ldImage) break
    }

    // ── 2. OG / Twitter fallbacks ─────────────────────────────────────────────
    const ogTitle  = meta('meta[property="og:title"]')       || meta('meta[name="og:title"]')
    const ogDesc   = meta('meta[property="og:description"]') || meta('meta[name="og:description"]')
    const ogImage  = meta('meta[property="og:image"]')       || meta('meta[name="og:image"]')
    const twTitle  = meta('meta[name="twitter:title"]')
    const twDesc   = meta('meta[name="twitter:description"]')
    const twImage  = meta('meta[name="twitter:image"]')      || meta('meta[name="twitter:image:src"]')
    const metaDesc = meta('meta[name="description"]')
    const pageTitle = decodeEntities(root.querySelector('title')?.textContent)

    // ── 3. Priority chain ─────────────────────────────────────────────────────
    const title       = ldTitle       || ogTitle  || twTitle  || pageTitle
    const description = ldDescription || ogDesc   || twDesc   || metaDesc
    const image       = ldImage       || ogImage  || twImage  || null

    return res.json({ url, title, description, image, domain })
  } catch (err) {
    if (err.name === 'AbortError') return res.status(422).json({ error: 'Request timed out' })
    return res.status(422).json({ error: 'Fetch failed' })
  }
}))

// GET /api/posts/config -- Tier 0
router.get('/config', asyncHandler(async (req, res) => {
  const cfgCol = postTypeConfigCol()
  if (!cfgCol) return res.status(503).json({ error: 'Database unavailable' })
  const configs = await cfgCol.find({}, { projection: { _id: 0 } }).toArray()
  res.json(configs)
}))

// GET /api/posts -- Tier 0 (optionally authenticated for is_mine flag)
router.get('/', asyncHandler(async (req, res) => {
  const { entity_type, entity_id, reach } = req.query
  const page  = Math.max(parseInt(req.query.page  ?? '1',  10), 1)
  const limit = Math.min(Math.max(parseInt(req.query.limit ?? '20', 10), 1), 50)

  if (!entity_type || !entity_id) {
    return res.status(400).json({ error: 'entity_type and entity_id are required' })
  }

  // Optionally resolve caller for is_mine stamping -- failures are non-blocking
  let viewerUserId = null
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  if (token) {
    try {
      const { data: { user: sbUser } } = await supabaseAdmin.auth.getUser(token)
      if (sbUser) {
        const uCol = usersCol()
        if (uCol) {
          const u = await uCol.findOne({ supabase_id: sbUser.id }, { projection: { _id: 1 } })
          if (u) viewerUserId = u._id
        }
      }
    } catch { /* non-blocking */ }
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

  res.json({ posts: posts.map(p => scrubAuthor(p, viewerUserId)), total, page, limit })
}))

// POST /api/posts -- Tier 1
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { post_type, body, origin, reach_set, is_anonymous, meta } = req.body

  if (typeof body !== 'string' || body.trim().length === 0) {
    return res.status(400).json({ error: 'body is required' })
  }
  if (body.length > 10000) {
    return res.status(400).json({ error: 'body exceeds 10000 characters' })
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
  // Attempt backfill for well-known entity types (school / committee / network_chapter).
  // For geo entity posts (county/constituency/ward etc.) geo_scope will be all-null --
  // entity_type + entity_id (slug) is the geographic anchor in v0.1.
  // GSS population for feed filtering is a deferred systemic sprint.
  if (!geoScope.ward_gss && !geoScope.constituency_gss && !geoScope.county_gss) {
    const backfill = await backfillGeoScope(origin.entity_type, origin.entity_id)
    if (backfill) geoScope = backfill
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

  const now      = new Date()
  const isAnon   = Boolean(is_anonymous)
  const reply_to = req.body.reply_to && typeof req.body.reply_to === 'string' ? req.body.reply_to : null

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

    ...(reply_to ? { reply_to } : {}),
  }

  const result = await pstCol.insertOne(doc)

  // Fire-and-forget reply notification to parent post author
  if (reply_to && ObjectId.isValid(reply_to)) {
    ;(async () => {
      try {
        const nCol   = notificationsCol()
        const parent = await pstCol.findOne({ _id: new ObjectId(reply_to) })
        if (
          nCol && parent &&
          parent.author?.user_id &&
          !parent.author.user_id.equals(req.user._id)
        ) {
          const authorName = req.claims.display_name ?? req.user.display_name ?? 'Someone'
          await nCol.insertOne({
            user_id:     parent.author.user_id,
            category:    'notification',
            subtype:     'reply',
            entity_type: doc.origin.entity_type,
            entity_id:   doc.origin.entity_id,
            entity_name: doc.origin.entity_id,
            summary:     `${authorName} replied to your post`,
            detail_url:  null,
            read:        false,
            resolved:    false,
            created_at:  new Date(),
            expires_at:  null,
          })
        }
      } catch (_) { /* non-blocking */ }
    })()
  }

  res.status(201).json(scrubAuthor({ ...doc, _id: result.insertedId }, req.user._id))
}))

// PATCH /api/posts/:id/react -- Tier 1
// One reaction per user per post. Upserts (changing reaction replaces previous).
// Recalculates reaction_counts from the post_reactions collection after each upsert.
router.patch('/:id/react', requireAuth, asyncHandler(async (req, res) => {
  const { id }            = req.params
  const { reaction_type } = req.body

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid post id' })
  }
  if (!REACTION_TYPES.includes(reaction_type)) {
    return res.status(400).json({ error: `Invalid reaction_type. Allowed: ${REACTION_TYPES.join(', ')}` })
  }

  const pstCol = postsCol()
  const prCol  = postReactionsCol()
  if (!pstCol || !prCol) return res.status(503).json({ error: 'Database unavailable' })

  const postOid = new ObjectId(id)
  const userOid = req.user._id
  const now     = new Date()

  const post = await pstCol.findOne({ _id: postOid, status: 'active' }, { projection: { _id: 1 } })
  if (!post) return res.status(404).json({ error: 'Post not found or not active' })

  // Upsert reaction -- one row per user per post, reaction_type changes on re-vote
  await prCol.updateOne(
    { post_id: postOid, user_id: userOid },
    { $set: { reaction_type, updated_at: now }, $setOnInsert: { created_at: now } },
    { upsert: true }
  )

  // Recalculate counts from all reactions on this post
  const allReactions = await prCol.find({ post_id: postOid }).toArray()
  const counts = {}
  for (const r of allReactions) {
    counts[r.reaction_type] = (counts[r.reaction_type] ?? 0) + 1
  }

  await pstCol.updateOne(
    { _id: postOid },
    { $set: { reaction_counts: counts, updated_at: now } }
  )

  res.json({ ok: true, reaction_counts: counts, user_reaction: reaction_type })
}))

// POST /api/posts/:id/flag -- Tier 1
router.post('/:id/flag', requireAuth, asyncHandler(async (req, res) => {
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
}))

// GET /api/posts/:id/replies -- public
router.get('/:id/replies', asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid post id' })
  }
  const pstCol = postsCol()
  if (!pstCol) return res.status(503).json({ error: 'Database unavailable' })

  const replies = await pstCol
    .find({ reply_to: id, status: { $in: ['active', 'shadow'] } })
    .sort({ created_at: 1 })
    .toArray()

  res.json(replies.map(p => scrubAuthor(p, req.user?._id ?? null)))
}))

// POST /api/posts/:id/veracity -- Tier 1
// One vote per user per post. Upserts. Recalculates counts + score on the post document.
const VERACITY_VOTES   = ['true', 'plausible', 'questionable', 'false']
const VERACITY_WEIGHTS = { true: 1.0, plausible: 0.75, questionable: 0.25, false: 0.0 }
const VERACITY_THRESHOLD = 5

router.post('/:id/veracity', requireAuth, asyncHandler(async (req, res) => {
  const { id }            = req.params
  const { veracity_vote } = req.body

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid post id' })
  }
  if (!VERACITY_VOTES.includes(veracity_vote)) {
    return res.status(400).json({ error: `veracity_vote must be one of: ${VERACITY_VOTES.join(', ')}` })
  }

  const pstCol = postsCol()
  const vvCol  = veracityVotesCol()
  if (!pstCol || !vvCol) return res.status(503).json({ error: 'Database unavailable' })

  const postOid  = new ObjectId(id)
  const userOid  = req.user._id
  const now      = new Date()

  // Upsert the vote record
  await vvCol.updateOne(
    { post_id: postOid, user_id: userOid },
    { $set: { vote: veracity_vote, updated_at: now }, $setOnInsert: { created_at: now } },
    { upsert: true }
  )

  // Recalculate counts + score from all votes on this post
  const allVotes = await vvCol.find({ post_id: postOid }).toArray()
  const counts   = { true: 0, plausible: 0, questionable: 0, false: 0, total: allVotes.length }
  for (const v of allVotes) counts[v.vote] = (counts[v.vote] ?? 0) + 1

  const thresholdMet = counts.total >= VERACITY_THRESHOLD
  let score = null
  if (thresholdMet) {
    const weighted = VERACITY_VOTES.reduce((sum, k) => sum + counts[k] * VERACITY_WEIGHTS[k], 0)
    score = Math.round((weighted / counts.total) * 100) / 100
  }

  await pstCol.updateOne(
    { _id: postOid },
    {
      $set: {
        veracity_counts:        counts,
        veracity_score:         score,
        veracity_threshold_met: thresholdMet,
        updated_at:             now,
      },
    }
  )

  res.json({ ok: true, veracity_counts: counts, veracity_score: score, veracity_threshold_met: thresholdMet })
}))

// PATCH /api/posts/:id -- Tier 1, author only
// No replies: overwrite body in place, no snapshot.
// Has replies: snapshot current body + veracity into versions[], then overwrite.
router.patch('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id }   = req.params
  const { body } = req.body

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid post id' })
  }
  if (!body || typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'body is required' })
  }
  if (body.trim().length > 2000) {
    return res.status(400).json({ error: 'body exceeds 2000 characters' })
  }

  const pstCol = postsCol()
  if (!pstCol) return res.status(503).json({ error: 'Database unavailable' })

  const post = await pstCol.findOne({ _id: new ObjectId(id) })
  if (!post) return res.status(404).json({ error: 'Post not found' })

  const isAuthor = post.author?.user_id && req.user._id.equals(post.author.user_id)
  if (!isAuthor) return res.status(403).json({ error: 'Forbidden' })

  const now         = new Date()
  const replyCount  = post.counts?.reply_count ?? 0
  let updateOp

  if (replyCount === 0) {
    // Free edit -- no snapshot
    updateOp = {
      $set: { body: body.trim(), edited: true, updated_at: now },
    }
  } else {
    // Snapshot current state before overwrite
    const snapshot = {
      version:           (post.versions?.length ?? 0) + 1,
      body:              post.body,
      edited_at:         now,
      veracity_snapshot: {
        ...(post.veracity_counts ?? {}),
        score: post.veracity_score ?? null,
      },
    }
    updateOp = {
      $push: { versions: snapshot },
      $set: {
        body:                   body.trim(),
        edited:                 true,
        updated_at:             now,
        veracity_counts:        { true: 0, plausible: 0, questionable: 0, false: 0, total: 0 },
        veracity_score:         null,
        veracity_threshold_met: false,
      },
    }
  }

  await pstCol.updateOne({ _id: post._id }, updateOp)
  const updated = await pstCol.findOne({ _id: post._id })
  res.json(scrubAuthor(updated, req.user._id))
}))

// DELETE /api/posts/:id -- Tier 1
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
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
}))

export default router
