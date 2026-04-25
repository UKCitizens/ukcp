/**
 * export-places.js — Regenerate newplace.csv from the MongoDB `places` collection.
 *
 * Reads all documents from the `places` collection (Mongo is master post-migration).
 * Writes the full dataset to public/data/newplace.csv.
 * Run before `npm run build` to ensure the deployed CSV reflects the current state of Mongo.
 *
 * Usage:
 *   node scripts/export-places.js
 *   MONGODB_URI=mongodb+srv://... node scripts/export-places.js
 */

import { MongoClient } from 'mongodb'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'
const CSV_PATH  = join(__dirname, '..', 'public', 'data', 'newplace.csv')

const CSV_HEADER = [
  'id', 'name', 'type', 'place_type', 'country', 'country_gss',
  'region', 'region_gss', 'ctyhistnm', 'county_gss',
  'lad_name', 'lad_gss', 'constituency', 'con_gss',
  'ward', 'ward_gss', 'lat', 'lng', 'summary'
]

function csvField(val) {
  const s = String(val ?? '')
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? `"${s.replace(/"/g, '""')}"` : s
}

async function run() {
  const client = new MongoClient(MONGO_URI)
  try {
    await client.connect()
    console.log(`[export] connected to MongoDB`)

    const col  = client.db('ukcp').collection('places')
    const docs = await col.find({}).sort({ _id: 1 }).toArray()
    console.log(`[export] fetched ${docs.length} documents`)

    const lines = [CSV_HEADER.join(',')]
    for (const doc of docs) {
      // Map _id back to id; skip internal Mongo fields (_corrected etc)
      const row = { ...doc, id: doc._id }
      lines.push(CSV_HEADER.map(h => csvField(row[h] ?? '')).join(','))
    }
    const out = lines.join('\n') + '\n'
    writeFileSync(CSV_PATH, out, 'utf8')
    console.log(`[export] written → ${CSV_PATH}`)
    console.log(`[export] done — ${docs.length} rows`)
  } finally {
    await client.close()
  }
}

run().catch(err => {
  console.error('[export] failed:', err.message)
  process.exit(1)
})
