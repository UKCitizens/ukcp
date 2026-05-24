/**
 * @file db/mongo.js
 * @description MongoDB client, connection lifecycle, and collection accessors.
 *
 * One client, one connection, reused for all requests.
 * If Mongo is unavailable at startup the server continues -- only Mongo-backed
 * routes degrade. Collection accessors return null when db is not connected so
 * callers can handle the unavailable case explicitly.
 */

import { MongoClient } from 'mongodb'

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'

export const mongoClient = new MongoClient(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:          10000,
  connectTimeoutMS:         5000,
})

let db = null

/**
 * Opens the MongoDB connection and creates required indexes.
 * Sets the module-level db reference on success.
 * On failure logs the error and leaves db as null -- server continues.
 */
export async function connectMongo() {
  try {
    await mongoClient.connect()
    db = mongoClient.db('ukcp')
    await db.collection('geo_content').createIndex({ type: 1, slug: 1 }, { unique: true })
    await db.collection('users').createIndex({ supabase_id: 1 }, { unique: true })
    await db.collection('users').createIndex({ email: 1 }, { unique: true })
    await db.collection('anon_device_cookies').createIndex({ token: 1 }, { unique: true })
    await db.collection('anon_device_cookies').createIndex({ user_id: 1 })
    await db.collection('national_groups').createIndex({ slug: 1 }, { unique: true })
    await db.collection('national_groups').createIndex({ status: 1 })
    await db.collection('network_chapters').createIndex(
      { national_group_ref: 1, tier: 1, slug: 1 },
      { unique: true }
    )
    await db.collection('network_chapters').createIndex({ tier: 1, slug: 1 })
    await db.collection('network_chapters').createIndex({ status: 1 })
    await db.collection('network_chapters').createIndex(
      { institution_type: 1, institution_id: 1 },
      { unique: true, sparse: true }
    )
    await db.collection('schools').createIndex({ urn:      1 }, { unique: true })
    await db.collection('schools').createIndex({ ward_gss: 1 })
    await db.collection('schools').createIndex({ con_gss:  1 })
    await db.collection('schools').createIndex({ la_gss:   1 })
    await db.collection('schools').createIndex({ location: '2dsphere' }, { sparse: true })
    await db.collection('places').createIndex({ location: '2dsphere' }, { sparse: true })
    await db.collection('posts').createIndex({ 'origin.entity_type': 1, 'origin.entity_id': 1 })
    await db.collection('posts').createIndex({ 'origin.geo_scope.ward_gss':         1 })
    await db.collection('posts').createIndex({ 'origin.geo_scope.constituency_gss': 1 })
    await db.collection('posts').createIndex({ reach_effective:          1 })
    await db.collection('posts').createIndex({ 'author.user_id':         1 })
    await db.collection('posts').createIndex({ created_at:              -1 })
    await db.collection('posts').createIndex({ status:                   1 })
    await db.collection('posts').createIndex({ national_feed_suppressed: 1 })
    await db.collection('post_type_config').createIndex({ post_type: 1 }, { unique: true })
    await db.collection('veracity_votes').createIndex({ post_id: 1, user_id: 1 }, { unique: true })
    await db.collection('post_reactions').createIndex({ post_id: 1, user_id: 1 }, { unique: true })
    await db.collection('user_session').createIndex({ user_id: 1 }, { unique: true })
    await db.collection('user_follows').createIndex({ user_id: 1, entity_type: 1 })
    await db.collection('user_follows').createIndex({ entity_type: 1, entity_id: 1 })
    await db.collection('user_follows').createIndex(
      { user_id: 1, entity_type: 1, entity_id: 1 },
      { unique: true }
    )
    await db.collection('traders').createIndex({ user_id: 1 }, { unique: true })
    await db.collection('traders').createIndex({ 'location.ward_gss': 1 })
    await db.collection('traders').createIndex({ 'location.con_gss': 1 })
    await db.collection('traders').createIndex({ 'location.county_gss': 1 })
    await db.collection('traders').createIndex({ status: 1 })
    await db.collection('traders').createIndex({ category: 1 })
    await db.collection('user_notifications').createIndex({ user_id: 1, category: 1, read: 1, created_at: -1 })
    await db.collection('user_notifications').createIndex({ user_id: 1, resolved: 1 })
    await db.collection('geo_group_state').createIndex({ user_id: 1, group_key: 1 }, { unique: true })
    await db.collection('geo_groups').createIndex({ group_key: 1 }, { unique: true })
    await db.collection('geo_groups').createIndex({ tier: 1 })
    await db.collection('geo_groups').createIndex({ gss: 1 }, { sparse: true })

    // group_memberships has two distinct schemas sharing one collection:
    //   voluntary joins: { collection_type, collective_id (ObjectId), user_id }
    //   geo constituted: { collection_type, group_key (string), user_id }
    //
    // The old index { collection_type, collective_id, user_id } unique WITHOUT
    // partialFilterExpression indexes geo records (collective_id absent) as null,
    // causing dup-key on the second geo record per user. Drop it and recreate
    // with partialFilterExpression so only real collective_id documents are covered.
    try {
      await db.collection('group_memberships').dropIndex('collection_type_1_collective_id_1_user_id_1')
    } catch (_) {}
    // Voluntary-join uniqueness: only index where collective_id is a real value.
    await db.collection('group_memberships').createIndex(
      { collection_type: 1, collective_id: 1, user_id: 1 },
      {
        unique: true,
        partialFilterExpression: { collective_id: { $exists: true, $type: 'objectId' } },
      }
    )
    // Geo-membership uniqueness: keyed by group_key string.
    await db.collection('group_memberships').createIndex(
      { user_id: 1, collection_type: 1, group_key: 1 },
      { unique: true, sparse: true }
    )
    console.log('MongoDB connected')
  } catch (err) {
    console.error('[mongo] connection failed -- continuing without MongoDB:', err.message)
    db = null
  }
}

/** Returns the geo_content collection, or null if Mongo is unavailable. */
export function geoContent()    { return db ? db.collection('geo_content')         : null }

/** Returns the places collection, or null if Mongo is unavailable. */
export function placesCol()     { return db ? db.collection('places')              : null }

/** Returns the users collection, or null if Mongo is unavailable. */
export function usersCol()      { return db ? db.collection('users')               : null }

/** Returns the anon_device_cookies collection, or null if Mongo is unavailable. */
export function anonCookiesCol()      { return db ? db.collection('anon_device_cookies') : null }

/** Returns the associations collection, or null if Mongo is unavailable. */
export function associationsCol()     { return db ? db.collection('associations')      : null }

/** Returns the spaces collection, or null if Mongo is unavailable. */
export function spacesCol()           { return db ? db.collection('spaces')            : null }

/** Returns the group_memberships collection, or null if Mongo is unavailable. */
export function groupMembershipsCol() { return db ? db.collection('group_memberships') : null }

/** Returns the posts collection, or null if Mongo is unavailable. */
export function postsCol()            { return db ? db.collection('posts')             : null }

/** Returns the post_type_config collection, or null if Mongo is unavailable. */
export function postTypeConfigCol()   { return db ? db.collection('post_type_config')  : null }

/** Returns the committees collection, or null if Mongo is unavailable. */
export function committeesCol()       { return db ? db.collection('committees')        : null }

/** Returns the committee_forums collection, or null if Mongo is unavailable. */
export function committeeForumsCol()  { return db ? db.collection('committee_forums')  : null }

/** Returns the national_groups collection, or null if Mongo is unavailable. */
export function nationalGroupsCol()  { return db ? db.collection('national_groups')  : null }

/** Returns the network_chapters collection, or null if Mongo is unavailable. */
export function networkChaptersCol() { return db ? db.collection('network_chapters') : null }

/** Returns the schools collection, or null if Mongo is unavailable. */
export function schoolsCol()         { return db ? db.collection('schools')          : null }

/** Returns the user_session collection, or null if Mongo is unavailable. */
export function sessionCol()         { return db ? db.collection('user_session')     : null }

/** Returns the user_follows collection, or null if Mongo is unavailable. */
export function followsCol()         { return db ? db.collection('user_follows')     : null }

/** Returns the traders collection, or null if Mongo is unavailable. */
export function tradersCol()         { return db ? db.collection('traders')          : null }

/** Returns the user_notifications collection, or null if Mongo is unavailable. */
export function notificationsCol()   { return db ? db.collection('user_notifications') : null }
export function geoGroupStateCol()   { return db ? db.collection('geo_group_state')   : null }
export function geoGroupsCol()       { return db ? db.collection('geo_groups')         : null }

/** Returns the veracity_votes collection, or null if Mongo is unavailable. */
export function veracityVotesCol()   { return db ? db.collection('veracity_votes')     : null }

/** Returns the post_reactions collection, or null if Mongo is unavailable. */
export function postReactionsCol()   { return db ? db.collection('post_reactions')     : null }
