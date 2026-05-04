/**
 * @file src/components/SchoolGates/SchoolsLeftNav.jsx
 * @description Left nav for At the School Gates network mode.
 *   Locate/browse schools by proximity. Left pane = find; right pane = yours.
 *
 *   Two distinct actions per school row:
 *     Select   -- session-scoped. Adds to right-pane My Schools for this visit.
 *                 Checkbox on the row. No API call. Any user.
 *     Follow   -- persistent. Writes to user_follows / localStorage.
 *                 Small button on the row. Survives session.
 *
 * Props:
 *   activeUrns     -- session-selected URNs
 *   followedUrns   -- persistent follows
 *   focusUrn
 *   onFocusSchool
 *   onToggleActive -- toggle session select (no API)
 *   onToggleFollow -- toggle persistent follow (API / localStorage)
 *   onBack
 *   proximity: { lat, lng, radius, searchRequired, scopeLabel } | null
 *   onSchoolsChange
 */
import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export default function SchoolsLeftNav({
  activeUrns = [], followedUrns = [], focusUrn,
  onFocusSchool, onToggleActive, onToggleFollow,
  onBack, proximity, onSchoolsChange,
}) {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(false)
  const [search,  setSearch]  = useState('')

  // Reset list when proximity changes (user navigated to a new scope).
  const prevProxKey = useRef(null)
  useEffect(() => {
    const key = proximity ? `${proximity.lat},${proximity.lng},${proximity.radius}` : null
    if (key !== prevProxKey.current) {
      prevProxKey.current = key
      setSearch('')
      setSchools([])
      onSchoolsChange?.([])
    }
  }, [proximity?.lat, proximity?.lng, proximity?.radius])

  // Fetch schools. For large-radius scopes, wait for >= 3 chars.
  useEffect(() => {
    if (!proximity?.lat || !proximity?.lng) { setSchools([]); onSchoolsChange?.([]); return }
    if (proximity.searchRequired && search.trim().length < 3) { setSchools([]); onSchoolsChange?.([]); return }

    let cancelled = false
    setLoading(true)

    const params = new URLSearchParams({
      lat:    proximity.lat,
      lng:    proximity.lng,
      radius: proximity.radius,
    })
    if (search.trim()) params.set('search', search.trim())

    fetch(`${API_BASE}/api/schools?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (!cancelled) { setSchools(data); onSchoolsChange?.(data); setLoading(false) }
      })
      .catch(() => { if (!cancelled) { setSchools([]); onSchoolsChange?.([]); setLoading(false) } })

    return () => { cancelled = true }
  }, [proximity?.lat, proximity?.lng, proximity?.radius, search])

  const noLocation  = !proximity?.lat
  const searchFirst = proximity?.searchRequired && search.trim().length < 3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 10px 0', flexShrink: 0 }}>
        <button style={backBtn} onClick={onBack}>{'< Back to Groups'}</button>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={proximity?.searchRequired ? 'Type to search schools...' : 'Search schools...'}
          style={searchInput}
        />
        {proximity?.scopeLabel && (
          <p style={scopeHint}>Showing schools near {proximity.scopeLabel}</p>
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
        {loading && <p style={statusMsg}>Loading schools...</p>}
        {!loading && noLocation && (
          <p style={statusMsg}>Navigate to a location to see local schools.</p>
        )}
        {!loading && !noLocation && searchFirst && (
          <p style={statusMsg}>Type at least 3 characters to search.</p>
        )}
        {!loading && !searchFirst && schools.map(s => {
          const isActive   = activeUrns.includes(s.urn)
          const isFollowed = followedUrns.includes(s.urn)
          return (
            <div
              key={s.urn}
              style={focusUrn === s.urn ? { ...row, ...rowActive } : row}
              onClick={() => onFocusSchool(s.urn)}
            >
              {/* Select checkbox -- session only */}
              <input
                type="checkbox"
                checked={isActive}
                title="Select for this session"
                onChange={e => { e.stopPropagation(); onToggleActive(s.urn) }}
                onClick={e => e.stopPropagation()}
                style={{ margin: 0, cursor: 'pointer', flexShrink: 0 }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={nameText}>{s.name}</span>
                <span style={badgeText}>{s.type_group}</span>
              </div>

              {/* Follow button -- persistent */}
              <button
                style={isFollowed ? followingBtn : followBtn}
                title={isFollowed ? 'Unfollow' : 'Follow (persistent)'}
                onClick={e => { e.stopPropagation(); onToggleFollow(s.urn) }}
              >
                {isFollowed ? '♥' : '♡'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const backBtn     = { fontSize: 11, color: '#1971c2', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px 0', display: 'block' }
const searchInput = { width: '100%', fontSize: 12, padding: '4px 6px', border: '1px solid #dee2e6', borderRadius: 4, boxSizing: 'border-box', marginBottom: 2 }
const scopeHint   = { fontSize: 10, color: '#adb5bd', margin: '0 0 6px 0', fontStyle: 'italic' }
const row         = { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', cursor: 'pointer', borderLeft: '2px solid transparent' }
const rowActive   = { borderLeft: '2px solid #2f9e44', background: '#f8f9fa' }
const nameText    = { fontSize: 12, color: '#212529', display: 'block', lineHeight: 1.3 }
const badgeText   = { fontSize: 10, color: '#adb5bd', display: 'block', marginTop: 1 }
const statusMsg   = { fontSize: 12, color: '#adb5bd', padding: '8px 10px', margin: 0, fontStyle: 'italic' }
const followBtn    = { fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#adb5bd', padding: '0 2px', flexShrink: 0, lineHeight: 1 }
const followingBtn = { fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#2f9e44', padding: '0 2px', flexShrink: 0, lineHeight: 1 }
