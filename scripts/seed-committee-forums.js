/**
 * @file scripts/seed-committee-forums.js
 * @description Seeds the committee_forums collection with one forum per committee
 * and back-fills committee_forum_ref on each committees record.
 *
 * Safe to re-run: skips any committee that already has committee_forum_ref set.
 *
 * Usage:
 *   node scripts/seed-committee-forums.js
 *   MONGODB_URI=mongodb+srv://... node scripts/seed-committee-forums.js
 */

import { MongoClient } from 'mongodb'

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'

async function run() {
  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  await client.connect()
  console.log(`Connected to MongoDB: ${MONGO_URI.includes('mongodb+srv') ? 'Atlas' : 'local'}`)

  const db         = client.db('ukcp')
  const committeeCol = db.collection('committees')
  const forumCol     = db.collection('committee_forums')

  // ── Indexes ────────────────────────────────────────────────────────────────
  await forumCol.createIndex({ slug: 1 },           { unique: true, background: true })
  await forumCol.createIndex({ committee_ref: 1 },  { unique: true, background: true })
  await forumCol.createIndex({ 'location_scope.type': 1, 'location_scope.slug': 1 }, { background: true })
  await forumCol.createIndex({ con_gss: 1 },         { background: true })
  console.log('committee_forums: indexes created')

  // ── Load committees that need a forum ──────────────────────────────────────
  const committees = await committeeCol
    .find({ committee_forum_ref: null })
    .toArray()

  console.log(`Committees needing a forum: ${committees.length}`)

  let inserted = 0
  let failed   = 0
  const now    = new Date()

  for (let i = 0; i < committees.length; i++) {
    const c = committees[i]
    try {
      const forum = {
        committee_ref:    c._id,
        name:             c.name + ' Forum',
        slug:             c.slug + '-forum',
        status:           'active',
        membership_model: 'open',
        location_scope:   c.location_scope,
        con_gss:          c.con_gss,
        region:           c.region,
        region_gss:       c.region_gss,
        country:          c.country,
        moderation_level: null,
        member_count:     0,
        created_at:       now,
        updated_at:       now,
      }

      const result = await forumCol.insertOne(forum)
      await committeeCol.updateOne(
        { _id: c._id },
        { $set: { committee_forum_ref: result.insertedId, updated_at: now } }
      )
      inserted++
    } catch (err) {
      console.error(`  FAILED: ${c.name} — ${err.message}`)
      failed++
    }

    if ((i + 1) % 100 === 0) {
      console.log(`  Progress: ${i + 1}/${committees.length}`)
    }
  }

  console.log(`committee_forums: ${inserted} inserted, ${failed} failed, ${committees.length} total processed`)

  await client.close()
  console.log('Done.')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
