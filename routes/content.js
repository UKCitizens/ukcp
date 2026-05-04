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
import { fetchWikiSummary }                    from '../services/wikipedia.js'
import { wikidataPopulation, wikidataPopulationConstituency } from '../services/wikidata.js'
import { fetchConstituencyMP }                 from '../services/parliament.js'
import { fetchNomisPopulation }                from '../services/nomis.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

const router = Router()

// ── /api/content/:type/:slug ─────────────────────────────────────────────────

router.get('/content/:type/:slug', asyncHandler(async (req, res) => {
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

    // Constituency -- Parliament Members API.
    if (type === 'constituency') {
      const searchName = slug.replace(/_/g, ' ')

      let mp
      try {
        mp = await fetchConstituencyMP(searchName)
      } catch (err) {
        return res.status(err.status ?? 502).json({ error: err.message })
      }

      const population = await wikidataPopulationConstituency(mp.matchedName)

      const result = {
        contentType:  'mp',
        mpName:       mp.mpName,
        party:        mp.party,
        partyColour:  mp.partyColour,
        thumbnail:    mp.thumbnail,
        title:        mp.title,
        extract:      null,
        wikiUrl:      null,
        population,
      }
      contentCacheSet(cacheKey, result, ttl)
      return res.json(result)
    }

    // All other types -- Wikipedia REST Summary API.
    let wiki
    try {
      wiki = await fetchWikiSummary(slug)
    } catch (err) {
      return res.status(err.status ?? 502).json({ error: err.message })
    }

    const population = await wikidataPopulation(slug)

    const result = {
      contentType:   'wiki',
      extract:       wiki.extract,
      thumbnail:     wiki.thumbnail,
      title:         wiki.title,
      wikiUrl:       wiki.wikiUrl,
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
}))

// ── /api/population/:gss ─────────────────────────────────────────────────────

const popCache = new Map()
const POP_TTL  = 30 * 24 * 60 * 60 * 1000
const GSS_RE   = /^[ENSW]\d{8}$/

router.get('/population/:gss', asyncHandler(async (req, res) => {
  const { gss } = req.params
  if (!GSS_RE.test(gss)) return res.status(400).json({ error: 'Invalid GSS code' })

  const cached = popCache.get(gss)
  if (cached && Date.now() < cached.expiresAt) return res.json(cached.data)

  try {
    const population = await fetchNomisPopulation(gss)
    const result     = { population }
    popCache.set(gss, { data: result, expiresAt: Date.now() + POP_TTL })
    return res.json(result)
  } catch (err) {
    console.error('[population proxy] error:', err.message)
    return res.status(err.status ?? 502).json({ error: err.message })
  }
}))

export default router
