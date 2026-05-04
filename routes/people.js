/**
 * @file routes/people.js
 * @description Public people directory.
 *
 * GET /api/people -- browse registered users (safe fields only)
 *
 * Query params:
 *   q            -- display_name search (optional)
 *   scope        -- 'ward' | 'constituency' | 'county' | 'region' | 'all'
 *   gss          -- GSS code for the scope (required when scope != 'all')
 *   page         -- default 1
 *   limit        -- default 20, max 50
 *
 * NEVER returns: email, supabase_id, device_cookie_id, _id, or any auth field.
 * Returns a stable public_id (hex string from _id) for linking purposes.
 */

import { Router } from 'express'
import { usersCol } from '../db/mongo.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = Router()

// Safe fields returned to any caller
const SAFE_PROJECTION = {
  display_name:          1,
  bio:                   1,
  platform_role:         1,
  confirmed_location:    1,
  home_ward_gss:         1,
  home_constituency_gss: 1,
  status:                1,
  created_at:            1,
}

// Scope field map -- maps scope name to the user field to filter on
const SCOPE_FIELD = {
  ward:         'home_ward_gss',
  constituency: 'home_constituency_gss',
}

router.get('/', asyncHandler(async (req, res) => {
  const usrCol = usersCol()
  if (!usrCol) return res.status(503).json({ error: 'Database unavailable' })

  const { q, scope = 'all', gss } = req.query
  const page  = Math.max(1, parseInt(req.query.page  ?? '1',  10))
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit ?? '20', 10)))

  try {
    const filter = { status: { $ne: 'deleted' } }

    // Scope filter
    if (scope !== 'all' && gss) {
      const field = SCOPE_FIELD[scope]
      if (field) {
        filter[field] = gss
      }
      // county and region scope: filter by confirmed_location fields
      if (scope === 'county' || scope === 'region') {
        filter['confirmed_location.scope'] = scope
        filter['confirmed_location.gss']   = gss
      }
    }

    // Name search
    if (q?.trim()) {
      filter.display_name = { $regex: q.trim(), $options: 'i' }
    }

    const total = await usrCol.countDocuments(filter)
    const users = await usrCol
      .find(filter, { projection: SAFE_PROJECTION })
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    // Map _id to a safe public_id string -- never expose ObjectId directly
    const safe = users.map(u => ({
      public_id:          u._id.toHexString(),
      display_name:       u.display_name ?? 'Citizen',
      bio:                u.bio ?? null,
      platform_role:      u.platform_role ?? 'citizen',
      confirmed_location: u.confirmed_location ?? null,
      created_at:         u.created_at ?? null,
    }))

    res.json({ users: safe, total, page, limit })
  } catch (err) {
    console.error('people route error', err)
    res.status(500).json({ error: 'Failed to load people' })
  }
}))

export default router
