/**
 * seed-geo-content.js — One-shot seed from public/data/geo-content.json into MongoDB geo_content.
 *
 * Run once to populate the collection with existing curated data.
 * Uses insertMany with ordered:false — skips duplicate slugs, reports count inserted.
 *
 * Usage: node scripts/seed-geo-content.js
 */

import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

const MONGO_URI     = process.env.MONGO_URI ?? 'mongodb://localhost:27017'
const GEO_JSON_PATH = join(__dirname, '..', 'public', 'data', 'geo-content.json')

// Maps geo-content.json f-fields to the geo_content document schema.
// f3 is the display summary; seed_text is the longer Wikipedia-sourced text.
// f1 is a local asset path (flag image) — stored as thumbnail.
function mapDocument(key, raw) {
  const [typePrefix, ...slugParts] = key.split(':')
  const slug = slugParts.join(':')

  // Only seed types we recognise in the schema
  const VALID_TYPES = new Set(['country', 'region', 'county', 'city', 'town', 'village', 'hamlet', 'constituency', 'ward'])
  if (!VALID_TYPES.has(typePrefix)) return null

  return {
    type:      typePrefix,
    slug,
    name:      raw.name ?? slug,
    summary:   raw.f3 ?? null,
    extract:   raw.seed_text ?? null,
    thumbnail: raw.f1 ?? null,
    wikiUrl:   null,
    geoData: {
      motto:       raw.f4  ?? null,
      area:        raw.f5  ?? null,
      politics:    raw.f6  ?? null,
      economic:    raw.f7  ?? null,
      cultural:    raw.f8  ?? null,
      history:     raw.f10 ?? null,
      website:     raw.f13 ?? null,
      environment: raw.f14 ?? null,
    },
    updatedAt: new Date(),
  }
}

async function seed() {
  const client = new MongoClient(MONGO_URI)

  try {
    await client.connect()
    console.log('Connected to MongoDB')

    const col = client.db('ukcp').collection('geo_content')
    await col.createIndex({ type: 1, slug: 1 }, { unique: true })

    const raw     = JSON.parse(readFileSync(GEO_JSON_PATH, 'utf8'))
    const docs    = Object.entries(raw).map(([key, val]) => mapDocument(key, val)).filter(Boolean)

    console.log(`Mapped ${docs.length} documents from geo-content.json`)

    if (docs.length === 0) {
      console.log('Nothing to insert.')
      return
    }

    // ordered:false — continues past duplicates, reports partial success
    let inserted = 0
    let skipped  = 0
    try {
      const result = await col.insertMany(docs, { ordered: false })
      inserted = result.insertedCount
    } catch (err) {
      // BulkWriteError: some inserted, some were duplicate key errors
      if (err.code === 65 || err.writeErrors) {
        inserted = err.result?.nInserted ?? 0
        skipped  = err.writeErrors?.length ?? 0
      } else {
        throw err
      }
    }

    console.log(`Done — inserted: ${inserted}, skipped (duplicates): ${skipped}`)
  } finally {
    await client.close()
  }
}

seed().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
