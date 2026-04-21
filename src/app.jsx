/**
 * @file app.jsx
 * @description Root component. Owns routing only.
 * Add routes here as pages are built out.
 * No data fetching, no state, no layout — those belong in pages and components.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home        from './pages/Home.jsx'
import Locations   from './pages/Locations.jsx'
import MyHome      from './pages/MyHome.jsx'
import MyVote      from './pages/MyVote.jsx'
import Profile     from './pages/Profile.jsx'
import Help        from './pages/Help.jsx'
import Settings    from './pages/Settings.jsx'

/**
 * App root — declares all client-side routes.
 * @returns {JSX.Element}
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"           element={<Home />}      />
        <Route path="/locations"  element={<Locations />} />
        <Route path="/myhome"     element={<MyHome />}    />
        <Route path="/myvote"     element={<MyVote />}    />
        <Route path="/profile"    element={<Profile />}   />
        <Route path="/help"       element={<Help />}      />
        <Route path="/settings"   element={<Settings />}  />
      </Routes>
    </BrowserRouter>
  )
}
