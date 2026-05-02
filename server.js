/**
 * @file server.js
 * @description UKCP Express application entry point.
 *
 * Responsibilities:
 *   - App and middleware wiring
 *   - Route module registration
 *   - Static file serving (Vite dist/)
 *   - MongoDB connection
 *   - Server startup (HTTP or local HTTPS)
 *
 * All route logic lives in routes/. All DB logic lives in db/. All middleware
 * logic lives in middleware/. Adding a new feature domain = add a routes/ file
 * and one app.use() line here.
 *
 * Production: node server.js
 * Local SSL:  generate cert.pem + key.pem in project root (see dex-instructions-local-ssl.md)
 */

import 'dotenv/config'
import express          from 'express'
import cors             from 'cors'
import cookieParser     from 'cookie-parser'
import { createServer as createHttpsServer } from 'https'
import { readFileSync, existsSync }          from 'fs'
import { fileURLToPath }                     from 'url'
import { dirname, join }                     from 'path'

import { connectMongo }                from './db/mongo.js'
import { deviceCookieMiddleware }      from './middleware/deviceCookie.js'
import contentRouter                   from './routes/content.js'
import placesRouter                    from './routes/places.js'
import adminRouter                     from './routes/admin.js'
import authRouter                      from './routes/auth.js'
import profileRouter                   from './routes/profile.js'
import groupsRouter                    from './routes/groups.js'
import postsRouter                     from './routes/posts.js'
import forumsRouter                    from './routes/forums.js'
import communityNetworksRouter         from './routes/communityNetworks.js'
import schoolsRouter                   from './routes/schools.js'
import sessionRouter                   from './routes/session.js'
import followsRouter                   from './routes/follows.js'
import peopleRouter                    from './routes/people.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

const app  = express()
const PORT = process.env.PORT || 3000

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(deviceCookieMiddleware)

// ── Static files ──────────────────────────────────────────────────────────────

app.use(express.static(join(__dirname, 'dist')))

// ── API routes ────────────────────────────────────────────────────────────────

app.use('/api', contentRouter)
app.use('/api', placesRouter)
app.use('/api/admin', adminRouter)
app.use('/api', authRouter)
app.use('/api', profileRouter)
app.use('/api/groups',  groupsRouter)
app.use('/api/posts',   postsRouter)
app.use('/api/forums',  forumsRouter)
app.use('/api/community-networks', communityNetworksRouter)
app.use('/api/schools',           schoolsRouter)
app.use('/api', sessionRouter)
app.use('/api/follows', followsRouter)
app.use('/api/people',  peopleRouter)

// ── SPA catch-all ─────────────────────────────────────────────────────────────
// Any unmatched route returns index.html -- React Router handles client-side nav.

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

// ── Start ─────────────────────────────────────────────────────────────────────

connectMongo().then(() => {
  const certPath = join(__dirname, 'cert.pem')
  const keyPath  = join(__dirname, 'key.pem')

  if (existsSync(certPath) && existsSync(keyPath)) {
    const HTTPS_PORT = process.env.HTTPS_PORT || 3443
    createHttpsServer(
      { cert: readFileSync(certPath), key: readFileSync(keyPath) },
      app
    ).listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`UKCP running on https://localhost:${HTTPS_PORT} (local SSL)`)
    })
  } else {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`UKCP running on http://localhost:${PORT}`)
    })
  }
})
