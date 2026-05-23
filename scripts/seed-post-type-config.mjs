/**
 * @file scripts/seed-post-type-config.mjs
 * @description Upserts post_type_config documents per post design note v0.3.
 *   Safe to re-run. Delete this file after first successful run.
 *
 * Usage:
 *   node --env-file=.env scripts/seed-post-type-config.mjs
 */

import { MongoClient } from 'mongodb'

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'

const configs = [
  {
    post_type:       'general_comment',
    label:           'Comment',
    description:     'General post for any location or group context.',
    affiliated_only: false,
    reach_default:   'ward',
    reach_floor:     'origin',
    reach_ceiling:   'national',
    user_override:   true,
    veracity_enabled: true,
  },
  {
    post_type:       'notice',
    label:           'Notice',
    description:     'Official notice. Affiliated only.',
    affiliated_only: true,
    reach_default:   'constituency',
    reach_floor:     'constituency',
    reach_ceiling:   'national',
    user_override:   false,
    veracity_enabled: true,
  },
  {
    post_type:       'school_notice',
    label:           'School Notice',
    description:     'Notice originating from a school entity.',
    affiliated_only: true,
    reach_default:   'ward',
    reach_floor:     'origin',
    reach_ceiling:   'constituency',
    user_override:   false,
    veracity_enabled: true,
  },
]

const client = new MongoClient(MONGO_URI)
await client.connect()
const col = client.db('ukcp').collection('post_type_config')

await col.createIndex({ post_type: 1 }, { unique: true })

for (const cfg of configs) {
  const result = await col.updateOne(
    { post_type: cfg.post_type },
    { $set: cfg },
    { upsert: true }
  )
  const action = result.upsertedCount ? 'inserted' : 'updated'
  console.log(`${action}: ${cfg.post_type}`)
}

const all = await col.find({}, { projection: { post_type: 1, veracity_enabled: 1, _id: 0 } }).toArray()
console.log('post_type_config collection:', JSON.stringify(all, null, 2))

await client.close()
