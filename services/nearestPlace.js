/**
 * @file services/nearestPlace.js
 * @description Finds the nearest vernacular settlement (City/Town/Village/Hamlet)
 * to a given lat/lng, using the MongoDB places collection.
 *
 * Note: lat/lng are stored as strings in MongoDB (build.py never casts them).
 * The bounding-box query uses $expr + $toDouble to cast at query time.
 * Full collection scan on ~54k docs -- acceptable for a one-off registration call.
 */

import { placesCol } from '../db/mongo.js'

const R_KM = 6371
const SNAP_TYPES = ['City', 'Town', 'Village', 'Hamlet', 'Suburb',
                    'city', 'town', 'village', 'hamlet', 'suburb']
const BOX = 1.0  // degrees ~70 km

function haversine(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return 2 * R_KM * Math.asin(Math.sqrt(a))
}

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ id: string, name: string, place_type: string, distance_km: number }|null>}
 */
export async function findNearestPlace(lat, lng) {
  const col = placesCol()
  if (!col || lat == null || lng == null) return null

  const candidates = await col.find({
    place_type: { $in: SNAP_TYPES },
    $expr: {
      $and: [
        { $gte: [{ $toDouble: '$lat' }, lat - BOX] },
        { $lte: [{ $toDouble: '$lat' }, lat + BOX] },
        { $gte: [{ $toDouble: '$lng' }, lng - BOX] },
        { $lte: [{ $toDouble: '$lng' }, lng + BOX] },
      ],
    },
  }).project({ name: 1, place_type: 1, lat: 1, lng: 1 }).toArray()

  if (!candidates.length) return null

  let nearest = null
  let minDist = Infinity
  for (const p of candidates) {
    const pLat = parseFloat(p.lat)
    const pLng = parseFloat(p.lng)
    if (isNaN(pLat) || isNaN(pLng)) continue
    const d = haversine(lat, lng, pLat, pLng)
    if (d < minDist) { minDist = d; nearest = p }
  }

  if (!nearest) return null
  return {
    id:          nearest._id.toString(),
    name:        nearest.name,
    place_type:  nearest.place_type,
    distance_km: Math.round(minDist * 10) / 10,
  }
}
