/**
 * @file middleware/deviceCookie.js
 * @description Device cookie middleware.
 *
 * Runs on every request. Sets a long-lived httpOnly device cookie if the
 * request does not already carry one. Creates an anon_device_cookies record
 * in Mongo on first visit; updates last_seen at most once per hour on subsequent
 * visits. Attaches the token to req.deviceToken for downstream middleware.
 *
 * Does not block the request -- all Mongo failures are caught and logged silently
 * so cookie features degrade gracefully if Atlas is unavailable.
 */

import { randomUUID }  from 'crypto'
import { anonCookiesCol } from '../db/mongo.js'
import { DEVICE_COOKIE_NAME, DEVICE_COOKIE_MAX_AGE } from '../config/constants.js'

export async function deviceCookieMiddleware(req, res, next) {
  try {
    let token = req.cookies[DEVICE_COOKIE_NAME]

    if (!token) {
      token = randomUUID()
      res.cookie(DEVICE_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge:   DEVICE_COOKIE_MAX_AGE,
        secure:   process.env.NODE_ENV === 'production',
      })

      const col = anonCookiesCol()
      if (col) {
        await col.insertOne({
          token,
          user_id:    null,
          created_at: new Date(),
          last_seen:  new Date(),
          ip:         req.ip ?? null,
        })
      }
    } else {
      const col = anonCookiesCol()
      if (col) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        await col.updateOne(
          { token, last_seen: { $lt: oneHourAgo } },
          { $set: { last_seen: new Date() } }
        )
      }
    }

    req.deviceToken = token
  } catch (err) {
    console.error('[device-cookie]', err.message)
  }

  next()
}
