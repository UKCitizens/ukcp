/**
 * @file routes/profile.js
 * @description Authenticated user profile routes.
 *
 * GET   /api/profile             -- Composite profile (user + follows + groups + posts + claims).
 * PATCH /api/profile             -- Update editable user fields (display_name, bio, etc).
 * PATCH /api/profile/preferences -- Update preferences sub-document.
 *
 * All routes require a valid Supabase Bearer token (requireAuth middleware).
 */

import { Router }                      from 'express'
import { requireAuth, supabaseAdmin } from '../middleware/auth.js'
import {
  usersCol,
  followsCol,
  postsCol,
  groupMembershipsCol,
} from '../db/mongo.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = Router()

const PROFILE_EDITABLE = [
  'display_name', 'username', 'bio',
  'default_post_visibility', 'home_ward_gss', 'home_constituency_gss',
]

// Server-side allowlist for preferences. Each value validated against an enum
// before write -- no free-text preference fields land in the user record.
const PREFERENCE_ENUMS = {
  default_load_page:    new Set(['locations', 'myhome']),
  default_tab:          new Set(['map', 'info', 'groups', 'news', 'traders', 'civic']),
  default_posting_mode: new Set(['anonymous', 'named']),
}

// Fields stripped from the user record before returning. device_cookie_id ties
// the user to their browser fingerprint -- no reason to expose it client-side.
const SENSITIVE_USER_FIELDS = ['device_cookie_id']

function sanitiseUser(user) {
  if (!user) return null
  const out = { ...user }
  for (const f of SENSITIVE_USER_FIELDS) delete out[f]
  return out
}

// GET /api/profile
router.get('/profile', requireAuth, asyncHandler(async (req, res) => {
  const usrCol = usersCol()
  const folCol = followsCol()
  const memCol = groupMembershipsCol()
  const pstCol = postsCol()

  if (!usrCol) return res.status(503).json({ error: 'Database unavailable' })

  // Re-read from Mongo so the response reflects fields that may have been
  // mirrored after the requireAuth lookup (e.g. claims sync via PUT claims).
  const user = await usrCol.findOne({ _id: req.user._id })

  const follows = folCol
    ? await folCol.find({ user_id: req.user._id }).sort({ followed_at: -1 }).toArray()
    : []

  // Group memberships are tracked in group_memberships, not user_follows.
  // Returned alongside follows so the civic-footprint panel can render them.
  const joined_groups = memCol
    ? await memCol.find({ user_id: req.user._id, status: 'active' })
        .sort({ joined_at: -1 }).toArray()
    : []

  // Posts: author.user_id is always stored (even on anon posts) so per-user
  // counts are accurate; the named/anon split is reflected in display only.
  let recent_posts     = []
  let post_count       = 0
  let anon_post_count  = 0
  if (pstCol) {
    recent_posts = await pstCol.find({
      'author.user_id':      req.user._id,
      'author.is_anonymous': false,
      status:                'active',
    }).sort({ created_at: -1 }).limit(5).toArray()
    post_count = await pstCol.countDocuments({
      'author.user_id': req.user._id,
      status:           'active',
    })
    anon_post_count = await pstCol.countDocuments({
      'author.user_id':      req.user._id,
      'author.is_anonymous': true,
      status:                'active',
    })
  }

  res.json({
    user:            sanitiseUser(user),
    follows,
    joined_groups,
    recent_posts,
    post_count,
    anon_post_count,
    claims:          req.claims,
  })
}))

// PATCH /api/profile
router.patch('/profile', requireAuth, asyncHandler(async (req, res) => {
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

  // First-time registration completion: if display_name is being set and the
  // user is not yet marked complete, flip registration_complete in Supabase
  // app_metadata and mirror to Mongo. Client must refreshSession() to pick up
  // the updated JWT claims.
  let registration_completed = false
  const name = update.display_name?.trim()
  if (name && !req.claims.registration_complete) {
    const newClaims = {
      platform_role:         req.claims.platform_role    ?? 'citizen',
      affiliated_roles:      req.claims.affiliated_roles ?? [],
      display_name:          name,
      registration_complete: true,
    }
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        req.user.supabase_id,
        { app_metadata: newClaims }
      )
      if (!error) {
        await col.updateOne(
          { _id: req.user._id },
          { $set: { registration_complete: true, display_name: name } }
        )
        registration_completed = true
      } else {
        console.error('[profile] registration_complete update failed:', error.message)
      }
    } catch (e) {
      console.error('[profile] registration_complete update threw:', e.message)
    }
  }

  res.json({ ok: true, registration_completed })
}))

// PATCH /api/profile/preferences
router.patch('/profile/preferences', requireAuth, asyncHandler(async (req, res) => {
  const body = req.body ?? {}
  const $set = {}

  for (const [field, allowed] of Object.entries(PREFERENCE_ENUMS)) {
    if (field in body) {
      const value = body[field]
      if (!allowed.has(value)) {
        return res.status(400).json({
          error: `${field} must be one of: ${[...allowed].join(', ')}`,
        })
      }
      $set[`preferences.${field}`] = value
    }
  }

  if (Object.keys($set).length === 0) {
    return res.status(400).json({ error: 'No valid preference fields provided' })
  }

  $set.updated_at = new Date()

  const col = usersCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })
  await col.updateOne({ _id: req.user._id }, { $set })
  res.json({ ok: true })
}))

export default router
