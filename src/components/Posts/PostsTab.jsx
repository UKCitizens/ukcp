/**
 * @file src/components/Posts/PostsTab.jsx
 * @description Posts tab panel. Displays a post feed for the current location
 *   and a compose form for logged-in users.
 *
 * Props:
 *   locationType  — geo node type (ward | constituency | county | region | country)
 *   locationSlug  — geo node slug (e.g. "Mossley_Hill")
 *   collectiveRef — optional { collection: string, id: string } — filters to a specific group
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

/** Format a UTC date string as a relative timestamp. */
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

/**
 * @param {{
 *   locationType:  string|null,
 *   locationSlug:  string|null,
 *   collectiveRef: { collection: string, id: string }|null
 * }} props
 */
export default function PostsTab({ locationType, locationSlug, collectiveRef = null }) {
  const { session } = useAuth()
  const [posts,       setPosts]       = useState([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [body,        setBody]        = useState('')
  const [isAnon,      setIsAnon]      = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    if (!locationType || !locationSlug) return
    let cancelled = false
    setLoading(true)
    setError(null)

    let url = `${API_BASE}/api/posts?location_type=${encodeURIComponent(locationType)}&location_slug=${encodeURIComponent(locationSlug)}`
    if (collectiveRef?.id) {
      url += `&collective_id=${encodeURIComponent(collectiveRef.id)}&collective_col=${encodeURIComponent(collectiveRef.collection)}`
    }

    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { if (!cancelled) { setPosts(data); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError('Failed to load posts'); setLoading(false) } })

    return () => { cancelled = true }
  }, [locationType, locationSlug, collectiveRef])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!body.trim() || !session?.access_token) return
    setSubmitting(true)
    setSubmitError(null)

    const payload = {
      post_type:      'standard',
      body:           body.trim(),
      is_anonymous:   isAnon,
      location_scope: { type: locationType, slug: locationSlug },
      collective_ref: collectiveRef ?? null,
    }

    try {
      const res = await fetch(`${API_BASE}/api/posts`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        setSubmitError(err.error ?? 'Post failed')
        setSubmitting(false)
        return
      }

      const { _id, anon_token } = await res.json()
      const newPost = {
        _id,
        body:           payload.body,
        is_anonymous:   isAnon,
        author:         isAnon ? 'Anonymous' : (session?.user?.email?.split('@')[0] ?? 'citizen'),
        location_scope: { type: locationType, slug: locationSlug },
        collective_ref: payload.collective_ref,
        status:         'published',
        created_at:     new Date().toISOString(),
        anon_token,
      }
      setPosts(prev => [newPost, ...prev])
      setBody('')
      setIsAnon(false)
    } catch {
      setSubmitError('Network error — please try again')
    }
    setSubmitting(false)
  }

  if (!locationType) {
    return <div style={wrap}><p style={dim}>Select a location to view posts.</p></div>
  }

  return (
    <div style={wrap}>
      {/* Compose */}
      {session
        ? (
          <form onSubmit={handleSubmit} style={formStyle}>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={2000}
              required
              style={textarea}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <label style={anonLabel}>
                <input
                  type="checkbox"
                  checked={isAnon}
                  onChange={e => setIsAnon(e.target.checked)}
                  style={{ marginRight: 4 }}
                />
                Post anonymously
              </label>
              <button type="submit" disabled={submitting || !body.trim()} style={submitBtn}>
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
            {submitError && <p style={errText}>{submitError}</p>}
          </form>
        )
        : (
          <p style={{ ...dim, marginBottom: 16 }}>
            <a href="/auth" style={{ color: '#1971c2' }}>Log in</a> to post.
          </p>
        )
      }

      {/* Feed */}
      {loading && <p style={dim}>Loading posts…</p>}
      {error   && <p style={{ ...dim, color: '#c92a2a' }}>{error}</p>}
      {!loading && !error && posts.length === 0 && (
        <p style={dim}>No posts at this location yet. Be the first!</p>
      )}
      {posts.map(post => (
        <PostCard key={post._id} post={post} />
      ))}
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
      <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={metaTag}>
          {post.location_scope?.type} · {post.location_scope?.slug?.replace(/_/g, ' ')}
        </span>
        {post.collective_ref && <span style={metaTag}>Group post</span>}
      </div>
    </div>
  )
}

const wrap      = { padding: 16 }
const dim       = { fontSize: 13, color: '#868e96', margin: 0 }
const formStyle = { marginBottom: 20, background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 6, padding: 12 }
const textarea  = { width: '100%', minHeight: 72, padding: '8px 10px', fontSize: 13, border: '1px solid #dee2e6', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
const anonLabel = { fontSize: 12, color: '#495057', display: 'flex', alignItems: 'center', cursor: 'pointer' }
const submitBtn = { fontSize: 12, padding: '5px 14px', background: '#2f9e44', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }
const errText   = { fontSize: 12, color: '#c92a2a', margin: '4px 0 0 0' }
const card      = { border: '1px solid #dee2e6', borderRadius: 6, padding: 12, marginBottom: 10, background: '#fff' }
const metaTag   = { fontSize: 11, color: '#868e96', background: '#f8f9fa', borderRadius: 4, padding: '2px 6px' }
