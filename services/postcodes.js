/**
 * @file services/postcodes.js
 * @description Wraps the postcodes.io public API for UK postcode lookups.
 * No auth required by postcodes.io. AbortSignal.timeout(8000) guards against hangs.
 *
 * Field name reference (postcodes.io):
 *   r.admin_ward                      -- ward name
 *   r.codes.admin_ward                -- ward GSS code
 *   r.parliamentary_constituency      -- constituency name
 *   r.codes.parliamentary_constituency -- constituency GSS code
 *   r.admin_county                    -- county name
 *   r.region                          -- region name
 *   r.country                         -- country name
 */

export async function lookupPostcode(postcode) {
  const normalised = postcode.replace(/\s+/g, '').toUpperCase()
  const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(normalised)}`
  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) })

  if (resp.status === 404) {
    const err = new Error('Postcode not found')
    err.status = 400
    throw err
  }
  if (!resp.ok) {
    const err = new Error('Postcodes.io unavailable')
    err.status = 502
    throw err
  }

  const data = await resp.json()
  const r = data.result
  return {
    postcode:     r.postcode,
    constituency: r.parliamentary_constituency ?? null,
    con_gss:      r.codes?.parliamentary_constituency ?? null,
    ward:         r.admin_ward ?? null,
    ward_gss:     r.codes?.admin_ward ?? null,
    county:       r.admin_county ?? null,
    region:       r.region ?? null,
    country:      r.country ?? null,
    latitude:     r.latitude ?? null,
    longitude:    r.longitude ?? null,
  }
}
