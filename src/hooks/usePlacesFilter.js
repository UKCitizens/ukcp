/**
 * @file usePlacesFilter.js
 * @description Reactive hook that derives filtered, grouped places from the
 * current navigation path.
 *
 * Derives the deepest available scope from path (county > region > country)
 * and passes it to filterPlaces. A null scope returns all UK places.
 */

import { useMemo } from 'react'
import { filterPlaces } from '../utils/filterPlaces.js'

/**
 * Derives filtered and grouped places from the current navigation path.
 *
 * @param {object[]}                              places - Flat places array from useLocationData.
 * @param {Array<{ level: string, value: string }>} path - Navigation path from useNavigation.
 * @returns {{
 *   grouped: { City: object[], Town: object[], Village: object[], Hamlet: object[] }
 * }}
 */
export function usePlacesFilter(places, path) {
  // Derive deepest available scope: county → region → country → null (all UK).
  const scope = useMemo(() => {
    if (!Array.isArray(path) || path.length === 0) return null
    for (const level of ['county', 'region', 'country']) {
      const entry = path.find(p => p.level === level)
      if (entry) return { level, value: entry.value }
    }
    return null
  }, [path])

  const grouped = useMemo(
    () => filterPlaces(places, scope),
    [places, scope]
  )

  /** Stable string key — changes only when geographic scope changes. */
  const scopeKey = scope ? `${scope.level}:${scope.value}` : 'uk'

  return { grouped, scopeKey }
}
