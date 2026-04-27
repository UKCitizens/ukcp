/**
 * @file AuthContext.jsx
 * @description Authentication context. Wraps the app and provides useAuth().
 *
 * Listens to Supabase auth state changes. On sign-in, calls GET /api/profile
 * to retrieve (or trigger creation of) the MongoDB user record.
 *
 * Exposes: { session, user, profile, loading, signOut }
 * - session: raw Supabase session (has access_token)
 * - user:    raw Supabase user object
 * - profile: MongoDB profile record (display_name, tier, home location etc.)
 * - loading: true while initial auth state is being resolved
 * - signOut: function
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user,    setUser]    = useState(null)
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
      if (session?.access_token) fetchProfile(session.access_token)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.access_token) {
          fetchProfile(session.access_token)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
