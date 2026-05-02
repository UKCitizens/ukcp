/**
 * @file scripts/seed-post-type-config.js
 * @description Seeds the post_type_config collection with reach rules per post_type.
 *
 *   Source of truth: UKCP/Ali/post-design-note.md (post types and reach defaults table).
 *   Idempotent -- deletes existing rows, then inserts fresh. Safe to re-run.
 *   The post_type_config collection has a unique index on post_type (created in
 *   db/mongo.js connectMongo).
 *
 * Usage:
 *   node --env-file=.env scripts/seed-post-type-config.js
 */

import { MongoClient } from 'mongodb'

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'

const configs = [
  {
    post_type:      'general_comment',
    reach_default:  'origin',
    reach_floor:    'origin',
    reach_ceiling:  'constituency',
    user_override:  true,
  },
  {
    post_type:      'reaction',
    reach_default:  'origin',
    reach_floor:    'origin',
    reach_ceiling:  'origin',
    user_override:  false,
  },
  {
    post_type:      'question',
    reach_default:  'ward',
    reach_floor:    'origin',
    reach_ceiling:  'county',
    user_override:  true,
  },
  {
    post_type:      'call_to_arms',
    reach_default:  'constituency',
    reach_floor:    'ward',
    reach_ceiling:  'national',
    user_override:  true,
  },
  {
    post_type:       'announcement',
    reach_default:   'constituency',
    reach_floor:     'constituency',
    reach_ceiling:   'region',
    user_override:   false,
    affiliated_only: true,
  },
  {
    post_type:      'school_notice',
    reach_default:  'origin',
    reach_floor:    'origin',
    reach_ceiling:  'constituency',
    user_override:  true,
  },
  {
    post_type:      'news_discussion',
    reach_default:  'origin',
    reach_floor:    'origin',
    reach_ceiling:  'county',
    user_override:  true,
  },
  {
    post_type:      'trader_offer',
    reach_default:  'ward',
    reach_floor:    'origin',
    reach_ceiling:  'county',
    user_override:  true,
  },
  {
    post_type:      'petition_signature',
    reach_default:  'constituency',
    reach_floor:    'constituency',
    reach_ceiling:  'national',
    user_override:  false,
  },
  {
    post_type:      'evidence_submission',
    reach_default:  'origin',
    reach_floor:    'origin',
    reach_ceiling:  'origin',
    user_override:  false,
  },
]

const client = new MongoClient(MONGO_URI)

await client.connect()
const db  = client.db('ukcp')
const col = db.collection('post_type_config')

await col.createIndex({ post_type: 1 }, { unique: true })

await col.deleteMany({})
const result = await col.insertMany(configs)
console.log(`post_type_config seeded: ${result.insertedCount} records`)

const types = await col.find({}, { projection: { post_type: 1, _id: 0 } }).toArray()
console.log('post_types:', types.map(t => t.post_type).join(', '))

await client.close()
