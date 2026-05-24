/**
 * @file scripts/seed-geo-groups.js
 * @description Seeds the geo_groups collection with one record per geographic entity.
 *
 * Sources:
 *   1. Nation (UK)         -- single fixed record
 *   2. geo-content.json    -- countries (England/Scotland/Wales/NI), regions, counties (115 total)
 *   3. committees          -- one constituency geo_group per committee (632)
 *   4. places collection   -- all ~54k settlement records (city/town/village/hamlet/suburb)
 *
 * group_key format:
 *   nation:uk
 *   country:{slug}          e.g. country:england
 *   region:{slug}           e.g. region:north-west
 *   county:{slug}           e.g. county:lancashire
 *   constituency:{con_gss}  e.g. constituency:E14001480
 *   ward:{ward_gss}         -- lazy-created on postcode resolution, not seeded here
 *   place:{place_id}        -- all settlements from places collection
 *
 * Safe to re-run: all writes are upserts keyed on group_key.
 *
 * Usage:
 *   node scripts/seed-geo-groups.js
 *   MONGODB_URI=mongodb+srv://... node scripts/seed-geo-groups.js
 */

import 'dotenv/config'
import { readFileSync }   from 'fs'
import { fileURLToPath }  from 'url'
import { dirname, join }  from 'path'
import { MongoClient, ObjectId } from 'mongodb'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'
const GEO_JSON  = join(__dirname, '..', 'public', 'data', 'geo-content.json')
const BATCH     = 500

const slugify = s => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')

async function upsert(col, group_key, doc) {
  await col.updateOne(
    { group_key },
    { $set: doc, $setOnInsert: { created_at: new Date() } },
    { upsert: true }
  )
}

async function bulkUpsert(col, docs) {
  if (!docs.length) return
  const ops = docs.map(d => ({
    updateOne: {
      filter: { group_key: d.group_key },
      update: { $set: d, $setOnInsert: { created_at: new Date() } },
      upsert: true,
    },
  }))
  const result = await col.bulkWrite(ops, { ordered: false })
  return result
}

async function run() {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 15000 })
  await client.connect()
  const label = MONGO_URI.includes('mongodb+srv') ? 'Atlas' : 'local'
  console.log(`Connected to MongoDB (${label})`)

  const db  = client.db('ukcp')
  const col = db.collection('geo_groups')

  // Indexes
  await col.createIndex({ group_key: 1 }, { unique: true })
  await col.createIndex({ tier: 1 })
  await col.createIndex({ gss: 1 }, { sparse: true })
  console.log('geo_groups: indexes ready')

  let total = 0

  // ── 1. Nation: UK ──────────────────────────────────────────────────────────
  await upsert(col, 'nation:uk', {
    group_key:        'nation:uk',
    tier:             'nation',
    label:            'United Kingdom',
    geo_type:         'place',
    gss:              'K02000001',
    geo_content_key:  'country:United_Kingdom',
    committee_id:     null,
    place_id:         null,
    origin:           'systemic',
  })
  total++
  console.log('nation:uk seeded')

  // ── 2. geo-content.json: countries, regions, counties ─────────────────────
  const geoContent = JSON.parse(readFileSync(GEO_JSON, 'utf8'))
  const geoDocs = []

  for (const [key, entry] of Object.entries(geoContent)) {
    const [rawTier, rawSlug] = key.split(':')
    if (!entry.name) continue

    // Skip United Kingdom -- handled above as nation:uk
    if (rawSlug === 'United_Kingdom') continue

    const tier = rawTier  // country | region | county
    const group_key = `${tier}:${slugify(entry.name)}`

    geoDocs.push({
      group_key,
      tier,
      label:           entry.name,
      geo_type:        'place',
      gss:             entry._qid ?? null,
      geo_content_key: key,
      committee_id:    null,
      place_id:        null,
      origin:          'systemic',
    })
  }

  await bulkUpsert(col, geoDocs)
  total += geoDocs.length
  console.log(`geo-content: ${geoDocs.length} records seeded (countries/regions/counties)`)

  // ── 3. Constituencies from committees collection ───────────────────────────
  const committees = db.collection('committees')
  const allCommittees = await committees.find(
    { con_gss: { $exists: true, $ne: null } },
    { projection: { _id: 1, name: 1, con_gss: 1 } }
  ).toArray()

  const conDocs = allCommittees.map(c => ({
    group_key:       `constituency:${c.con_gss}`,
    tier:            'constituency',
    label:           c.name,
    geo_type:        'civic',
    gss:             c.con_gss,
    geo_content_key: null,
    committee_id:    c._id,
    place_id:        null,
    origin:          'systemic',
  }))

  await bulkUpsert(col, conDocs)
  total += conDocs.length
  console.log(`constituencies: ${conDocs.length} records seeded`)

  // ── 4. Places collection -- all settlements ────────────────────────────────
  const places = db.collection('places')
  const cursor  = places.find(
    {},
    { projection: { _id: 1, name: 1, place_type: 1 } }
  )

  let batch = []
  let placeCount = 0

  while (await cursor.hasNext()) {
    const p = await cursor.next()
    if (!p.name || !p.place_type) continue

    batch.push({
      group_key:       `place:${p._id.toString()}`,
      tier:            (p.place_type ?? 'place').toLowerCase(),
      label:           p.name,
      geo_type:        'place',
      gss:             null,
      geo_content_key: null,
      committee_id:    null,
      place_id:        p._id,
      origin:          'systemic',
    })

    if (batch.length >= BATCH) {
      await bulkUpsert(col, batch)
      placeCount += batch.length
      process.stdout.write(`\rplaces: ${placeCount} upserted...`)
      batch = []
    }
  }
  if (batch.length) {
    await bulkUpsert(col, batch)
    placeCount += batch.length
  }

  total += placeCount
  console.log(`\nplaces: ${placeCount} records seeded`)
  console.log(`\nDone. Total geo_groups records upserted: ${total}`)

  await client.close()
}

run().catch(e => { console.error(e); process.exit(1) })
