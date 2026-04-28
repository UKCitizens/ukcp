/**
 * @file middleware/auth.js
 * @description Supabase admin client and requireAuth middleware.
 *
 * requireAuth validates the Bearer JWT via Supabase's admin API (handles ECC
 * P-256 automatically). On a valid token it looks up or creates the MongoDB
 * users record and attaches it to req.user. On an invalid token it returns 401.
 *
 * On first login the users record is created here and the device cookie (if
 * present on the request) is linked to the new user record.
 *
 * supabaseAdmin is also exported for use in routes that need direct Supabase
 * admin operations (e.g. hard-delete from auth in the admin users route).
 */

import { createClient }   from '@supabase/supabase-js'
import { usersCol, anonCookiesCol } from '../db/mongo.js'

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * Express middleware. Validates Bearer token, resolves or creates a users
 * document, and attaches it to req.user. Returns 401/503 on failure.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.slice(7)
  const { data: { user: sbUser }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !sbUser) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const supabase_id = sbUser.id
  const col = usersCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  let user = await col.findOne({ supabase_id })

  if (!user) {
    const email = sbUser.email ?? null
    const now   = new Date()

    const doc = {
      supabase_id,
      email,
      display_name:            email ? email.split('@')[0] : 'citizen',
      username:                null,
      avatar_url:              null,
      bio:                     null,
      access_tier:             'seen',
      is_verified:             false,
      verification_method:     null,
      home_ward_gss:           null,
      home_constituency_gss:   null,
      default_post_visibility: 'anonymous',
      device_cookie_id:        null,
      is_active:               true,
      is_suspended:            false,
      created_at:              now,
      updated_at:              now,
    }

    const result = await col.insertOne(doc)
    user = { ...doc, _id: result.insertedId }

    // Link the device cookie to the new user record.
    const cookieCol = anonCookiesCol()
    if (cookieCol && req.deviceToken) {
      await cookieCol.updateOne(
        { token: req.deviceToken, user_id: null },
        { $set: { user_id: result.insertedId } }
      )
      await col.updateOne(
        { _id: result.insertedId },
        { $set: { device_cookie_id: req.deviceToken } }
      )
    }
  }

  req.user = user
  next()
}
