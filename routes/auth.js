/**
 * @file routes/auth.js
 * @description Auth utility routes.
 *
 * GET /api/auth/check
 *   Called by the login page on mount. Reads the httpOnly device cookie and
 *   returns whether this device has a record in anon_device_cookies.
 *   No auth required -- the whole point is to check before the user logs in.
 */

import { Router }        from 'express'
import { anonCookiesCol } from '../db/mongo.js'
import { DEVICE_COOKIE_NAME } from '../config/constants.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = Router()

router.get('/auth/check', asyncHandler(async (req, res) => {
  const token = req.cookies[DEVICE_COOKIE_NAME]
  if (!token) return res.json({ known: false })
  const col = anonCookiesCol()
  if (!col)  return res.json({ known: false })
  try {
    const doc = await col.findOne({ token })
    return res.json({ known: !!doc })
  } catch {
    return res.json({ known: false })
  }
}))

export default router
