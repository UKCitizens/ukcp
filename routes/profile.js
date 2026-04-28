/**
 * @file routes/profile.js
 * @description Authenticated user profile routes.
 *
 * GET  /api/profile -- Returns the authenticated user's public profile fields.
 * PATCH /api/profile -- Updates editable profile fields.
 *
 * Both routes require a valid Supabase Bearer token (requireAuth middleware).
 */

import { Router }      from 'express'
import { requireAuth } from '../middleware/auth.js'
import { usersCol }    from '../db/mongo.js'

const router = Router()

const PROFILE_EDITABLE = [
  'display_name', 'username', 'bio',
  'default_post_visibility', 'home_ward_gss', 'home_constituency_gss',
]

// GET /api/profile
router.get('/profile', requireAuth, (req, res) => {
  const {
    _id, email, display_name, username, bio, access_tier,
    is_verified, home_ward_gss, home_constituency_gss,
    default_post_visibility, created_at,
  } = req.user

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

// PATCH /api/profile
router.patch('/profile', requireAuth, async (req, res) => {
  const update = {}
  for (const field of PROFILE_EDITABLE) {
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

export default router
