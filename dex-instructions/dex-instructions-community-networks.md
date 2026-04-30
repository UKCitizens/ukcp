# Dex Instruction File -- Community Networks
Date: 30 Apr 2026
Author: Ali
Reference: community-networks-state-matrix.md, ukcp-entity-manifests-v0.3.txt

Execute all steps in order. Stop after each numbered stop point and await
Phil's go/stop. Within a stop, execute all sub-steps before stopping.

Plain ASCII throughout. UTF-8 encoding on all file writes.

---

## STOP 1 -- Seed national_groups + DB layer

### 1a. Write scripts/seed-national-groups.js

Create the file at project root scripts/seed-national-groups.js.
Full content below. No truncation.

```js
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
```

### 1b. Run seed locally

```
node scripts/seed-national-groups.js
```

Confirm output: "Done. Inserted: 8, already existed: 0"

### 1c. Create indexes for network_chapters

Add to db/mongo.js connectMongo() alongside the existing createIndex calls:

```js
await db.collection('national_groups').createIndex({ slug: 1 }, { unique: true })
await db.collection('national_groups').createIndex({ status: 1 })
await db.collection('network_chapters').createIndex(
  { national_group_ref: 1, tier: 1, slug: 1 },
  { unique: true }
)
await db.collection('network_chapters').createIndex({ tier: 1, slug: 1 })
await db.collection('network_chapters').createIndex({ status: 1 })
await db.collection('posts').createIndex({ 'collective_ref.id': 1, created_at: -1 })
await db.collection('posts').createIndex({ national_feed_suppressed: 1 })
```

### 1d. Add collection accessors to db/mongo.js

Append after the last existing export (committeeForumsCol):

```js
/** Returns the national_groups collection, or null if Mongo is unavailable. */
export function nationalGroupsCol()  { return db ? db.collection('national_groups')  : null }

/** Returns the network_chapters collection, or null if Mongo is unavailable. */
export function networkChaptersCol() { return db ? db.collection('network_chapters') : null }
```

### 1e. Update posts.js -- accept network_chapters as a valid collective_ref

In routes/posts.js, locate the POST handler block that validates collective_ref.
It currently reads:

```js
    const targetCol = collective_ref.collection === 'associations'
      ? associationsCol()
      : collective_ref.collection === 'spaces'
        ? spacesCol()
        : null
```

Replace with:

```js
    const targetCol = collective_ref.collection === 'associations'
      ? associationsCol()
      : collective_ref.collection === 'spaces'
        ? spacesCol()
        : collective_ref.collection === 'network_chapters'
          ? networkChaptersCol()
          : null
```

Add networkChaptersCol to the import at the top of routes/posts.js:

```js
import {
  postsCol,
  groupMembershipsCol,
  associationsCol,
  spacesCol,
  networkChaptersCol,
  usersCol,
} from '../db/mongo.js'
```

The membership check for named posts into a collective also needs
network_chapters. In the same POST handler, locate the membership check:

```js
    if (!is_anonymous && memCol) {
      const membership = await memCol.findOne({
        collection_type: collective_ref.collection,
        collective_id:   new ObjectId(collective_ref.id),
        user_id:         req.user._id,
        status:          'active',
      })
      if (!membership) {
        return res.status(403).json({ error: 'Join the group to post here.' })
      }
    }
```

This is already collection-type agnostic (uses collective_ref.collection as
the discriminator) -- no change needed here.

---

## STOP 2 -- Service layer + Routes

### 2a. Write services/communityNetworks.js

Create the file. Full content below.

```js
/**
 * @file services/communityNetworks.js
 * @description Community Networks service layer.
 *
 * Responsibilities:
 *   - Retrieve all national groups with their chapter (if any) at a given scope
 *   - Lazy-instantiate all 8 chapters for a scope when a logged-in user views them
 *   - Join / leave a chapter
 *   - Retrieve national feed posts for a national group
 */

import { ObjectId }           from 'mongodb'
import {
  nationalGroupsCol,
  networkChaptersCol,
  groupMembershipsCol,
  postsCol,
} from '../db/mongo.js'

/**
 * Return all national_groups with their network_chapter at the given scope.
 * If userId is provided, also triggers ensureChaptersExist and annotates
 * is_member on each chapter.
 *
 * @param {string}   type    -- geo scope type (ward|constituency|county)
 * @param {string}   slug    -- geo scope slug
 * @param {ObjectId|null} userId -- caller's Mongo _id, or null for anon
 * @returns {Array<{ nationalGroup: object, chapter: object|null, is_member: boolean }>}
 */
export async function getChaptersAtScope(type, slug, userId) {
  const ngCol  = nationalGroupsCol()
  const ncCol  = networkChaptersCol()
  const memCol = groupMembershipsCol()

  if (!ngCol || !ncCol) return []

  const groups = await ngCol.find({ status: 'active' }).sort({ name: 1 }).toArray()
  if (!groups.length) return []

  // Logged-in view triggers silent background instantiation of all chapters.
  if (userId) {
    ensureChaptersExist(groups, type, slug, ncCol).catch(err => {
      console.error('[communityNetworks] ensureChaptersExist error:', err.message)
    })
  }

  // Fetch existing chapters for this scope.
  const groupIds = groups.map(g => g._id)
  const chapters = await ncCol.find({
    national_group_ref: { $in: groupIds },
    tier:               type,
    slug,
  }).toArray()

  const chapterByGroupId = Object.fromEntries(
    chapters.map(c => [c.national_group_ref.toString(), c])
  )

  // Annotate is_member per chapter.
  let memberSet = new Set()
  if (userId && memCol && chapters.length) {
    const chapterIds = chapters.map(c => c._id)
    const memberships = await memCol.find({
      collection_type: 'network_chapters',
      collective_id:   { $in: chapterIds },
      user_id:         userId,
      status:          'active',
    }).toArray()
    memberSet = new Set(memberships.map(m => m.collective_id.toString()))
  }

  return groups.map(ng => {
    const chapter = chapterByGroupId[ng._id.toString()] ?? null
    return {
      nationalGroup: ng,
      chapter,
      is_member: chapter ? memberSet.has(chapter._id.toString()) : false,
    }
  })
}

/**
 * Upsert all 8 chapters for the given scope. Fire-and-forget safe.
 * Uses compound unique index to prevent duplicates.
 */
async function ensureChaptersExist(groups, tier, slug, ncCol) {
  const now = new Date()
  const ops = groups.map(ng => ({
    updateOne: {
      filter: { national_group_ref: ng._id, tier, slug },
      update: {
        $setOnInsert: {
          national_group_ref: ng._id,
          name:               `${ng.name} (${slug.replace(/_/g, ' ')})`,
          slug:               `${ng.slug}--${tier}--${slug.toLowerCase()}`,
          description:        ng.purpose_statement,
          tier,
          location_scope:     { type: tier, slug },
          member_count:       0,
          founder_user_ref:   null,
          membership_model:   'open',
          status:             'active',
          created_at:         now,
          updated_at:         now,
        },
      },
      upsert: true,
    },
  }))

  const result = await ncCol.bulkWrite(ops, { ordered: false })

  // Increment chapter_count on the parent national_groups for any new chapters.
  if (result.upsertedCount > 0) {
    const ngCol = nationalGroupsCol()
    if (ngCol) {
      const upsertedGroupIds = Object.values(result.upsertedIds).map(
        id => groups[parseInt(Object.keys(result.upsertedIds).find(
          k => result.upsertedIds[k].toString() === id.toString()
        ), 10)]?._id
      ).filter(Boolean)

      if (upsertedGroupIds.length) {
        await ngCol.updateMany(
          { _id: { $in: upsertedGroupIds } },
          { $inc: { chapter_count: 1 } }
        )
      }
    }
  }
}

/**
 * Join a chapter. Creates GroupMembership record. Idempotent.
 *
 * @param {ObjectId} userId
 * @param {ObjectId} chapterId
 * @returns {{ status: 'joined'|'already_member' }}
 */
export async function joinChapter(userId, chapterId) {
  const ncCol  = networkChaptersCol()
  const memCol = groupMembershipsCol()
  if (!ncCol || !memCol) throw new Error('Database unavailable')

  const chapter = await ncCol.findOne({ _id: chapterId })
  if (!chapter) throw Object.assign(new Error('Chapter not found'), { status: 404 })

  const existing = await memCol.findOne({
    collection_type: 'network_chapters',
    collective_id:   chapterId,
    user_id:         userId,
    status:          'active',
  })
  if (existing) return { status: 'already_member' }

  const now = new Date()
  await memCol.insertOne({
    collection_type: 'network_chapters',
    collective_id:   chapterId,
    user_id:         userId,
    membership_role: 'member',
    status:          'active',
    joined_at:       now,
  })

  await ncCol.updateOne({ _id: chapterId }, { $inc: { member_count: 1 } })
  return { status: 'joined' }
}

/**
 * Leave a chapter.
 *
 * @param {ObjectId} userId
 * @param {ObjectId} chapterId
 * @returns {{ status: 'left'|'not_member' }}
 */
export async function leaveChapter(userId, chapterId) {
  const ncCol  = networkChaptersCol()
  const memCol = groupMembershipsCol()
  if (!ncCol || !memCol) throw new Error('Database unavailable')

  const result = await memCol.deleteOne({
    collection_type: 'network_chapters',
    collective_id:   chapterId,
    user_id:         userId,
    status:          'active',
  })

  if (!result.deletedCount) return { status: 'not_member' }

  await ncCol.updateOne(
    { _id: chapterId, member_count: { $gt: 0 } },
    { $inc: { member_count: -1 } }
  )
  return { status: 'left' }
}

/**
 * Get paginated national feed posts for a national group.
 * Aggregates posts from all chapters of the group, excluding suppressed.
 *
 * @param {ObjectId} nationalGroupId
 * @param {object}   filters  -- { tier?, slug?, date_from? }
 * @param {number}   page     -- 1-based
 * @param {number}   limit    -- max 20
 * @returns {{ posts: object[], total: number }}
 */
export async function getNationalFeed(nationalGroupId, filters = {}, page = 1, limit = 20) {
  const ncCol  = networkChaptersCol()
  const pstCol = postsCol()
  if (!ncCol || !pstCol) return { posts: [], total: 0 }

  // Build chapter query for this national group.
  const chapterQuery = { national_group_ref: nationalGroupId, status: 'active' }
  if (filters.tier) chapterQuery.tier = filters.tier
  if (filters.slug) chapterQuery.slug = filters.slug

  const chapters = await ncCol.find(chapterQuery, { projection: { _id: 1 } }).toArray()
  if (!chapters.length) return { posts: [], total: 0 }

  const chapterIds = chapters.map(c => c._id)

  const postQuery = {
    'collective_ref.collection': 'network_chapters',
    'collective_ref.id':         { $in: chapterIds },
    status:                       'published',
    national_feed_suppressed:     { $ne: true },
  }
  if (filters.date_from) {
    postQuery.created_at = { $gte: new Date(filters.date_from) }
  }

  const safeLimit  = Math.min(limit, 20)
  const skip       = (Math.max(page, 1) - 1) * safeLimit

  const [posts, total] = await Promise.all([
    pstCol.find(postQuery).sort({ created_at: -1 }).skip(skip).limit(safeLimit).toArray(),
    pstCol.countDocuments(postQuery),
  ])

  return { posts, total }
}
```

### 2b. Write routes/communityNetworks.js

Create the file. Full content below.

```js
/**
 * @file routes/communityNetworks.js
 * @description Community Networks API routes.
 *
 *   GET   /api/community-networks              -- all national groups + chapters at scope
 *   POST  /api/community-networks/chapters/:id/join  -- join a chapter
 *   POST  /api/community-networks/chapters/:id/leave -- leave a chapter
 *   GET   /api/community-networks/:ngId/feed   -- national feed for a group
 *   PATCH /api/community-networks/feed/:postId/suppress -- suppress from national feed
 */

import { Router }      from 'express'
import { ObjectId }    from 'mongodb'
import { requireAuth, supabaseAdmin } from '../middleware/auth.js'
import { usersCol }    from '../db/mongo.js'
import {
  getChaptersAtScope,
  joinChapter,
  leaveChapter,
  getNationalFeed,
} from '../services/communityNetworks.js'
import { postsCol }    from '../db/mongo.js'

const router = Router()

/**
 * Resolve caller MongoDB _id from optional Bearer token. Returns null for anon.
 */
async function optionalUserId(req) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice(7)
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  const col    = usersCol()
  if (!col) return null
  const record = await col.findOne({ supabase_id: user.id }, { projection: { _id: 1 } })
  return record?._id ?? null
}

// GET /api/community-networks
router.get('/', async (req, res) => {
  const { type, slug } = req.query
  if (!type || !slug) {
    return res.status(400).json({ error: 'type and slug are required' })
  }
  const VALID_TIERS = ['ward', 'constituency', 'county']
  if (!VALID_TIERS.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TIERS.join(', ')}` })
  }

  const userId = await optionalUserId(req)
  const data   = await getChaptersAtScope(type, slug, userId)
  res.json(data)
})

// POST /api/community-networks/chapters/:id/join
router.post('/chapters/:id/join', requireAuth, async (req, res) => {
  const { id } = req.params
  if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid chapter id' })

  try {
    const result = await joinChapter(req.user._id, new ObjectId(id))
    res.status(result.status === 'joined' ? 201 : 200).json(result)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// POST /api/community-networks/chapters/:id/leave
router.post('/chapters/:id/leave', requireAuth, async (req, res) => {
  const { id } = req.params
  if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid chapter id' })

  try {
    const result = await leaveChapter(req.user._id, new ObjectId(id))
    res.json(result)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// GET /api/community-networks/:ngId/feed
router.get('/:ngId/feed', async (req, res) => {
  const { ngId } = req.params
  if (!ObjectId.isValid(ngId)) return res.status(400).json({ error: 'Invalid national group id' })

  const { tier, slug, date_from, page = '1', limit = '20' } = req.query
  const filters = {}
  if (tier)      filters.tier      = tier
  if (slug)      filters.slug      = slug
  if (date_from) filters.date_from = date_from

  const result = await getNationalFeed(
    new ObjectId(ngId),
    filters,
    parseInt(page, 10),
    parseInt(limit, 10)
  )
  res.json(result)
})

// PATCH /api/community-networks/feed/:postId/suppress
// Requires auth. In v1 any logged-in user can call this -- national moderator
// role enforcement is deferred. Route is present for wiring completeness.
router.patch('/feed/:postId/suppress', requireAuth, async (req, res) => {
  const { postId } = req.params
  if (!ObjectId.isValid(postId)) return res.status(400).json({ error: 'Invalid post id' })

  const pstCol = postsCol()
  if (!pstCol) return res.status(503).json({ error: 'Database unavailable' })

  const result = await pstCol.updateOne(
    { _id: new ObjectId(postId) },
    {
      $set: {
        national_feed_suppressed:   true,
        national_feed_suppressed_at: new Date(),
        national_feed_suppressed_by: req.user._id,
      }
    }
  )

  if (!result.matchedCount) return res.status(404).json({ error: 'Post not found' })
  res.json({ status: 'suppressed' })
})

export default router
```

### 2c. Register route in server.js

Add import after the existing forumsRouter import:

```js
import communityNetworksRouter from './routes/communityNetworks.js'
```

Add app.use() after the forums line:

```js
app.use('/api/community-networks', communityNetworksRouter)
```

### 2d. Build and verify locally

```
npm run build
node server.js
```

Verify with curl (substitute a real ward slug from the live data):

```
curl "http://localhost:3000/api/community-networks?type=ward&slug=Mossley_Hill"
```

Expect: JSON array of 8 objects, each with nationalGroup + chapter (null until
first logged-in view triggers instantiation) + is_member: false.

---

## STOP 3 -- UI

### 3a. Write src/components/Groups/CommunityNetworksSection.jsx

Create the file. Full content below.

```jsx
/**
 * @file src/components/Groups/CommunityNetworksSection.jsx
 * @description Community Networks section within the Groups tab.
 *
 * Fetches all 8 national groups + their chapters at the current scope.
 * Logged-in view triggers silent background chapter instantiation server-side.
 *
 * Props:
 *   locationType  -- geo scope type (ward|constituency|county)
 *   locationSlug  -- geo scope slug
 *   session       -- Supabase session or null
 */

import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const VALID_TIERS = ['ward', 'constituency', 'county']

export default function CommunityNetworksSection({ locationType, locationSlug, session }) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!locationType || !locationSlug) return
    if (!VALID_TIERS.includes(locationType)) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const headers = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}

    fetch(
      `${API_BASE}/api/community-networks?type=${encodeURIComponent(locationType)}&slug=${encodeURIComponent(locationSlug)}`,
      { headers }
    )
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError('Failed to load community networks'); setLoading(false) } })

    return () => { cancelled = true }
  }, [locationType, locationSlug, session])

  async function handleJoin(chapterId) {
    if (!session?.access_token) return
    const res = await fetch(`${API_BASE}/api/community-networks/chapters/${chapterId}/join`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      setData(prev => prev.map(item => {
        if (item.chapter?._id?.toString() === chapterId.toString()) {
          return { ...item, is_member: true }
        }
        return item
      }))
    }
  }

  async function handleLeave(chapterId) {
    if (!session?.access_token) return
    const res = await fetch(`${API_BASE}/api/community-networks/chapters/${chapterId}/leave`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      setData(prev => prev.map(item => {
        if (item.chapter?._id?.toString() === chapterId.toString()) {
          return { ...item, is_member: false }
        }
        return item
      }))
    }
  }

  if (!locationType || !VALID_TIERS.includes(locationType)) {
    return (
      <div style={wrap}>
        <p style={dim}>Community Networks are available at ward, constituency, and county level.</p>
      </div>
    )
  }

  if (loading) return <div style={wrap}><p style={dim}>Loading community networks...</p></div>
  if (error)   return <div style={wrap}><p style={dim}>{error}</p></div>

  return (
    <div style={wrap}>
      <p style={intro}>
        Community Networks are national topic groups with local chapters.
        Every network has a chapter here -- join to connect with people near you
        who care about the same issues.
      </p>
      {data.map(({ nationalGroup, chapter, is_member }) => (
        <NetworkCard
          key={nationalGroup._id}
          nationalGroup={nationalGroup}
          chapter={chapter}
          isMember={is_member}
          session={session}
          onJoin={handleJoin}
          onLeave={handleLeave}
          locationType={locationType}
          locationSlug={locationSlug}
        />
      ))}
    </div>
  )
}

function NetworkCard({ nationalGroup, chapter, isMember, session, onJoin, onLeave, locationType, locationSlug }) {
  const [joining,       setJoining]       = useState(false)
  const [showFeed,      setShowFeed]       = useState(false)
  const [feedPosts,     setFeedPosts]      = useState([])
  const [feedLoading,   setFeedLoading]    = useState(false)

  async function handleJoin() {
    if (!chapter) return
    setJoining(true)
    await onJoin(chapter._id)
    setJoining(false)
  }

  async function handleLeave() {
    if (!chapter) return
    setJoining(true)
    await onLeave(chapter._id)
    setJoining(false)
  }

  async function toggleNationalFeed() {
    if (showFeed) { setShowFeed(false); return }
    setShowFeed(true)
    if (feedPosts.length) return
    setFeedLoading(true)
    try {
      const res  = await fetch(`${API_BASE}/api/community-networks/${nationalGroup._id}/feed?limit=5`)
      const json = await res.json()
      setFeedPosts(json.posts ?? [])
    } catch (_) {
      setFeedPosts([])
    }
    setFeedLoading(false)
  }

  const memberCount = chapter?.member_count ?? 0
  const topicBadge  = nationalGroup.topic_category

  return (
    <div style={card}>
      <div style={cardHeader}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={cardName}>{nationalGroup.name}</p>
            <span style={topicTag}>{topicBadge}</span>
          </div>
          <p style={cardDesc}>{nationalGroup.purpose_statement}</p>
          <p style={memberLine}>
            {memberCount === 0
              ? 'No local members yet -- be the first'
              : `${memberCount} local member${memberCount === 1 ? '' : 's'}`}
          </p>
        </div>
        <div style={actions}>
          {!session ? (
            <a href="/auth" style={loginLink}>Log in to join</a>
          ) : isMember ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexDirection: 'column' }}>
              <span style={joinedBadge}>Joined</span>
              <button style={leaveBtn} onClick={handleLeave} disabled={joining}>
                {joining ? '...' : 'Leave'}
              </button>
            </div>
          ) : chapter ? (
            <button style={joinBtn} onClick={handleJoin} disabled={joining}>
              {joining ? 'Joining...' : 'Join'}
            </button>
          ) : (
            <p style={dim}>Loading...</p>
          )}
        </div>
      </div>

      <div style={cardFooter}>
        <button style={feedToggle} onClick={toggleNationalFeed}>
          {showFeed ? 'Hide national posts' : 'View national posts'}
        </button>
      </div>

      {showFeed && (
        <div style={feedPanel}>
          {feedLoading && <p style={dim}>Loading...</p>}
          {!feedLoading && feedPosts.length === 0 && (
            <p style={dim}>No national posts yet.</p>
          )}
          {feedPosts.map(post => (
            <div key={post._id} style={feedPost}>
              <p style={feedPostMeta}>
                {post.location_scope?.slug?.replace(/_/g, ' ') ?? 'Unknown location'}
                {' -- '}
                {new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
              <p style={feedPostBody}>{post.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Styles
const wrap        = { padding: 16 }
const intro       = { fontSize: 12, color: '#495057', marginBottom: 16, lineHeight: 1.5 }
const dim         = { fontSize: 13, color: '#868e96', margin: 0 }
const card        = { border: '1px solid #dee2e6', borderRadius: 6, padding: 12, marginBottom: 12, background: '#fff' }
const cardHeader  = { display: 'flex', justifyContent: 'space-between', gap: 8 }
const cardName    = { fontSize: 13, fontWeight: 600, margin: '0 0 4px 0', color: '#212529' }
const cardDesc    = { fontSize: 12, color: '#495057', margin: '0 0 6px 0', lineHeight: 1.5 }
const memberLine  = { fontSize: 11, color: '#868e96', margin: 0 }
const topicTag    = { fontSize: 11, color: '#1971c2', background: '#e7f5ff', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }
const actions     = { flexShrink: 0, display: 'flex', alignItems: 'flex-start', paddingTop: 2 }
const joinBtn     = { fontSize: 12, padding: '4px 10px', border: 'none', borderRadius: 4, background: '#2f9e44', color: '#fff', cursor: 'pointer' }
const joinedBadge = { fontSize: 12, color: '#2f9e44', fontWeight: 600 }
const leaveBtn    = { fontSize: 11, padding: '2px 8px', border: '1px solid #dee2e6', borderRadius: 4, background: '#fff', color: '#868e96', cursor: 'pointer' }
const loginLink   = { fontSize: 12, color: '#1971c2', textDecoration: 'none' }
const cardFooter  = { marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f3f5' }
const feedToggle  = { fontSize: 11, color: '#1971c2', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }
const feedPanel   = { marginTop: 8, paddingTop: 8, borderTop: '1px solid #f8f9fa' }
const feedPost    = { marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f1f3f5' }
const feedPostMeta = { fontSize: 11, color: '#868e96', margin: '0 0 2px 0' }
const feedPostBody = { fontSize: 12, color: '#212529', margin: 0, lineHeight: 1.5 }
```

### 3b. Update src/components/Groups/GroupsTab.jsx

Replace the entire file with the updated version below.
Changes from current: adds filter strip (All | Groups | Local Spaces | Community Networks),
wires CommunityNetworksSection, adds locationType guard for community networks tier check.

```jsx
/**
 * @file src/components/Groups/GroupsTab.jsx
 * @description Groups tab panel. Shows associations ("Groups"), spaces ("Local Spaces"),
 *   and community networks (national networks with local chapters).
 *
 * Props:
 *   locationType  -- geo node type (ward|constituency|county|region|country)
 *   locationSlug  -- geo node slug
 */

import { useState, useEffect }     from 'react'
import { useAuth }                 from '../../context/AuthContext.jsx'
import CommunityNetworksSection    from './CommunityNetworksSection.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'groups',   label: 'Groups' },
  { key: 'spaces',   label: 'Local Spaces' },
  { key: 'networks', label: 'Community Networks' },
]

export default function GroupsTab({ locationType, locationSlug }) {
  const { session }  = useAuth()
  const [filter, setFilter]   = useState('all')
  const [groups,  setGroups]  = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!locationType || !locationSlug) return
    let cancelled = false
    setLoading(true)
    setError(null)

    const headers = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}

    fetch(
      `${API_BASE}/api/groups?type=${encodeURIComponent(locationType)}&slug=${encodeURIComponent(locationSlug)}`,
      { headers }
    )
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { if (!cancelled) { setGroups(data); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError('Failed to load groups'); setLoading(false) } })

    return () => { cancelled = true }
  }, [locationType, locationSlug, session])

  async function handleJoin(kind, id) {
    if (!session?.access_token) return
    const res = await fetch(`${API_BASE}/api/groups/${kind}/${id}/join`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      setGroups(prev => prev.map(g =>
        g._id.toString() === id.toString() ? { ...g, is_member: true } : g
      ))
    }
  }

  const associations = groups.filter(g => g.kind === 'association')
  const spaces       = groups.filter(g => g.kind === 'space')

  const showGroups   = filter === 'all' || filter === 'groups'
  const showSpaces   = filter === 'all' || filter === 'spaces'
  const showNetworks = filter === 'all' || filter === 'networks'

  if (!locationType) {
    return <div style={wrap}><p style={dim}>Select a location to view groups.</p></div>
  }

  return (
    <div style={{ padding: 0 }}>
      {/* Filter strip */}
      <div style={filterStrip}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            style={filter === f.key ? { ...filterBtn, ...filterBtnActive } : filterBtn}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div style={wrap}><p style={dim}>Loading groups...</p></div>}
      {error   && <div style={wrap}><p style={dim}>{error}</p></div>}

      {!loading && !error && (
        <>
          {showGroups && (
            <Section
              title="Groups"
              items={associations}
              showCategory
              session={session}
              onJoin={(id) => handleJoin('associations', id)}
            />
          )}
          {showSpaces && (
            <Section
              title="Local Spaces"
              items={spaces}
              session={session}
              onJoin={(id) => handleJoin('spaces', id)}
            />
          )}
          {showNetworks && (
            <CommunityNetworksSection
              locationType={locationType}
              locationSlug={locationSlug}
              session={session}
            />
          )}
        </>
      )}
    </div>
  )
}

function Section({ title, items, showCategory, session, onJoin }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <p style={sectionHead}>{title}</p>
      {items.length === 0
        ? <p style={{ ...dim, padding: '0 16px 12px' }}>No {title.toLowerCase()} at this location yet.</p>
        : items.map(item => (
          <GroupCard
            key={item._id}
            item={item}
            showCategory={showCategory}
            session={session}
            onJoin={onJoin}
          />
        ))
      }
    </div>
  )
}

function GroupCard({ item, showCategory, session, onJoin }) {
  const [joining, setJoining] = useState(false)

  async function handleClick() {
    setJoining(true)
    await onJoin(item._id)
    setJoining(false)
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={cardName}>{item.name}</p>
          <p style={cardDesc}>{item.description}</p>
          {showCategory && item.category && (
            <span style={badge}>
              {item.category}{item.sub_type ? ` · ${item.sub_type}` : ''}
            </span>
          )}
          <p style={memberCount}>{item.member_count ?? 0} members</p>
        </div>
        <div style={{ flexShrink: 0 }}>
          {item.is_member
            ? <span style={joinedBadge}>Joined</span>
            : session
              ? (
                <button style={joinBtn} onClick={handleClick} disabled={joining}>
                  {joining ? 'Joining...' : 'Join'}
                </button>
              )
              : <a href="/auth" style={loginLink}>Log in to join</a>
          }
        </div>
      </div>
    </div>
  )
}

const wrap         = { padding: 16 }
const dim          = { fontSize: 13, color: '#868e96', margin: 0 }
const filterStrip  = { display: 'flex', gap: 4, padding: '10px 16px 8px', borderBottom: '1px solid #f1f3f5' }
const filterBtn    = { fontSize: 12, padding: '4px 10px', border: '1px solid #dee2e6', borderRadius: 20, background: '#fff', color: '#495057', cursor: 'pointer', whiteSpace: 'nowrap' }
const filterBtnActive = { background: '#1971c2', color: '#fff', borderColor: '#1971c2' }
const sectionHead  = { fontSize: 13, fontWeight: 600, color: '#343a40', margin: '12px 16px 8px' }
const card         = { border: '1px solid #dee2e6', borderRadius: 6, padding: 12, margin: '0 16px 10px', background: '#fff' }
const cardName     = { fontSize: 13, fontWeight: 600, margin: '0 0 4px 0', color: '#212529' }
const cardDesc     = { fontSize: 12, color: '#495057', margin: '0 0 6px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
const badge        = { display: 'inline-block', fontSize: 11, color: '#495057', background: '#f1f3f5', borderRadius: 4, padding: '2px 6px', marginBottom: 4 }
const memberCount  = { fontSize: 11, color: '#868e96', margin: '4px 0 0 0' }
const joinedBadge  = { fontSize: 12, color: '#2f9e44', fontWeight: 600 }
const joinBtn      = { fontSize: 12, padding: '4px 10px', border: 'none', borderRadius: 4, background: '#2f9e44', color: '#fff', cursor: 'pointer' }
const loginLink    = { fontSize: 12, color: '#1971c2', textDecoration: 'none' }
```

### 3c. Build and verify locally

```
npm run build
node server.js
```

Open https://localhost:3443, navigate to a ward or constituency.
Open Groups tab. Verify:
  -- Filter strip visible: All | Groups | Local Spaces | Community Networks
  -- Community Networks section shows 8 network cards
  -- Each card shows name, topic badge, purpose statement, member count
  -- Logged in: Join button visible on each card
  -- After joining: "Joined" badge and "Leave" button appear
  -- "View national posts" toggle loads (empty until posts exist)
  -- At region/country scope: tier warning message shown instead of cards

---

## STOP 4 -- Atlas seed + Deploy

### 4a. Seed Atlas

```
MONGODB_URI="<atlas-uri-from-.env>" node scripts/seed-national-groups.js
```

Confirm: 8 inserted on Atlas.

### 4b. Commit and push

```
git add .
git commit -m "Community Networks: national groups seed, service layer, routes, UI"
git push
```

### 4c. Railway redeploy

In Railway dashboard, trigger manual redeploy of the UKCP service.
Vercel will auto-deploy from push.

### 4d. Verify live

Open https://www.ukcportal.co.uk, navigate to a ward.
Open Groups tab. Verify Community Networks section renders with 8 groups.
Log in and join one -- confirm member count increments.
Check Atlas network_chapters collection -- confirm chapter documents created
on first logged-in view.

---

## STOP 5 -- Verification

### 5a. Check Atlas collections

In MongoDB Atlas UI, verify:
  national_groups:   8 documents
  network_chapters:  at least 8 documents (one per group per scope visited)

Each network_chapter document should have:
  national_group_ref  -- ObjectId matching a national_groups._id
  tier, slug          -- matching the scope visited
  member_count        -- 0 or more
  status: 'active'

### 5b. Check group_memberships

For any chapter you joined, verify a group_memberships document exists:
  collection_type: 'network_chapters'
  collective_id: <chapterId>
  user_id: <your userId>
  status: 'active'

### 5c. Confirm post routing

From GroupsTab, if you can post to a network chapter (after joining),
verify the post appears in:
  -- The chapter card local view (GET /api/posts with collective_ref filter)
  -- The national feed toggle (GET /api/community-networks/:ngId/feed)

---

END OF INSTRUCTION FILE
