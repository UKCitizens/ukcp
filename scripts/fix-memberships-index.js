/**
 * One-time migration: fix the group_memberships collective_id index.
 *
 * The old index { collection_type, collective_id, user_id } was created as
 * unique without sparse=true. Geo membership records have collective_id: null,
 * so the second geo record per user triggers a dup-key error.
 *
 * Fix: drop the old index, recreate as sparse so null values are not indexed.
 */

import 'dotenv/config'
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
await client.connect()
const col = client.db('ukcp').collection('group_memberships')

// Drop the conflicting index (ignore error if already gone)
try {
  await col.dropIndex('collection_type_1_collective_id_1_user_id_1')
  console.log('Dropped old index')
} catch (e) {
  console.log('Drop skipped (index may not exist):', e.message)
}

// Recreate as sparse so null collective_id rows are not indexed
await col.createIndex(
  { collection_type: 1, collective_id: 1, user_id: 1 },
  { unique: true, sparse: true, name: 'collection_type_1_collective_id_1_user_id_1' }
)
console.log('Recreated index as sparse+unique')

// Confirm indexes now on the collection
const indexes = await col.indexes()
indexes.forEach(i => console.log(' ', i.name, JSON.stringify(i.key), i.sparse ? 'sparse' : ''))

await client.close()
