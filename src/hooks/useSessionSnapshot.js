/**
 * @file useSessionSnapshot.js
 * @description Persist app session state across reloads.
 *
 *   Logged-in users:  GET / PATCH /api/session/snapshot (Bearer auth, debounced 500ms)
 *   Anon users:       localStorage key 'ukcp_session_snapshot' (same shape)
 *
 * On mount (once auth has resolved): fetches the snapshot and calls onRestore
 * with the stored doc (or null). Subsequent state changes write a fresh
 * snapshot — debounced 500ms to avoid hammering the API on every keystroke or
 * navigation tick.
 *
 * onRestore is captured in a ref so consumers may pass an inline callback
 * without retriggering the load effect.
 *
 * Restore fires exactly once per mount — guarded by a ref so a session change
 * (e.g. login/logout mid-session) does not overwrite freshly applied state.
 */

import { useEffect, useRef, useState } from 'react'

const API_BASE    = import.meta.env.VITE_API_URL ?? ''
const LS_KEY      = 'ukcp_session_snapshot'
const DEBOUNCE_MS = 500

/**
 * @param {object}   args
 * @param {object}   args.session   — Supabase session ({ access_token } when logged in, else null)
 * @param {boolean}  args.loading   — true while AuthContext is resolving initial state
 * @param {object}   args.snapshot  — current state to persist (any shape)
 * @param {Function} args.onRestore — called once on mount with the stored snapshot or null
 *
 * @returns {{ ready: boolean }} ready flips true once the initial restore has
 *   resolved (whether from API, localStorage, or null). Consumers should gate
 *   user input on this — clicks made before ready are silently dropped from
 *   persistence because the write effect refuses to fire pre-restore (it
 *   would race with the restore fetch).
 */
export function useSessionSnapshot({ session, loading, snapshot, onRestore }) {
  const [ready, setReady] = useState(false)
  const timer             = useRef(null)
  const restored          = useRef(false)
  const onRestoreRef      = useRef(onRestore)

  useEffect(() => { onRestoreRef.current = onRestore }, [onRestore])

  const accessToken = session?.access_token ?? null

  // ── Load once after auth resolves ─────────────────────────────────────────
  useEffect(() => {
    if (restored.current) return
    if (loading)          return

    if (accessToken) {
      restored.current = true
      fetch(`${API_BASE}/api/session/snapshot`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { onRestoreRef.current?.(data) })
        .catch(() => {})
        .finally(() => { setReady(true) })
    } else {
      restored.current = true
      try {
        const raw = localStorage.getItem(LS_KEY)
        onRestoreRef.current?.(raw ? JSON.parse(raw) : null)
      } catch {
        onRestoreRef.current?.(null)
      }
      setReady(true)
    }
  }, [accessToken, loading])

  // ── Write debounced ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!snapshot)        return
    if (!restored.current) return  // do not write before initial restore

    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (accessToken) {
        fetch(`${API_BASE}/api/session/snapshot`, {
          method:  'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${accessToken}`,
          },
          body: JSON.stringify(snapshot),
        }).catch(() => {})
      } else {
        try { localStorage.setItem(LS_KEY, JSON.stringify(snapshot)) } catch {}
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer.current)
  }, [snapshot, accessToken])

  return { ready }
}
