/**
 * @file src/components/Groups/GroupsTab.jsx
 * @description Groups tab panel. Shows associations ("Groups"), spaces ("Local Spaces"),
 *   and community networks (national networks with local chapters).
 *
 * Props:
 *   locationType  -- geo node type (ward|constituency|county|region|country)
 *   locationSlug  -- geo node slug
 */

import { useState, useEffect }     from 'react'
import { useAuth }                 from '../../context/AuthContext.jsx'
import CommunityNetworksSection    from './CommunityNetworksSection.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'groups',   label: 'Groups' },
  { key: 'spaces',   label: 'Local Spaces' },
  { key: 'networks', label: 'Community Networks' },
]

export default function GroupsTab({ locationType, locationSlug }) {
  const { session }  = useAuth()
  const [filter, setFilter]   = useState('all')
  const [groups,  setGroups]  = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!locationType || !locationSlug) return
    let cancelled = false
    setLoading(true)
    setError(null)

    const headers = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}

    fetch(
      `${API_BASE}/api/groups?type=${encodeURIComponent(locationType)}&slug=${encodeURIComponent(locationSlug)}`,
      { headers }
    )
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { if (!cancelled) { setGroups(data); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError('Failed to load groups'); setLoading(false) } })

    return () => { cancelled = true }
  }, [locationType, locationSlug, session])

  async function handleJoin(kind, id) {
    if (!session?.access_token) return
    const res = await fetch(`${API_BASE}/api/groups/${kind}/${id}/join`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      setGroups(prev => prev.map(g =>
        g._id.toString() === id.toString() ? { ...g, is_member: true } : g
      ))
    }
  }

  const associations = groups.filter(g => g.kind === 'association')
  const spaces       = groups.filter(g => g.kind === 'space')

  const showGroups   = filter === 'all' || filter === 'groups'
  const showSpaces   = filter === 'all' || filter === 'spaces'
  const showNetworks = filter === 'all' || filter === 'networks'

  if (!locationType) {
    return <div style={wrap}><p style={dim}>Select a location to view groups.</p></div>
  }

  return (
    <div style={{ padding: 0 }}>
      {/* Filter strip */}
      <div style={filterStrip}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            style={filter === f.key ? { ...filterBtn, ...filterBtnActive } : filterBtn}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div style={wrap}><p style={dim}>Loading groups...</p></div>}
      {error   && <div style={wrap}><p style={dim}>{error}</p></div>}

      {!loading && !error && (
        <>
          {showGroups && (
            <Section
              title="Groups"
              items={associations}
              showCategory
              session={session}
              onJoin={(id) => handleJoin('associations', id)}
            />
          )}
          {showSpaces && (
            <Section
              title="Local Spaces"
              items={spaces}
              session={session}
              onJoin={(id) => handleJoin('spaces', id)}
            />
          )}
          {showNetworks && (
            <CommunityNetworksSection
              locationType={locationType}
              locationSlug={locationSlug}
              session={session}
            />
          )}
        </>
      )}
    </div>
  )
}

function Section({ title, items, showCategory, session, onJoin }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <p style={sectionHead}>{title}</p>
      {items.length === 0
        ? <p style={{ ...dim, padding: '0 16px 12px' }}>No {title.toLowerCase()} at this location yet.</p>
        : items.map(item => (
          <GroupCard
            key={item._id}
            item={item}
            showCategory={showCategory}
            session={session}
            onJoin={onJoin}
          />
        ))
      }
    </div>
  )
}

function GroupCard({ item, showCategory, session, onJoin }) {
  const [joining, setJoining] = useState(false)

  async function handleClick() {
    setJoining(true)
    await onJoin(item._id)
    setJoining(false)
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={cardName}>{item.name}</p>
          <p style={cardDesc}>{item.description}</p>
          {showCategory && item.category && (
            <span style={badge}>
              {item.category}{item.sub_type ? ` · ${item.sub_type}` : ''}
            </span>
          )}
          <p style={memberCount}>{item.member_count ?? 0} members</p>
        </div>
        <div style={{ flexShrink: 0 }}>
          {item.is_member
            ? <span style={joinedBadge}>Joined</span>
            : session
              ? (
                <button style={joinBtn} onClick={handleClick} disabled={joining}>
                  {joining ? 'Joining...' : 'Join'}
                </button>
              )
              : <a href="/auth" style={loginLink}>Log in to join</a>
          }
        </div>
      </div>
    </div>
  )
}

const wrap            = { padding: 16 }
const dim             = { fontSize: 13, color: '#868e96', margin: 0 }
const filterStrip     = { display: 'flex', gap: 4, padding: '10px 16px 8px', borderBottom: '1px solid #f1f3f5' }
const filterBtn       = { fontSize: 12, padding: '4px 10px', border: '1px solid #dee2e6', borderRadius: 20, background: '#fff', color: '#495057', cursor: 'pointer', whiteSpace: 'nowrap' }
const filterBtnActive = { background: '#1971c2', color: '#fff', borderColor: '#1971c2' }
const sectionHead     = { fontSize: 13, fontWeight: 600, color: '#343a40', margin: '12px 16px 8px' }
const card            = { border: '1px solid #dee2e6', borderRadius: 6, padding: 12, margin: '0 16px 10px', background: '#fff' }
const cardName        = { fontSize: 13, fontWeight: 600, margin: '0 0 4px 0', color: '#212529' }
const cardDesc        = { fontSize: 12, color: '#495057', margin: '0 0 6px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
const badge           = { display: 'inline-block', fontSize: 11, color: '#495057', background: '#f1f3f5', borderRadius: 4, padding: '2px 6px', marginBottom: 4 }
const memberCount     = { fontSize: 11, color: '#868e96', margin: '4px 0 0 0' }
const joinedBadge     = { fontSize: 12, color: '#2f9e44', fontWeight: 600 }
const joinBtn         = { fontSize: 12, padding: '4px 10px', border: 'none', borderRadius: 4, background: '#2f9e44', color: '#fff', cursor: 'pointer' }
const loginLink       = { fontSize: 12, color: '#1971c2', textDecoration: 'none' }
