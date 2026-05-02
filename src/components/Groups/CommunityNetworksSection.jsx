/**
 * @file src/components/Groups/CommunityNetworksSection.jsx
 * @description Community Networks section within the Groups tab.
 *
 * Fetches all 8 national groups + their chapters at the current scope.
 * Logged-in view triggers silent background chapter instantiation server-side.
 *
 * Props:
 *   locationType  -- geo scope type (ward|constituency|county)
 *   locationSlug  -- geo scope slug
 *   session       -- Supabase session or null
 */

import { useState, useEffect } from 'react'
import PostsTab from '../Posts/PostsTab.jsx'
import CommunityNetworkCard from './CommunityNetworkCard.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const VALID_TIERS = ['ward', 'constituency', 'county', 'city', 'town', 'village', 'hamlet']
const NETWORK_MODE_SLUGS = new Set(['at-the-school-gates'])

export default function CommunityNetworksSection({ locationType, locationSlug, session, onNetworkSelect }) {
  const [data,        setData]        = useState([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [selectedId,  setSelectedId]  = useState(null)

  useEffect(() => {
    if (!locationType || !locationSlug) return
    if (!VALID_TIERS.includes(locationType)) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const headers = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}

    fetch(
      `${API_BASE}/api/community-networks?type=${encodeURIComponent(locationType)}&slug=${encodeURIComponent(locationSlug)}`,
      { headers }
    )
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError('Failed to load community networks'); setLoading(false) } })

    return () => { cancelled = true }
  }, [locationType, locationSlug, session])

  async function handleJoin(chapterId) {
    if (!session?.access_token) return
    const res = await fetch(`${API_BASE}/api/community-networks/chapters/${chapterId}/join`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      setData(prev => prev.map(item => {
        if (item.chapter?._id?.toString() === chapterId.toString()) {
          return { ...item, is_member: true }
        }
        return item
      }))
    }
  }

  async function handleLeave(chapterId) {
    if (!session?.access_token) return
    const res = await fetch(`${API_BASE}/api/community-networks/chapters/${chapterId}/leave`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      setData(prev => prev.map(item => {
        if (item.chapter?._id?.toString() === chapterId.toString()) {
          return { ...item, is_member: false }
        }
        return item
      }))
    }
  }

  if (!locationType || !VALID_TIERS.includes(locationType)) {
    return (
      <div style={wrap}>
        <p style={dim}>Community Networks are available at ward, constituency, and county level.</p>
      </div>
    )
  }

  if (loading) return <div style={wrap}><p style={dim}>Loading community networks...</p></div>
  if (error)   return <div style={wrap}><p style={dim}>{error}</p></div>

  const selectedItem = selectedId
    ? data.find(d => d.nationalGroup._id?.toString() === selectedId)
    : null

  return (
    <div style={wrap}>
      {/* Network icon grid -- 3 columns, scrolls vertically if > 9 */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap:                 6,
        maxHeight:           210,
        overflowY:           'auto',
        marginBottom:        10,
      }}>
        {data.map(({ nationalGroup }) => {
          const slug = nationalGroup.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
          const hasDedicatedMode = NETWORK_MODE_SLUGS.has(slug)
          return (
            <CommunityNetworkCard
              key={nationalGroup._id}
              name={nationalGroup.name}
              description={nationalGroup.purpose_statement}
              topicCategory={nationalGroup.topic_category}
              isSelected={selectedId === nationalGroup._id?.toString()}
              onClick={() => {
                if (hasDedicatedMode && onNetworkSelect) {
                  onNetworkSelect(slug)
                } else {
                  setSelectedId(selectedId === nationalGroup._id?.toString() ? null : nationalGroup._id?.toString())
                }
              }}
            />
          )
        })}
      </div>

      {/* Selected network detail */}
      {selectedItem && (
        <NetworkCard
          key={selectedItem.nationalGroup._id}
          nationalGroup={selectedItem.nationalGroup}
          chapter={selectedItem.chapter}
          isMember={selectedItem.is_member}
          session={session}
          onJoin={handleJoin}
          onLeave={handleLeave}
          locationType={locationType}
          locationSlug={locationSlug}
        />
      )}
    </div>
  )
}

function NetworkCard({ nationalGroup, chapter, isMember, session, onJoin, onLeave, locationType, locationSlug }) {
  const [joining,        setJoining]        = useState(false)
  const [showFeed,       setShowFeed]       = useState(false)
  const [showLocalPosts, setShowLocalPosts] = useState(false)
  const [feedPosts,      setFeedPosts]      = useState([])
  const [feedLoading,    setFeedLoading]    = useState(false)

  async function handleJoin() {
    if (!chapter) return
    setJoining(true)
    await onJoin(chapter._id)
    setJoining(false)
  }

  async function handleLeave() {
    if (!chapter) return
    setJoining(true)
    await onLeave(chapter._id)
    setJoining(false)
  }

  async function toggleNationalFeed() {
    if (showFeed) { setShowFeed(false); return }
    setShowFeed(true)
    if (feedPosts.length) return
    setFeedLoading(true)
    try {
      const res  = await fetch(`${API_BASE}/api/community-networks/${nationalGroup._id}/feed?limit=5`)
      const json = await res.json()
      setFeedPosts(json.posts ?? [])
    } catch (_) {
      setFeedPosts([])
    }
    setFeedLoading(false)
  }

  const memberCount = chapter?.member_count ?? 0
  const topicBadge  = nationalGroup.topic_category

  return (
    <div style={card}>
      <div style={cardHeader}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={cardName}>{nationalGroup.name}</p>
            <span style={topicTag}>{topicBadge}</span>
          </div>
          <p style={cardDesc}>{nationalGroup.purpose_statement}</p>
          <p style={memberLine}>
            {memberCount === 0
              ? 'No local members yet -- be the first'
              : `${memberCount} local member${memberCount === 1 ? '' : 's'}`}
          </p>
        </div>
        <div style={actions}>
          {!session ? (
            <a href="/auth" style={loginLink}>Log in to join</a>
          ) : isMember ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexDirection: 'column' }}>
              <span style={joinedBadge}>Joined</span>
              <button style={leaveBtn} onClick={handleLeave} disabled={joining}>
                {joining ? '...' : 'Leave'}
              </button>
            </div>
          ) : chapter ? (
            <button style={joinBtn} onClick={handleJoin} disabled={joining}>
              {joining ? 'Joining...' : 'Join'}
            </button>
          ) : (
            <p style={dim}>Loading...</p>
          )}
        </div>
      </div>

      <div style={cardFooter}>
        {chapter && (
          <button style={feedToggle} onClick={() => setShowLocalPosts(p => !p)}>
            {showLocalPosts ? 'Hide local posts' : 'Local posts'}
          </button>
        )}
        <button style={{ ...feedToggle, marginLeft: chapter ? 12 : 0 }} onClick={toggleNationalFeed}>
          {showFeed ? 'Hide national posts' : 'National posts'}
        </button>
      </div>

      {showLocalPosts && chapter && (
        <div style={feedPanel}>
          <PostsTab
            locationType={chapter.location_scope.type}
            locationSlug={chapter.location_scope.slug}
            collectiveRef={{ collection: 'network_chapters', id: String(chapter._id) }}
          />
        </div>
      )}

      {showFeed && (
        <div style={feedPanel}>
          {feedLoading && <p style={dim}>Loading...</p>}
          {!feedLoading && feedPosts.length === 0 && (
            <p style={dim}>No national posts yet.</p>
          )}
          {feedPosts.map(post => (
            <div key={post._id} style={feedPost}>
              <p style={feedPostMeta}>
                {post.location_scope?.slug?.replace(/_/g, ' ') ?? 'Unknown location'}
                {' -- '}
                {new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
              <p style={feedPostBody}>{post.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Styles
const wrap         = { padding: 16 }
const intro        = { fontSize: 12, color: '#495057', marginBottom: 16, lineHeight: 1.5 }
const dim          = { fontSize: 13, color: '#868e96', margin: 0 }
const card         = { border: '1px solid #dee2e6', borderRadius: 6, padding: 12, marginBottom: 12, background: '#fff' }
const cardHeader   = { display: 'flex', justifyContent: 'space-between', gap: 8 }
const cardName     = { fontSize: 13, fontWeight: 600, margin: '0 0 4px 0', color: '#212529' }
const cardDesc     = { fontSize: 12, color: '#495057', margin: '0 0 6px 0', lineHeight: 1.5 }
const memberLine   = { fontSize: 11, color: '#868e96', margin: 0 }
const topicTag     = { fontSize: 11, color: '#1971c2', background: '#e7f5ff', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }
const actions      = { flexShrink: 0, display: 'flex', alignItems: 'flex-start', paddingTop: 2 }
const joinBtn      = { fontSize: 12, padding: '4px 10px', border: 'none', borderRadius: 4, background: '#2f9e44', color: '#fff', cursor: 'pointer' }
const joinedBadge  = { fontSize: 12, color: '#2f9e44', fontWeight: 600 }
const leaveBtn     = { fontSize: 11, padding: '2px 8px', border: '1px solid #dee2e6', borderRadius: 4, background: '#fff', color: '#868e96', cursor: 'pointer' }
const loginLink    = { fontSize: 12, color: '#1971c2', textDecoration: 'none' }
const cardFooter   = { marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f3f5' }
const feedToggle   = { fontSize: 11, color: '#1971c2', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }
const feedPanel    = { marginTop: 8, paddingTop: 8, borderTop: '1px solid #f8f9fa' }
const feedPost     = { marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f1f3f5' }
const feedPostMeta = { fontSize: 11, color: '#868e96', margin: '0 0 2px 0' }
const feedPostBody = { fontSize: 12, color: '#212529', margin: 0, lineHeight: 1.5 }
