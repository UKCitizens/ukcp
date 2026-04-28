/**
 * @file useNavigation.js
 * @description Navigation state hook for UKCP hierarchy navigation.
 * Manages the selection path, panel content, and sessionStorage persistence.
 *
 * panel1 shows all top-level countries from the hierarchy.
 * panel2 shows children at the current path depth via getChildren.
 * The path is cleared in sessionStorage on mount (navigation always starts fresh)
 * and written on every change. Session restore was intentionally removed.
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
