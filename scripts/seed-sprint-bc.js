/**
 * @file scripts/seed-sprint-bc.js
 * @description Sprint B+C: create indexes for associations, spaces,
 *   group_memberships, posts. Insert POC seed data for associations and spaces.
 *
 * Safe to re-run: indexes are idempotent. Seed records are skipped if slug exists.
 *
 * Usage:
 *   node scripts/seed-sprint-bc.js
 *   MONGODB_URI=mongodb+srv://... node scripts/seed-sprint-bc.js
 */

import { MongoClient } from 'mongodb'

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'

async function run() {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  await client.connect()
  console.log('Connected to MongoDB')

  const db = client.db('ukcp')

  // ── associations ────────────────────────────────────────────────────────────
  const assocCol = db.collection('associations')
  await assocCol.createIndex({ slug: 1 }, { unique: true })
  await assocCol.createIndex({ 'location_scope.type': 1, 'location_scope.slug': 1 })
  await assocCol.createIndex({ category: 1 })
  await assocCol.createIndex({ national: 1 })
  console.log('associations: indexes created')

  // ── spaces ──────────────────────────────────────────────────────────────────
  const spcCol = db.collection('spaces')
  await spcCol.createIndex({ slug: 1 }, { unique: true })
  await spcCol.createIndex({ 'location_scope.type': 1, 'location_scope.slug': 1 })
  console.log('spaces: indexes created')

  // ── group_memberships ───────────────────────────────────────────────────────
  const memCol = db.collection('group_memberships')
  await memCol.createIndex(
    { collection_type: 1, collective_id: 1, user_id: 1 },
    { unique: true }
  )
  await memCol.createIndex({ user_id: 1 })
  await memCol.createIndex({ collective_id: 1 })
  console.log('group_memberships: indexes created')

  // ── posts ───────────────────────────────────────────────────────────────────
  const pstCol = db.collection('posts')
  await pstCol.createIndex({ 'location_scope.type': 1, 'location_scope.slug': 1 })
  await pstCol.createIndex({ collective_ref_id: 1 }, { sparse: true })
  await pstCol.createIndex({ status: 1 })
  await pstCol.createIndex({ created_at: -1 })
  console.log('posts: indexes created')

  // ── seed associations ───────────────────────────────────────────────────────
  const now = new Date()

  const assocSeeds = [
    {
      name: 'Mossley Hill Cyclists',
      slug: 'mossley-hill-cyclists',
      description: 'Road and leisure cycling group for Mossley Hill ward',
      founder_user_ref: null,
      membership_model: 'open',
      status: 'active',
      location_scope: { type: 'ward', slug: 'Mossley_Hill' },
      category: 'Sports and Leisure',
      sub_type: 'Cycling',
      national: false,
      member_count: 0,
      created_at: now,
      updated_at: now,
    },
    {
      name: 'Liverpool Environment Network',
      slug: 'liverpool-environment-network',
      description: 'Environmental action and conservation across Liverpool',
      founder_user_ref: null,
      membership_model: 'open',
      status: 'active',
      location_scope: { type: 'county', slug: 'Merseyside' },
      category: 'Environment and Green',
      sub_type: 'Conservation',
      national: false,
      member_count: 0,
      created_at: now,
      updated_at: now,
    },
    {
      name: 'UK Premier League Supporters',
      slug: 'uk-premier-league-supporters',
      description: 'National group for Premier League football supporters',
      founder_user_ref: null,
      membership_model: 'open',
      status: 'active',
      location_scope: null,
      category: 'Sports and Leisure',
      sub_type: 'Football',
      national: true,
      member_count: 0,
      created_at: now,
      updated_at: now,
    },
    {
      name: 'Riverside Residents',
      slug: 'riverside-residents',
      description: 'Residents group for the Riverside constituency',
      founder_user_ref: null,
      membership_model: 'open',
      status: 'active',
      location_scope: { type: 'constituency', slug: 'Liverpool_Riverside' },
      category: 'Community and Neighbourhood',
      sub_type: 'Residents Association',
      national: false,
      member_count: 0,
      created_at: now,
      updated_at: now,
    },
    {
      name: 'Greater London Arts Collective',
      slug: 'greater-london-arts',
      description: 'Arts and culture network across Greater London',
      founder_user_ref: null,
      membership_model: 'open',
      status: 'active',
      location_scope: { type: 'county', slug: 'Greater_London' },
      category: 'Arts and Culture',
      sub_type: 'Visual Arts',
      national: false,
      member_count: 0,
      created_at: now,
      updated_at: now,
    },
  ]

  let assocInserted = 0
  for (const doc of assocSeeds) {
    const exists = await assocCol.findOne({ slug: doc.slug })
    if (!exists) {
      await assocCol.insertOne(doc)
      assocInserted++
    }
  }
  console.log(`associations: ${assocInserted} inserted (${assocSeeds.length - assocInserted} already existed)`)

  // ── seed spaces ─────────────────────────────────────────────────────────────
  const spaceSeeds = [
    {
      name: 'Mossley Hill Local',
      slug: 'mossley-hill-local',
      description: 'General discussion space for Mossley Hill ward',
      founder_user_ref: null,
      membership_model: 'open',
      status: 'active',
      location_scope: { type: 'ward', slug: 'Mossley_Hill' },
      member_count: 0,
      created_at: now,
      updated_at: now,
    },
    {
      name: 'Riverside Constituency Notice Board',
      slug: 'riverside-notice-board',
      description: 'Open discussion for Liverpool Riverside constituency',
      founder_user_ref: null,
      membership_model: 'open',
      status: 'active',
      location_scope: { type: 'constituency', slug: 'Liverpool_Riverside' },
      member_count: 0,
      created_at: now,
      updated_at: now,
    },
  ]

  let spacesInserted = 0
  for (const doc of spaceSeeds) {
    const exists = await spcCol.findOne({ slug: doc.slug })
    if (!exists) {
      await spcCol.insertOne(doc)
      spacesInserted++
    }
  }
  console.log(`spaces: ${spacesInserted} inserted (${spaceSeeds.length - spacesInserted} already existed)`)

  await client.close()
  console.log('Done.')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
