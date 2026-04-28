/**
 * @file useSelectionState.js
 * @description Manages pending place selection state.
 * A pending place is set when the user clicks a place in the left pane.
 * It drives the crumb trail, MiniMap flyTo, and info tab content.
 * Dismissing clears it without any side effects.
 *
 * Note: the confirm/confirmed pattern (SelectionBanner, confirmPlace,
 * confirmedPlace, clearSelection) was removed -- it was fully dead code.
 * SelectionBanner.jsx is retained as a deprecated reference only.
 */

import { useState, useCallback } from 'react'

/**
 * useSelectionState -- manages pending place selection.
 *
 * @returns {{
 *   pendingPlace:   object|null,
 *   setPending:     (place: object) => void,
 *   dismissPending: () => void,
 * }}
 */
export function useSelectionState() {
  const [pendingPlace, setPendingPlace] = useState(null)

  /**
   * Sets the pending place.
   * @param {object} place - The place object the user clicked.
   */
  const setPending = useCallback((place) => {
    setPendingPlace(place)
  }, [])

  /**
   * Clears the pending place.
   */
  const dismissPending = useCallback(() => {
    setPendingPlace(null)
  }, [])

  return { pendingPlace, setPending, dismissPending }
}
