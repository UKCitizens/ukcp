/**
 * @file src/lib/postConfig.js
 * @description Module-level cache for the post_type_config table.
 *   GET /api/posts/config is fetched once per page load and shared across all
 *   composers. Cache survives navigation but resets on full reload.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? ''

let configsCache   = null
let configsPromise = null

/**
 * Returns all post_type_config rows. Cached after the first successful fetch.
 * On failure the promise is dropped so the next caller retries.
 * @returns {Promise<object[]>}
 */
export async function loadPostConfigs() {
  if (configsCache) return configsCache
  if (!configsPromise) {
    configsPromise = fetch(`${API_BASE}/api/posts/config`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`config fetch ${r.status}`)))
      .then(rows => { configsCache = rows; return rows })
      .catch(err => { configsPromise = null; throw err })
  }
  return configsPromise
}

/**
 * Returns the config row for a given post_type, or null if not found.
 * @param {string} postType
 * @returns {Promise<object|null>}
 */
export async function getPostConfig(postType) {
  const rows = await loadPostConfigs()
  return rows.find(r => r.post_type === postType) ?? null
}
