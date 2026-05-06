/**
 * @file scripts/migrate-place-location.js
 * @description One-time migration: adds GeoJSON location field to all place records.
 * Run once against local MongoDB, then again against Atlas before deploy.
 * Usage: node scripts/migrate-place-location.js
 */

import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DB_NAME   = 'ukcp'

const BATCH = 500

async function run() {
  const client = new MongoClient(MONGO_URI)
  await client.connect()
  const col = client.db(DB_NAME).collection('places')

  const cursor = col.find(
    { lat: { $exists: true, $ne: '' }, lng: { $exists: true, $ne: '' } },
    { projection: { _id: 1, lat: 1, lng: 1 } }
  )

  let updated = 0, skipped = 0, ops = []

  const flush = async () => {
    if (!ops.length) return
    await col.bulkWrite(ops, { ordered: false })
    updated += ops.length
    ops = []
    process.stdout.write(`\r  updated: ${updated}`)
  }

  while (await cursor.hasNext()) {
    const doc = await cursor.next()
    const lat = parseFloat(doc.lat)
    const lng = parseFloat(doc.lng)
    if (isNaN(lat) || isNaN(lng)) { skipped++; continue }
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { location: { type: 'Point', coordinates: [lng, lat] } } },
      }
    })
    if (ops.length >= BATCH) await flush()
  }
  await flush()

  console.log(`\nDone -- updated: ${updated}, skipped: ${skipped}`)
  await client.close()
}

run().catch(console.error)
