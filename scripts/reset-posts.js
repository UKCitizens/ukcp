/**
 * @file scripts/reset-posts.js
 * @description One-shot reset of the posts collection ahead of the new
 *   post object schema (origin/author/reach model -- see post-design-note.md).
 *
 *   Drops the entire posts collection (data + legacy indexes from sprint-BC).
 *   On next server start, connectMongo() recreates the new index set defined
 *   in db/mongo.js. Safe to run -- only existing content was POC seed data.
 *
 * Usage:
 *   node --env-file=.env scripts/reset-posts.js
 */

import { MongoClient } from 'mongodb'

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'

const client = new MongoClient(MONGO_URI)

await client.connect()
const db = client.db('ukcp')

const before = await db.collection('posts').countDocuments().catch(() => 0)
console.log(`posts before drop: ${before}`)

const exists = await db.listCollections({ name: 'posts' }).hasNext()
if (exists) {
  await db.collection('posts').drop()
  console.log('posts collection dropped')
} else {
  console.log('posts collection did not exist -- nothing to drop')
}

await client.close()
