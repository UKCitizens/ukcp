/**
 * @file useSelectionState.js
 * @description Manages pending and confirmed place selection with sessionStorage
 * persistence. Provides setPending, confirmPlace, dismissPending, and
 * clearSelection actions.
 */

import { useState, useEffect, useCallback } from 'react'

/** sessionStorage key for the confirmed place selection. */
const SESSION_KEY = 'UKCP_SELECTED_PLACE'

/**
 * Reads and parses the confirmed place from sessionStorage.
 * Returns null on any failure.
 *
 * @returns {object|null}
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
 * Writes the selection object to sessionStorage.
 * Failures are silently swallowed.
 *
 * @param {object} value - The selection object to persist.
 */
function writeSession(value) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value))
  } catch {
    // silently swallow
  }
}

/**
 * Removes UKCP_SELECTED_PLACE from sessionStorage.
 * Failures are silently swallowed.
 */
function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // silently swallow
  }
}

/**
 * useSelectionState — manages pending and confirmed place selection.
 *
 * @returns {{
 *   pendingPlace:    object|null,
 *   confirmedPlace:  object|null,
 *   setPending:      (place: object) => void,
 *   confirmPlace:    (path: Array<{ level: string, value: string }>) => void,
 *   dismissPending:  () => void,
 *   clearSelection:  () => void
 * }}
 */
export function useSelectionState() {
  const [pendingPlace,   setPendingPlace]   = useState(null)
  const [confirmedPlace, setConfirmedPlace] = useState(null)

  // Restore confirmed place from sessionStorage on mount.
  useEffect(() => {
    const saved = readSession()
    if (saved) setConfirmedPlace(saved)
  }, [])

  /**
   * Sets the pending place. Does not write to sessionStorage.
   *
   * @param {object} place - The place object the user clicked.
   */
  const setPending = useCallback((place) => {
    setPendingPlace(place)
  }, [])

  /**
   * Moves pendingPlace to confirmedPlace, persists to sessionStorage,
   * and clears pendingPlace.
   *
   * @param {Array<{ level: string, value: string }>} path - Current navigation path.
   */
  const confirmPlace = useCallback((path) => {
    setPendingPlace(prev => {
      if (!prev) return null
      const record = {
        placeName:  prev.PlaceName,
        type:       prev.Type,
        county:     prev.County,
        crumbTrail: path,
      }
      writeSession(record)
      setConfirmedPlace(record)
      return null
    })
  }, [])

  /**
   * Clears pendingPlace without affecting confirmedPlace or sessionStorage.
   */
  const dismissPending = useCallback(() => {
    setPendingPlace(null)
  }, [])

  /**
   * Clears both states and removes the sessionStorage entry.
   */
  const clearSelection = useCallback(() => {
    setPendingPlace(null)
    setConfirmedPlace(null)
    clearSession()
  }, [])

  return { pendingPlace, confirmedPlace, setPending, confirmPlace, dismissPending, clearSelection }
}
