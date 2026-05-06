/**
 * @file routes/nearby.js
 * @description Nearby context endpoints for ward and constituency entities.
 * No auth required.
 *
 * GET /api/nearby/ward/:gss          -- settlements within ward + nearest towns/city
 * GET /api/nearby/constituency/:gss  -- all Towns and Cities in constituency
 */

import { Router }       from 'express'
import { placesCol }    from '../db/mongo.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = Router()

/**
 * GET /api/nearby/ward/:gss
 * Returns up to 5 Hamlets/Villages within the ward (GSS match),
 * up to 2 nearest Towns (spatial), 1 nearest City (spatial).
 * Requires a representative point: ?lat=&lng= query params (use ward centroid or first place).
 */
router.get('/ward/:gss', asyncHandler(async (req, res) => {
  const col = placesCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  const { gss } = req.params
  const lat = parseFloat(req.query.lat)
  const lng = parseFloat(req.query.lng)

  const settlements = await col.find({
    ward_gss:   gss,
    place_type: { $in: ['Hamlet', 'Village'] },
  }).limit(5).project({ id: 1, name: 1, place_type: 1 }).toArray()

  let towns = [], city = null
  if (!isNaN(lat) && !isNaN(lng)) {
    const point = { type: 'Point', coordinates: [lng, lat] }
    towns = await col.find({
      location:   { $nearSphere: { $geometry: point, $maxDistance: 50000 } },
      place_type: 'Town',
    }).limit(2).project({ id: 1, name: 1, place_type: 1 }).toArray()

    city = await col.findOne({
      location:   { $nearSphere: { $geometry: point, $maxDistance: 150000 } },
      place_type: 'City',
    }, { projection: { id: 1, name: 1, place_type: 1 } })
  }

  res.json({ settlements, towns, city })
}))

/**
 * GET /api/nearby/constituency/:gss
 * Returns all Towns and Cities where con_gss matches.
 */
router.get('/constituency/:gss', asyncHandler(async (req, res) => {
  const col = placesCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  const places = await col.find({
    con_gss:    req.params.gss,
    place_type: { $in: ['Town', 'City'] },
  }).project({ id: 1, name: 1, place_type: 1 }).toArray()

  res.json({ places })
}))

export default router
