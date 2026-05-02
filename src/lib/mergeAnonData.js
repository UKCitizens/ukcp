/**
 * @file lib/mergeAnonData.js
 * @description On a genuine sign-in, merge any anon localStorage state into
 * the user's server-side records.
 *
 *   ukcp_session_snapshot  -> PATCH /api/session/snapshot
 *   ukcp_saves             -> POST  /api/follows (one per save, parallel)
 *
 * Called from AuthContext when the SIGNED_IN event fires, before session is
 * propagated to consumers — this guarantees that downstream hooks (notably
 * useSessionSnapshot) read the merged state, not the pre-merge state.
 *
 * Errors are swallowed: a merge failure must not block the user from logging in.
 * On success, the localStorage keys are cleared so reload does not double-merge.
 */

const API_BASE  = import.meta.env.VITE_API_URL ?? ''
const SNAP_KEY  = 'ukcp_session_snapshot'
const SAVES_KEY = 'ukcp_saves'

export async function mergeAnonData(accessToken) {
  if (!accessToken) return

  const headers = {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${accessToken}`,
  }

  const snap = localStorage.getItem(SNAP_KEY)
  if (snap) {
    try {
      await fetch(`${API_BASE}/api/session/snapshot`, {
        method: 'PATCH',
        headers,
        body:   snap,
      })
      localStorage.removeItem(SNAP_KEY)
    } catch {}
  }

  try {
    const saves = JSON.parse(localStorage.getItem(SAVES_KEY) ?? '[]')
    if (saves.length) {
      await Promise.all(saves.map(save =>
        fetch(`${API_BASE}/api/follows`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            entity_type: save.entity_type,
            entity_id:   save.entity_id,
            entity_name: save.entity_name,
            scope_gss:   save.scope_gss,
            followed_at: save.saved_at,
          }),
        }).catch(() => {})
      ))
      localStorage.removeItem(SAVES_KEY)
    }
  } catch {}
}
