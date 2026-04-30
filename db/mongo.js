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

/** Returns the committees collection, or null if Mongo is unavailable. */
export function committeesCol()       { return db ? db.collection('committees')        : null }

/** Returns the committee_forums collection, or null if Mongo is unavailable. */
export function committeeForumsCol()  { return db ? db.collection('committee_forums')  : null }
