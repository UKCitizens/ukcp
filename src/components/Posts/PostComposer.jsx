/**
 * @file src/components/Posts/PostComposer.jsx
 * @description Base composer. Content zones: rich text body + 1 image + 1 URL embed.
 *   Toolbar (on expand): Bold, Italic, Link, Image upload, Emoji picker.
 *
 * Props:
 *   postType     -- string, required.
 *   origin       -- { entity_type, entity_id, entity_name, geo_scope }, required.
 *   onSuccess    -- function(post), required.
 *   meta         -- object, optional. Merged into POST payload meta.
 *   children     -- ReactNode, optional. Variant fields above editor.
 *   defaultReach -- string, optional.
 *   replyTo      -- string, optional.
 *   hideReach    -- boolean, optional.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth }       from '../../context/AuthContext.jsx'
import { getPostConfig } from '../../lib/postConfig.js'
import RichEditor        from './RichEditor.jsx'
import PostEmbed         from './PostEmbed.jsx'

const API_BASE        = import.meta.env.VITE_API_URL ?? ''
const REACH_HIERARCHY = ['origin', 'ward', 'constituency', 'county', 'region', 'national']
const REACH_LABELS    = {
  origin:       'Origin', ward: 'Ward', constituency: 'Constituency',
  county:       'County', region: 'Region', national: 'National',
}
const MAX_IMAGE_BYTES = 3 * 1024 * 1024 // 3 MB

function isBodyEmpty(html) {
  if (!html) return true
  return html.replace(/<[^>]+>/g, '').trim().length === 0
}

export default function PostComposer({
  postType, origin, onSuccess, meta, children, defaultReach, replyTo, hideReach = false,
}) {
  const { session, profile } = useAuth()

  const [config,        setConfig]        = useState(null)
  const [body,          setBody]          = useState('')
  const [isAnonymous,   setIsAnonymous]   = useState(false)
  const [reachOverride, setReachOverride] = useState(null)
  const [submitting,    setSubmitting]    = useState(false)
  const [error,         setError]         = useState(null)
  const [expanded,      setExpanded]      = useState(false)

  // Image slot
  const [imageData,  setImageData]  = useState(null)   // base64 data URL string
  const [imageError, setImageError] = useState(null)
  const fileInputRef = useRef(null)

  // Embed slot
  const [embeds,      setEmbeds]      = useState([])
  const [fetchingUrl, setFetchingUrl] = useState(null)

  // Load post_type config
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

  // Anon flag from user prefs
  useEffect(() => {
    const pref = profile?.user?.preferences?.default_posting_mode
    if (pref === 'anonymous') setIsAnonymous(true)
    if (pref === 'named')     setIsAnonymous(false)
  }, [profile?.user?.preferences?.default_posting_mode])

  // Image selection via file input
  function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError(null)
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image must be under 3 MB')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = ev => setImageData(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // URL embed fetch
  const fetchEmbed = useCallback(async (url) => {
    if (embeds.find(e => e.url === url)) return
    if (fetchingUrl === url) return
    setFetchingUrl(url)
    try {
      const res = await fetch(`${API_BASE}/api/posts/link-preview?url=${encodeURIComponent(url)}`)
      if (res.ok) {
        const data = await res.json()
        setEmbeds([data]) // cap at 1
      }
    } catch {}
    setFetchingUrl(null)
  }, [embeds, fetchingUrl])

  if (!session) {
    return (
      <p style={loginPrompt}>
        <a href="/login" style={{ color: '#1971c2' }}>Log in</a> to post.
      </p>
    )
  }
  if (error && !config) return <p style={errText}>{error}</p>
  if (!config) return <p style={dim}>Loading composer...</p>

  const lo = REACH_HIERARCHY.indexOf(config.reach_floor)
  const hi = REACH_HIERARCHY.indexOf(config.reach_ceiling)
  const reachOptions = config.user_override
    ? REACH_HIERARCHY.slice(Math.max(lo, 0), hi < 0 ? REACH_HIERARCHY.length : hi + 1)
    : []

  function reachLabel(r) {
    if (r === 'origin') return `Origin (this ${origin.entity_name ?? origin.entity_type})`
    return REACH_LABELS[r] ?? r
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isBodyEmpty(body) && !imageData && embeds.length === 0) return
    if (submitting) return
    setSubmitting(true)
    setError(null)

    const payload = {
      post_type:    postType,
      body:         body || '',
      origin,
      reach_set:    reachOverride || null,
      is_anonymous: isAnonymous,
      meta: {
        ...(meta ?? {}),
        ...(imageData  ? { image: imageData }     : {}),
        ...(embeds.length ? { embeds }             : {}),
      },
      ...(replyTo ? { reply_to: replyTo } : {}),
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
      setImageData(null)
      setEmbeds([])
      setExpanded(false)
      onSuccess(newPost)
    } catch {
      setError('Network error -- please try again')
    }
    setSubmitting(false)
  }

  function handleCancel() {
    setBody('')
    setImageData(null)
    setEmbeds([])
    setError(null)
    setExpanded(false)
  }

  // Submit enabled if any content zone has content
  const canSubmit = !submitting && (!isBodyEmpty(body) || imageData || embeds.length > 0)

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      {children}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.gif"
        style={{ display: 'none' }}
        onChange={handleImageSelect}
      />

      {/* ── Rich text editor ── */}
      <RichEditor
        content={body}
        onUpdate={setBody}
        onUrlPasted={fetchEmbed}
        onImageClick={() => fileInputRef.current?.click()}
        expanded={expanded}
        onFocus={() => setExpanded(true)}
        placeholder={replyTo ? 'Write a reply...' : "What's on your mind?"}
      />

      {/* ── Image preview zone ── */}
      {imageData && (
        <div style={imagePreviewWrap}>
          <img src={imageData} alt="attachment" style={imagePreviewImg} />
          <button type="button" style={removeMediaBtn} onClick={() => setImageData(null)} title="Remove image">x</button>
        </div>
      )}
      {imageError && <p style={errText}>{imageError}</p>}

      {/* ── URL embed zone ── */}
      {embeds.map(embed => (
        <PostEmbed
          key={embed.url}
          embed={embed}
          onRemove={() => setEmbeds([])}
        />
      ))}
      {fetchingUrl && <p style={fetchingText}>Fetching preview...</p>}

      {/* ── Controls row (only when expanded) ── */}
      {expanded && (
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
          {!hideReach && config.user_override && reachOptions.length > 0 && (
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
          <button type="button" onClick={handleCancel} style={cancelBtn}>
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit} style={submitBtn}>
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      )}

      {error && <p style={errText}>{error}</p>}
    </form>
  )
}

const formStyle       = { marginBottom: 0 }
const controls        = { display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }
const anonLabel       = { fontSize: 12, color: '#495057', display: 'flex', alignItems: 'center', cursor: 'pointer' }
const reachSelect     = { fontSize: 12, padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: 4, background: '#fff' }
const cancelBtn       = { fontSize: 12, padding: '5px 12px', background: 'none', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', color: '#868e96', marginLeft: 'auto' }
const submitBtn       = { fontSize: 12, padding: '5px 16px', background: '#2f9e44', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }
const errText         = { fontSize: 12, color: '#c92a2a', margin: '4px 0 0 0' }
const loginPrompt     = { fontSize: 13, color: '#868e96', marginBottom: 16 }
const dim             = { fontSize: 13, color: '#868e96', margin: 0 }
const fetchingText    = { fontSize: 11, color: '#adb5bd', margin: '4px 0 0 0' }
const imagePreviewWrap= { position: 'relative', marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid #e9ecef', background: '#f8f9fa' }
const imagePreviewImg = { width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }
const removeMediaBtn  = { position: 'absolute', top: 8, right: 10, fontSize: 16, lineHeight: 1, color: '#fff', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontWeight: 700 }
