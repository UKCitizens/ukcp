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
import { postsCol, networkChaptersCol } from '../db/mongo.js'

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
  const VALID_TIERS = ['ward', 'constituency', 'county', 'city', 'town', 'village', 'hamlet']
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

// GET /api/community-networks/chapter-by-institution?type=school&id=100045
router.get('/chapter-by-institution', async (req, res) => {
  const col = networkChaptersCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })
  const { type, id } = req.query
  if (!type || !id) return res.status(400).json({ error: 'type and id required' })
  try {
    const chapter = await col.findOne(
      { institution_type: type, institution_id: id },
      { projection: { _id: 1 } }
    )
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' })
    res.json({ chapter_id: chapter._id })
  } catch (err) {
    res.status(500).json({ error: 'Failed to find chapter' })
  }
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
        national_feed_suppressed:    true,
        national_feed_suppressed_at: new Date(),
        national_feed_suppressed_by: req.user._id,
      }
    }
  )

  if (!result.matchedCount) return res.status(404).json({ error: 'Post not found' })
  res.json({ status: 'suppressed' })
})

export default router
