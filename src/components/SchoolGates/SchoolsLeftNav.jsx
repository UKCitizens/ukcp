/**
 * @file src/components/SchoolGates/SchoolsLeftNav.jsx
 * @description Left nav for At the School Gates network mode.
 *   Fetches schools from API by geo scope. Search, All/My toggle, follow checkboxes.
 * Props: selectedUrns, focusUrn, onFocusSchool, onToggleSchool, onBack, locationScope
 */
import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export default function SchoolsLeftNav({ selectedUrns, focusUrn, onFocusSchool, onToggleSchool, onBack, locationScope, onSchoolsChange }) {
  const [schools,  setSchools]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [view,     setView]     = useState('all')  // 'all' | 'my'
  const [search,   setSearch]   = useState('')

  // First time selectedUrns becomes non-empty (hydration from follows/saves),
  // default the toggle to 'my'. After that, the user controls it.
  const viewSeeded = useRef(false)
  useEffect(() => {
    if (viewSeeded.current) return
    if (selectedUrns.length > 0) {
      setView('my')
      viewSeeded.current = true
    }
  }, [selectedUrns])

  useEffect(() => {
    if (!locationScope?.scope || !locationScope?.gss) { setSchools([]); onSchoolsChange?.([]); return }
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ scope: locationScope.scope, gss: locationScope.gss })
    fetch(`${API_BASE}/api/schools?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (!cancelled) {
          setSchools(data)
          onSchoolsChange?.(data)
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) { setSchools([]); onSchoolsChange?.([]); setLoading(false) } })
    return () => { cancelled = true }
  }, [locationScope?.scope, locationScope?.gss])

  const filtered = schools
    .filter(s => view === 'my' ? selectedUrns.includes(s.urn) : true)
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 10px 0' }}>
        <button style={backBtn} onClick={onBack}>{'< Back to Groups'}</button>

        <div style={toggleRow}>
          <label style={toggleLabel}>
            <input type="radio" name="school-view" checked={view === 'all'} onChange={() => setView('all')} style={{ marginRight: 4 }} />
            <span style={{ fontSize: 12 }}>All schools</span>
          </label>
          <label style={toggleLabel}>
            <input type="radio" name="school-view" checked={view === 'my'} onChange={() => setView('my')} style={{ marginRight: 4 }} />
            <span style={{ fontSize: 12 }}>My schools</span>
          </label>
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search schools..."
          style={searchInput}
        />
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
        {loading && <p style={statusMsg}>Loading schools...</p>}
        {!loading && !locationScope?.gss && (
          <p style={statusMsg}>Navigate to a ward or constituency to see local schools.</p>
        )}
        {!loading && view === 'my' && selectedUrns.length === 0 && (
          <p style={statusMsg}>No schools selected yet.</p>
        )}
        {!loading && filtered.map(s => (
          <div
            key={s.urn}
            style={focusUrn === s.urn ? { ...row, ...rowActive } : row}
            onClick={() => onFocusSchool(s.urn)}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={nameText}>{s.name}</span>
              <span style={badgeText}>{s.type_group}</span>
            </div>
            <input
              type="checkbox"
              checked={selectedUrns.includes(s.urn)}
              onChange={e => { e.stopPropagation(); onToggleSchool(s.urn); onFocusSchool(s.urn) }}
              onClick={e => e.stopPropagation()}
              style={{ margin: 0, cursor: 'pointer', flexShrink: 0 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const backBtn     = { fontSize: 11, color: '#1971c2', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px 0', display: 'block' }
const toggleRow   = { display: 'flex', gap: 12, marginBottom: 8 }
const toggleLabel = { display: 'flex', alignItems: 'center', cursor: 'pointer' }
const searchInput = { width: '100%', fontSize: 12, padding: '4px 6px', border: '1px solid #dee2e6', borderRadius: 4, boxSizing: 'border-box', marginBottom: 4 }
const row         = { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', cursor: 'pointer', borderLeft: '2px solid transparent' }
const rowActive   = { borderLeft: '2px solid #2f9e44', background: '#f8f9fa' }
const nameText    = { fontSize: 12, color: '#212529', display: 'block', lineHeight: 1.3 }
const badgeText   = { fontSize: 10, color: '#adb5bd', display: 'block', marginTop: 1 }
const statusMsg   = { fontSize: 12, color: '#adb5bd', padding: '8px 10px', margin: 0, fontStyle: 'italic' }
