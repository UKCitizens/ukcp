/**
 * @file src/components/SchoolGates/SchoolsRightNav.jsx
 * @description Right nav for At the School Gates network mode.
 *   Replaces the Community Networks list while a network is active.
 *
 *   Two levels:
 *     List  -- proximity school list with search + All/My toggle
 *     Detail -- focused school card + actions
 *
 *   Back button at top always returns to the community networks list (onBack).
 *
 * Props:
 *   onBack, focusSchool, focusUrn, onFocusSchool,
 *   selectedUrns, onToggleSchool, session,
 *   proximity, onSchoolsChange
 */
import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export default function SchoolsRightNav({
  onBack,
  focusSchool, focusUrn, onFocusSchool,
  selectedUrns, onToggleSchool, session,
  proximity, onSchoolsChange,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={backBar}>
        <button style={backBtn} onClick={onBack}>&larr; Community Networks</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {focusSchool ? (
          <SchoolDetail
            school={focusSchool}
            selectedUrns={selectedUrns}
            onToggleSchool={onToggleSchool}
            session={session}
            onBack={() => onFocusSchool(null)}
          />
        ) : (
          <SchoolList
            focusUrn={focusUrn}
            onFocusSchool={onFocusSchool}
            selectedUrns={selectedUrns}
            onToggleSchool={onToggleSchool}
            proximity={proximity}
            onSchoolsChange={onSchoolsChange}
          />
        )}
      </div>
    </div>
  )
}

// ── School list ───────────────────────────────────────────────────────────────

function SchoolList({ focusUrn, onFocusSchool, selectedUrns, onToggleSchool, proximity, onSchoolsChange }) {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(false)
  const [view,    setView]    = useState('all')
  const [search,  setSearch]  = useState('')

  const viewSeeded = useRef(false)
  useEffect(() => {
    if (viewSeeded.current) return
    if (selectedUrns.length > 0) { setView('my'); viewSeeded.current = true }
  }, [selectedUrns])

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

  useEffect(() => {
    if (!proximity?.lat || !proximity?.lng) { setSchools([]); onSchoolsChange?.([]); return }
    if (proximity.searchRequired && search.trim().length < 3) { setSchools([]); onSchoolsChange?.([]); return }

    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ lat: proximity.lat, lng: proximity.lng, radius: proximity.radius })
    if (search.trim()) params.set('search', search.trim())

    fetch(`${API_BASE}/api/schools?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { if (!cancelled) { setSchools(data); onSchoolsChange?.(data); setLoading(false) } })
      .catch(() => { if (!cancelled) { setSchools([]); onSchoolsChange?.([]); setLoading(false) } })

    return () => { cancelled = true }
  }, [proximity?.lat, proximity?.lng, proximity?.radius, search])

  const filtered = schools.filter(s => view === 'my' ? selectedUrns.includes(s.urn) : true)
  const noLocation  = !proximity?.lat
  const searchFirst = proximity?.searchRequired && search.trim().length < 3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 10px 0', flexShrink: 0 }}>
        <div style={toggleRow}>
          <label style={toggleLabel}>
            <input type="radio" name="school-view-r" checked={view === 'all'} onChange={() => setView('all')} style={{ marginRight: 4 }} />
            <span style={{ fontSize: 12 }}>All schools</span>
          </label>
          <label style={toggleLabel}>
            <input type="radio" name="school-view-r" checked={view === 'my'} onChange={() => setView('my')} style={{ marginRight: 4 }} />
            <span style={{ fontSize: 12 }}>My schools</span>
          </label>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={proximity?.searchRequired ? 'Type to search...' : 'Search schools...'}
          style={searchInput}
        />
        {proximity?.scopeLabel && (
          <p style={scopeHint}>Near {proximity.scopeLabel}</p>
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
        {loading && <p style={statusMsg}>Loading schools...</p>}
        {!loading && noLocation && <p style={statusMsg}>Navigate to a location to see local schools.</p>}
        {!loading && !noLocation && searchFirst && <p style={statusMsg}>Type at least 3 characters to search.</p>}
        {!loading && !noLocation && !searchFirst && view === 'my' && selectedUrns.length === 0 && (
          <p style={statusMsg}>No schools selected yet.</p>
        )}
        {!loading && !searchFirst && filtered.map(s => (
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

// ── School detail ─────────────────────────────────────────────────────────────

function SchoolDetail({ school, selectedUrns, onToggleSchool, session, onBack }) {
  const isFollowing = selectedUrns.includes(school.urn)
  const label    = session ? (isFollowing ? 'Following' : 'Follow') : (isFollowing ? 'Saved' : 'Save')
  const btnStyle = isFollowing ? followingBtn : followBtn

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexShrink: 0, padding: '6px 10px', borderBottom: '1px solid #f1f3f5' }}>
        <button style={backBtn} onClick={onBack}>&larr; Schools</button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1, padding: 10 }}>
        <div style={detailCard}>
          <p style={schoolName}>{school.name}</p>
          <p style={meta}>{school.phase} -- {school.type}</p>
          <p style={meta}>{school.gender}</p>
          <div style={{ marginTop: 6 }}>
            <p style={addr}>{school.street}</p>
            <p style={addr}>{school.postcode}</p>
          </div>
          <p style={meta}>{school.head_role}: {school.head}</p>
          <p style={{ ...dim, marginTop: 4 }}>
            Ward: {school.ward_name} | Con: {school.con_name}
          </p>
          <div style={{ marginTop: 10 }}>
            <button style={btnStyle} onClick={() => onToggleSchool(school.urn)}>{label}</button>
          </div>
        </div>

        <hr style={divider} />

        <p style={sectionHead}>Actions</p>
        <div style={actionRow} onClick={() => alert('Message school -- coming soon')}>
          <span style={actionChevron}>&gt;</span>
          <span style={actionLabel}>Message school</span>
        </div>
        <div style={actionRow} onClick={() => alert('Raise a survey -- coming soon')}>
          <span style={actionChevron}>&gt;</span>
          <span style={actionLabel}>Raise a survey</span>
        </div>
        <div style={{ ...actionRow, borderBottom: 'none' }} onClick={() => alert('Organise an event -- coming soon')}>
          <span style={actionChevron}>&gt;</span>
          <span style={actionLabel}>Organise an event</span>
        </div>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const backBar      = { flexShrink: 0, padding: '8px 10px', borderBottom: '1px solid #f1f3f5' }
const backBtn      = { fontSize: 12, color: '#1971c2', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }
const toggleRow    = { display: 'flex', gap: 12, marginBottom: 8 }
const toggleLabel  = { display: 'flex', alignItems: 'center', cursor: 'pointer' }
const searchInput  = { width: '100%', fontSize: 12, padding: '4px 6px', border: '1px solid #dee2e6', borderRadius: 4, boxSizing: 'border-box', marginBottom: 2 }
const scopeHint    = { fontSize: 10, color: '#adb5bd', margin: '0 0 6px 0', fontStyle: 'italic' }
const row          = { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', cursor: 'pointer', borderLeft: '2px solid transparent' }
const rowActive    = { borderLeft: '2px solid #2f9e44', background: '#f8f9fa' }
const nameText     = { fontSize: 12, color: '#212529', display: 'block', lineHeight: 1.3 }
const badgeText    = { fontSize: 10, color: '#adb5bd', display: 'block', marginTop: 1 }
const statusMsg    = { fontSize: 12, color: '#adb5bd', padding: '8px 10px', margin: 0, fontStyle: 'italic' }
const dim          = { fontSize: 12, color: '#adb5bd', margin: 0 }
const detailCard   = { border: '1px solid #dee2e6', borderRadius: 6, padding: 12 }
const schoolName   = { fontSize: 13, fontWeight: 600, color: '#212529', margin: '0 0 2px 0' }
const meta         = { fontSize: 11, color: '#868e96', margin: '2px 0 0 0' }
const addr         = { fontSize: 12, color: '#495057', margin: '1px 0 0 0' }
const followBtn    = { fontSize: 12, padding: '4px 10px', border: 'none', borderRadius: 4, background: '#2f9e44', color: '#fff', cursor: 'pointer' }
const followingBtn = { fontSize: 12, padding: '4px 10px', border: '1px solid #2f9e44', borderRadius: 4, background: '#fff', color: '#2f9e44', cursor: 'pointer' }
const divider      = { border: 'none', borderTop: '1px solid #f1f3f5', margin: '10px 0' }
const sectionHead  = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 6px 0', letterSpacing: '0.05em' }
const actionRow    = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f8f9fa', cursor: 'pointer', color: '#1971c2', fontSize: 12 }
const actionChevron = { fontSize: 10, color: '#ced4da' }
const actionLabel  = { fontSize: 12 }
