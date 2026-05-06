/**
 * @file routes/pipeline.js
 * @description Localhost-only pipeline endpoints. No auth -- localhost access only.
 *
 * PATCH /api/pipeline/geo-content/:key -- updates geo-content.json from manifest record.
 *   Body: { field: string, value: string }
 */

import { Router }                                  from 'express'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath }                           from 'url'
import { dirname, join }                           from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const ROOT_DIR   = join(__dirname, '..')

const GEO_CONTENT_SRC  = join(ROOT_DIR, 'public', 'data', 'geo-content.json')
const GEO_CONTENT_DIST = join(ROOT_DIR, 'dist',   'data', 'geo-content.json')

const router = Router()

/** Localhost-only guard. */
const requireLocalhost = (req, res, next) => {
  const ip = req.ip ?? req.connection?.remoteAddress ?? ''
  const clean = ip.replace('::ffff:', '')
  if (clean === '127.0.0.1' || clean === '::1') return next()
  return res.status(403).json({ error: 'Local access only' })
}

router.use(requireLocalhost)

// PATCH /api/pipeline/geo-content/:key
router.patch('/geo-content/:key', (req, res) => {
  const { key } = req.params
  const { field, value } = req.body ?? {}

  if (!field || value === undefined) {
    return res.status(400).json({ error: 'field and value required' })
  }
  try {
    if (!existsSync(GEO_CONTENT_SRC)) {
      return res.status(500).json({ error: 'geo-content.json not found' })
    }
    const content = JSON.parse(readFileSync(GEO_CONTENT_SRC, 'utf8'))
    if (!content[key]) {
      return res.status(404).json({ error: `Key not found: ${key}` })
    }
    content[key][field] = value
    const json = JSON.stringify(content, null, 2)
    writeFileSync(GEO_CONTENT_SRC, json, 'utf8')
    if (existsSync(GEO_CONTENT_DIST)) writeFileSync(GEO_CONTENT_DIST, json, 'utf8')
    console.log(`[pipeline] geo-content updated: ${key} -> ${field}`)
    return res.json({ ok: true, key, field })
  } catch (e) {
    console.error('[pipeline] patch error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

export default router
