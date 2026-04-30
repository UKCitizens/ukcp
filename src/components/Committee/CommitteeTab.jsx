/**
 * @file src/components/Committee/CommitteeTab.jsx
 * @description Committee tab panel. Fetches and displays the constituency committee
 * forum for the current location scope. Renders a read-only post feed.
 * Join flow and post form are deferred to the next sprint.
 *
 * Props:
 *   locationType  — geo node type (constituency | ward | county | ...)
 *   locationSlug  — geo node slug (e.g. "Liverpool,_Riverside")
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

/** Format a UTC date string as a relative timestamp. */
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

/**
 * @param {{ locationType: string|null, locationSlug: string|null }} props
 */
export default function CommitteeTab({ locationType, locationSlug }) {
  const { session } = useAuth()
  const [forum,   setForum]   = useState(null)
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (locationType !== 'constituency' || !locationSlug) {
      setForum(null)
      setPosts([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setForum(null)
    setPosts([])

    const headers = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}

    fetch(
      `${API_BASE}/api/forums?type=constituency&slug=${encodeURIComponent(locationSlug)}`,
      { headers }
    )
      .then(r => {
        if (r.status === 404) return null
        if (!r.ok) return Promise.reject(r.status)
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        setForum(data)
        setLoading(false)
        if (!data) return

        // Fetch post feed for this forum
        const url =
          `${API_BASE}/api/posts` +
          `?location_type=constituency` +
          `&location_slug=${encodeURIComponent(locationSlug)}` +
          `&collective_id=${data._id}` +
          `&collective_col=committee_forums`

        fetch(url)
          .then(r => r.ok ? r.json() : Promise.reject(r.status))
          .then(feed => { if (!cancelled) setPosts(feed) })
          .catch(() => { if (!cancelled) setPosts([]) })
      })
      .catch(() => {
        if (!cancelled) { setError('Failed to load committee forum'); setLoading(false) }
      })

    return () => { cancelled = true }
  }, [locationType, locationSlug, session])

  if (locationType !== 'constituency') {
    return <div style={wrap}><p style={dim}>Select a constituency to see its committee forum.</p></div>
  }

  if (loading) return <div style={wrap}><p style={dim}>Loading committee forum…</p></div>
  if (error)   return <div style={wrap}><p style={dim}>{error}</p></div>
  if (!forum)  return <div style={wrap}><p style={dim}>No committee forum found for this constituency.</p></div>

  return (
    <div style={wrap}>
      {/* Forum header */}
      <div style={forumHeader}>
        <p style={forumName}>{forum.name}</p>
        <p style={forumDesc}>
          The public forum for {forum.committee?.name ?? locationSlug.replace(/_/g, ' ')} constituency
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <span style={memberCount}>{forum.member_count ?? 0} members</span>
          {forum.is_member
            ? <span style={joinedBadge}>Joined</span>
            : (
              <button
                style={joinBtn}
                disabled
                onClick={() => console.log('join clicked')}
              >
                Join Forum
              </button>
            )
          }
        </div>
        {forum.committee?.mp_name && (
          <p style={mpLine}>
            MP: {forum.committee.mp_name}
            {forum.committee.mp_party ? ` · ${forum.committee.mp_party}` : ''}
          </p>
        )}
      </div>

      {/* Post feed */}
      <p style={sectionHead}>Forum Posts</p>
      {posts.length === 0
        ? <p style={dim}>No posts yet in this forum.</p>
        : posts.map(post => <PostCard key={post._id} post={post} />)
      }
    </div>
  )
}

/** @param {{ post: object }} props */
function PostCard({ post }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#343a40' }}>{post.author}</span>
        <span style={{ fontSize: 11, color: '#868e96' }}>{timeAgo(post.created_at)}</span>
      </div>
      <p style={{ fontSize: 13, color: '#212529', margin: 0, lineHeight: 1.5 }}>{post.body}</p>
    </div>
  )
}

const wrap        = { padding: 16 }
const dim         = { fontSize: 13, color: '#868e96', margin: 0 }
const forumHeader = { background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 6, padding: 14, marginBottom: 20 }
const forumName   = { fontSize: 15, fontWeight: 700, color: '#212529', margin: '0 0 4px 0' }
const forumDesc   = { fontSize: 12, color: '#495057', margin: 0 }
const memberCount = { fontSize: 12, color: '#868e96' }
const mpLine      = { fontSize: 12, color: '#495057', margin: '8px 0 0 0' }
const sectionHead = { fontSize: 13, fontWeight: 600, color: '#343a40', margin: '0 0 10px 0' }
const card        = { border: '1px solid #dee2e6', borderRadius: 6, padding: 12, marginBottom: 10, background: '#fff' }
const joinedBadge = { fontSize: 12, color: '#2f9e44', fontWeight: 600 }
const joinBtn     = { fontSize: 12, padding: '4px 12px', border: 'none', borderRadius: 4, background: '#adb5bd', color: '#fff', cursor: 'not-allowed' }
