/**
 * @file routes/follows.js
 * @description Unified follow/save persistence across all entity types.
 *
 *   GET    /api/follows?entity_type=:t  — list caller's follows for a type
 *   POST   /api/follows                 — upsert one follow
 *   DELETE /api/follows/:type/:id       — remove one follow
 *
 * Anon users do not hit these routes — the client persists saves in localStorage
 * under key 'ukcp_saves' and merges them in on login.
 *
 * Document shape:
 *   { user_id, entity_type, entity_id, entity_name, scope_gss?, followed_at }
 *
 * Uniqueness is enforced by a compound index on { user_id, entity_type, entity_id }
 * — see db/mongo.js connectMongo().
 */

import { Router }     from 'express'
import { requireAuth } from '../middleware/auth.js'
import { followsCol }  from '../db/mongo.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = Router()

// GET /api/follows?entity_type=school
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const entityType = req.query.entity_type
  if (!entityType) return res.status(400).json({ error: 'entity_type required' })

  const col = followsCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  const rows = await col
    .find({ user_id: req.user._id, entity_type: entityType })
    .sort({ followed_at: -1 })
    .toArray()

  res.json(rows)
}))

// POST /api/follows
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { entity_type, entity_id, entity_name, scope_gss, followed_at } = req.body ?? {}
  if (!entity_type || !entity_id) {
    return res.status(400).json({ error: 'entity_type and entity_id required' })
  }

  const col = followsCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  // followed_at is honoured if supplied (used by the anon-merge-on-login flow
  // to preserve the original save timestamp). New follows default to now.
  const followedAt = followed_at ? new Date(followed_at) : new Date()

  await col.updateOne(
    { user_id: req.user._id, entity_type, entity_id },
    {
      $set:         { entity_name: entity_name ?? null, scope_gss: scope_gss ?? null },
      $setOnInsert: { user_id: req.user._id, entity_type, entity_id, followed_at: followedAt },
    },
    { upsert: true }
  )

  res.status(201).json({ ok: true })
}))

// DELETE /api/follows/:entity_type/:entity_id
router.delete('/:entity_type/:entity_id', requireAuth, asyncHandler(async (req, res) => {
  const col = followsCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  await col.deleteOne({
    user_id:     req.user._id,
    entity_type: req.params.entity_type,
    entity_id:   req.params.entity_id,
  })

  res.json({ ok: true })
}))

export default router
