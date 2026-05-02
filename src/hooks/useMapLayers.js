/**
 * @file useMapLayers.js
 * @description Hook owning content map layer toggle state.
 *
 * Layers:
 *   schools      -- proximity schools (from loadedSchools)
 *   committees   -- committee markers (stub -- wired in Sprint 3)
 *   groups       -- community network pins (stub)
 *   traders      -- local traders pins (stub)
 *   news         -- geolocated news pins (stub)
 *
 * activateForTab(tab) auto-enables the layer naturally associated with a tab.
 * Only activates -- never deactivates -- so manual toggles are preserved.
 */

import { useState, useCallback } from 'react'

const DEFAULT_LAYERS = {
  schools:    false,
  committees: false,
  groups:     false,
  traders:    false,
  news:       false,
}

// Which layer auto-activates when a tab is opened.
const TAB_LAYER = {
  groups:  'groups',
  news:    'news',
  traders: 'traders',
  civic:   'committees',
}

export function useMapLayers() {
  const [layers, setLayers] = useState(DEFAULT_LAYERS)

  const toggleLayer = useCallback((key) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // Only flips to true -- never clears a layer the user has manually toggled.
  const activateForTab = useCallback((tab) => {
    const key = TAB_LAYER[tab]
    if (!key) return
    setLayers(prev => prev[key] ? prev : { ...prev, [key]: true })
  }, [])

  return { layers, toggleLayer, activateForTab }
}
