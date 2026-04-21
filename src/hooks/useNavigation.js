/**
 * @file useNavigation.js
 * @description Navigation state hook for UKCP hierarchy navigation.
 * Manages the selection path, panel content, and sessionStorage persistence.
 *
 * panel1 shows all top-level countries from the hierarchy.
 * panel2 shows children at the current path depth via getChildren.
 * The full path is persisted to sessionStorage under UKCP_NAV_PATH on every
 * change and restored on mount once the hierarchy is available.
 */

import { useState, useEffect, useCallback } from 'react'
import { getChildren } from '../utils/getChildren.js'
import { COUNTRIES } from '../config/navConfig.js'

/** sessionStorage key for navigation path persistence. */
const SESSION_KEY = 'UKCP_NAV_PATH'

/**
 * Canonical level order — used by select/selectMany to truncate the path
 * at the correct depth before appending, preventing crumb accumulation.
 */
const LEVEL_ORDER = ['country', 'region', 'county', 'constituency', 'ward']

/**
 * Reads and JSON-parses the navigation path from sessionStorage.
 * Returns null on any failure (missing key, invalid JSON, SecurityError).
 * @returns {Array<{ level: string, value: string }>|null}
 */
function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw === null) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Writes the navigation path to sessionStorage as JSON.
 * Failures are silently swallowed.
 * @param {Array<{ level: string, value: string }>} path - Path to persist.
 */
function writeSession(path) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(path))
  } catch {
    // silently swallow — do not surface sessionStorage write failures
  }
}

/**
 * Validates that every step in a saved path exists in the current hierarchy.
 * Returns false on any mismatch so stale session data is discarded rather than
 * applied to an incompatible hierarchy.
 *
 * @param {object} hierarchy - Full hierarchy from buildHierarchy.
 * @param {Array<{ level: string, value: string }>} path - Saved path to validate.
 * @returns {boolean}
 */
function isPathValid(hierarchy, path) {
  try {
    if (!hierarchy || !Array.isArray(path) || path.length === 0) return false
    const countryNode = hierarchy[path[0].value]
    if (!countryNode) return false
    if (path.length === 1) return true
    const regionNode = countryNode.regions?.[path[1].value]
    if (!regionNode) return false
    if (path.length === 2) return true
    const countyNode = regionNode.counties?.[path[2].value]
    if (!countyNode) return false
    if (path.length === 3) return true
    const constiNode = countyNode.constituencies?.[path[3].value]
    if (!constiNode) return false
    if (path.length === 4) return true
    // path.length === 5: ward level
    const wardName = path[4]?.value
    return wardName ? !!constiNode.wards?.[wardName] : false
  } catch {
    return false
  }
}

/**
 * useNavigation — manages UKCP hierarchy navigation state.
 *
 * @param {object|null} hierarchy - Full hierarchy from useLocationData.
 * @returns {{
 *   path:        Array<{ level: string, value: string }>,
 *   panel1:      string[],
 *   panel2:      string[],
 *   select:      (level: string, value: string) => void,
 *   selectMany:  (pairs: Array<{ level: string, value: string }>) => void,
 *   goTo:        (index: number) => void,
 *   reset:       () => void
 * }}
 */
export function useNavigation(hierarchy) {
  const [path,   setPath]   = useState([])
  const [panel2, setPanel2] = useState([])

  // panel1: fixed country list from navConfig — always shows all 4 countries.
  const panel1 = COUNTRIES

  // Clear any stale session on mount so navigation always starts fresh.
  useEffect(() => {
    writeSession([])
  }, [])

  // Recompute panel2 whenever path or hierarchy changes.
  useEffect(() => {
    if (!hierarchy) return
    setPanel2(getChildren(hierarchy, path))
  }, [path, hierarchy])

  /**
   * Sets a level/value pair in the navigation path, truncating any entries
   * at or below the given level first. Prevents crumb accumulation when the
   * user selects a new value at a level already visited.
   * @param {string} level - Hierarchy level label (e.g. 'country', 'region').
   * @param {string} value - Selected item value.
   */
  const select = useCallback((level, value) => {
    setPath(prev => {
      const levelIdx = LEVEL_ORDER.indexOf(level)
      // Find the first path entry that sits at or below the target level.
      // Slicing there (not at the raw LEVEL_ORDER index) handles paths that
      // skip intermediate levels (e.g. country→region→constituency, no county).
      const cutAt = prev.findIndex(p => LEVEL_ORDER.indexOf(p.level) >= levelIdx)
      const base  = cutAt >= 0 ? prev.slice(0, cutAt) : prev
      const next  = [...base, { level, value }]
      writeSession(next)
      return next
    })
  }, [])

  /**
   * Atomically sets multiple level/value pairs in the navigation path, first
   * truncating at the depth of the first pair's level. Prevents crumb
   * accumulation on repeated ward/constituency clicks.
   * @param {Array<{ level: string, value: string }>} pairs - Pairs to set.
   */
  const selectMany = useCallback((pairs) => {
    setPath(prev => {
      if (!pairs.length) return prev
      const levelIdx = LEVEL_ORDER.indexOf(pairs[0].level)
      const cutAt    = prev.findIndex(p => LEVEL_ORDER.indexOf(p.level) >= levelIdx)
      const base     = cutAt >= 0 ? prev.slice(0, cutAt) : prev
      const next     = [...base, ...pairs]
      writeSession(next)
      return next
    })
  }, [])

  /**
   * Truncates the path to the entry at the given index (inclusive).
   * @param {number} index - Path index to navigate back to.
   */
  const goTo = useCallback((index) => {
    setPath(prev => {
      const next = prev.slice(0, index + 1)
      writeSession(next)
      return next
    })
  }, [])

  /**
   * Clears the entire navigation path and resets panel2.
   */
  const reset = useCallback(() => {
    setPath([])
    writeSession([])
  }, [])

  return { path, panel1, panel2, select, selectMany, goTo, reset }
}
