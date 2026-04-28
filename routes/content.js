/**
 * @file routes/content.js
 * @description Content and population proxy routes.
 *
 * GET /api/content/:type/:slug
 *   Three-source lookup: in-memory cache -> MongoDB geo_content -> upstream API.
 *   Upstream is Parliament Members API for constituencies, Wikipedia REST for all
 *   others. Wikidata P1082 is fetched for population on each upstream hit.
 *   Successful upstream results are upserted into Mongo for future local-first hits.
 *
 * GET /api/population/:gss
 *   Nomis NM_2001_1 dataset lookup by ONS GSS code. Separate 30-day cache.
 *   Currently returns no data for electoral geographies -- dataset TBD.
 */

import { Router }    from 'express'
import { geoContent } from '../db/mongo.js'
import { ALLOWED_CONTENT_TYPES } from '../config/constants.js'
import { contentCacheGet, contentCacheSet, CONTENT_TTL } from '../cache/contentCache.js'

const router = Router()

// ── /api/content/:type/:slug ─────────────────────────────────────────────────

router.get('/content/:type/:slug', async (req, res) => {
  const { type, slug } = req.params
  if (!ALLOWED_CONTENT_TYPES.has(type)) {
    return res.status(400).json({ error: 'Invalid content type' })
  }

  const cacheKey = `${type}:${slug}`
  const cached   = contentCacheGet(cacheKey)
  if (cached) return res.json(cached)

  try {
    const ttl = CONTENT_TTL[type] ?? CONTENT_TTL.county

    // Mongo local-first (non-constituency types only).
    // Constituencies are always fetched from Parliament API -- MPs change.
    if (type !== 'constituency') {
      const col = geoContent()
      if (col) {
        const doc = await col.findOne({ type, slug })
        if (doc && (doc.summary || doc.extract)) {
          const result = {
            contentType:   doc.summary ? 'curated' : 'wiki',
            summary:       doc.summary        ?? null,
            extract:       doc.extract        ?? null,
            thumbnail:     doc.thumbnail      ?? null,
            title:         doc.name           ?? slug,
            wikiUrl:       doc.wikiUrl        ?? null,
            mpName:        null,
            party:         null,
            partyColour:   null,
            population:    doc.population     ?? null,
            area:          doc.area           ?? null,
            elevation:     doc.elevation      ?? null,
            website:       doc.website        ?? null,
            notable_facts: doc.notable_facts  ?? [],
            category_tags: doc.category_tags  ?? [],
            gather_status: doc.gather_status  ?? 'none',
          }
          contentCacheSet(cacheKey, result, ttl)
          return res.json(result)
        }
      }
    }

    // Constituency -- Parliament Constituency Search API.
    // Uses Location/Constituency endpoint which returns currentRepresentation (current MP).
    if (type === 'constituency') {
      const searchName = slug.replace(/_/g, ' ')
      const conUrl     = `https://members-api.parliament.uk/api/Location/Constituency/Search?searchText=${encodeURIComponent(searchName)}&skip=0&take=5`
      const conResp    = await fetch(conUrl, {
        headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
        signal:  AbortSignal.timeout(8000),
      })
      if (!conResp.ok) return res.status(502).json({ error: 'Parliament API failed' })
      const conData = await conResp.json()

      const normTarget = searchName.toLowerCase()
      const match      = conData.items?.find(
        item => item.value?.name?.toLowerCase() === normTarget
      ) ?? conData.items?.[0]

      const member = match?.value?.currentRepresentation?.member?.value
      if (!member) return res.status(404).json({ error: 'No MP found' })

      const mpName = member.nameDisplayAs ?? member.nameFull ?? null
      if (!mpName) return res.status(404).json({ error: 'No MP name' })

      // Wikidata P1082 -- constituency population.
      // Try bare name first, then with _(UK_Parliament_constituency) suffix.
      let conPopulation = null
      try {
        const baseName   = (match?.value?.name ?? searchName).replace(/ /g, '_')
        const slugsToTry = [baseName, `${baseName}_(UK_Parliament_constituency)`]
        for (const wdSlug of slugsToTry) {
          const wdUrl  = `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(wdSlug)}&props=claims&languages=en&format=json`
          const wdResp = await fetch(wdUrl, {
            headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
            signal:  AbortSignal.timeout(8000),
          })
          if (!wdResp.ok) continue
          const wdData = await wdResp.json()
          const entity = Object.values(wdData.entities ?? {})[0]
          if (entity?.missing) continue
          const claims = entity?.claims?.P1082 ?? []
          const claim  = claims.find(c => c.rank === 'preferred') ?? claims.find(c => c.rank === 'normal')
          const amount = claim?.mainsnak?.datavalue?.value?.amount
          if (amount) { conPopulation = Number(amount.replace('+', '')).toLocaleString('en-GB'); break }
        }
      } catch { /* population stays null */ }

      const result = {
        contentType:  'mp',
        mpName,
        party:        member.latestParty?.name                ?? null,
        partyColour:  member.latestParty?.backgroundColour    ?? null,
        thumbnail:    member.thumbnailUrl                     ?? null,
        title:        match?.value?.name ?? searchName,
        extract:      null,
        wikiUrl:      null,
        population:   conPopulation,
      }
      contentCacheSet(cacheKey, result, ttl)
      return res.json(result)
    }

    // All other types -- Wikipedia REST Summary API.
    const wikiUrl  = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`
    const response = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
      signal:  AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      return res.status(response.status === 404 ? 404 : 502).json({ error: 'Wikipedia fetch failed' })
    }
    const wiki = await response.json()

    // Wikidata P1082 -- population for place types. Fails silently.
    let population = null
    try {
      const wdUrl  = `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(slug)}&props=claims&languages=en&format=json`
      const wdResp = await fetch(wdUrl, {
        headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
        signal:  AbortSignal.timeout(8000),
      })
      if (wdResp.ok) {
        const wdData  = await wdResp.json()
        const entity  = Object.values(wdData.entities ?? {})[0]
        const claims  = entity?.claims?.P1082 ?? []
        const claim   = claims.find(c => c.rank === 'preferred') ?? claims.find(c => c.rank === 'normal')
        const amount  = claim?.mainsnak?.datavalue?.value?.amount
        if (amount) population = Number(amount.replace('+', '')).toLocaleString('en-GB')
        console.log(`[wikidata] ${slug} -> population: ${population}`)
      }
    } catch (e) { console.error(`[wikidata] ${slug} error:`, e.message) }

    const result = {
      contentType:   'wiki',
      extract:       wiki.extract                                                 ?? null,
      thumbnail:     wiki.thumbnail?.source                                       ?? null,
      title:         wiki.title                                                   ?? slug,
      wikiUrl:       wiki.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${slug}`,
      mpName:        null,
      party:         null,
      partyColour:   null,
      population,
      area:          null,
      elevation:     null,
      website:       null,
      notable_facts: [],
      category_tags: [],
      gather_status: 'none',
    }

    // Upsert into Mongo so future requests hit the local-first path.
    const col = geoContent()
    if (col && (result.extract || result.thumbnail || result.title)) {
      col.updateOne(
        { type, slug },
        { $set: { type, slug, name: result.title, extract: result.extract,
                  thumbnail: result.thumbnail, wikiUrl: result.wikiUrl,
                  population: result.population ?? null, updatedAt: new Date() } },
        { upsert: true }
      ).catch(err => console.error(`[mongo] upsert failed for ${type}:${slug}:`, err.message))
    }

    contentCacheSet(cacheKey, result, ttl)
    return res.json(result)

  } catch (err) {
    console.error('[content proxy] fetch error:', err.message)
    return res.status(502).json({ error: 'Fetch failed' })
  }
})

// ── /api/population/:gss ─────────────────────────────────────────────────────

const popCache = new Map()
const POP_TTL  = 30 * 24 * 60 * 60 * 1000
const GSS_RE   = /^[ENSW]\d{8}$/

router.get('/population/:gss', async (req, res) => {
  const { gss } = req.params
  if (!GSS_RE.test(gss)) return res.status(400).json({ error: 'Invalid GSS code' })

  const cached = popCache.get(gss)
  if (cached && Date.now() < cached.expiresAt) return res.json(cached.data)

  try {
    const nomisUrl = `https://www.nomisweb.co.uk/api/v01/dataset/NM_2001_1.data.json?geography=${gss}&cell=0&measures=20100&select=obs_value`
    const resp     = await fetch(nomisUrl, {
      headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
      signal:  AbortSignal.timeout(8000),
    })
    if (!resp.ok) return res.status(502).json({ error: 'Nomis API failed' })
    const data  = await resp.json()
    const value = data.obs?.[0]?.obs_value?.value
    if (value == null) return res.status(404).json({ error: 'No population data' })
    const result = { population: Number(value).toLocaleString('en-GB') }
    popCache.set(gss, { data: result, expiresAt: Date.now() + POP_TTL })
    return res.json(result)
  } catch (err) {
    console.error('[population proxy] error:', err.message)
    return res.status(502).json({ error: 'Fetch failed' })
  }
})

export default router
