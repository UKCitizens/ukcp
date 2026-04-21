/**
 * @file filterPlaces.js
 * @description Pure utility for filtering and grouping places by geographic scope.
 *
 * Operates on the flat LOC-row array from useLocationData. Filters by the
 * deepest available scope level and groups by place_type.
 *
 * Scope levels and their corresponding CSV field:
 *   county  → ctyhistnm
 *   region  → region
 *   country → country
 *   null    → no filter (all UK)
 *
 * No imports. No side effects. Must never throw.
 */

/** @type {string[]} Valid place_type values, in render order. */
const VALID_TYPES = ['City', 'Town', 'Village', 'Hamlet']

/** Maps navigation level names to LOC-row field names. */
const SCOPE_FIELD = {
  county:  'ctyhistnm',
  region:  'region',
  country: 'country',
}

/**
 * Filters the flat LOC-row array to the given scope, then groups by place_type.
 *
 * @param {object[]} places - Flat LOC-row array from useLocationData.
 *   Each row has: name, place_type, ctyhistnm, region, country.
 * @param {{ level: string, value: string }|null} scope
 *   Deepest available navigation scope. Null returns all UK places.
 * @returns {{
 *   City:    object[],
 *   Town:    object[],
 *   Village: object[],
 *   Hamlet:  object[]
 * }} Grouped by place_type, each group sorted alphabetically by name.
 */
export function filterPlaces(places, scope) {
  const empty = { City: [], Town: [], Village: [], Hamlet: [] }

  if (!Array.isArray(places) || !places.length) return empty

  const field     = scope ? SCOPE_FIELD[scope.level] : null
  const normValue = scope?.value?.trim().toLowerCase() ?? null

  const grouped = { City: [], Town: [], Village: [], Hamlet: [] }

  for (const place of places) {
    try {
      if (!place?.name || !place.place_type) continue
      if (typeof place.name !== 'string' || place.name.trim() === '') continue
      if (!VALID_TYPES.includes(place.place_type)) continue

      if (field && normValue) {
        const placeVal = place[field]?.trim().toLowerCase()
        if (placeVal !== normValue) continue
      }

      grouped[place.place_type].push(place)
    } catch {
      // silently skip malformed rows
    }
  }

  for (const type of VALID_TYPES) {
    grouped[type].sort((a, b) =>
      a.name.trim().toLowerCase().localeCompare(b.name.trim().toLowerCase())
    )
  }

  return grouped
}
