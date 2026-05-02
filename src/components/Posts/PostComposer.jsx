/**
 * @file src/components/Posts/PostComposer.jsx
 * @description Base composer for any post type. Owns body, anonymity,
 *   reach selection, and submission. Variants render their own fields as
 *   children above the body textarea and supply variant-specific fields
 *   via the `meta` prop.
 *
 * Props:
 *   postType     -- string, required. Must match a post_type_config row.
 *   origin       -- { entity_type, entity_id, entity_name, geo_scope }, required.
 *   onSuccess    -- function(post), required. Called with created post on submit.
 *   meta         -- object, optional. Variant-specific extras passed to POST.
 *   children     -- ReactNode, optional. Variant fields rendered above body.
 *   defaultReach -- string, optional. Override of the post_type's default reach.
 */

import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { getPostConfig } from '../../lib/postConfig.js'

const API_BASE        = import.meta.env.VITE_API_URL ?? ''
const REACH_HIERARCHY = ['origin', 'ward', 'constituency', 'county', 'region', 'national']
const REACH_LABELS    = {
  origin:       'Origin',
  ward:         'Ward',
  constituency: 'Constituency',
  county:       'County',
  region:       'Region',
  national:     'National',
}

/**
 * @param {{
 *   postType: string,
 *   origin: { entity_type: string, entity_id: string, entity_name?: string, geo_scope?: object },
 *   onSuccess: (post: object) => void,
 *   meta?: object,
 *   children?: import('react').ReactNode,
 *   defaultReach?: string,
 * }} props
 */
export default function PostComposer({
  postType, origin, onSuccess, meta, children, defaultReach,
}) {
  const { session, profile } = useAuth()

  const [config,        setConfig]        = useState(null)
  const [body,          setBody]          = useState('')
  const [isAnonymous,   setIsAnonymous]   = useState(false)
  const [reachOverride, setReachOverride] = useState(null)
  const [submitting,    setSubmitting]    = useState(false)
  const [error,         setError]         = useState(null)

  // Load post_type config (cached at module level).
  useEffect(() => {
    let cancelled = false
    getPostConfig(postType)
      .then(cfg => {
        if (cancelled) return
        if (!cfg) { setError(`Unknown post type: ${postType}`); return }
        setConfig(cfg)
        if (defaultReach) setReachOverride(defaultReach)
      })
      .catch(() => { if (!cancelled) setError('Failed to load post config') })
    return () => { cancelled = true }
  }, [postType, defaultReach])

  // Initial anon flag from user prefs.
  useEffect(() => {
    const pref = profile?.user?.preferences?.default_posting_mode
    if (pref === 'anonymous') setIsAnonymous(true)
    if (pref === 'named')     setIsAnonymous(false)
  }, [profile?.user?.preferences?.default_posting_mode])

  if (!session) {
    return (
      <p style={loginPrompt}>
        <a href="/login" style={{ color: '#1971c2' }}>Log in</a> to post.
      </p>
    )
  }
  if (error && !config) return <p style={errText}>{error}</p>
  if (!config) return <p style={dim}>Loading composer…</p>

  // Reach selector options between floor and ceiling inclusive.
  const lo = REACH_HIERARCHY.indexOf(config.reach_floor)
  const hi = REACH_HIERARCHY.indexOf(config.reach_ceiling)
  const reachOptions = config.user_override
    ? REACH_HIERARCHY.slice(Math.max(lo, 0), (hi < 0 ? REACH_HIERARCHY.length : hi + 1))
    : []

  function reachLabel(r) {
    if (r === 'origin') return `Origin (this ${origin.entity_name ?? origin.entity_type})`
    return REACH_LABELS[r] ?? r
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!body.trim() || submitting) return
    setSubmitting(true)
    setError(null)

    const payload = {
      post_type:    postType,
      body:         body.trim(),
      origin,
      reach_set:    reachOverride || null,
      is_anonymous: isAnonymous,
      meta:         meta ?? {},
    }

    try {
      const res = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error ?? 'Post failed')
        setSubmitting(false)
        return
      }
      const newPost = await res.json()
      setBody('')
      onSuccess(newPost)
    } catch {
      setError('Network error -- please try again')
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      {children}
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="What's on your mind?"
        maxLength={2000}
        required
        style={textarea}
      />
      <div style={charCount}>{body.length}/2000</div>
      <div style={controls}>
        <label style={anonLabel}>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={e => setIsAnonymous(e.target.checked)}
            style={{ marginRight: 4 }}
          />
          Post anonymously
        </label>
        {config.user_override && (
          <select
            value={reachOverride ?? config.reach_default}
            onChange={e => setReachOverride(e.target.value)}
            style={reachSelect}
            aria-label="Reach"
          >
            {reachOptions.map(r => (
              <option key={r} value={r}>{reachLabel(r)}</option>
            ))}
          </select>
        )}
        <button type="submit" disabled={submitting || !body.trim()} style={submitBtn}>
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </div>
      {error && <p style={errText}>{error}</p>}
    </form>
  )
}

const formStyle   = { marginBottom: 20, background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 6, padding: 12 }
const textarea    = { width: '100%', minHeight: 72, padding: '8px 10px', fontSize: 13, border: '1px solid #dee2e6', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
const charCount   = { fontSize: 11, color: '#868e96', textAlign: 'right', margin: '4px 0 0 0' }
const controls    = { display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }
const anonLabel   = { fontSize: 12, color: '#495057', display: 'flex', alignItems: 'center', cursor: 'pointer' }
const reachSelect = { fontSize: 12, padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: 4, background: '#fff' }
const submitBtn   = { fontSize: 12, padding: '5px 14px', background: '#2f9e44', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }
const errText     = { fontSize: 12, color: '#c92a2a', margin: '4px 0 0 0' }
const loginPrompt = { fontSize: 13, color: '#868e96', marginBottom: 16 }
const dim         = { fontSize: 13, color: '#868e96', margin: 0 }
