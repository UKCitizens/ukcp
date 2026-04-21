/**
 * @file usePopulation.js
 * @description Fetches Census 2021 population for a ward or constituency
 * from the UKCP population proxy (/api/population/:gss).
 *
 * Returns null when gss is absent or the fetch fails.
 * No local cache — server-side cache (30-day TTL) is sufficient.
 *
 * @param {string|null} gss - ONS GSS code (e.g. E05010673, E14000535)
 * @returns {{ population: string|null, loading: boolean }}
 */

import { useState, useEffect } from 'react'

export function usePopulation(gss) {
  const [population, setPopulation] = useState(null)
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    if (!gss) { setPopulation(null); return }
    let cancelled = false
    setLoading(true)
    fetch(`/api/population/${gss}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled) setPopulation(data?.population ?? null) })
      .catch(() => { if (!cancelled) setPopulation(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gss])

  return { population, loading }
}
