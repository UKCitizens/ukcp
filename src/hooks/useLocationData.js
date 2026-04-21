/**
 * @file useLocationData.js
 * @description Primary data hook for UKCP location data (v2 schema).
 *
 * On mount this hook:
 *   1. Checks localStorage for version-keyed cached data.
 *   2. If both caches are present, uses them directly — no fetch.
 *   3. If either cache is absent, fetches newplace.csv, parses all rows,
 *      builds the hierarchy (LOC + WD rows), extracts LOC rows as the
 *      places array, writes both to localStorage.
 *
 * CSV location (served from public/data/):
 *   /data/newplace.csv — 72 431 rows, LOC + WD types, v2 schema.
 *
 * Exposes: { hierarchy, places, loading, error }
 *   hierarchy — navigation tree built by buildHierarchy
 *   places    — flat array of LOC rows (used by filterPlaces / PlacesCard)
 *
 * Data quality notes (see spec Section 4):
 *   - All string comparisons are normalised (trim, lowercase).
 *   - Bad rows are skipped with console.warn — never thrown.
 *   - localStorage quota errors are caught and surfaced via `error`.
 */

import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import { buildHierarchy } from '../utils/buildHierarchy.js'
import { CACHE_KEY_HIERARCHY, CACHE_KEY_PLACES, CACHE_KEY_CONTAINMENT, CACHE_KEY_WARDS } from '../utils/cacheKeys.js'

/**
 * Attempt to read and JSON-parse a value from localStorage.
 * Returns null on any failure (missing key, invalid JSON, SecurityError).
 * @param {string} key - localStorage key to read.
 * @returns {*|null} Parsed value, or null on failure.
 */
function readCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Attempt to write a value to localStorage as JSON.
 * Returns an Error if the write fails (e.g. quota exceeded), otherwise null.
 * @param {string} key   - localStorage key to write.
 * @param {*}      value - Value to serialise and store.
 * @returns {Error|null} Error on failure, null on success.
 */
function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return null
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err))
  }
}

/**
 * Fetch and parse a CSV file using PapaParse.
 * Resolves with an array of row objects (header row used as keys).
 * Rejects if the fetch itself fails (network error / 4xx / 5xx).
 * Individual malformed rows are skipped with console.warn.
 * @param {string} url - URL of the CSV file to fetch.
 * @returns {Promise<object[]>} Parsed row objects.
 */
function parseCsv(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().replace(/^\uFEFF/, ''),
      transform: (value) => (typeof value === 'string' ? value.trim() : value),
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          for (const err of results.errors) {
            console.warn('[useLocationData] CSV parse warning:', err)
          }
        }
        resolve(results.data)
      },
      error: (err) => {
        reject(new Error(`Failed to fetch ${url}: ${err.message}`))
      },
    })
  })
}

/**
 * useLocationData — loads and caches UKCP location dataset (v2 schema).
 *
 * Single CSV source: newplace.csv. All rows are parsed; hierarchy is built
 * from both LOC and WD rows; places (LOC rows only) are stored separately
 * for use by filterPlaces.
 *
 * On first load both derived datasets are written to localStorage under
 * version-keyed constants from cacheKeys.js. Subsequent loads use cache.
 *
 * @returns {{
 *   hierarchy:   object|null,
 *   places:      object[]|null,
 *   containment: object|null,
 *   loading:     boolean,
 *   error:       string|null
 * }}
 */
export function useLocationData() {
  const [hierarchy,   setHierarchy]   = useState(null)
  const [places,      setPlaces]      = useState(null)
  const [wards,       setWards]       = useState(null)
  const [containment, setContainment] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        let hierarchyData   = readCache(CACHE_KEY_HIERARCHY)
        let placesData      = readCache(CACHE_KEY_PLACES)
        let wardsData       = readCache(CACHE_KEY_WARDS)
        let containmentData = readCache(CACHE_KEY_CONTAINMENT)

        if (hierarchyData === null || placesData === null || wardsData === null) {
          const allRows = await parseCsv('/data/newplace.csv')
          if (hierarchyData === null) {
            hierarchyData = buildHierarchy(allRows)
            const writeErr = writeCache(CACHE_KEY_HIERARCHY, hierarchyData)
            if (writeErr) console.warn('[useLocationData] hierarchy cache write failed:', writeErr)
          }
          if (placesData === null) {
            placesData = allRows.filter(row => row.type === 'LOC')
            const writeErr = writeCache(CACHE_KEY_PLACES, placesData)
            if (writeErr) console.warn('[useLocationData] places cache write failed:', writeErr)
          }
          if (wardsData === null) {
            // Deduplicate WD rows — same ward can appear multiple times in source CSV.
            // buildHierarchy deduplicates on write; the flat wards array must do the same
            // or the map renders multiple markers at the same point.
            const wardsSeen = new Set()
            wardsData = allRows.filter(row => {
              if (row.type !== 'WD') return false
              const key = `${row.constituency}||${row.name}`
              if (wardsSeen.has(key)) return false
              wardsSeen.add(key)
              return true
            })
            const writeErr = writeCache(CACHE_KEY_WARDS, wardsData)
            if (writeErr) console.warn('[useLocationData] wards cache write failed:', writeErr)
          }
        }

        if (containmentData === null) {
          const resp = await fetch('/data/containment.json')
          if (!resp.ok) throw new Error(`Failed to fetch containment.json: ${resp.status}`)
          containmentData = await resp.json()
          const writeErr = writeCache(CACHE_KEY_CONTAINMENT, containmentData)
          if (writeErr) console.warn('[useLocationData] containment cache write failed:', writeErr)
        }

        if (!cancelled) {
          setHierarchy(hierarchyData)
          setPlaces(placesData)
          setWards(wardsData)
          setContainment(containmentData)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message ?? 'Unknown error loading location data')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  return { hierarchy, places, wards, containment, loading, error }
}
