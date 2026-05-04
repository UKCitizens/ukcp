/**
 * @file App.jsx
 * @description Root component. Owns routing only.
 *
 * Auth is handled by LoginModal -- a Mantine Modal overlay that shows when
 * there is no active session. No redirect-to-login pattern. Users stay on
 * their current route; the modal closes automatically on SIGNED_IN.
 *
 * RequireAuth renders null (not a redirect) while auth resolves or when
 * there is no session -- the modal handles the gate visually.
 */

import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth }    from './context/AuthContext.jsx'
import LoginModal     from './components/LoginModal.jsx'
import Locations      from './pages/Locations.jsx'
import MyHome         from './pages/MyHome.jsx'
import People         from './pages/People.jsx'
import Profile        from './pages/Profile.jsx'
import Register       from './pages/Register.jsx'
import Help           from './pages/Help.jsx'
import Settings       from './pages/Settings.jsx'

/**
 * Renders children only when a session is active. Returns null otherwise --
 * LoginModal handles the visual gate, so no redirect is needed.
 */
function RequireAuth({ children }) {
  const { session, loading, claims } = useAuth()
  const location = useLocation()

  if (loading || !session) return null

  // New user gate: force profile completion before accessing any route.
  // /profile itself is exempt to avoid a redirect loop.
  if (!claims.registration_complete && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />
  }

  return children
}

/**
 * Routes a logged-in user to their preferred landing page on first paint
 * if they arrived at "/" or "/locations" with no specific intent.
 */
function DefaultLandingRedirect() {
  const { profile, loading } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const fired     = useRef(false)

  useEffect(() => {
    if (loading || fired.current) return
    if (location.pathname !== '/' && location.pathname !== '/locations') return
    const pref = profile?.user?.preferences?.default_load_page
    if (pref === 'myhome') {
      fired.current = true
      navigate('/myhome', { replace: true })
    }
  }, [loading, profile, location.pathname, navigate])

  return null
}

export default function App() {
  return (
    <>
      <LoginModal />
      <DefaultLandingRedirect />
      <Routes>
        <Route path="/login"     element={<Navigate to="/" replace />} />
        <Route path="/register"  element={<Register />} />
        <Route path="/"          element={<RequireAuth><Locations /></RequireAuth>} />
        <Route path="/locations" element={<RequireAuth><Locations /></RequireAuth>} />
        <Route path="/myhome"    element={<RequireAuth><MyHome /></RequireAuth>}    />
        <Route path="/people"    element={<RequireAuth><People /></RequireAuth>}    />
        <Route path="/profile"   element={<RequireAuth><Profile /></RequireAuth>}   />
        <Route path="/help"      element={<RequireAuth><Help /></RequireAuth>}      />
        <Route path="/settings"  element={<RequireAuth><Settings /></RequireAuth>}  />
      </Routes>
    </>
  )
}
