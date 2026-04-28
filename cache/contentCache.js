/**
 * @file cache/contentCache.js
 * @description In-memory content cache for the /api/content proxy.
 *
 * Keyed by "type:slug". TTL varies by content type. LRU eviction at MAX_CACHE
 * entries (oldest insertion order). Cache is wiped on process restart -- Railway
 * redeploys cause a cold start and all entries re-warm from Atlas or upstream APIs.
 *
 * Shared by routes/content.js (reads and writes) and routes/admin.js (cache bust
 * on geo-content admin saves so edits surface immediately without a cache flush).
 */

/** TTL in milliseconds by content type. */
export const CONTENT_TTL = {
  country:       90 * 24 * 60 * 60 * 1000,
  region:        90 * 24 * 60 * 60 * 1000,
  county:        30 * 24 * 60 * 60 * 1000,
  city:          14 * 24 * 60 * 60 * 1000,
  town:          14 * 24 * 60 * 60 * 1000,
  village:       14 * 24 * 60 * 60 * 1000,
  hamlet:        14 * 24 * 60 * 60 * 1000,
  constituency:   7 * 24 * 60 * 60 * 1000,
  ward:           7 * 24 * 60 * 60 * 1000,
}

const MAX_CACHE    = 5000
const contentCache = new Map()

/**
 * Returns cached data for the given key, or null if missing or expired.
 * @param {string} key
 * @returns {object|null}
 */
export function contentCacheGet(key) {
  const entry = contentCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { contentCache.delete(key); return null }
  return entry.data
}

/**
 * Stores data under key with a TTL-based expiry.
 * Evicts the oldest entry when MAX_CACHE is reached.
 * @param {string} key
 * @param {object} data
 * @param {number} ttl - Milliseconds until expiry.
 */
export function contentCacheSet(key, data, ttl) {
  if (contentCache.size >= MAX_CACHE) {
    contentCache.delete(contentCache.keys().next().value)
  }
  contentCache.set(key, { data, expiresAt: Date.now() + ttl })
}

/**
 * Removes a single entry from the cache.
 * Called by the admin geo-content save so edits surface immediately.
 * @param {string} key
 */
export function contentCacheBust(key) {
  contentCache.delete(key)
}
