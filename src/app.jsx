/**
 * @file app.jsx
 * @description Root component. Owns routing only.
 * Add routes here as pages are built out.
 * No data fetching, no state, no layout — those belong in pages and components.
 */

import { useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
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
 * "/" is the Locations page (site home). Login form lives at "/login".
 * @returns {JSX.Element}
 */
export default function App() {
  return (
    <>
      <DefaultLandingRedirect />
      <Routes>
        <Route path="/"           element={<Locations />} />
        <Route path="/locations"  element={<Locations />} />
        <Route path="/login"      element={<Home />}      />
        <Route path="/myhome"     element={<MyHome />}    />
        <Route path="/people"     element={<People />}    />
        <Route path="/profile"    element={<Profile />}   />
        <Route path="/register"   element={<Register />}  />
        <Route path="/help"       element={<Help />}      />
        <Route path="/settings"   element={<Settings />}  />
      </Routes>
    </>
  )
}
