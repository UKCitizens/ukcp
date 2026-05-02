/**
 * @file routes/schools.js
 * @description Schools API. All queries use proximity (lat/lng/radius).
 *
 * GET /api/schools?lat=53.4&lng=-2.9&radius=4000
 * GET /api/schools?lat=53.4&lng=-2.9&radius=4000&search=grammar
 *
 * Optional: search filters by name (case-insensitive regex, server-side).
 * At large radii (region/country), search param should be provided by the client
 * to avoid returning thousands of records.
 * All queries exclude placeholder records. Results sorted by distance.
 */

import { Router } from 'express'
import { schoolsCol } from '../db/mongo.js'

const router = Router()

const MAX_RESULTS = 500

const PROJECT = {
  urn: 1, name: 1, la: 1, type: 1, type_group: 1, phase: 1, gender: 1,
  street: 1, town: 1, postcode: 1, website: 1, phone: 1,
  head: 1, head_role: 1,
  ward_gss: 1, ward_name: 1, con_gss: 1, con_name: 1,
  ofsted: 1, location: 1, country: 1,
}

router.get('/', async (req, res) => {
  const col = schoolsCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  try {
    const { lat, lng, radius, search } = req.query

    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' })

    const radiusMetres = Number(radius) || 4000
    const base = { is_placeholder: { $ne: true } }

    const geoFilter = {
      location: {
        $nearSphere: {
          $geometry:    { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: radiusMetres,
        },
      },
    }

    const nameFilter = search?.trim()
      ? { name: { $regex: search.trim(), $options: 'i' } }
      : {}

    const schools = await col
      .find({ ...base, ...geoFilter, ...nameFilter })
      .project(PROJECT)
      .limit(MAX_RESULTS)
      .toArray()

    res.json(schools)
  } catch (err) {
    console.error('schools route error', err)
    res.status(500).json({ error: 'Failed to load schools' })
  }
})

export default router
