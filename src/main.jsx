/**
 * main.jsx — React application entry point.
 * Mounts the App component into #root with MantineProvider.
 *
 * BrowserRouter is hoisted above AuthProvider so AuthContext can call
 * useNavigate() for post-login redirects (Section 4).
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { theme } from './theme/theme.js'
import App from './app.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { UserStateProvider } from './context/UserStateContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <BrowserRouter>
        <AuthProvider>
          <UserStateProvider>
            <App />
          </UserStateProvider>
        </AuthProvider>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
)
