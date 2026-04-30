/**
 * @file services/postcodes.js
 * @description Wraps the postcodes.io public API for UK postcode lookups.
 * No auth required by postcodes.io. AbortSignal.timeout(8000) guards against hangs.
 */

/**
 * Looks up a UK postcode via postcodes.io.
 * Returns constituency name, con_gss, ward, ward_gss.
 * Throws on invalid postcode or network failure.
 *
 * @param {string} postcode
 * @returns {Promise<{ postcode: string, constituency: string, con_gss: string|null, ward: string, ward_gss: string|null }>}
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
    constituency: r.parliamentary_constituency,
    con_gss:      r.codes?.parliamentary_constituency ?? null,
    ward:         r.ward,
    ward_gss:     r.codes?.ward ?? null,
  }
}
