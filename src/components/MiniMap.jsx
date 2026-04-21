/**
 * @file MiniMap.jsx
 * @description Small Leaflet map thumbnail rendered in the Info tab top-right.
 *
 * Shows a single marker at the given coordinates. No controls. No layer toggles.
 * Zoom level is chosen by content type so the visible area is appropriate.
 * OSM attribution is retained as required by tile usage terms.
 *
 * Props:
 *   lat         — number    latitude
 *   lng         — number    longitude
 *   contentType — string    used to derive zoom level
 *   label       — string    used as marker tooltip
 *   onMapClick  — function  optional — called when thumbnail is clicked
 */

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/** Zoom level by content type. Wider for larger areas. */
const ZOOM_BY_TYPE = {
  hamlet:        14,
  village:       13,
  town:          12,
  city:          11,
  ward:          12,
  constituency:  10,
  county:         9,
  region:         7,
  country:        5,
}

const DEFAULT_ZOOM = 10

/**
 * @param {{
 *   lat:         number,
 *   lng:         number,
 *   contentType: string|null,
 *   label:       string|null
 * }} props
 */
export default function MiniMap({ lat, lng, contentType, label, onMapClick }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !lat || !lng) return

    const zoom = ZOOM_BY_TYPE[contentType] ?? DEFAULT_ZOOM

    // Initialise map if not already done.
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl:        false,
        attributionControl: true,
        dragging:           false,
        scrollWheelZoom:    false,
        doubleClickZoom:    false,
        boxZoom:            false,
        keyboard:           false,
        touchZoom:          false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 18,
      }).addTo(mapRef.current)

      // ResizeObserver — fires when the container gains real dimensions after
      // being hidden (Info tab display:none → display:block). More reliable than
      // a fixed timeout because it fires exactly when the container is measurable.
      const ro = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.invalidateSize()
      })
      ro.observe(containerRef.current)
      mapRef.current._miniMapRO = ro
    }

    const map = mapRef.current
    map.setView([lat, lng], zoom)
    // Belt-and-braces: also invalidate after a short delay for first paint.
    setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize() }, 150)

    // Clear existing circle markers before adding new one.
    map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer)
    })

    const marker = L.circleMarker([lat, lng], {
      radius:      6,
      color:       '#2f9e44',
      fillColor:   '#2f9e44',
      fillOpacity: 0.9,
      weight:      2,
    }).addTo(map)

    if (label) marker.bindTooltip(label, { permanent: false, direction: 'top' })

    return () => {
      // Cleanup only on unmount, not on every update.
    }
  }, [lat, lng, contentType, label])

  // Remove map instance and ResizeObserver on unmount.
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        if (mapRef.current._miniMapRO) {
          mapRef.current._miniMapRO.disconnect()
        }
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  if (!lat || !lng) return null

  return (
    <div
      onClick={onMapClick}
      title={onMapClick ? 'Click to open map' : undefined}
      style={{
        flexShrink: 0,
        marginLeft: 12,
        marginBottom: 8,
        cursor: onMapClick ? 'pointer' : 'default',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width:        200,
          height:       150,
          borderRadius: 8,
          overflow:     'hidden',
          border:       '1px solid #dee2e6',
          transition:   'border-color 0.15s',
        }}
      />
    </div>
  )
}
