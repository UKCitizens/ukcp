/**
 * @file scripts/seed-committees.js
 * @description Seeds the committees collection with one record per UK constituency.
 * Parses public/data/newplace.csv, extracts unique constituencies by con_gss,
 * and bulk-inserts committee documents into MongoDB.
 *
 * Safe to re-run: indexes are idempotent. Duplicate slugs/con_gss are skipped.
 *
 * Usage:
 *   node scripts/seed-committees.js
 *   MONGODB_URI=mongodb+srv://... node scripts/seed-committees.js
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { MongoClient } from 'mongodb'
import Papa from 'papaparse'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'
const CSV_PATH = join(__dirname, '..', 'public', 'data', 'newplace.csv')
const BATCH_SIZE = 100

/**
 * Generate a URL-safe slug from a constituency name.
 * @param {string} name
 * @returns {string}
 */
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Generate a location_scope slug: spaces -> underscores, commas and case preserved.
 * Matches the existing platform convention for client-side group lookups.
 * @param {string} name
 * @returns {string}
 */
function toLocationSlug(name) {
  return name.replace(/\s+/g, '_')
}

async function run() {
  // ── Parse CSV ──────────────────────────────────────────────────────────────
  const csv = readFileSync(CSV_PATH, 'utf8')
  const { data, errors } = Papa.parse(csv, { header: true, skipEmptyLines: true })

  if (errors.length > 0) {
    console.warn(`CSV parse warnings: ${errors.length}`)
  }

  const seen = new Map()
  let csvSkipped = 0

  for (const row of data) {
    const { constituency, con_gss, region, region_gss, country } = row
    if (!constituency || !con_gss) {
      csvSkipped++
      continue
    }
    if (!seen.has(con_gss)) {
      seen.set(con_gss, { constituency, con_gss, region: region ?? '', region_gss: region_gss ?? '', country: country ?? '' })
    }
  }

  console.log(`CSV parsed. Rows: ${data.length}. Unique constituencies: ${seen.size}. Rows without constituency/con_gss: ${csvSkipped}`)

  // ── MongoDB ────────────────────────────────────────────────────────────────
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  await client.connect()
  console.log(`Connected to MongoDB: ${MONGO_URI.includes('mongodb+srv') ? 'Atlas' : 'local'}`)

  const db = client.db('ukcp')
  const col = db.collection('committees')

  // ── Indexes ────────────────────────────────────────────────────────────────
  await col.createIndex({ slug: 1 }, { unique: true, background: true })
  await col.createIndex({ con_gss: 1 }, { unique: true, background: true })
  await col.createIndex({ 'location_scope.type': 1, 'location_scope.slug': 1 }, { background: true })
  await col.createIndex({ tier: 1 }, { background: true })
  await col.createIndex({ country: 1 }, { background: true })
  await col.createIndex({ region_gss: 1 }, { background: true })
  console.log('committees: indexes created')

  // ── Build documents ────────────────────────────────────────────────────────
  const now = new Date()
  const docs = []

  for (const { constituency, con_gss, region, region_gss, country } of seen.values()) {
    docs.push({
      name:                 constituency,
      slug:                 toSlug(constituency),
      description:          'Constituency committee for ' + constituency,
      founder_user_ref:     null,
      membership_model:     'closed',
      status:               'active',
      location_scope:       { type: 'constituency', slug: toLocationSlug(constituency) },
      tier:                 'constituency',
      parent_committee_ref: null,
      jurisdiction:         constituency,
      term_start:           null,
      term_end:             null,
      committee_forum_ref:  null,
      con_gss,
      region,
      region_gss,
      country,
      mp_name:              null,
      mp_party:             null,
      mp_party_colour:      null,
      mp_thumbnail:         null,
      created_at:           now,
      updated_at:           now,
    })
  }

  // ── Bulk insert in batches ─────────────────────────────────────────────────
  let inserted = 0
  let skipped = 0

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE)
    try {
      const result = await col.insertMany(batch, { ordered: false })
      inserted += result.insertedCount
    } catch (err) {
      // BulkWriteError from duplicate key violations -- collect what did insert
      if (err.code === 11000 && err.result) {
        inserted += err.result.nInserted ?? 0
        skipped += batch.length - (err.result.nInserted ?? 0)
      } else {
        throw err
      }
    }
  }

  console.log(`committees: ${inserted} inserted, ${skipped} skipped (duplicates), ${docs.length} total processed`)

  await client.close()
  console.log('Done.')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
