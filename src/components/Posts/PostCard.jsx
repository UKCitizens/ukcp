/**
 * @file src/components/Posts/PostCard.jsx
 * @description Single post card. Renders author/timestamp/reach badge,
 *   body, reaction row, flag and (when permitted) delete actions.
 *   Calls /api/posts/:id/{react,flag} directly. Bubbles delete to the parent
 *   via onDeleted so the parent can drop the post from its feed.
 *
 * Author identity: anonymous posts arrive with author.user_id=null and
 * display_name='Anonymous' (server-scrubbed). Author-only actions therefore
 * never appear on anon posts in the UI; admin actions still apply.
 */

import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'

const API_BASE  = import.meta.env.VITE_API_URL ?? ''
const REACTIONS = [
  { key: 'agree',        label: 'Agree'    },
  { key: 'disagree',     label: 'Disagree' },
  { key: 'support',      label: 'Support'  },
  { key: 'flag_concern', label: 'Concern'  },
]

/** Format an ISO date string as a relative timestamp. */
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
 * @param {{
 *   post: object,
 *   onDeleted?: (postId: string) => void,
 * }} props
 */
export default function PostCard({ post, onDeleted }) {
  const { session, profile, claims } = useAuth()
  const [counts,  setCounts]  = useState(post.reaction_counts ?? {})
  const [flagged, setFlagged] = useState(false)
  const [busy,    setBusy]    = useState(false)

  const isAnon      = Boolean(post.author?.is_anonymous)
  const authorLabel = isAnon ? 'Anonymous' : (post.author?.display_name ?? 'citizen')
  const myUserId    = profile?.user?._id
  const isAuthor    = !isAnon && myUserId && String(post.author?.user_id) === String(myUserId)
  const isAdmin     = claims?.platform_role === 'admin'
  const canDelete   = Boolean(session && (isAuthor || isAdmin))

  const headers = session?.access_token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
    : null

  async function handleReact(key) {
    if (!headers || busy) return
    setBusy(true)
    setCounts(prev => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }))
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post._id}/react`, {
        method: 'PATCH',
        headers,
        body:   JSON.stringify({ reaction_type: key }),
      })
      if (!res.ok) {
        setCounts(prev => ({ ...prev, [key]: Math.max((prev[key] ?? 1) - 1, 0) }))
      }
    } catch {
      setCounts(prev => ({ ...prev, [key]: Math.max((prev[key] ?? 1) - 1, 0) }))
    }
    setBusy(false)
  }

  async function handleFlag() {
    if (!headers || busy || flagged) return
    setBusy(true)
    setFlagged(true)
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post._id}/flag`, {
        method: 'POST',
        headers,
      })
      if (!res.ok) setFlagged(false)
    } catch {
      setFlagged(false)
    }
    setBusy(false)
  }

  async function handleDelete() {
    if (!headers || busy) return
    if (typeof window !== 'undefined' && !window.confirm('Delete this post?')) return
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post._id}`, {
        method: 'DELETE',
        headers,
      })
      if (res.ok) onDeleted?.(post._id)
    } catch {
      // toast/error UX deferred to a later sprint
    }
    setBusy(false)
  }

  return (
    <div style={card}>
      <div style={headerRow}>
        <span style={authorTxt}>
          {authorLabel}
          {post.author?.persona === 'affiliated' && <span style={badge}>affiliated</span>}
        </span>
        <span style={timeTxt}>{timeAgo(post.created_at)}</span>
      </div>
      <p style={bodyTxt}>{post.body}</p>
      {post.reach_effective && (
        <div style={reachBadge}>reach: {post.reach_effective}</div>
      )}
      <div style={actions}>
        {REACTIONS.map(r => (
          <button
            key={r.key}
            type="button"
            onClick={() => handleReact(r.key)}
            disabled={!session || busy}
            style={reactBtn}
            title={session ? `React: ${r.label}` : 'Log in to react'}
          >
            {r.label}{counts[r.key] ? ` (${counts[r.key]})` : ''}
          </button>
        ))}
        {session && !isAuthor && (
          <button
            type="button"
            onClick={handleFlag}
            disabled={busy || flagged}
            style={flagBtn}
            title="Flag this post"
          >
            {flagged ? 'Flagged' : 'Flag'}
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            style={deleteBtn}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

const card       = { border: '1px solid #dee2e6', borderRadius: 6, padding: 12, marginBottom: 10, background: '#fff' }
const headerRow  = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }
const authorTxt  = { fontSize: 12, fontWeight: 600, color: '#343a40' }
const timeTxt    = { fontSize: 11, color: '#868e96' }
const bodyTxt    = { fontSize: 13, color: '#212529', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }
const reachBadge = { fontSize: 11, color: '#868e96', background: '#f8f9fa', borderRadius: 4, padding: '2px 6px', display: 'inline-block', marginTop: 6 }
const badge      = { fontSize: 10, color: '#1971c2', background: '#e7f5ff', borderRadius: 3, padding: '1px 5px', marginLeft: 6, fontWeight: 500 }
const actions    = { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }
const reactBtn   = { fontSize: 11, padding: '3px 8px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer' }
const flagBtn    = { fontSize: 11, padding: '3px 8px', background: '#fff5f5', border: '1px solid #ffe3e3', color: '#c92a2a', borderRadius: 4, cursor: 'pointer', marginLeft: 'auto' }
const deleteBtn  = { fontSize: 11, padding: '3px 8px', background: '#fff5f5', border: '1px solid #ffe3e3', color: '#c92a2a', borderRadius: 4, cursor: 'pointer' }
