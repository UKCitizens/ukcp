/**
 * @file routes/myhome.js
 * @description MyHome feed aggregator and meta endpoints.
 *
 *   GET   /api/myhome/feed          — aggregated post feed across all follows
 *   GET   /api/myhome/meta          — notification/alert/count/response summary
 *   PATCH /api/myhome/meta/read     — mark notifications read
 *   PATCH /api/myhome/meta/resolve  — mark alerts/responses resolved
 */

import { Router }      from 'express'
import { ObjectId }    from 'mongodb'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import {
  followsCol, postsCol, sessionCol, notificationsCol,
} from '../db/mongo.js'

const router = Router()

// GET /api/myhome/feed — Tier 1
router.get('/feed', requireAuth, asyncHandler(async (req, res) => {
  const page  = Math.max(parseInt(req.query.page  ?? '1',  10), 1)
  const limit = Math.min(Math.max(parseInt(req.query.limit ?? '20', 10), 1), 50)
  const types = req.query.types ? req.query.types.split(',').map(t => t.trim()).filter(Boolean) : null
  const since = req.query.since ? new Date(req.query.since) : null
  const scope = req.query.scope ?? null

  const fCol = followsCol()
  const pCol = postsCol()
  if (!fCol || !pCol) return res.status(503).json({ error: 'Database unavailable' })

  const follows = await fCol.find({ user_id: req.user._id }).toArray()

  if (!follows.length) {
    return res.json({ items: [], total: 0, page: 1, limit, types_present: [] })
  }

  const followSet    = follows.map(f => ({ entity_type: f.entity_type, entity_id: f.entity_id }))
  const followByKey  = {}
  for (const f of follows) followByKey[`${f.entity_type}:${f.entity_id}`] = f.entity_name

  const filter = {
    $or:    followSet.map(f => ({ 'origin.entity_type': f.entity_type, 'origin.entity_id': f.entity_id })),
    status: 'active',
  }
  if (scope) filter.reach_effective = scope
  if (since) filter.created_at = { $gt: since }

  const total = await pCol.countDocuments(filter)
  const posts = await pCol.find(filter)
    .sort({ created_at: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray()

  const typesPresent = [...new Set(posts.map(() => 'post'))]

  const items = posts.map(post => {
    const entityName = followByKey[`${post.origin.entity_type}:${post.origin.entity_id}`]
      ?? post.origin.entity_id
    return {
      feed_type:   'post',
      entity_type: post.origin.entity_type,
      entity_id:   post.origin.entity_id,
      entity_name: entityName,
      timestamp:   post.created_at,
      summary:     (post.body ?? '').slice(0, 120),
      scope:       post.reach_effective,
      payload: {
        post_type:    post.post_type,
        body:         (post.body ?? '').slice(0, 200),
        author_name:  post.author?.is_anonymous ? 'Anonymous' : (post.author?.display_name ?? 'Unknown'),
        is_anonymous: post.author?.is_anonymous ?? false,
        reach:        post.reach_effective,
        reactions:    post.reactions ?? {},
      },
    }
  })

  const filtered = types ? items.filter(i => types.includes(i.feed_type)) : items

  res.json({ items: filtered, total, page, limit, types_present: typesPresent })
}))

// GET /api/myhome/meta — Tier 1
router.get('/meta', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user._id
  const nCol   = notificationsCol()
  const pCol   = postsCol()
  const fCol   = followsCol()
  const sCol   = sessionCol()

  if (!nCol || !pCol || !fCol) return res.status(503).json({ error: 'Database unavailable' })

  const [notifications, alerts, responses] = await Promise.all([
    nCol.find({ user_id: userId, category: 'notification', read: false }).sort({ created_at: -1 }).limit(20).toArray(),
    nCol.find({ user_id: userId, category: 'alert',        resolved: false }).sort({ created_at: -1 }).limit(10).toArray(),
    nCol.find({ user_id: userId, category: 'response',     resolved: false }).sort({ created_at: -1 }).limit(10).toArray(),
  ])

  let lastSeenAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  if (sCol) {
    const sess = await sCol.findOne({ user_id: userId })
    if (sess?.last_seen_at) lastSeenAt = new Date(sess.last_seen_at)
  }

  const follows   = await fCol.find({ user_id: userId }).toArray()
  const followSet = follows.map(f => ({ 'origin.entity_type': f.entity_type, 'origin.entity_id': f.entity_id }))

  let newPosts = 0
  if (followSet.length > 0) {
    newPosts = await pCol.countDocuments({
      $or:        followSet,
      status:     'active',
      created_at: { $gt: lastSeenAt },
    })
  }

  const counts = newPosts > 0
    ? [{ subtype: 'new_posts', value: newPosts, label: `${newPosts} new post${newPosts === 1 ? '' : 's'} since your last visit` }]
    : []

  res.json({ notifications, alerts, counts, responses })
}))

// PATCH /api/myhome/meta/read — Tier 1
router.patch('/meta/read', requireAuth, asyncHandler(async (req, res) => {
  const { ids } = req.body ?? {}
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' })
  }

  const nCol = notificationsCol()
  if (!nCol) return res.status(503).json({ error: 'Database unavailable' })

  await nCol.updateMany(
    { _id: { $in: ids.map(id => new ObjectId(id)) }, user_id: req.user._id },
    { $set: { read: true } }
  )
  res.json({ ok: true })
}))

// PATCH /api/myhome/meta/resolve — Tier 1
router.patch('/meta/resolve', requireAuth, asyncHandler(async (req, res) => {
  const { ids } = req.body ?? {}
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' })
  }

  const nCol = notificationsCol()
  if (!nCol) return res.status(503).json({ error: 'Database unavailable' })

  await nCol.updateMany(
    { _id: { $in: ids.map(id => new ObjectId(id)) }, user_id: req.user._id },
    { $set: { resolved: true } }
  )
  res.json({ ok: true })
}))

export default router
