/**
 * @file routes/forums.js
 * @description Committee forums API routes.
 *
 *   GET  /api/forums          — find forum by location scope (type + slug query params)
 *   GET  /api/forums/:id      — get forum by _id
 *   POST /api/forums/:id/join — join a forum (auth required, postcode verified)
 *
 * GET routes join the parent committee and annotate is_member if a valid
 * Bearer token is present in the Authorization header.
 */

import { Router }   from 'express'
import { ObjectId } from 'mongodb'
import { requireAuth, supabaseAdmin } from '../middleware/auth.js'
import {
  committeesCol,
  committeeForumsCol,
  groupMembershipsCol,
  usersCol,
} from '../db/mongo.js'
import { lookupPostcode } from '../services/postcodes.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

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
router.get('/', asyncHandler(async (req, res) => {
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
}))

// GET /api/forums/:id
router.get('/:id', asyncHandler(async (req, res) => {
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
}))

// POST /api/forums/:id/join
router.post('/:id/join', requireAuth, asyncHandler(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' })
  }

  const forumCol = committeeForumsCol()
  const comCol   = committeesCol()
  const memCol   = groupMembershipsCol()
  if (!forumCol || !comCol || !memCol) {
    return res.status(503).json({ error: 'Database unavailable' })
  }

  // 1. Load forum
  const forum = await forumCol.findOne({ _id: new ObjectId(req.params.id) })
  if (!forum) return res.status(404).json({ error: 'Forum not found' })

  // 2. Load parent committee
  const committee = await comCol.findOne({ _id: forum.committee_ref })
  if (!committee) return res.status(500).json({ error: 'Committee record missing' })

  // 3. Validate postcode input
  const rawPostcode = req.body?.postcode
  if (!rawPostcode?.trim()) {
    return res.status(400).json({ error: 'Postcode is required' })
  }

  const reason = req.body?.reason?.trim().slice(0, 500) || null

  // 4. Resolve postcode via postcodes.io
  let resolved
  try {
    resolved = await lookupPostcode(rawPostcode)
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: 'Postcode not recognised. Please check and try again.' })
    }
    return res.status(503).json({ error: 'Postcode lookup unavailable. Please try again shortly.' })
  }

  // 5. Constituency gate — GSS match preferred, name match as fallback for vintage gap
  const gssMatch  = resolved.con_gss && resolved.con_gss === committee.con_gss
  const nameMatch = resolved.constituency?.toLowerCase().trim() ===
                    committee.name?.toLowerCase().trim()

  if (!gssMatch && !nameMatch) {
    return res.status(403).json({
      error: `This forum is for residents of ${committee.name}. Your postcode is registered to ${resolved.constituency}.`,
    })
  }

  // 6. Idempotent membership check
  const existing = await memCol.findOne({
    collection_type: 'committee_forums',
    collective_id:   forum._id,
    user_id:         req.user._id,
    status:          'active',
  })
  if (existing) return res.json({ message: 'Already a member.' })

  // 7. Provision membership
  await memCol.insertOne({
    collection_type:  'committee_forums',
    collective_id:    forum._id,
    user_id:          req.user._id,
    membership_role:  'member',
    status:           'active',
    joined_at:        new Date(),
    postcode:         resolved.postcode,
    con_gss:          resolved.con_gss,
    reason,
  })

  // Persist confirmed location to user record. Overwrites on re-join — intentional.
  const usrColRef = usersCol()
  if (usrColRef) {
    await usrColRef.updateOne(
      { _id: req.user._id },
      {
        $set: {
          'confirmed_location.postcode':     resolved.postcode,
          'confirmed_location.ward':         resolved.ward,
          'confirmed_location.ward_gss':     resolved.ward_gss,
          'confirmed_location.constituency': resolved.constituency,
          'confirmed_location.con_gss':      resolved.con_gss,
          'confirmed_location.confirmed_at': new Date(),
        },
      }
    )
  }

  // 8. Increment member_count
  await forumCol.updateOne({ _id: forum._id }, { $inc: { member_count: 1 } })

  // 9. Confirm
  res.status(201).json({ message: 'Membership confirmed.', forumName: forum.name })
}))

export default router
