/**
 * @file src/components/Posts/PostCard.jsx
 * @description Single post card. Facebook/Bluesky-style containment:
 *   avatar + header + body + veracity strip + action bar + thread (inside card).
 *   Edit/Delete/Flag live in a context menu (...), not inline.
 */

import { useState, useRef, useEffect } from 'react'
import { useAuth }    from '../../context/AuthContext.jsx'
import PostThread     from './PostThread.jsx'
import PostEmbed      from './PostEmbed.jsx'
import DOMPurify      from 'dompurify'

const API_BASE  = import.meta.env.VITE_API_URL ?? ''

const REACTIONS = [
  { key: 'agree',    label: 'Agree'    },
  { key: 'disagree', label: 'Disagree' },
  { key: 'support',  label: 'Support'  },
]

const VERACITY_VOTES = [
  { key: 'true',         label: 'True',        color: '#2f9e44', bg: '#ebfbee' },
  { key: 'plausible',    label: 'Plausible',   color: '#1971c2', bg: '#e7f5ff' },
  { key: 'questionable', label: 'Questionable',color: '#e67700', bg: '#fff4e6' },
  { key: 'false',        label: 'False',       color: '#c92a2a', bg: '#fff5f5' },
]

const AVATAR_COLORS = ['#2f9e44','#1971c2','#7950f2','#e67700','#0c8599','#c2255c','#5c7cfa']

function avatarColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function PostCard({ post, origin, onDeleted, depth = 0 }) {
  const { session, profile, claims } = useAuth()

  // Reaction state
  const [counts,       setCounts]       = useState(post.reaction_counts ?? {})
  const [userReaction, setUserReaction] = useState(null)

  // Veracity state
  const [vCounts,  setVCounts]  = useState(post.veracity_counts ?? { true:0, plausible:0, questionable:0, false:0, total:0 })
  const [vScore,   setVScore]   = useState(post.veracity_score ?? null)
  const [vMet,     setVMet]     = useState(post.veracity_threshold_met ?? false)
  const [userVote, setUserVote] = useState(null)

  // Edit state
  const [liveBody,     setLiveBody]     = useState(post.body)
  const [liveVersions, setLiveVersions] = useState(post.versions ?? [])
  const [editing,      setEditing]      = useState(false)
  const [editBody,     setEditBody]     = useState(post.body)
  const [showHistory,  setShowHistory]  = useState(false)

  // Thread state
  const [replyCount, setReplyCount] = useState(post.counts?.reply_count ?? 0)
  const [showThread, setShowThread] = useState(false)

  // Context menu
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Flag
  const [flagged, setFlagged] = useState(false)
  const [busy,    setBusy]    = useState(false)

  const isAnon      = Boolean(post.author?.is_anonymous) && !post.is_mine
  const authorLabel = isAnon ? 'Anonymous' : (post.author?.display_name ?? 'Citizen')
  const initial     = authorLabel[0]?.toUpperCase() ?? '?'
  const color       = avatarColor(authorLabel)
  const isAuthor    = Boolean(post.is_mine)
  const isAdmin     = claims?.platform_role === 'admin'
  const canDelete   = Boolean(session && (isAuthor || isAdmin))
  const hasMenu     = canDelete || (session && !isAuthor)

  const authHeaders = session?.access_token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
    : null

  // Close context menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  async function handleReact(key) {
    if (!authHeaders || busy) return
    setBusy(true)
    const prev = userReaction
    const prevC = { ...counts }
    const next = { ...counts }
    if (prev && prev !== key) next[prev] = Math.max((next[prev] ?? 1) - 1, 0)
    if (!prev || prev !== key) next[key] = (next[key] ?? 0) + 1
    setUserReaction(key)
    setCounts(next)
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post._id}/react`, {
        method: 'PATCH', headers: authHeaders, body: JSON.stringify({ reaction_type: key }),
      })
      if (res.ok) {
        const data = await res.json()
        setCounts(data.reaction_counts)
        setUserReaction(data.user_reaction)
      } else { setUserReaction(prev); setCounts(prevC) }
    } catch { setUserReaction(prev); setCounts(prevC) }
    setBusy(false)
  }

  async function handleVeracityVote(key) {
    if (!authHeaders || busy) return
    setBusy(true)
    const prev = userVote
    const prevC = { ...vCounts }
    const newC = { ...vCounts }
    if (prev) newC[prev] = Math.max((newC[prev] ?? 1) - 1, 0)
    newC[key] = (newC[key] ?? 0) + 1
    newC.total = prev ? prevC.total : (prevC.total ?? 0) + 1
    setUserVote(key)
    setVCounts(newC)
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post._id}/veracity`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ veracity_vote: key }),
      })
      if (res.ok) {
        const data = await res.json()
        setVCounts(data.veracity_counts)
        setVScore(data.veracity_score)
        setVMet(data.veracity_threshold_met)
      } else { setUserVote(prev); setVCounts(prevC) }
    } catch { setUserVote(prev); setVCounts(prevC) }
    setBusy(false)
  }

  async function handleFlag() {
    if (!authHeaders || busy || flagged) return
    setBusy(true)
    setFlagged(true)
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post._id}/flag`, {
        method: 'POST', headers: authHeaders,
      })
      if (!res.ok) setFlagged(false)
    } catch { setFlagged(false) }
    setBusy(false)
  }

  async function handleDelete() {
    if (!authHeaders || busy) return
    if (!window.confirm('Delete this post?')) return
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post._id}`, {
        method: 'DELETE', headers: authHeaders,
      })
      if (res.ok) onDeleted?.(post._id)
    } catch {}
    setBusy(false)
  }

  async function handleEdit() {
    if (!authHeaders || busy || !editBody.trim()) return
    if (replyCount > 0 && !window.confirm('This post has replies. Editing will reset its veracity score and create a version record. Continue?')) return
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post._id}`, {
        method: 'PATCH', headers: authHeaders, body: JSON.stringify({ body: editBody.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        setLiveBody(updated.body)
        setEditBody(updated.body)
        setLiveVersions(updated.versions ?? [])
        setEditing(false)
      }
    } catch {}
    setBusy(false)
  }

  const scorePercent = vScore !== null ? Math.round(vScore * 100) : null
  const scoreColor   = vScore >= 0.75 ? '#2f9e44' : vScore >= 0.5 ? '#1971c2' : vScore >= 0.25 ? '#e67700' : '#c92a2a'

  return (
    <div style={card}>

      {/* ── Header ── */}
      <div style={headerRow}>
        <div style={{ ...avatar, background: color }}>{initial}</div>
        <div style={authorBlock}>
          <span style={authorName}>{authorLabel}</span>
          {post.author?.persona === 'affiliated' && <span style={affiliatedChip}>affiliated</span>}
          {liveVersions.length > 0 && (
            <button type="button" style={editedChip} onClick={() => setShowHistory(h => !h)}>
              edited
            </button>
          )}
        </div>
        <span style={timeText}>{timeAgo(post.created_at)}</span>
        {hasMenu && (
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button type="button" style={menuTrigger} onClick={() => setMenuOpen(o => !o)}>•••</button>
            {menuOpen && (
              <div style={menuDropdown}>
                {isAuthor && (
                  <button type="button" style={menuItem} onClick={() => { setEditing(e => !e); setMenuOpen(false) }}>
                    {editing ? 'Cancel edit' : 'Edit'}
                  </button>
                )}
                {canDelete && (
                  <button type="button" style={{ ...menuItem, color: '#c92a2a' }} onClick={() => { handleDelete(); setMenuOpen(false) }}>
                    Delete
                  </button>
                )}
                {session && !isAuthor && (
                  <button type="button" style={{ ...menuItem, color: flagged ? '#adb5bd' : '#c92a2a' }} onClick={() => { handleFlag(); setMenuOpen(false) }} disabled={flagged}>
                    {flagged ? 'Flagged' : 'Flag'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      {editing ? (
        <div style={{ margin: '10px 0' }}>
          <textarea
            value={editBody}
            onChange={e => setEditBody(e.target.value)}
            maxLength={10000}
            style={editArea}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button type="button" onClick={handleEdit} disabled={busy || !editBody.trim()} style={saveBtn}>Save</button>
            <button type="button" onClick={() => { setEditing(false); setEditBody(liveBody) }} style={cancelEditBtn}>Cancel</button>
          </div>
        </div>
      ) : (
        <div
          style={bodyText}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(liveBody, { ADD_ATTR: ['target', 'rel'] }) }}
        />
      )}

      {/* ── Attached image ── */}
      {post.meta?.image && (
        <div style={postImageWrap}>
          <img src={post.meta.image} alt="" style={postImageImg} />
        </div>
      )}

      {/* ── URL embed (first only) ── */}
      {post.meta?.embeds?.[0] && (
        <PostEmbed embed={post.meta.embeds[0]} />
      )}

      {/* ── Version history panel ── */}
      {showHistory && liveVersions.length > 0 && (
        <div style={historyPanel}>
          {[...liveVersions].reverse().map(v => (
            <div key={v.version} style={historyEntry}>
              <span style={historyMeta}>v{v.version} &mdash; {new Date(v.edited_at).toLocaleString()}{v.veracity_snapshot?.score != null ? ` · veracity ${Math.round(v.veracity_snapshot.score * 100)}%` : ''}</span>
              <p style={historyBody}>{v.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Veracity strip ── */}
      <div style={veracityStrip}>
        <span style={veracityLabel}>Rate:</span>
        {VERACITY_VOTES.map(v => {
          const active = userVote === v.key
          return (
            <button
              key={v.key}
              type="button"
              disabled={!session || busy}
              onClick={() => handleVeracityVote(v.key)}
              style={{
                ...veracityPill,
                background:  active ? v.bg      : 'transparent',
                color:       active ? v.color   : '#adb5bd',
                borderColor: active ? v.color   : '#e9ecef',
                fontWeight:  active ? 600       : 400,
              }}
              title={session ? `Rate as ${v.label}` : 'Log in to rate'}
            >
              {v.label}{vCounts[v.key] ? ` ${vCounts[v.key]}` : ''}
            </button>
          )
        })}
        {vMet && scorePercent !== null && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 6 }}>
            <span style={{ width: 48, height: 4, background: '#e9ecef', borderRadius: 2, overflow: 'hidden', display: 'inline-block' }}>
              <span style={{ display: 'block', width: `${scorePercent}%`, height: '100%', background: scoreColor, borderRadius: 2 }} />
            </span>
            <span style={{ fontSize: 11, color: '#868e96' }}>{scorePercent}%</span>
          </span>
        )}
        {!vMet && (
          <span style={veracityPending}>{vCounts.total > 0 ? `${vCounts.total}/5` : ''}</span>
        )}
      </div>

      {/* ── Action bar ── */}
      <div style={actionBar}>
        <div style={actionLeft}>
          {REACTIONS.map(r => {
            const active = userReaction === r.key
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => handleReact(r.key)}
                disabled={!session || busy}
                style={{ ...actionBtn, color: active ? '#2f9e44' : '#868e96', fontWeight: active ? 600 : 400 }}
                title={session ? r.label : 'Log in to react'}
              >
                {r.label}{counts[r.key] ? ` ${counts[r.key]}` : ''}
              </button>
            )
          })}
        </div>
        {session && (
          <button type="button" style={replyBtn} onClick={() => setShowThread(t => !t)}>
            {showThread ? 'Hide replies'
              : replyCount > 0 ? `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
              : 'Reply'}
          </button>
        )}
      </div>

      {/* ── Thread (inside card) ── */}
      {showThread && (
        <div style={threadArea}>
          <PostThread
            postId={String(post._id)}
            origin={origin}
            depth={0}
            onReplyAdded={() => setReplyCount(n => n + 1)}
          />
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const card           = { background: '#fff', borderRadius: 8, border: '1px solid #e9ecef', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '14px 16px', marginBottom: 10 }

const headerRow      = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }
const avatar         = { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }
const authorBlock    = { flex: 1, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }
const authorName     = { fontSize: 13, fontWeight: 600, color: '#212529' }
const affiliatedChip = { fontSize: 10, color: '#1971c2', background: '#e7f5ff', borderRadius: 3, padding: '1px 5px', fontWeight: 500 }
const editedChip     = { fontSize: 10, color: '#868e96', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline dotted' }
const timeText       = { fontSize: 11, color: '#adb5bd', flexShrink: 0 }
const menuTrigger    = { fontSize: 16, color: '#adb5bd', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', lineHeight: 1, letterSpacing: 1 }
const menuDropdown   = { position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #dee2e6', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 100, minWidth: 120, overflow: 'hidden' }
const menuItem       = { display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#212529' }

const bodyText       = { fontSize: 14, color: '#212529', margin: '0 0 10px 0', lineHeight: 1.55 }
const editArea       = { width: '100%', minHeight: 80, padding: '8px 10px', fontSize: 14, border: '1px solid #ced4da', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }
const saveBtn        = { fontSize: 12, padding: '4px 12px', background: '#2f9e44', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }
const cancelEditBtn  = { fontSize: 12, padding: '4px 12px', background: 'none', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', color: '#868e96' }

const historyPanel   = { background: '#f8f9fa', borderRadius: 4, padding: '8px 10px', marginBottom: 10, borderLeft: '2px solid #dee2e6' }
const historyEntry   = { marginBottom: 6 }
const historyMeta    = { fontSize: 11, color: '#adb5bd', display: 'block', marginBottom: 2 }
const historyBody    = { fontSize: 12, color: '#495057', margin: 0 }

const veracityStrip  = { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', paddingBottom: 10, borderBottom: '1px solid #f1f3f5', marginBottom: 8 }
const veracityLabel  = { fontSize: 11, color: '#adb5bd', marginRight: 2 }
const veracityPill   = { fontSize: 11, padding: '2px 7px', borderRadius: 20, border: '1px solid', cursor: 'pointer', transition: 'all 0.1s', lineHeight: 1.4 }
const veracityPending = { fontSize: 11, color: '#dee2e6', marginLeft: 4 }

const actionBar      = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
const actionLeft     = { display: 'flex', gap: 0 }
const actionBtn      = { fontSize: 12, padding: '3px 10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4, transition: 'background 0.1s' }
const replyBtn       = { fontSize: 12, padding: '3px 10px', background: 'none', border: 'none', cursor: 'pointer', color: '#868e96', borderRadius: 4 }

const threadArea     = { marginTop: 12, borderTop: '1px solid #f1f3f5', paddingTop: 10 }

const postImageWrap  = { marginBottom: 10, borderRadius: 6, overflow: 'hidden', border: '1px solid #f1f3f5' }
const postImageImg   = { width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }
