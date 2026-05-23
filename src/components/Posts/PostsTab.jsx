/**
 * @file src/components/Posts/PostsTab.jsx
 * @description Post feed for an origin entity. Fetches via /api/posts,
 *   shows a composer (default GeneralPostComposer), renders posts as PostCard.
 *   Paginated via a "Load more" button (not infinite scroll).
 *
 * Props:
 *   origin           -- { entity_type, entity_id, entity_name?, geo_scope? }, required.
 *   composerVariant  -- React component with props { origin, onSuccess }, optional.
 *   reach            -- string, optional. Filter feed by reach_effective.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth }         from '../../context/AuthContext.jsx'
import GeneralPostComposer from './GeneralPostComposer.jsx'
import PostCard            from './PostCard.jsx'

const API_BASE   = import.meta.env.VITE_API_URL ?? ''
const PAGE_LIMIT = 20

// Color theme by entity_type. accent = border/highlight, bg = container fill.
const ENTITY_THEME = {
  county:         { accent: '#2f9e44', bg: '#f1faf4' },
  region:         { accent: '#2f9e44', bg: '#f1faf4' },
  country:        { accent: '#2f9e44', bg: '#f1faf4' },
  constituency:   { accent: '#2f9e44', bg: '#f1faf4' },
  ward:           { accent: '#2f9e44', bg: '#f1faf4' },
  city:           { accent: '#2f9e44', bg: '#f1faf4' },
  town:           { accent: '#2f9e44', bg: '#f1faf4' },
  village:        { accent: '#2f9e44', bg: '#f1faf4' },
  hamlet:         { accent: '#2f9e44', bg: '#f1faf4' },
  committee:      { accent: '#1971c2', bg: '#f0f4ff' },
  association:    { accent: '#7950f2', bg: '#f5f0ff' },
  space:          { accent: '#e67700', bg: '#fff9f0' },
  school:         { accent: '#f08c00', bg: '#fffdf0' },
  network_chapter:{ accent: '#0c8599', bg: '#f0fafa' },
}
const DEFAULT_THEME = { accent: '#868e96', bg: '#f8f9fa' }

/**
 * @param {{
 *   origin: { entity_type: string, entity_id: string, entity_name?: string, geo_scope?: object },
 *   composerVariant?: import('react').ComponentType<{ origin: object, onSuccess: (post: object) => void }>,
 *   reach?: string,
 * }} props
 */
export default function PostsTab({
  origin,
  composerVariant: ComposerVariant = GeneralPostComposer,
  reach,
}) {
  const { session } = useAuth()
  const [posts,   setPosts]   = useState([])
  const [page,    setPage]    = useState(1)
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const entityType = origin?.entity_type
  const entityId   = origin?.entity_id

  const loadPage = useCallback(async (p) => {
    if (!entityType || !entityId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        entity_type: entityType,
        entity_id:   String(entityId),
        page:        String(p),
        limit:       String(PAGE_LIMIT),
      })
      if (reach) params.set('reach', reach)
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}
      const res = await fetch(`${API_BASE}/api/posts?${params}`, { headers })
      if (!res.ok) throw new Error(`fetch ${res.status}`)
      const json = await res.json()
      setPosts(prev => p === 1 ? json.posts : [...prev, ...json.posts])
      setTotal(json.total ?? 0)
      setPage(p)
    } catch {
      setError('Failed to load posts')
    }
    setLoading(false)
  }, [entityType, entityId, reach, session])

  // Reset and reload when origin changes.
  useEffect(() => {
    setPosts([])
    setPage(1)
    setTotal(0)
    if (entityType && entityId) loadPage(1)
  }, [entityType, entityId, loadPage])

  function handleNew(post) {
    setPosts(prev => [post, ...prev])
    setTotal(t => t + 1)
  }

  function handleDeleted(postId) {
    setPosts(prev => prev.filter(p => String(p._id) !== String(postId)))
    setTotal(t => Math.max(t - 1, 0))
  }

  if (!entityType || !entityId) {
    return <div style={{ padding: 16 }}><p style={dim}>Select a location to view posts.</p></div>
  }

  const theme   = ENTITY_THEME[entityType] ?? DEFAULT_THEME
  const hasMore = posts.length < total

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>

      {/* ── Composer -- sticky, neutral, separated ── */}
      <div style={{
        flexShrink:   0,
        background:   '#fff',
        borderBottom: `1px solid #e9ecef`,
        borderLeft:   `3px solid ${theme.accent}`,
        padding:      '10px 14px',
        boxShadow:    '0 2px 6px rgba(0,0,0,0.06)',
      }}>
        <ComposerVariant origin={origin} onSuccess={handleNew} />
      </div>

      {/* ── Feed -- scrolls independently beneath composer ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: theme.bg, padding: '10px 12px 16px' }}>
        {loading && posts.length === 0 && <p style={dim}>Loading posts…</p>}
        {error   && <p style={errText}>{error}</p>}
        {!loading && !error && posts.length === 0 && (
          <p style={dim}>No posts yet. Be the first.</p>
        )}

        {posts.map(post => (
          <PostCard key={post._id} post={post} origin={origin} onDeleted={handleDeleted} />
        ))}

        {hasMore && (
          <button
            type="button"
            onClick={() => loadPage(page + 1)}
            disabled={loading}
            style={loadMoreBtn(theme.accent)}
          >
            {loading ? 'Loading…' : `Load more (${total - posts.length} remaining)`}
          </button>
        )}
      </div>

    </div>
  )
}

const noContext       = { padding: 16 }
const dim             = { fontSize: 13, color: '#868e96', margin: 0 }
const errText         = { fontSize: 12, color: '#c92a2a', margin: '4px 0 0 0' }
const loadMoreBtn = (accent) => ({
  fontSize: 12, padding: '6px 14px', background: '#fff',
  border: `1px solid ${accent}50`, color: accent,
  borderRadius: 4, cursor: 'pointer', marginTop: 4, display: 'block',
})
