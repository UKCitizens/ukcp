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
import GeneralPostComposer from './GeneralPostComposer.jsx'
import PostCard            from './PostCard.jsx'

const API_BASE   = import.meta.env.VITE_API_URL ?? ''
const PAGE_LIMIT = 20

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
      const res = await fetch(`${API_BASE}/api/posts?${params}`)
      if (!res.ok) throw new Error(`fetch ${res.status}`)
      const json = await res.json()
      setPosts(prev => p === 1 ? json.posts : [...prev, ...json.posts])
      setTotal(json.total ?? 0)
      setPage(p)
    } catch {
      setError('Failed to load posts')
    }
    setLoading(false)
  }, [entityType, entityId, reach])

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
    return <div style={wrap}><p style={dim}>Select a context to view posts.</p></div>
  }

  const hasMore = posts.length < total

  return (
    <div style={wrap}>
      <ComposerVariant origin={origin} onSuccess={handleNew} />

      {loading && posts.length === 0 && <p style={dim}>Loading posts…</p>}
      {error && <p style={errText}>{error}</p>}

      {!loading && !error && posts.length === 0 && (
        <p style={dim}>No posts yet. Be the first.</p>
      )}

      {posts.map(post => (
        <PostCard key={post._id} post={post} onDeleted={handleDeleted} />
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => loadPage(page + 1)}
          disabled={loading}
          style={loadMore}
        >
          {loading ? 'Loading…' : `Load more (${total - posts.length} remaining)`}
        </button>
      )}
    </div>
  )
}

const wrap     = { padding: 16 }
const dim      = { fontSize: 13, color: '#868e96', margin: 0 }
const errText  = { fontSize: 12, color: '#c92a2a', margin: '4px 0 0 0' }
const loadMore = { fontSize: 12, padding: '6px 12px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer', marginTop: 12, display: 'block' }
