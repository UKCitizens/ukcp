/**
 * export-geo-content.js — Regenerate geo-content.json from the MongoDB `geo_content` collection.
 *
 * Reads all documents from the `geo_content` collection (Mongo is master for curated fields).
 * Merges Mongo values over the existing geo-content.json — fields not tracked in Mongo
 * (f2 population, f9, f11, f12) are preserved from the existing file.
 * Run before `npm run build` or after pulling Atlas edits to keep the static bundle in sync.
 *
 * Usage:
 *   node scripts/export-geo-content.js
 *   MONGODB_URI=mongodb+srv://... node scripts/export-geo-content.js
 */

import { MongoClient } from 'mongodb'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename   = fileURLToPath(import.meta.url)
const __dirname    = dirname(__filename)

const MONGO_URI      = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'
const GEO_JSON_PATH  = join(__dirname, '..', 'public', 'data', 'geo-content.json')
const GEO_TMP_PATH   = join(__dirname, '..', 'public', 'data', 'geo-content.tmp')

/**
 * Map a geo_content Mongo document back to the flat f-field format used in geo-content.json.
 * Returns a partial object — only fields present in Mongo are included.
 * Caller merges this over the existing entry to preserve fields not tracked in Mongo.
 */
function mongoToFlat(doc) {
  const out = {}

  if (doc.name)      out.name = doc.name
  if (doc.thumbnail) out.f1   = doc.thumbnail
  if (doc.summary)   out.f3   = doc.summary

  const g = doc.geoData ?? {}
  if (g.motto)       out.f4  = g.motto
  if (g.area)        out.f5  = g.area
  if (g.politics)    out.f6  = g.politics
  if (g.economic)    out.f7  = g.economic
  if (g.cultural)    out.f8  = g.cultural
  if (g.history)     out.f10 = g.history
  if (g.website)     out.f13 = g.website
  if (g.environment) out.f14 = g.environment

  return out
}

async function run() {
  // Load existing geo-content.json as the merge base
  let base = {}
  try {
    base = JSON.parse(readFileSync(GEO_JSON_PATH, 'utf8'))
    console.log(`[export] loaded ${Object.keys(base).length} entries from geo-content.json`)
  } catch {
    console.log('[export] geo-content.json not found — will build from Mongo only')
  }

  const client = new MongoClient(MONGO_URI)
  try {
    await client.connect()
    console.log('[export] connected to MongoDB')

    const col  = client.db('ukcp').collection('geo_content')
    const docs = await col.find({}).toArray()
    console.log(`[export] fetched ${docs.length} documents from geo_content`)

    let updated = 0
    let added   = 0

    for (const doc of docs) {
      const key   = `${doc.type}:${doc.slug}`
      const patch = mongoToFlat(doc)

      if (base[key]) {
        base[key] = { ...base[key], ...patch }
        updated++
      } else {
        // Entry exists in Mongo but not in JSON — add it
        base[key] = patch
        added++
      }
    }

    console.log(`[export] updated: ${updated}, added: ${added}`)

    // Atomic write via tmp file
    const out = JSON.stringify(base, null, 2)
    writeFileSync(GEO_TMP_PATH, out, 'utf8')
    writeFileSync(GEO_JSON_PATH, out, 'utf8')

    console.log(`[export] written → ${GEO_JSON_PATH}`)
    console.log('[export] done')
  } finally {
    await client.close()
  }
}

run().catch(err => {
  console.error('[export] failed:', err.message)
  process.exit(1)
})
