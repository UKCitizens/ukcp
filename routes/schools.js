/**
 * @file routes/schools.js
 * @description Schools API. Filters by geo scope.
 *
 * GET /api/schools?scope=ward&gss=E05009308
 * GET /api/schools?scope=constituency&gss=E14001172
 * GET /api/schools?scope=county&gss=E09000001
 * GET /api/schools?scope=proximity&lat=53.4&lng=-2.9&radius=4000
 *
 * All queries exclude placeholder records.
 */

import { Router } from 'express'
import { schoolsCol } from '../db/mongo.js'

const router = Router()

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
    const { scope, gss, lat, lng, radius } = req.query
    const base = { is_placeholder: { $ne: true } }

    if (scope === 'proximity' && lat && lng) {
      const radiusMetres = Number(radius) || 4000
      const schools = await col.find({
        ...base,
        location: {
          $nearSphere: {
            $geometry:    { type: 'Point', coordinates: [Number(lng), Number(lat)] },
            $maxDistance: radiusMetres,
          },
        },
      }).project(PROJECT).limit(100).toArray()
      return res.json(schools)
    }

    if (!gss) return res.status(400).json({ error: 'gss required' })

    let filter
    if      (scope === 'ward')         filter = { ...base, ward_gss: gss }
    else if (scope === 'constituency') filter = { ...base, con_gss:  gss }
    else if (scope === 'county')       filter = { ...base, la_gss:   gss }
    else return res.status(400).json({ error: 'Invalid scope' })

    const schools = await col.find(filter).project(PROJECT).sort({ name: 1 }).limit(500).toArray()
    res.json(schools)
  } catch (err) {
    console.error('schools route error', err)
    res.status(500).json({ error: 'Failed to load schools' })
  }
})

export default router
