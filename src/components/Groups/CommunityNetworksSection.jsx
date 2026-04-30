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

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const VALID_TIERS = ['ward', 'constituency', 'county']

export default function CommunityNetworksSection({ locationType, locationSlug, session }) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

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

  return (
    <div style={wrap}>
      <p style={intro}>
        Community Networks are national topic groups with local chapters.
        Every network has a chapter here -- join to connect with people near you
        who care about the same issues.
      </p>
      {data.map(({ nationalGroup, chapter, is_member }) => (
        <NetworkCard
          key={nationalGroup._id}
          nationalGroup={nationalGroup}
          chapter={chapter}
          isMember={is_member}
          session={session}
          onJoin={handleJoin}
          onLeave={handleLeave}
          locationType={locationType}
          locationSlug={locationSlug}
        />
      ))}
    </div>
  )
}

function NetworkCard({ nationalGroup, chapter, isMember, session, onJoin, onLeave, locationType, locationSlug }) {
  const [joining,     setJoining]   = useState(false)
  const [showFeed,    setShowFeed]  = useState(false)
  const [feedPosts,   setFeedPosts] = useState([])
  const [feedLoading, setFeedLoading] = useState(false)

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
        <button style={feedToggle} onClick={toggleNationalFeed}>
          {showFeed ? 'Hide national posts' : 'View national posts'}
        </button>
      </div>

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
