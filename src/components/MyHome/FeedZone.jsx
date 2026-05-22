/**
 * @file FeedZone.jsx
 * @description Mid-pane feed for MyHome.
 *
 * All mode (feedContext null): fetches /api/myhome/feed with FeedControls filters.
 * Specific mode (feedContext set): fetches /api/posts for that entity, maps to envelope.
 *
 * Props:
 *   feedContext — { entity_type, entity_id, entity_name } or null
 *   reach       — 'ward'|'constituency'|'county'|'region'|'national' -- drives scope param in All mode
 */

import { useState, useEffect, useCallback } from 'react'
import { Stack, Text }  from '@mantine/core'
import { useAuth }      from '../../context/AuthContext.jsx'
import FeedControls     from './FeedControls.jsx'
import PostFeedCard     from './PostFeedCard.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

function postToEnvelope(post, entityName) {
  return {
    feed_type:   'post',
    entity_type: post.origin?.entity_type ?? '',
    entity_id:   post.origin?.entity_id   ?? '',
    entity_name: post.origin?.entity_name ?? entityName ?? post.origin?.entity_id ?? '',
    timestamp:   post.created_at,
    summary:     (post.body ?? '').slice(0, 120),
    scope:       post.reach_effective,
    payload: {
      post_type:    post.post_type,
      body:         (post.body ?? '').slice(0, 200),
      author_name:  post.author?.is_anonymous ? 'Anonymous' : (post.author?.display_name ?? 'Unknown'),
      is_anonymous: post.author?.is_anonymous ?? false,
      reach:        post.reach_effective,
      reactions:    post.reactions ?? {},
    },
  }
}

/** @returns {JSX.Element} */
export default function FeedZone({ feedContext, reach }) {
  const { session } = useAuth()
  const [items,        setItems]        = useState([])
  const [loading,      setLoading]      = useState(false)
  const [typeOptions,  setTypeOptions]  = useState([])
  const [filterParams, setFilterParams] = useState({ types: null, since: null })

  const headers = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {}

  const fetchAllFeed = useCallback(async (fp, reachOverride) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: 1, limit: 20 })
      if (fp.since)               params.set('since', fp.since)
      // reach from parent takes precedence; 'national' means no scope filter
      const scopeVal = reachOverride ?? reach
      if (scopeVal && scopeVal !== 'national') params.set('scope', scopeVal)
      if (fp.types?.length)       params.set('types', fp.types.join(','))
      const res  = await fetch(`${API_BASE}/api/myhome/feed?${params}`, { headers })
      const data = res.ok ? await res.json() : null
      if (data) {
        setItems(data.items ?? [])
        setTypeOptions(data.types_present ?? [])
      }
    } catch (_) {}
    setLoading(false)
  }, [session])

  const fetchEntityFeed = useCallback(async (ctx) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ entity_type: ctx.entity_type, entity_id: ctx.entity_id, limit: 20 })
      const res  = await fetch(`${API_BASE}/api/posts?${params}`, { headers })
      const data = res.ok ? await res.json() : null
      if (data) setItems((data.posts ?? []).map(p => postToEnvelope(p, ctx.entity_name)))
    } catch (_) {}
    setLoading(false)
  }, [session])

  useEffect(() => {
    if (!session?.access_token) return
    if (feedContext) {
      fetchEntityFeed(feedContext)
    } else {
      // Pass reach explicitly -- fetchAllFeed closure may not have the latest value
      fetchAllFeed(filterParams, reach)
    }
  }, [feedContext, session, reach])

  function handleFilter(fp) {
    setFilterParams(fp)
    fetchAllFeed(fp, reach)
  }

  async function handleUnfollow(entityType, entityId) {
    if (!session?.access_token) return
    await fetch(`${API_BASE}/api/follows/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    fetchAllFeed(filterParams)
  }

  if (loading) return <Text size="sm" c="dimmed">Loading...</Text>

  return (
    <Stack gap="xs">
      {!feedContext && (
        <FeedControls typeOptions={typeOptions} onFilter={handleFilter} />
      )}

      {items.length === 0
        ? <Text size="sm" c="dimmed">Nothing posted here yet.</Text>
        : items.map((item, i) => (
            <PostFeedCard
              key={`${item.entity_type}:${item.entity_id}:${item.timestamp}:${i}`}
              item={item}
              onUnfollow={feedContext ? null : handleUnfollow}
            />
          ))
      }
    </Stack>
  )
}
