/**
 * seed-places.js — Seed the MongoDB `places` collection from newplace.csv.
 *
 * Reads public/data/newplace.csv as the source dataset.
 * Reads public/data/place-corrections.json and merges corrections into each row.
 * Drops the existing `places` collection and bulk-inserts all rows in batches.
 * Creates indexes for search and filter operations.
 *
 * Corrected rows are flagged with _corrected: true so the corrections endpoint
 * can identify them after migration.
 *
 * Usage:
 *   node scripts/seed-places.js
 *   MONGODB_URI=mongodb+srv://... node scripts/seed-places.js
 *
 * Run once to establish the collection. After this, server.js reads from Mongo —
 * newplace.csv and place-corrections.json become build artefacts only.
 */

import { MongoClient } from 'mongodb'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

const MONGO_URI        = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'
const CSV_PATH         = join(__dirname, '..', 'public', 'data', 'newplace.csv')
const CORRECTIONS_PATH = join(__dirname, '..', 'public', 'data', 'place-corrections.json')
const BATCH_SIZE       = 1000

const CSV_HEADER = [
  'id', 'name', 'type', 'place_type', 'country', 'country_gss',
  'region', 'region_gss', 'ctyhistnm', 'county_gss',
  'lad_name', 'lad_gss', 'constituency', 'con_gss',
  'ward', 'ward_gss', 'lat', 'lng', 'summary'
]

const EDITABLE_FIELDS = ['place_type', 'summary', 'constituency', 'con_gss', 'ward', 'ward_gss', 'county_gss']

function parseCSVLine(line) {
  const out = []; let cur = ''; let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++ } else q = !q
    } else if (ch === ',' && !q) {
      out.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

async function run() {
  // 1. Parse CSV
  console.log(`[seed] reading ${CSV_PATH}`)
  const src   = readFileSync(CSV_PATH, 'utf8')
  const lines = src.split('\n')
  const rows  = []
  const byId  = new Map()

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = parseCSVLine(line)
    const row  = {}
    CSV_HEADER.forEach((h, j) => { row[h] = cols[j] ?? '' })
    if (!row.id) continue
    rows.push(row)
    byId.set(row.id, row)
  }
  console.log(`[seed] parsed ${rows.length} rows`)

  // 2. Load and apply corrections
  let correctionCount = 0
  if (existsSync(CORRECTIONS_PATH)) {
    const corrections = JSON.parse(readFileSync(CORRECTIONS_PATH, 'utf8'))
    for (const [id, fields] of Object.entries(corrections)) {
      const row = byId.get(id)
      if (!row) {
        console.warn(`[seed] correction for unknown id: ${id} — skipped`)
        continue
      }
      for (const field of EDITABLE_FIELDS) {
        if (fields[field] !== undefined && fields[field] !== null) {
          row[field] = fields[field]
        }
      }
      row._corrected = true
      correctionCount++
    }
    console.log(`[seed] applied ${correctionCount} corrections`)
  } else {
    console.log(`[seed] no corrections file found — skipping`)
  }

  // 3. Build documents (_id = place id)
  const docs = rows.map(row => ({
    _id:          row.id,
    name:         row.name,
    type:         row.type,
    place_type:   row.place_type,
    country:      row.country,
    country_gss:  row.country_gss,
    region:       row.region,
    region_gss:   row.region_gss,
    ctyhistnm:    row.ctyhistnm,
    county_gss:   row.county_gss,
    lad_name:     row.lad_name,
    lad_gss:      row.lad_gss,
    constituency: row.constituency,
    con_gss:      row.con_gss,
    ward:         row.ward,
    ward_gss:     row.ward_gss,
    lat:          row.lat,
    lng:          row.lng,
    summary:      row.summary,
    area:          null,
    elevation:     null,
    website:       null,
    notable_facts: [],
    category_tags: [],
    gather_status: 'none',
    ...(row._corrected ? { _corrected: true } : {}),
  }))

  // 4. Connect and seed
  const client = new MongoClient(MONGO_URI)
  try {
    await client.connect()
    console.log(`[seed] connected to MongoDB`)
    const col = client.db('ukcp').collection('places')

    // Drop existing
    await col.drop().catch(() => { /* collection may not exist — fine */ })
    console.log(`[seed] dropped existing places collection`)

    // Batch insert
    let inserted = 0
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE)
      await col.insertMany(batch, { ordered: false })
      inserted += batch.length
      process.stdout.write(`\r[seed] inserted ${inserted}/${docs.length}`)
    }
    console.log(`\n[seed] all rows inserted`)

    // 5. Create indexes
    console.log(`[seed] creating indexes...`)
    await col.createIndex({ name: 1 })                    // name search (regex)
    await col.createIndex({ country: 1 })                 // country filter
    await col.createIndex({ place_type: 1 })              // type filter
    await col.createIndex({ constituency: 1 })            // missing constituency filter
    await col.createIndex({ county_gss: 1 })              // missing county_gss filter
    await col.createIndex({ summary: 1 })                 // missing summary filter
    await col.createIndex({ _corrected: 1 }, { sparse: true }) // corrections endpoint
    console.log(`[seed] indexes created`)

  } finally {
    await client.close()
  }

  console.log(`[seed] done — ${docs.length} places, ${correctionCount} corrections applied`)
}

run().catch(err => {
  console.error('[seed] failed:', err.message)
  process.exit(1)
})
