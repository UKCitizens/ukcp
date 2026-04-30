/**
 * @file routes/groups.js
 * @description Groups API routes.
 *
 *   GET  /api/groups                   — list groups (associations + spaces) at a location
 *   POST /api/groups/:kind/:id/join    — join a group (auth required)
 *   GET  /api/groups/:kind/:id/members — list members (auth required, POC stub)
 */

import { Router }      from 'express'
import { ObjectId }    from 'mongodb'
import { requireAuth, supabaseAdmin } from '../middleware/auth.js'
import {
  associationsCol,
  spacesCol,
  groupMembershipsCol,
  usersCol,
} from '../db/mongo.js'

const router = Router()

/**
 * Resolve caller's MongoDB _id from an optional Bearer token.
 * Returns ObjectId or null — never throws.
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

// GET /api/groups
router.get('/', async (req, res) => {
  const { type, slug, kind } = req.query
  if (!type || !slug) {
    return res.status(400).json({ error: 'type and slug are required' })
  }

  const assocCol = associationsCol()
  const spcCol   = spacesCol()
  const memCol   = groupMembershipsCol()
  if (!assocCol || !spcCol) {
    return res.status(503).json({ error: 'Database unavailable' })
  }

  const locationQuery = { 'location_scope.type': type, 'location_scope.slug': slug }
  let results = []

  if (kind !== 'spaces') {
    const assocs = await assocCol.find(locationQuery).toArray()
    assocs.forEach(a => { a.kind = 'association' })
    results = results.concat(assocs)
  }

  if (kind !== 'associations') {
    const spaces = await spcCol.find(locationQuery).toArray()
    spaces.forEach(s => { s.kind = 'space' })
    results = results.concat(spaces)
  }

  results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  // Annotate is_member if caller sends a valid JWT.
  const callerId = memCol ? await optionalUserId(req) : null
  if (callerId && memCol && results.length) {
    const ids = results.map(r => r._id)
    const memberships = await memCol.find({
      collective_id: { $in: ids },
      user_id:       callerId,
      status:        'active',
    }).toArray()
    const memberSet = new Set(memberships.map(m => m.collective_id.toString()))
    results.forEach(r => { r.is_member = memberSet.has(r._id.toString()) })
  } else {
    results.forEach(r => { r.is_member = false })
  }

  res.json(results)
})

// POST /api/groups/:kind/:id/join
router.post('/:kind/:id/join', requireAuth, async (req, res) => {
  const { kind, id } = req.params

  if (!['associations', 'spaces'].includes(kind)) {
    return res.status(400).json({ error: 'kind must be associations or spaces' })
  }
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid id' })
  }

  const targetCol = kind === 'associations' ? associationsCol() : spacesCol()
  const memCol    = groupMembershipsCol()
  if (!targetCol || !memCol) {
    return res.status(503).json({ error: 'Database unavailable' })
  }

  const objectId = new ObjectId(id)
  const target   = await targetCol.findOne({ _id: objectId })
  if (!target) return res.status(404).json({ error: 'Group not found' })

  if (target.membership_model !== 'open') {
    return res.status(403).json({ error: 'Closed membership not yet supported.' })
  }

  // Idempotent: return 200 if already an active member.
  const existing = await memCol.findOne({
    collection_type: kind,
    collective_id:   objectId,
    user_id:         req.user._id,
    status:          'active',
  })
  if (existing) return res.json({ status: 'already_member' })

  await memCol.insertOne({
    collection_type: kind,
    collective_id:   objectId,
    user_id:         req.user._id,
    membership_role: 'member',
    status:          'active',
    joined_at:       new Date(),
  })

  await targetCol.updateOne({ _id: objectId }, { $inc: { member_count: 1 } })

  res.status(201).json({ status: 'joined' })
})

// GET /api/groups/:kind/:id/members
router.get('/:kind/:id/members', requireAuth, async (req, res) => {
  const { kind, id } = req.params

  if (!['associations', 'spaces'].includes(kind)) {
    return res.status(400).json({ error: 'kind must be associations or spaces' })
  }
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid id' })
  }

  const memCol = groupMembershipsCol()
  const usrCol = usersCol()
  if (!memCol) return res.status(503).json({ error: 'Database unavailable' })

  const objectId = new ObjectId(id)

  const callerMembership = await memCol.findOne({
    collection_type: kind,
    collective_id:   objectId,
    user_id:         req.user._id,
    status:          'active',
  })
  if (!callerMembership) return res.status(403).json({ error: 'Members only' })

  const total   = await memCol.countDocuments({ collective_id: objectId, status: 'active' })
  const records = await memCol.find({ collective_id: objectId, status: 'active' })
    .limit(20).toArray()

  let members = records.map(r => ({
    user_id:      r.user_id,
    display_name: 'citizen',
    role:         r.membership_role,
    joined_at:    r.joined_at,
  }))

  if (usrCol && records.length) {
    const userIds = records.map(r => r.user_id)
    const users   = await usrCol.find({ _id: { $in: userIds } })
      .project({ display_name: 1 }).toArray()
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.display_name]))
    members = members.map(m => ({ ...m, display_name: userMap[m.user_id.toString()] ?? 'citizen' }))
  }

  res.json({ total, members })
})

export default router
