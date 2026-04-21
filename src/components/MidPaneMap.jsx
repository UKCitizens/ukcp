/**
 * @file MidPaneMap.jsx
 * @description Leaflet map — six toggleable layers, zoom-responsive radii, tooltip on hover.
 *
 * Marker radius scales with zoom via a zoomend listener added once at map init.
 * The listener always reads from markersDataRef so it works across layer redraws.
 * Hover enlarges the marker and shows a tooltip; mouseout restores it.
 *
 * Filtering by nav depth:
 *   Settlements (City/Town/Village/Hamlet) — capped at county. Places have no
 *   constituency/ward field so settlement scope never goes deeper than county.
 *
 *   Constituency layer — at constituency or ward depth shows only the selected
 *   constituency centroid; above that filters by county/region/country.
 *
 *   Ward layer — at ward depth shows only the selected ward; at constituency
 *   depth shows all wards for that constituency; above that filters by county etc.
 *
 * pendingPlace — when a place is selected in the left pane, a gold highlight
 * marker is rendered at its coordinates and the map pans to it.
 *
 * onMarkerClick — fires when any marker is clicked.
 *   Payload shapes:
 *     { type: 'place',         place }
 *     { type: 'constituency',  name }
 *     { type: 'ward',          name, constituency }
 *
 * Props:
 *   places        — flat LOC-row array from useLocationData
 *   wards         — flat WD-row array from useLocationData
 *   path          — navigation path [{ level, value }, ...]
 *   pendingPlace  — selected place object or null
 *   onMarkerClick — callback(payload) — optional
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Constants ────────────────────────────────────────────────────────────────

const UK_DEFAULT = { center: [54.5, -3.5], zoom: 5 }

const ALL_TYPES        = ['City', 'Town', 'Village', 'Hamlet', 'Constituency', 'Ward']
const PLACE_TYPES      = ['City', 'Town', 'Village', 'Hamlet']
const POLITICAL_TYPES  = ['Constituency', 'Ward']
const SETTLEMENT_TYPES = new Set(PLACE_TYPES)

const MARKER_STYLE = {
  City:         { radius: 8, color: '#1864ab', fillColor: '#1971c2', fillOpacity: 0.85 },
  Town:         { radius: 5, color: '#2f9e44', fillColor: '#37b24d', fillOpacity: 0.80 },
  Village:      { radius: 4, color: '#e67700', fillColor: '#f08c00', fillOpacity: 0.75 },
  Hamlet:       { radius: 3, color: '#868e96', fillColor: '#adb5bd', fillOpacity: 0.70 },
  Constituency: { radius: 7, color: '#862e9c', fillColor: '#ae3ec9', fillOpacity: 0.20 },
  Ward:         { radius: 3, color: '#0c8599', fillColor: '#22b8cf', fillOpacity: 0.65 },
}

/**
 * Maps nav level → CSV field name for filtering.
 * constituency and ward map to their respective field names on ward rows.
 */
const LEVEL_FIELD = {
  country:      'country',
  region:       'region',
  county:       'ctyhistnm',
  constituency: 'constituency',
  ward:         'name',
}

// ── Zoom scale ───────────────────────────────────────────────────────────────

function getScale(zoom) {
  if (zoom <= 5) return 0.35
  if (zoom <= 6) return 0.50
  if (zoom <= 8) return 0.70
  if (zoom <= 10) return 0.90
  return 1.0
}

function scaledRadius(baseRadius, zoom) {
  return Math.max(2, Math.round(baseRadius * getScale(zoom)))
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hasCoords(p) {
  return p.lat && p.lng && !isNaN(+p.lat) && !isNaN(+p.lng)
}

/**
 * Returns the deepest nav level present in path — including constituency and ward.
 * Used for constituency and ward layer filtering.
 */
function resolveLevel(path) {
  if (!Array.isArray(path) || !path.length) return { level: 'uk', value: 'UK' }
  for (const candidate of ['ward', 'constituency', 'county', 'region', 'country']) {
    const entry = path.find(p => p.level === candidate)
    if (entry) return { level: candidate, value: entry.value }
  }
  return { level: 'uk', value: 'UK' }
}

/**
 * Returns the deepest geographic level, capped at county.
 * Used for settlement (place) layers — LOC rows have no constituency/ward field.
 */
function resolveSettlementLevel(path) {
  if (!Array.isArray(path) || !path.length) return { level: 'uk', value: 'UK' }
  for (const candidate of ['county', 'region', 'country']) {
    const entry = path.find(p => p.level === candidate)
    if (entry) return { level: candidate, value: entry.value }
  }
  return { level: 'uk', value: 'UK' }
}

/**
 * Filters items to those matching level/value.
 * nameField overrides LEVEL_FIELD — use when the target field name differs
 * from the default (e.g. constituency centroids store name in .name not .constituency).
 */
function filterByLevel(items, level, value, nameField = null) {
  if (!Array.isArray(items) || !items.length) return []
  if (level === 'uk') return items.filter(hasCoords)
  const field = nameField ?? LEVEL_FIELD[level]
  if (!field || !value) return []
  const norm = value.trim().toLowerCase()
  return items.filter(p => hasCoords(p) && p[field]?.trim().toLowerCase() === norm)
}

function computeBounds(points) {
  if (!points.length) return null
  const lats = points.map(p => +p.lat)
  const lngs = points.map(p => +p.lng)
  return L.latLngBounds(
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)]
  )
}

// ── Toggle button ─────────────────────────────────────────────────────────────

function TypeToggle({ type, active, onToggle }) {
  const s = MARKER_STYLE[type]
  return (
    <button
      onClick={() => onToggle(type)}
      title={active ? `Hide ${type}s` : `Show ${type}s`}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '5px',
        padding:      '3px 10px 3px 7px',
        borderRadius: '20px',
        border:       `1.5px solid ${active ? s.color : '#ced4da'}`,
        background:   active ? s.fillColor : '#f1f3f5',
        color:        active ? '#fff' : '#adb5bd',
        cursor:       'pointer',
        fontSize:     '12px',
        fontWeight:   500,
        transition:   'all 0.15s ease',
        userSelect:   'none',
      }}
    >
      <svg width="10" height="10" style={{ flexShrink: 0 }}>
        <circle
          cx="5" cy="5" r={Math.min(s.radius * 0.55, 4.5)}
          fill={active ? '#fff' : '#ced4da'}
          stroke={active ? 'rgba(255,255,255,0.6)' : '#ced4da'}
          strokeWidth="1"
        />
      </svg>
      {type}
    </button>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MidPaneMap({ places, wards, path, pendingPlace, onMarkerClick, flyTo, invalidateTrigger }) {
  const containerRef    = useRef(null)
  const mapRef          = useRef(null)
  const layerRef        = useRef(null)
  const pendingLayerRef  = useRef(null)  // separate layer for pendingPlace gold marker
  const politicalLayerRef = useRef(null) // separate layer for selected constituency/ward highlight
  const markersDataRef  = useRef([])    // [{ marker, baseRadius }] — read by zoomend
  const prevPathRef     = useRef(null)  // track path changes to gate fitBounds

  // Keep onMarkerClick in a ref so marker click closures always call the latest version
  // without needing the markers effect to re-run when the callback identity changes.
  const onMarkerClickRef = useRef(onMarkerClick)
  useEffect(() => { onMarkerClickRef.current = onMarkerClick }, [onMarkerClick])

  const [visibleTypes, setVisibleTypes] = useState({
    City: true, Town: false, Village: false, Hamlet: false, Constituency: false, Ward: false,
  })

  const toggleType = useCallback((type) => {
    setVisibleTypes(prev => {
      const next = { ...prev, [type]: !prev[type] }
      if (Object.values(next).every(v => !v)) return prev
      return next
    })
  }, [])

  // Constituency centroids — computed once from wards.
  // Adds .constituency field so filterByLevel can target it directly.
  const constituencyCentroids = useMemo(() => {
    if (!Array.isArray(wards) || !wards.length) return []
    const acc = {}
    for (const w of wards) {
      if (!w.constituency || !hasCoords(w)) continue
      const key = w.constituency
      if (!acc[key]) {
        acc[key] = {
          name:         w.constituency,
          place_type:   'Constituency',
          country:      w.country      ?? '',
          region:       w.region       ?? '',
          ctyhistnm:    w.ctyhistnm    ?? '',
          constituency: w.constituency,
          latSum: 0, lngSum: 0, count: 0,
        }
      }
      acc[key].latSum += +w.lat
      acc[key].lngSum += +w.lng
      acc[key].count++
    }
    return Object.values(acc).map(c => ({
      name:         c.name,
      place_type:   'Constituency',
      country:      c.country,
      region:       c.region,
      ctyhistnm:    c.ctyhistnm,
      constituency: c.constituency,
      lat:          (c.latSum / c.count).toFixed(6),
      lng:          (c.lngSum / c.count).toFixed(6),
    }))
  }, [wards])

  // ── Map init — runs once. Adds zoomend listener that reads markersDataRef. ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current).setView(UK_DEFAULT.center, UK_DEFAULT.zoom)
    mapRef.current = map

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    map.on('zoomend', () => {
      const zoom = map.getZoom()
      for (const { marker, baseRadius } of markersDataRef.current) {
        marker.setRadius(scaledRadius(baseRadius, zoom))
      }
    })

    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ── Markers — rebuild when path, data, or visible types change ─────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }
    markersDataRef.current = []

    const pathKey     = JSON.stringify(path)
    const pathChanged = pathKey !== prevPathRef.current
    prevPathRef.current = pathKey

    // Deepest nav level — controls political layer scope
    const { level: deepLevel, value: deepValue } = resolveLevel(path)
    // Settlement level — capped at county
    const { level: settleLevel, value: settleValue } = resolveSettlementLevel(path)

    const constituencyEntry = path.find(p => p.level === 'constituency')
    const wardEntry         = path.find(p => p.level === 'ward')

    const group     = L.layerGroup()
    const allPoints = []
    const zoom      = map.getZoom()

    function addMarker(lat, lng, s, label, sublabel, clickPayload) {
      const baseRadius = s.radius
      const r = scaledRadius(baseRadius, zoom)

      const marker = L.circleMarker([lat, lng], {
        radius: r, color: s.color,
        fillColor: s.fillColor, fillOpacity: s.fillOpacity, weight: 1.5,
      })

      marker.bindTooltip(
        `<strong>${label}</strong><br/><span style="color:#868e96;font-size:11px">${sublabel}</span>`,
        { direction: 'top', sticky: false, offset: L.point(0, -r - 2) }
      )

      marker.on('mouseover', function () {
        const currentScale = getScale(map.getZoom())
        this.setStyle({ fillOpacity: 1.0, weight: 2.5 })
        this.setRadius(Math.max(4, Math.round(baseRadius * currentScale * 1.6)))
        this.openTooltip()
      })
      marker.on('mouseout', function () {
        this.setStyle({ fillOpacity: s.fillOpacity, weight: 1.5 })
        this.setRadius(scaledRadius(baseRadius, map.getZoom()))
        this.closeTooltip()
      })

      if (clickPayload) {
        marker.on('click', () => onMarkerClickRef.current?.(clickPayload))
      }

      marker.addTo(group)
      markersDataRef.current.push({ marker, baseRadius })
      return marker
    }

    // ── Settlement layers — capped at county scope ───────────────────────────
    const activeSettlements = ALL_TYPES.filter(
      t => SETTLEMENT_TYPES.has(t) && visibleTypes[t]
    )
    if (activeSettlements.length && Array.isArray(places)) {
      const filtered = filterByLevel(places, settleLevel, settleValue)
        .filter(p => activeSettlements.includes(p.place_type))
      for (const place of filtered) {
        addMarker(
          +place.lat, +place.lng,
          MARKER_STYLE[place.place_type],
          place.name, place.place_type,
          { type: 'place', place }
        )
        allPoints.push(place)
      }
    }

    // ── Constituency layer ────────────────────────────────────────────────────
    if (visibleTypes['Constituency'] && constituencyCentroids.length) {
      let filtered
      if (deepLevel === 'constituency' || deepLevel === 'ward') {
        // Show only the selected constituency centroid
        const conName = constituencyEntry?.value ?? deepValue
        filtered = filterByLevel(constituencyCentroids, 'constituency', conName, 'name')
      } else {
        filtered = filterByLevel(constituencyCentroids, deepLevel, deepValue)
      }
      for (const con of filtered) {
        addMarker(
          +con.lat, +con.lng,
          MARKER_STYLE.Constituency,
          con.name, 'Constituency',
          { type: 'constituency', name: con.name }
        )
        allPoints.push(con)
      }
    }

    // ── Ward layer ────────────────────────────────────────────────────────────
    if (visibleTypes['Ward'] && Array.isArray(wards)) {
      let filtered
      if (deepLevel === 'ward') {
        // Single ward at ward depth
        filtered = filterByLevel(wards, 'ward', wardEntry?.value ?? deepValue, 'name')
      } else if (deepLevel === 'constituency') {
        // All wards in the selected constituency
        filtered = filterByLevel(wards, 'constituency', deepValue, 'constituency')
      } else {
        filtered = filterByLevel(wards, deepLevel, deepValue)
      }
      for (const ward of filtered) {
        addMarker(
          +ward.lat, +ward.lng,
          MARKER_STYLE.Ward,
          ward.name, 'Ward',
          { type: 'ward', name: ward.name, constituency: ward.constituency }
        )
        allPoints.push(ward)
      }
    }

    group.addTo(map)
    layerRef.current = group

    if (pathChanged) {
      if (!allPoints.length) {
        map.setView(UK_DEFAULT.center, UK_DEFAULT.zoom)
      } else if (allPoints.length === 1) {
        // Single point — fitBounds doesn't work well; use setView at a sensible zoom
        map.setView([+allPoints[0].lat, +allPoints[0].lng], 12)
      } else {
        const bounds = computeBounds(allPoints)
        if (bounds) map.fitBounds(bounds, { padding: [24, 24] })
      }
    }

  }, [places, wards, constituencyCentroids, path, visibleTypes])

  // ── FlyTo — triggered by MiniMap thumbnail click ────────────────────────────
  useEffect(() => {
    if (!flyTo || !mapRef.current) return
    mapRef.current.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom, { duration: 0.8 })
  }, [flyTo])

  // ── invalidateTrigger — called after container resize (e.g. map-expand mode) ─
  useEffect(() => {
    if (invalidateTrigger == null || !mapRef.current) return
    mapRef.current.invalidateSize()
  }, [invalidateTrigger])

  // ── Pending place highlight — gold marker, pan to location ─────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (pendingLayerRef.current) {
      map.removeLayer(pendingLayerRef.current)
      pendingLayerRef.current = null
    }

    if (!pendingPlace || !hasCoords(pendingPlace)) return

    const lat   = +pendingPlace.lat
    const lng   = +pendingPlace.lng
    const group = L.layerGroup()

    const marker = L.circleMarker([lat, lng], {
      radius: 10, color: '#e67700', fillColor: '#ffd43b',
      fillOpacity: 0.95, weight: 3,
    })
    marker.bindTooltip(
      `<strong>${pendingPlace.name}</strong><br/><span style="color:#868e96;font-size:11px">${pendingPlace.place_type ?? ''}</span>`,
      { direction: 'top', sticky: false, offset: L.point(0, -14) }
    )

    marker.addTo(group)
    group.addTo(map)
    pendingLayerRef.current = group

    // panTo removed — flyTo in Locations.jsx handles positioning,
    // allowing the SVG overlay scale animation to inflate the marker mid-zoom.
  }, [pendingPlace])

  // ── Selected constituency/ward highlight — always visible, ignores layer toggles ──
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (politicalLayerRef.current) {
      map.removeLayer(politicalLayerRef.current)
      politicalLayerRef.current = null
    }

    const wardEntry         = path?.find(p => p.level === 'ward')
    const constituencyEntry = path?.find(p => p.level === 'constituency')
    if (!wardEntry && !constituencyEntry) return

    let lat = null, lng = null, label = '', sublabel = ''

    let zoom = 10  // default for constituency

    if (wardEntry && Array.isArray(wards)) {
      const needle = wardEntry.value.trim().toLowerCase()
      const hit = wards.find(w => w.name?.trim().toLowerCase() === needle)
      if (hit && hasCoords(hit)) {
        lat = +hit.lat; lng = +hit.lng
        label    = wardEntry.value
        sublabel = `Ward${constituencyEntry ? ` · ${constituencyEntry.value}` : ''}`
        zoom     = 12
      }
    }

    if (lat === null && constituencyEntry) {
      const needle = constituencyEntry.value.trim().toLowerCase()
      const centroid = constituencyCentroids.find(c => c.name?.trim().toLowerCase() === needle)
      if (centroid && hasCoords(centroid)) {
        lat = +centroid.lat; lng = +centroid.lng
        label    = constituencyEntry.value
        sublabel = 'Constituency'
        zoom     = 10
      }
    }

    if (lat === null) return

    const group  = L.layerGroup()
    const marker = L.circleMarker([lat, lng], {
      radius: 11, color: '#862e9c', fillColor: '#ffd43b',
      fillOpacity: 0.92, weight: 3,
    })
    marker.bindTooltip(
      `<strong>${label}</strong><br/><span style="color:#868e96;font-size:11px">${sublabel}</span>`,
      { direction: 'top', sticky: false, offset: L.point(0, -16) }
    )
    marker.addTo(group)
    group.addTo(map)
    politicalLayerRef.current = group

    map.flyTo([lat, lng], zoom, { duration: 0.6 })
  }, [path, wards, constituencyCentroids])

  const { value } = resolveLevel(path)

  return (
    <div style={{
      position:      'absolute',
      inset:         0,
      display:       'flex',
      flexDirection: 'column',
      padding:       '4px',
    }}>
      {/* Toggle bar */}
      <div style={{
        flexShrink:     0,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            '6px',
        padding:        '4px 0 8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {value && value !== 'UK' && (
            <span style={{ fontSize: '12px', color: '#868e96', marginRight: '2px' }}>
              {value}
            </span>
          )}
          {PLACE_TYPES.map(type => (
            <TypeToggle
              key={type}
              type={type}
              active={visibleTypes[type]}
              onToggle={toggleType}
            />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {POLITICAL_TYPES.map(type => (
            <TypeToggle
              key={type}
              type={type}
              active={visibleTypes[type]}
              onToggle={toggleType}
            />
          ))}
        </div>
      </div>

      <style>{`
        .leaflet-container { cursor: default !important; }
        .leaflet-interactive { cursor: pointer !important; }
      `}</style>
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, borderRadius: '4px', overflow: 'hidden' }}
      />
    </div>
  )
}
