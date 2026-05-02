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
    national_group_ref:      { $in: groupIds },
    'location_scope.type':   type,
    'location_scope.slug':   slug,
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
      filter: { national_group_ref: ng._id, slug: `${ng.slug}--${tier}--${slug.toLowerCase()}` },
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

  // Posts use the new schema: origin.entity_type='network_chapter' and entity_id
  // is stored as a string. Translate chapter ObjectIds accordingly.
  const chapterIds = chapters.map(c => String(c._id))

  const postQuery = {
    'origin.entity_type':     'network_chapter',
    'origin.entity_id':       { $in: chapterIds },
    status:                   'active',
    national_feed_suppressed: { $ne: true },
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
