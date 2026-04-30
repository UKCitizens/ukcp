/**
 * @file routes/posts.js
 * @description Posts API routes.
 *
 *   GET  /api/posts — fetch posts for a location (optional collective filter)
 *   POST /api/posts — create a post (auth required)
 */

import { Router }      from 'express'
import { ObjectId }    from 'mongodb'
import { randomUUID }  from 'crypto'
import { requireAuth } from '../middleware/auth.js'
import {
  postsCol,
  groupMembershipsCol,
  associationsCol,
  spacesCol,
  usersCol,
} from '../db/mongo.js'

const router = Router()

// GET /api/posts
router.get('/', async (req, res) => {
  const { location_type, location_slug, collective_id, collective_col } = req.query
  const limit  = Math.min(parseInt(req.query.limit  ?? '20', 10), 50)
  const offset = parseInt(req.query.offset ?? '0', 10)

  if (!location_type || !location_slug) {
    return res.status(400).json({ error: 'location_type and location_slug are required' })
  }

  const pstCol = postsCol()
  if (!pstCol) return res.status(503).json({ error: 'Database unavailable' })

  const query = {
    'location_scope.type': location_type,
    'location_scope.slug': location_slug,
    status: 'published',
  }

  if (collective_id && collective_col) {
    if (!ObjectId.isValid(collective_id)) {
      return res.status(400).json({ error: 'Invalid collective_id' })
    }
    query['collective_ref.collection'] = collective_col
    query['collective_ref.id']         = new ObjectId(collective_id)
  }

  const posts = await pstCol.find(query)
    .sort({ created_at: -1 })
    .skip(offset)
    .limit(limit)
    .toArray()

  // Annotate author display_name.
  const usrCol = usersCol()
  if (usrCol && posts.length) {
    const authorIds = posts
      .filter(p => !p.is_anonymous && p.author_user_id)
      .map(p => p.author_user_id)

    let userMap = {}
    if (authorIds.length) {
      const users = await usrCol.find({ _id: { $in: authorIds } })
        .project({ display_name: 1 }).toArray()
      userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.display_name]))
    }
    posts.forEach(p => {
      p.author = p.is_anonymous
        ? 'Anonymous'
        : (userMap[p.author_user_id?.toString()] ?? 'citizen')
    })
  } else {
    posts.forEach(p => { p.author = p.is_anonymous ? 'Anonymous' : 'citizen' })
  }

  res.json(posts)
})

// POST /api/posts
router.post('/', requireAuth, async (req, res) => {
  const { post_type = 'standard', body, title, is_anonymous, location_scope, collective_ref } = req.body

  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return res.status(400).json({ error: 'body is required' })
  }
  if (body.length > 2000) {
    return res.status(400).json({ error: 'body exceeds 2000 characters' })
  }
  if (!location_scope?.type || !location_scope?.slug) {
    return res.status(400).json({ error: 'location_scope (type + slug) is required' })
  }

  const pstCol = postsCol()
  const memCol = groupMembershipsCol()
  if (!pstCol) return res.status(503).json({ error: 'Database unavailable' })

  // Validate collective_ref if present.
  if (collective_ref?.collection && collective_ref?.id) {
    if (!ObjectId.isValid(collective_ref.id)) {
      return res.status(400).json({ error: 'Invalid collective_ref.id' })
    }

    const targetCol = collective_ref.collection === 'associations'
      ? associationsCol()
      : collective_ref.collection === 'spaces'
        ? spacesCol()
        : null

    if (!targetCol) {
      return res.status(400).json({ error: 'Invalid collective_ref.collection' })
    }

    const targetRecord = await targetCol.findOne({ _id: new ObjectId(collective_ref.id) })
    if (!targetRecord) {
      return res.status(400).json({ error: 'Referenced collective not found' })
    }

    // Named posts into a collective require active membership.
    if (!is_anonymous && memCol) {
      const membership = await memCol.findOne({
        collection_type: collective_ref.collection,
        collective_id:   new ObjectId(collective_ref.id),
        user_id:         req.user._id,
        status:          'active',
      })
      if (!membership) {
        return res.status(403).json({ error: 'Join the group to post here.' })
      }
    }
  }

  const now    = new Date()
  const isAnon = Boolean(is_anonymous)

  const doc = {
    post_type,
    body:           body.trim(),
    title:          title?.trim() ?? null,
    is_anonymous:   isAnon,
    author_user_id: isAnon ? null : req.user._id,
    anon_token:     isAnon ? randomUUID() : null,
    location_scope,
    collective_ref: (collective_ref?.collection && collective_ref?.id)
      ? { collection: collective_ref.collection, id: new ObjectId(collective_ref.id) }
      : null,
    status:       'published',
    published_at: now,
    created_at:   now,
    updated_at:   now,
  }

  const result = await pstCol.insertOne(doc)

  res.status(201).json({
    _id:        result.insertedId,
    anon_token: doc.anon_token,
  })
})

export default router
