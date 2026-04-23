/**
 * @file useLocationContent.js
 * @description Three-layer content cache for UKCP location content.
 *
 * L0 — geo-content.json: static file in public/data/. Covers UK/countries/regions/counties.
 *       Fetched once at module load, cached in memory. Checked before L1 or L2.
 *       Keys match type:slug pattern. Fields: name, f1 (image), f2 (population), f3 (blurb).
 *
 * L1 — localStorage: keyed content:v2:{type}:{slug}, 7-day TTL. Increment L1_VERSION to bust cache.
 *       Checked after L0 miss. Written on successful L2 fetch.
 *
 * L2 — Express proxy: GET /api/content/:type/:slug
 *       Fetches Wikipedia REST Summary API or Parliament API server-side.
 *       Returns { extract, thumbnail, title, wikiUrl } or MP card fields.
 *
 * Returns null values (not loading) when type or slug is absent.
 * Errors are surfaced via the error field; the UI degrades gracefully.
 */

import { useState, useEffect } from 'react'
import API_BASE from '../config.js'

// ── L0: geo-content.json — module-level cache ────────────────────────────
// Fetch is initiated immediately on module load so it is ready by the time
// the user navigates to a location. Failures degrade silently to L1/L2.

let _geoContent = null

// eslint-disable-next-line no-unused-vars
const _geoContentReady = fetch('/data/geo-content.json')
  .then(r => r.ok ? r.json() : {})
  .then(data => { _geoContent = data })
  .catch(() => { _geoContent = {} })

/**
 * Look up a type:slug pair in the in-memory geo-content cache.
 * Returns a normalised content object if found, null on any miss.
 * f3 placeholder text is treated as no extract (graceful empty state in UI).
 *
 * @param {string} type
 * @param {string} slug
 * @returns {object|null}
 */
function l0Read(type, slug) {
  if (!_geoContent) return null
  const entry = _geoContent[`${type}:${slug}`]
  if (!entry) return null
  return {
    contentType: type,
    extract:     entry.f3 && entry.f3 !== 'Content coming soon.' ? entry.f3 : null,
    thumbnail:   entry.f1 || null,
    title:       entry.name,
    wikiUrl:     null,
    mpName:      null,
    party:       null,
    partyColour: null,
    population:  entry.f2 || null,
    // geoData carries all authored fields for rendering in LocationInfo.
    // Fields are included only when non-empty so the UI can check presence simply.
    geoData: {
      motto:        entry.f4  || null,
      area:         entry.f5  || null,
      politics:     entry.f6  || null,
      economic:     entry.f7  || null,
      cultural:     entry.f8  || null,
      history:      entry.f10 || null,
      website:      entry.f13 || null,
      environment:  entry.f14 || null,
    },
  }
}

/** Client-side localStorage TTL — 7 days. */
const L1_TTL = 7 * 24 * 60 * 60 * 1000

/**
 * L1 cache version. Increment to bust all cached entries when the
 * underlying data source or response shape changes.
 */
const L1_VERSION = 'v3'

/**
 * Builds the localStorage key for a given type and slug.
 * @param {string} type
 * @param {string} slug
 * @returns {string}
 */
function l1Key(type, slug) {
  return `content:${L1_VERSION}:${type}:${slug}`
}

/**
 * Reads and validates a cached content entry from localStorage.
 * Returns null if missing, expired, or malformed.
 *
 * @param {string} type
 * @param {string} slug
 * @returns {object|null}
 */
function l1Read(type, slug) {
  try {
    const raw = localStorage.getItem(l1Key(type, slug))
    if (!raw) return null
    const { data, expiresAt } = JSON.parse(raw)
    if (Date.now() > expiresAt) {
      localStorage.removeItem(l1Key(type, slug))
      return null
    }
    return data
  } catch {
    return null
  }
}

/**
 * Writes a content entry to localStorage with a 7-day TTL.
 * Quota errors are silently swallowed.
 *
 * @param {string} type
 * @param {string} slug
 * @param {object} data - { extract, thumbnail, title, wikiUrl }
 */
function l1Write(type, slug, data) {
  try {
    localStorage.setItem(l1Key(type, slug), JSON.stringify({
      data,
      expiresAt: Date.now() + L1_TTL,
    }))
  } catch {
    // localStorage quota exceeded — silently swallow
  }
}

/**
 * useLocationContent — fetches and caches Wikipedia summary content for a location.
 *
 * @param {string|null} type - Location type: 'country' | 'region' | 'county' | 'city' | 'town'
 * @param {string|null} slug - Wikipedia-compatible slug (spaces replaced with underscores)
 * @returns {{
 *   extract:   string|null,
 *   thumbnail: string|null,
 *   title:     string|null,
 *   wikiUrl:   string|null,
 *   loading:   boolean,
 *   error:     string|null
 * }}
 */
export function useLocationContent(type, slug) {
  const [contentType, setContentType] = useState(null)
  const [summary,     setSummary]     = useState(null)
  const [extract,     setExtract]     = useState(null)
  const [thumbnail,   setThumbnail]   = useState(null)
  const [title,       setTitle]       = useState(null)
  const [wikiUrl,     setWikiUrl]     = useState(null)
  const [mpName,      setMpName]      = useState(null)
  const [party,       setParty]       = useState(null)
  const [partyColour, setPartyColour] = useState(null)
  const [population,  setPopulation]  = useState(null)
  const [geoData,     setGeoData]     = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
    // No context — clear state immediately, no fetch.
    if (!type || !slug) {
      setContentType(null)
      setSummary(null)
      setExtract(null)
      setThumbnail(null)
      setTitle(null)
      setWikiUrl(null)
      setMpName(null)
      setParty(null)
      setPartyColour(null)
      setPopulation(null)
      setGeoData(null)
      setError(null)
      setLoading(false)
      return
    }

    // Clear stale state from previous context before any cache/fetch.
    // Prevents old MP/wiki data persisting on screen while new fetch is in flight.
    setContentType(null)
    setSummary(null)
    setExtract(null)
    setThumbnail(null)
    setTitle(null)
    setWikiUrl(null)
    setMpName(null)
    setParty(null)
    setPartyColour(null)
    setPopulation(null)
    setGeoData(null)
    setError(null)

    // L0: await geo-content.json load (no-op if already resolved), then check.
    await _geoContentReady
    if (cancelled) return
    const l0 = l0Read(type, slug)
    if (l0) {
      setContentType(l0.contentType ?? null)
      setExtract(l0.extract)
      setThumbnail(l0.thumbnail)
      setTitle(l0.title)
      setWikiUrl(null)
      setMpName(null)
      setParty(null)
      setPartyColour(null)
      setPopulation(l0.population ?? null)
      setGeoData(l0.geoData ?? null)
      setLoading(false)
      setError(null)
      return
    }

    // L1: localStorage hit — populate immediately, no loading state needed.
    const cached = l1Read(type, slug)
    if (cached) {
      setContentType(cached.contentType ?? null)
      setExtract(cached.extract)
      setThumbnail(cached.thumbnail)
      setTitle(cached.title)
      setWikiUrl(cached.wikiUrl)
      setMpName(cached.mpName ?? null)
      setParty(cached.party ?? null)
      setPartyColour(cached.partyColour ?? null)
      setPopulation(null)
      setGeoData(null)
      setLoading(false)
      setError(null)
      return
    }

    // L2: proxy fetch.
    setLoading(true)
    setError(null)

    fetch(`${API_BASE}/api/content/${type}/${encodeURIComponent(slug)}`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        setContentType(data.contentType ?? null)
        setSummary(data.summary ?? null)
        setExtract(data.extract)
        setThumbnail(data.thumbnail)
        setTitle(data.title)
        setWikiUrl(data.wikiUrl)
        setMpName(data.mpName ?? null)
        setParty(data.party ?? null)
        setPartyColour(data.partyColour ?? null)
        setPopulation(data.population ?? null)
        // Only cache to L1 if the data is substantive (no null-mpName MP stubs).
        const cacheable = data.contentType !== 'mp' || !!data.mpName
        if (cacheable) l1Write(type, slug, data)
      })
      .catch(err => {
        if (!cancelled) setError(err.message ?? 'Content unavailable')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    } // end run()

    run()
    return () => { cancelled = true }
  }, [type, slug])

  return { contentType, summary, extract, thumbnail, title, wikiUrl, mpName, party, partyColour, population, geoData, loading, error }
}
