/**
 * @file services/wikipedia.js
 * @description Wikipedia REST Summary API adapter.
 *
 * fetchWikiSummary(slug)
 *   Fetches the Wikipedia summary for a given page slug.
 *   Returns { extract, thumbnail, title, wikiUrl } or throws on failure.
 */

const UA = 'UKCP/1.0 (phil@ukcp.dev)'

/**
 * @param {string} slug  Wikipedia page slug (URL-encoded by this function)
 * @returns {{ extract: string|null, thumbnail: string|null, title: string, wikiUrl: string }}
 * @throws on non-OK response or network timeout
 */
export async function fetchWikiSummary(slug) {
  const url  = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`
  const resp = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal:  AbortSignal.timeout(8000),
  })

  if (!resp.ok) {
    const err = new Error('Wikipedia fetch failed')
    err.status = resp.status === 404 ? 404 : 502
    throw err
  }

  const data = await resp.json()
  return {
    extract:   data.extract                                                   ?? null,
    thumbnail: data.thumbnail?.source                                         ?? null,
    title:     data.title                                                     ?? slug,
    wikiUrl:   data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${slug}`,
  }
}
