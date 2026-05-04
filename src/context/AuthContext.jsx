/**
 * @file AuthContext.jsx
 * @description Authentication context. Wraps the app and provides useAuth().
 *
 * Listens to Supabase auth state changes. On sign-in, calls GET /api/profile
 * to retrieve (or trigger creation of) the MongoDB user record.
 *
 * Exposes: { session, user, claims, profile, loading, signOut }
 * - session: raw Supabase session (has access_token)
 * - user:    raw Supabase user object
 * - claims:  normalised platform claims from Supabase app_metadata
 *            ({ platform_role, affiliated_roles, display_name, registration_complete }).
 *            Server-controlled -- the JWT carries these, written via the
 *            admin PUT /api/admin/users/:id/claims endpoint.
 * - profile: MongoDB profile record (display_name, tier, home location etc.)
 * - loading: true while initial auth state is being resolved
 * - signOut: function
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { mergeAnonData } from '../lib/mergeAnonData.js'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const DEFAULT_CLAIMS = {
  platform_role:         'citizen',
  affiliated_roles:      [],
  display_name:          '',
  registration_complete: false,
}

/**
 * Build a normalised claims object from a Supabase session. Returns defaults
 * for an anon (null session) so consumers can read claims.platform_role
 * unconditionally. Mirrors the shape produced server-side in middleware/auth.js.
 */
function claimsFromSession(session) {
  const meta = session?.user?.app_metadata
  if (!meta) return DEFAULT_CLAIMS
  return {
    platform_role:         meta.platform_role         ?? 'citizen',
    affiliated_roles:      Array.isArray(meta.affiliated_roles) ? meta.affiliated_roles : [],
    display_name:          meta.display_name          ?? '',
    registration_complete: meta.registration_complete ?? false,
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user,    setUser]    = useState(null)
  const [claims,  setClaims]  = useState(DEFAULT_CLAIMS)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(accessToken) {
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      }
    } catch (err) {
      console.error('[auth] profile fetch failed:', err.message)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setClaims(claimsFromSession(session))
      if (session?.access_token) fetchProfile(session.access_token)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Genuine sign-in: merge any anon localStorage state into the user
        // record before propagating session downstream. This guarantees the
        // snapshot hook will read merged state, not pre-merge state.
        // INITIAL_SESSION (page reload with existing session) and
        // TOKEN_REFRESHED never trigger merge.
        if (event === 'SIGNED_IN' && session?.access_token) {
          await mergeAnonData(session.access_token)
        }
        setSession(session)
        setUser(session?.user ?? null)
        setClaims(claimsFromSession(session))
        if (session?.access_token) {
          fetchProfile(session.access_token)
        } else {
          setProfile(null)
        }

        // Navigation on sign-in is handled by LoginModal closing (session
        // becomes non-null, RequireAuth renders children). No navigate call
        // needed here -- the user is already on the correct route.
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setClaims(DEFAULT_CLAIMS)
  }

  return (
    <AuthContext.Provider value={{ session, user, claims, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
