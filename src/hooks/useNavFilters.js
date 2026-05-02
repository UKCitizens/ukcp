/**
 * @file useNavFilters.js
 * @description Shared nav type filter state consumed by both maps.
 *
 * Owns the C/T/V/H/Constituency/Ward visibility toggles.
 * Previously this state lived inside MidPaneMap as local useState.
 * Moving it here means both the header nav map and content map
 * always reflect the same filter selection.
 */

import { useState, useCallback } from 'react'

const DEFAULT_FILTERS = {
  City:         true,
  Town:         false,
  Village:      false,
  Hamlet:       false,
  Constituency: false,
  Ward:         false,
}

export function useNavFilters() {
  const [visibleTypes, setVisibleTypes] = useState(DEFAULT_FILTERS)

  const toggleNavFilter = useCallback((type) => {
    setVisibleTypes(prev => {
      const next = { ...prev, [type]: !prev[type] }
      // Prevent all-off
      if (Object.values(next).every(v => !v)) return prev
      return next
    })
  }, [])

  return { visibleTypes, toggleNavFilter }
}
