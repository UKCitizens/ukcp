/**
 * @file services/wikidata.js
 * @description Wikidata API adapter -- P1082 population claim lookup.
 *
 * wikidataPopulation(slug)
 *   Looks up the P1082 (population) claim for a Wikipedia page slug.
 *   Returns a formatted string (e.g. "45,231") or null if not found.
 *   Never throws -- callers treat population as optional.
 *
 * wikidataPopulationConstituency(name)
 *   Tries two slug variants for UK Parliament constituencies:
 *   bare name, then name_(UK_Parliament_constituency).
 *   Returns formatted string or null.
 */

const UA = 'UKCP/1.0 (phil@ukcp.dev)'

function buildUrl(slug) {
  return `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(slug)}&props=claims&languages=en&format=json`
}

function extractPopulation(wdData) {
  const entity = Object.values(wdData.entities ?? {})[0]
  if (!entity || entity.missing) return null
  const claims = entity.claims?.P1082 ?? []
  const claim  = claims.find(c => c.rank === 'preferred') ?? claims.find(c => c.rank === 'normal')
  const amount = claim?.mainsnak?.datavalue?.value?.amount
  return amount ? Number(amount.replace('+', '')).toLocaleString('en-GB') : null
}

/**
 * @param {string} slug  Wikipedia page slug
 * @returns {Promise<string|null>}
 */
export async function wikidataPopulation(slug) {
  try {
    const resp = await fetch(buildUrl(slug), {
      headers: { 'User-Agent': UA },
      signal:  AbortSignal.timeout(8000),
    })
    if (!resp.ok) return null
    const data = await resp.json()
    const pop  = extractPopulation(data)
    console.log(`[wikidata] ${slug} -> population: ${pop}`)
    return pop
  } catch (e) {
    console.error(`[wikidata] ${slug} error:`, e.message)
    return null
  }
}

/**
 * @param {string} name  Constituency name (spaces allowed)
 * @returns {Promise<string|null>}
 */
export async function wikidataPopulationConstituency(name) {
  const base      = name.replace(/ /g, '_')
  const slugsToTry = [base, `${base}_(UK_Parliament_constituency)`]

  for (const slug of slugsToTry) {
    try {
      const resp = await fetch(buildUrl(slug), {
        headers: { 'User-Agent': UA },
        signal:  AbortSignal.timeout(8000),
      })
      if (!resp.ok) continue
      const data = await resp.json()
      const pop  = extractPopulation(data)
      if (pop) return pop
    } catch { /* try next slug */ }
  }
  return null
}
