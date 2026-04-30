/**
 * @file scripts/seed-national-groups.js
 * @description Seeds the 8 launch national_groups into MongoDB.
 * Safe to re-run -- upserts on slug.
 *
 * Usage:
 *   node scripts/seed-national-groups.js
 *   MONGODB_URI=<atlas-uri> node scripts/seed-national-groups.js
 */

import 'dotenv/config'
import { MongoClient } from 'mongodb'

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'
const client    = new MongoClient(MONGO_URI)

const now = new Date()

const groups = [
  {
    name:              'At the School Gates',
    slug:              'at-the-school-gates',
    description:       'A community network for parents, carers, and school communities to share concerns and organise around local education issues.',
    topic_category:    'Education',
    purpose_statement: 'To give parents and carers a local voice on education, school services, and the issues that affect families at the school gate. This network connects people who share the same concerns across every ward in the country.',
    action_template:   null,
  },
  {
    name:              'Waiting at the Surgery',
    slug:              'waiting-at-the-surgery',
    description:       'A network for people experiencing difficulties accessing GP services and local NHS care.',
    topic_category:    'Health',
    purpose_statement: 'To surface local experience of NHS access -- waiting times, surgery closures, appointment availability -- and connect people who share the same pressures. Every area has this problem. This network makes it visible.',
    action_template:   null,
  },
  {
    name:              'Then 3 Came Along',
    slug:              'then-3-came-along',
    description:       'A network for people affected by poor public transport, bus service cuts, and unreliable local routes.',
    topic_category:    'Transport',
    purpose_statement: 'To give people a local space to document transport failures, share experiences, and organise around the bus routes, timetables, and service cuts that affect daily life.',
    action_template:   null,
  },
  {
    name:              'Lights Out',
    slug:              'lights-out',
    description:       'A network for residents concerned about street lighting failures, road safety at night, and council maintenance.',
    topic_category:    'Council Services',
    purpose_statement: 'To log and share local experience of street lighting failures and council maintenance issues, and to give residents a collective voice when reporting problems that affect safety.',
    action_template:   null,
  },
  {
    name:              'The Empty Shelf',
    slug:              'the-empty-shelf',
    description:       'A network connecting people affected by food poverty, cost of living pressures, and local food bank services.',
    topic_category:    'Cost of Living',
    purpose_statement: 'To connect people experiencing food poverty and cost of living hardship with local support, and to give communities a way to document need and organise mutual aid.',
    action_template:   null,
  },
  {
    name:              'Our Green Space',
    slug:              'our-green-space',
    description:       'A network for people who want to protect and improve local parks, playing fields, green belt, and open spaces.',
    topic_category:    'Environment',
    purpose_statement: 'To give communities a shared voice in protecting local green spaces from development, neglect, and loss -- and to support local campaigns for parks, playing fields, and accessible outdoor space.',
    action_template:   null,
  },
  {
    name:              'The Housing List',
    slug:              'the-housing-list',
    description:       'A network for people navigating social housing waiting lists, housing association issues, and council housing policy.',
    topic_category:    'Housing',
    purpose_statement: 'To connect people on housing waiting lists, in temporary accommodation, or facing housing insecurity -- and to surface local housing need as a visible community concern, not a private struggle.',
    action_template:   null,
  },
  {
    name:              'Safe Streets',
    slug:              'safe-streets',
    description:       'A network for residents concerned about road safety, pavement conditions, dangerous junctions, and cycling infrastructure.',
    topic_category:    'Road Safety',
    purpose_statement: 'To give residents a local space to document road safety concerns, share near-miss incidents, and organise around the changes needed to make streets safer for everyone.',
    action_template:   null,
  },
]

async function run() {
  await client.connect()
  const db  = client.db('ukcp')
  const col = db.collection('national_groups')

  await col.createIndex({ slug: 1 }, { unique: true })
  await col.createIndex({ status: 1 })

  let inserted = 0
  let updated  = 0

  for (const g of groups) {
    const doc = {
      ...g,
      national_moderators: [],
      chapter_count:       0,
      founder_user_ref:    null,
      membership_model:    'open',
      location_scope:      null,
      status:              'active',
      created_at:          now,
      updated_at:          now,
    }
    const result = await col.updateOne(
      { slug: g.slug },
      { $setOnInsert: doc },
      { upsert: true }
    )
    if (result.upsertedCount) inserted++
    else updated++
  }

  console.log(`Done. Inserted: ${inserted}, already existed: ${updated}`)
  await client.close()
}

run().catch(err => { console.error(err); process.exit(1) })
