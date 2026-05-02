/**
 * @file scripts/seed-schools.js
 * @description Seeds England schools from GIAS CSV into MongoDB schools collection.
 * Run: node --env-file=.env scripts/seed-schools.js
 * Source: Ali/schools.csv (latin-1, 51,497 rows, ~27k open schools)
 */

import { createReadStream } from 'fs'
import { fileURLToPath }    from 'url'
import { dirname, join }    from 'path'
import { createInterface }  from 'readline'
import { MongoClient }      from 'mongodb'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV_PATH  = join(__dirname, '../Ali/schools.csv')

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'

// ── OSGB36 Easting/Northing to WGS84 lat/lng ─────────────────────────────────
// Ordnance Survey Concise method -- accurate to ~5m across Great Britain.
function osgbToWgs84(E, N) {
  if (!E || !N || isNaN(E) || isNaN(N)) return null
  E = Number(E); N = Number(N)
  if (E === 0 && N === 0) return null

  const a  = 6377563.396, b = 6356256.909
  const F0 = 0.9996012717
  const φ0 = 49 * Math.PI / 180
  const λ0 = -2 * Math.PI / 180
  const N0 = -100000, E0 = 400000
  const e2 = 1 - (b * b) / (a * a)
  const n  = (a - b) / (a + b), n2 = n*n, n3 = n*n*n

  let φ = φ0, M = 0
  do {
    φ = (N - N0 - M) / (a * F0) + φ
    const Ma = (1 + n + (5/4)*n2 + (5/4)*n3) * (φ - φ0)
    const Mb = (3*n + 3*n2 + (21/8)*n3) * Math.sin(φ-φ0) * Math.cos(φ+φ0)
    const Mc = ((15/8)*n2 + (15/8)*n3) * Math.sin(2*(φ-φ0)) * Math.cos(2*(φ+φ0))
    const Md = (35/24)*n3 * Math.sin(3*(φ-φ0)) * Math.cos(3*(φ+φ0))
    M = b * F0 * (Ma - Mb + Mc - Md)
  } while (Math.abs(N - N0 - M) >= 0.0001)

  const sinφ = Math.sin(φ), cosφ = Math.cos(φ), tanφ = Math.tan(φ)
  const ν   = a * F0 / Math.sqrt(1 - e2*sinφ*sinφ)
  const ρ   = a * F0 * (1-e2) / Math.pow(1 - e2*sinφ*sinφ, 1.5)
  const η2  = ν/ρ - 1
  const tan2 = tanφ*tanφ, tan4 = tan2*tan2
  const sec  = 1 / cosφ

  const VII  = tanφ / (2*ρ*ν)
  const VIII = tanφ / (24*ρ*ν*ν*ν) * (5 + 3*tan2 + η2 - 9*tan2*η2)
  const IX   = tanφ / (720*ρ*Math.pow(ν,5)) * (61 + 90*tan2 + 45*tan4)
  const X    = sec / ν
  const XI   = sec / (6*ν*ν*ν) * (ν/ρ + 2*tan2)
  const XII  = sec / (120*Math.pow(ν,5)) * (5 + 28*tan2 + 24*tan4)
  const XIIA = sec / (5040*Math.pow(ν,7)) * (61 + 662*tan2 + 1320*tan4 + 720*tan2*tan4)

  const dE = E - E0
  const lat = (φ - VII*dE*dE + VIII*Math.pow(dE,4) - IX*Math.pow(dE,6)) * 180/Math.PI
  const lng = (λ0 + X*dE - XI*Math.pow(dE,3) + XII*Math.pow(dE,5) - XIIA*Math.pow(dE,7)) * 180/Math.PI

  return { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) }
}

// ── CSV parser (handles quoted fields) ───────────────────────────────────────
function parseCsvLine(line) {
  const result = []
  let cur = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"')                   { inQuote = !inQuote }
    else if (ch === ',' && !inQuote)  { result.push(cur.trim()); cur = '' }
    else                              { cur += ch }
  }
  result.push(cur.trim())
  return result
}

// ── Seed ──────────────────────────────────────────────────────────────────────
async function seed() {
  const client = new MongoClient(MONGO_URI)
  await client.connect()
  const db  = client.db('ukcp')
  const col = db.collection('schools')

  console.log('Connected. Ensuring indexes...')
  await col.createIndex({ urn:      1 }, { unique: true })
  await col.createIndex({ ward_gss: 1 })
  await col.createIndex({ con_gss:  1 })
  await col.createIndex({ la_gss:   1 })
  await col.createIndex({ location: '2dsphere' }, { sparse: true })
  await col.createIndex({ is_placeholder: 1 })

  console.log('Clearing existing England schools...')
  await col.deleteMany({ country: 'England', is_placeholder: { $ne: true } })

  const rl = createInterface({
    input: createReadStream(CSV_PATH, { encoding: 'latin1' }),
    crlfDelay: Infinity,
  })

  let lineNum = 0, inserted = 0, skipped = 0
  const batch = []

  for await (const line of rl) {
    lineNum++
    if (lineNum === 1) continue  // header

    const r = parseCsvLine(line)
    if (r[10] !== 'Open') { skipped++; continue }

    const coords = osgbToWgs84(r[113], r[114])
    const head   = [r[67], r[68], r[69]].filter(Boolean).join(' ')

    const doc = {
      urn:        r[0],
      name:       r[4],
      la:         r[2],
      la_gss:     r[112] || '',
      type:       r[6],
      type_group: r[8],
      phase:      r[18] || 'Not applicable',
      gender:     r[27] || '',
      street:     r[59] || '',
      town:       r[62] || '',
      county:     r[63] || '',
      postcode:   r[64] || '',
      website:    r[65] || '',
      phone:      r[66] || '',
      head,
      head_role:  r[70] || 'Headteacher',
      ward_gss:   r[106] || '',
      ward_name:  r[107] || '',
      con_gss:    r[108] || '',
      con_name:   r[109] || '',
      ofsted:     r[125] || '',
      country:    'England',
      is_placeholder: false,
    }

    if (coords) {
      doc.location = { type: 'Point', coordinates: [coords.lng, coords.lat] }
    }

    batch.push(doc)

    if (batch.length >= 500) {
      await col.insertMany(batch, { ordered: false })
      inserted += batch.length
      batch.length = 0
      process.stdout.write(`\r  ${inserted} inserted...`)
    }
  }

  if (batch.length) {
    await col.insertMany(batch, { ordered: false })
    inserted += batch.length
  }

  console.log(`\nEngland schools: ${inserted} inserted, ${skipped} skipped (closed).`)

  // ── Coverage placeholders ─────────────────────────────────────────────────
  // Sentinel records so the UI can detect missing coverage.
  // Replace with real data when Scotland/Wales/NI sources are available.
  await col.deleteMany({ is_placeholder: true })
  await col.insertMany([
    {
      urn: 'PLACEHOLDER-SCOTLAND', name: '[PLACEHOLDER] Scotland school data not yet imported',
      country: 'Scotland', is_placeholder: true,
      la: 'Scotland', la_gss: 'S92000003', ward_gss: '', con_gss: '',
    },
    {
      urn: 'PLACEHOLDER-WALES', name: '[PLACEHOLDER] Wales school data not yet imported',
      country: 'Wales', is_placeholder: true,
      la: 'Wales', la_gss: 'W92000004', ward_gss: '', con_gss: '',
    },
    {
      urn: 'PLACEHOLDER-NIRELAND', name: '[PLACEHOLDER] Northern Ireland school data not yet imported',
      country: 'Northern Ireland', is_placeholder: true,
      la: 'Northern Ireland', la_gss: 'N92000002', ward_gss: '', con_gss: '',
    },
  ])

  console.log('Coverage placeholders inserted for Scotland, Wales, Northern Ireland.')
  await client.close()
  console.log('Done.')
}

seed().catch(err => { console.error(err); process.exit(1) })
