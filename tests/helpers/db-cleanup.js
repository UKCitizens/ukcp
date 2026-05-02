/**
 * @file tests/helpers/db-cleanup.js
 * @description Reset Phil's user_session and user_follows rows between tests.
 *
 * Looks up his Mongo user _id by email, then deletes only rows owned by that
 * user. Does not touch any other user's data and does not delete the user
 * record itself. Safe to run between tests.
 *
 * Returns the user's _id and supabase_id for tests that need them.
 */

import { MongoClient } from 'mongodb'

const TEST_EMAIL = process.env.DEX_TEST_EMAIL ?? 'phild@btltd.net'

let cachedClient = null

async function getClient() {
  if (cachedClient) return cachedClient
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')
  cachedClient = new MongoClient(uri)
  await cachedClient.connect()
  return cachedClient
}

export async function cleanTestUserState() {
  const client = await getClient()
  const db     = client.db('ukcp')
  const user   = await db.collection('users').findOne({ email: TEST_EMAIL })
  if (!user) return null  // user not yet created in Mongo (first login provisions)
  await db.collection('user_session').deleteMany({ user_id: user._id })
  await db.collection('user_follows').deleteMany({ user_id: user._id })
  return user
}

export async function getTestUser() {
  const client = await getClient()
  return client.db('ukcp').collection('users').findOne({ email: TEST_EMAIL })
}

export async function getFollows(userId) {
  const client = await getClient()
  return client.db('ukcp').collection('user_follows')
    .find({ user_id: userId }).toArray()
}

export async function getSnapshot(userId) {
  const client = await getClient()
  return client.db('ukcp').collection('user_session').findOne({ user_id: userId })
}

export async function closeDb() {
  if (cachedClient) {
    await cachedClient.close()
    cachedClient = null
  }
}
