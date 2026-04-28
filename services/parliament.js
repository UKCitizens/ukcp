/**
 * @file services/parliament.js
 * @description Parliament Members API adapter -- constituency and MP lookup.
 *
 * fetchConstituencyMP(name)
 *   Searches the Parliament Constituency endpoint for a constituency name.
 *   Returns { mpName, party, partyColour, thumbnail, title } or throws on failure.
 *   Caller is responsible for population lookup (see wikidata.js).
 */

const UA       = 'UKCP/1.0 (phil@ukcp.dev)'
const BASE_URL = 'https://members-api.parliament.uk/api/Location/Constituency/Search'

/**
 * @param {string} name  Constituency name (spaces allowed)
 * @returns {{
 *   mpName:      string|null,
 *   party:       string|null,
 *   partyColour: string|null,
 *   thumbnail:   string|null,
 *   title:       string,
 *   matchedName: string,
 * }}
 * @throws on non-OK response or no MP found
 */
export async function fetchConstituencyMP(name) {
  const url  = `${BASE_URL}?searchText=${encodeURIComponent(name)}&skip=0&take=5`
  const resp = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal:  AbortSignal.timeout(8000),
  })

  if (!resp.ok) {
    const err = new Error('Parliament API failed')
    err.status = 502
    throw err
  }

  const data       = await resp.json()
  const normTarget = name.toLowerCase()
  const match      = data.items?.find(
    item => item.value?.name?.toLowerCase() === normTarget
  ) ?? data.items?.[0]

  const member = match?.value?.currentRepresentation?.member?.value
  if (!member) {
    const err = new Error('No MP found')
    err.status = 404
    throw err
  }

  const mpName = member.nameDisplayAs ?? member.nameFull ?? null
  if (!mpName) {
    const err = new Error('No MP name')
    err.status = 404
    throw err
  }

  return {
    mpName,
    party:       member.latestParty?.name              ?? null,
    partyColour: member.latestParty?.backgroundColour  ?? null,
    thumbnail:   member.thumbnailUrl                   ?? null,
    title:       match?.value?.name ?? name,
    matchedName: match?.value?.name ?? name,
  }
}
