/**
 * @file services/nomis.js
 * @description Nomis API adapter -- NM_2001_1 population by ONS GSS code.
 *
 * fetchNomisPopulation(gss)
 *   Fetches the population figure for a GSS code from the Nomis NM_2001_1 dataset.
 *   Returns a formatted string (e.g. "12,345") or throws on failure/no data.
 */

const UA = 'UKCP/1.0 (phil@ukcp.dev)'

/**
 * @param {string} gss  ONS GSS code (e.g. "E06000001")
 * @returns {Promise<string>}  formatted population string
 * @throws on non-OK response, network timeout, or no data found
 */
export async function fetchNomisPopulation(gss) {
  const url  = `https://www.nomisweb.co.uk/api/v01/dataset/NM_2001_1.data.json?geography=${gss}&cell=0&measures=20100&select=obs_value`
  const resp = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal:  AbortSignal.timeout(8000),
  })

  if (!resp.ok) {
    const err = new Error('Nomis API failed')
    err.status = 502
    throw err
  }

  const data  = await resp.json()
  const value = data.obs?.[0]?.obs_value?.value
  if (value == null) {
    const err = new Error('No population data')
    err.status = 404
    throw err
  }

  return Number(value).toLocaleString('en-GB')
}
