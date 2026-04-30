/**
 * @file routes/forums.js
 * @description Committee forums API routes.
 *
 *   GET /api/forums       — find forum by location scope (type + slug query params)
 *   GET /api/forums/:id   — get forum by _id
 *
 * Both routes join the parent committee and annotate is_member if a valid
 * Bearer token is present in the Authorization header.
 */

import { Router }   from 'express'
import { ObjectId } from 'mongodb'
import { supabaseAdmin } from '../middleware/auth.js'
import {
  committeesCol,
  committeeForumsCol,
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
  const col = usersCol()
  if (!col) return null
  const record = await col.findOne({ supabase_id: user.id }, { projection: { _id: 1 } })
  return record?._id ?? null
}

/**
 * Join parent committee data onto a forum document.
 * Mutates forum in place, returns it.
 */
async function joinCommittee(forum) {
  if (!forum?.committee_ref) return forum
  const col       = committeesCol()
  const committee = col
    ? await col.findOne(
        { _id: forum.committee_ref },
        { projection: { name: 1, con_gss: 1, jurisdiction: 1, mp_name: 1, mp_party: 1 } }
      )
    : null
  forum.committee = committee
    ? {
        name:         committee.name,
        con_gss:      committee.con_gss,
        jurisdiction: committee.jurisdiction,
        mp_name:      committee.mp_name,
        mp_party:     committee.mp_party,
      }
    : null
  return forum
}

/**
 * Annotate is_member on a forum document for the given caller.
 * Mutates forum in place.
 */
async function annotateMembership(forum, callerId) {
  if (!callerId) { forum.is_member = false; return forum }
  const memCol = groupMembershipsCol()
  if (!memCol) { forum.is_member = false; return forum }
  const mem = await memCol.findOne({
    collection_type: 'committee_forums',
    collective_id:   forum._id,
    user_id:         callerId,
    status:          'active',
  })
  forum.is_member = !!mem
  return forum
}

// GET /api/forums
router.get('/', async (req, res) => {
  const { type, slug } = req.query
  if (!type || !slug) {
    return res.status(400).json({ error: 'type and slug are required' })
  }

  const col = committeeForumsCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  const forum = await col.findOne({
    'location_scope.type': type,
    'location_scope.slug': slug,
  })
  if (!forum) return res.status(404).json({ error: 'Forum not found' })

  await joinCommittee(forum)

  const callerId = await optionalUserId(req)
  await annotateMembership(forum, callerId)

  res.json(forum)
})

// GET /api/forums/:id
router.get('/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' })
  }

  const col = committeeForumsCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  const forum = await col.findOne({ _id: new ObjectId(req.params.id) })
  if (!forum) return res.status(404).json({ error: 'Forum not found' })

  await joinCommittee(forum)

  const callerId = await optionalUserId(req)
  await annotateMembership(forum, callerId)

  res.json(forum)
})

export default router
