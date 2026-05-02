/**
 * @file routes/session.js
 * @description User session snapshot — last app state for logged-in users.
 *
 *   GET   /api/session/snapshot — returns the caller's snapshot doc, or null.
 *   PATCH /api/session/snapshot — upserts allowed snapshot fields.
 *
 * Anon users do not hit this route — the client persists state in localStorage
 * under key 'ukcp_session_snapshot'. On login, the client merges that record
 * into the DB via PATCH and clears the local copy.
 */

import { Router }     from 'express'
import { requireAuth } from '../middleware/auth.js'
import { sessionCol }  from '../db/mongo.js'

const router = Router()

const ALLOWED_FIELDS = [
  'geo_path',
  'active_tab',
  'active_network',
  'selected_school_urn',
  'tab_nav_mode',
  'group_filter',
]

// GET /api/session/snapshot
router.get('/session/snapshot', requireAuth, async (req, res) => {
  const col = sessionCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })
  const doc = await col.findOne({ user_id: req.user._id })
  res.json(doc)
})

// PATCH /api/session/snapshot
router.patch('/session/snapshot', requireAuth, async (req, res) => {
  const col = sessionCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  const $set = { user_id: req.user._id, updated_at: new Date() }
  for (const k of ALLOWED_FIELDS) {
    if (k in (req.body ?? {})) $set[k] = req.body[k]
  }

  await col.updateOne(
    { user_id: req.user._id },
    { $set },
    { upsert: true }
  )

  res.json({ ok: true })
})

export default router
