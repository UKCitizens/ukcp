/**
 * @file hooks/useNearby.js
 * @description Fetches nearby context for a place, ward, or constituency.
 * Caches result in localStorage under nearby:v1:<entityType>:<id>, 30-day TTL.
 *
 * @param {Object} params
 * @param {string} params.entityType -- 'place' | 'ward' | 'constituency'
 * @param {string} [params.id]       -- place id (entityType = 'place')
 * @param {string} [params.gss]      -- GSS code (entityType = 'ward' | 'constituency')
 * @param {number} [params.lat]      -- centroid lat (entityType = 'ward', optional)
 * @param {number} [params.lng]      -- centroid lng (entityType = 'ward', optional)
 */

import { useState, useEffect } from 'react'

const CACHE_VERSION = 'v1'
const CACHE_TTL_MS  = 30 * 24 * 60 * 60 * 1000

export function useNearby({ entityType, id, gss, lat, lng } = {}) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let url, cacheKey

    if (entityType === 'place' && id) {
      url      = `/api/places/${encodeURIComponent(id)}/nearby`
      cacheKey = `nearby:${CACHE_VERSION}:place:${id}`
    } else if (entityType === 'ward' && gss) {
      const params = (lat != null && lng != null) ? `?lat=${lat}&lng=${lng}` : ''
      url      = `/api/nearby/ward/${encodeURIComponent(gss)}${params}`
      cacheKey = `nearby:${CACHE_VERSION}:ward:${gss}`
    } else if (entityType === 'constituency' && gss) {
      url      = `/api/nearby/constituency/${encodeURIComponent(gss)}`
      cacheKey = `nearby:${CACHE_VERSION}:constituency:${gss}`
    } else {
      return
    }

    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) ?? 'null')
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        setData(cached.data)
        return
      }
    } catch {}

    setLoading(true)
    fetch(url)
      .then(r => r.json())
      .then(d => {
        const hasContent = d.peers?.length || d.hierarchy || d.settlements?.length ||
                           d.towns?.length || d.city || d.places?.length
        if (hasContent) localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: d }))
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [entityType, id, gss, lat, lng])

  return { data, loading, error }
}
