/**
 * @file app.jsx
 * @description Root component. Owns routing only.
 * Add routes here as pages are built out.
 * No data fetching, no state, no layout — those belong in pages and components.
 */

import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Home        from './pages/Home.jsx'
import Locations   from './pages/Locations.jsx'
import MyHome      from './pages/MyHome.jsx'
import People      from './pages/People.jsx'
import Profile     from './pages/Profile.jsx'
import Register    from './pages/Register.jsx'
import Help        from './pages/Help.jsx'
import Settings    from './pages/Settings.jsx'

/**
 * Guards protected routes. Unauthenticated users are redirected to /login.
 * Stores the intended path in sessionStorage so Home.jsx can restore it post-login.
 * Returns null while auth is resolving to avoid a flash redirect.
 */
function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return null

  if (!session) {
    sessionStorage.setItem('ukcp_login_redirect', location.pathname)
    return <Navigate to="/login" replace />
  }

  return children
}

/**
 * Routes a logged-in user to their preferred landing page on first paint
 * if they arrived at "/" or "/locations" with no specific intent. Fires once
 * per mount; never overrides an explicit click into a different route.
 */
function DefaultLandingRedirect() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const fired = useRef(false)

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

/**
 * App root — declares all client-side routes.
 * "/login" is the entry point. All other routes are protected by RequireAuth.
 * @returns {JSX.Element}
 */
export default function App() {
  return (
    <>
      <DefaultLandingRedirect />
      <Routes>
        <Route path="/login"     element={<Home />}     />
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
