/**
 * @file usePlaceFollows.js
 * @description Shared follow state for all geographic/place entities.
 *
 * Uses module-level cache so a single fetch is shared across all consuming
 * components. All instances re-render together when the set changes.
 *
 * entity_type is always 'place' in the follows collection.
 * entity_id is the type:slug key, e.g. 'county:Merseyside', 'constituency:Birkenhead',
 *   'ward:Claughton', 'city:Liverpool', 'town:Bebington'.
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

// Module-level state -- shared across all hook instances in the same session
let _cache     = null   // Set<string> of entity_ids, or null (not loaded)
let _listeners = new Set()

function notify() {
  for (const cb of _listeners) cb()
}

export function usePlaceFollows() {
  const { session } = useAuth()
  const [, tick] = useState(0)

  // Subscribe to cache changes
  useEffect(() => {
    const cb = () => tick(n => n + 1)
    _listeners.add(cb)
    return () => _listeners.delete(cb)
  }, [])

  // (Re)load when session changes
  useEffect(() => {
    if (!session?.access_token) {
      _cache = null
      notify()
      return
    }
    fetch(`${API_BASE}/api/follows?entity_type=place`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(rows => {
        _cache = new Set(rows.map(r => String(r.entity_id)))
        notify()
      })
      .catch(() => {})
  }, [session?.access_token])

  const followedSet = _cache ?? new Set()

  async function follow(entityId, entityName, navPath = null) {
    if (!session?.access_token) return
    // Optimistic update
    _cache = new Set([...followedSet, entityId])
    notify()
    try {
      await fetch(`${API_BASE}/api/follows`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          entity_type: 'place',
          entity_id:   entityId,
          entity_name: entityName,
          nav_path:    navPath ?? null,
        }),
      })
    } catch (_) {
      // Revert on error
      _cache = new Set([...followedSet].filter(id => id !== entityId))
      notify()
    }
  }

  async function unfollow(entityId) {
    if (!session?.access_token) return
    // Optimistic update
    _cache = new Set([...followedSet].filter(id => id !== entityId))
    notify()
    try {
      await fetch(
        `${API_BASE}/api/follows/place/${encodeURIComponent(entityId)}`,
        {
          method:  'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      )
    } catch (_) {
      // Revert on error
      _cache = new Set([...followedSet, entityId])
      notify()
    }
  }

  return {
    followedSet,
    follow,
    unfollow,
    isLoggedIn: !!session?.access_token,
  }
}
