/**
 * @file findRelatedPlace.js
 * @description Cross-reference a constituency or ward name against the places
 * (LOC) dataset to find a geographically related place.
 *
 * Match tiers (in priority order):
 *   1. Exact       — names are equal after normalisation.
 *   2. Containment — one name is a contiguous substring of the other
 *                    (e.g. "Redcar and Cleveland" contains "Redcar").
 *   3. Token       — meaningful word overlap ≥ 50% of the shorter name's tokens
 *                    (e.g. "St Annes East" ↔ "St Annes-on-Sea" share "st","annes").
 *
 * All matches are scoped to the same county (ctyhistnm) to reduce false
 * positives across the country.
 *
 * @param {string}    targetName - Constituency or ward name to match.
 * @param {object[]}  places     - Flat LOC rows from useLocationData.
 * @param {string|null} county   - County value from current nav path (ctyhistnm).
 * @returns {{ match: object|null, confidence: 'exact'|'fuzzy'|'none' }}
 */

/** Words excluded from token scoring — directional/structural noise. */
const STOP = new Set([
  'and', 'the', 'of', 'with', 'in',
  'east', 'west', 'north', 'south', 'central', 'upper', 'lower', 'new', 'old',
])

/**
 * Normalise a name for comparison: lowercase, collapse hyphens/dashes to
 * spaces, collapse multiple spaces.
 * @param {string} s
 * @returns {string}
 */
function norm(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * Extract meaningful tokens from a normalised name string.
 * Filters out stop words and single-character tokens.
 * @param {string} normalised
 * @returns {string[]}
 */
function tokens(normalised) {
  return normalised.split(' ').filter(t => t.length > 1 && !STOP.has(t))
}

/**
 * @param {string}      targetName
 * @param {object[]}    places
 * @param {string|null} county
 * @returns {{ match: object|null, confidence: 'exact'|'fuzzy'|'none' }}
 */
export function findRelatedPlace(targetName, places, county) {
  if (!targetName || !Array.isArray(places) || !places.length) {
    return { match: null, confidence: 'none' }
  }

  const countyNorm = county ? norm(county) : null

  // Scope to county when we have one — reduces false positives significantly.
  const scoped = countyNorm
    ? places.filter(p => norm(p.ctyhistnm ?? '') === countyNorm)
    : places

  const target = norm(targetName)

  // ── Tier 1: Exact ─────────────────────────────────────────────────────────
  // Try county-scoped first; fall back to full dataset if county naming
  // differs between WD rows and LOC rows (e.g. "Cheshire East" vs "Cheshire").
  const exactInScope = scoped.find(p => norm(p.name) === target)
  if (exactInScope) return { match: exactInScope, confidence: 'exact' }

  if (scoped.length < places.length) {
    const exactFallback = places.find(p => norm(p.name) === target)
    if (exactFallback) return { match: exactFallback, confidence: 'exact' }
  }

  if (!scoped.length) return { match: null, confidence: 'none' }

  // ── Tier 2: Containment ───────────────────────────────────────────────────
  // target contains placeName OR placeName contains target.
  // Prefer towns/cities over villages/hamlets when multiple containment hits.
  const TYPE_RANK = { City: 4, Town: 3, Village: 2, Hamlet: 1 }
  const containmentHits = scoped.filter(p => {
    const pn = norm(p.name)
    return target.includes(pn) || pn.includes(target)
  })
  if (containmentHits.length) {
    containmentHits.sort(
      (a, b) => (TYPE_RANK[b.place_type] ?? 0) - (TYPE_RANK[a.place_type] ?? 0)
    )
    return { match: containmentHits[0], confidence: 'fuzzy' }
  }

  // ── Tier 3: Token overlap ─────────────────────────────────────────────────
  const targetTokens = tokens(target)
  if (!targetTokens.length) return { match: null, confidence: 'none' }

  let bestMatch = null
  let bestScore = 0

  for (const place of scoped) {
    const placeTokens = tokens(norm(place.name))
    if (!placeTokens.length) continue

    const overlap  = targetTokens.filter(t => placeTokens.includes(t)).length
    const minLen   = Math.min(targetTokens.length, placeTokens.length)
    const score    = overlap / minLen

    if (score > bestScore && score >= 0.5) {
      bestScore = score
      bestMatch = place
    }
  }

  if (bestMatch) return { match: bestMatch, confidence: 'fuzzy' }
  return { match: null, confidence: 'none' }
}
