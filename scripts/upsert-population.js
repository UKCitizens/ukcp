/**
 * upsert-population.js
 * Writes validated population data to MongoDB geo_content and places collections.
 * Reads scripts/data/population-validated.json — run validate-population.js first.
 * Usage: node scripts/upsert-population.js
 */

import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function upsertPopulation() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('ukcp');

    const validatedData = JSON.parse(
      await fs.readFile(path.join(DATA_DIR, 'population-validated.json'), 'utf8')
    );

    let processed = 0;
    let updated = 0;
    let notFound = 0;
    let errors = 0;
    const total = validatedData.length;

    for (const record of validatedData) {
      processed++;
      try {
        const collectionName = record.source_collection === 'geo_content' ? 'geo_content' : 'places';
        const collection = db.collection(collectionName);

        // geo_content uses ObjectId; places uses plain string _id
        const docId =
          record.source_collection === 'geo_content'
            ? new ObjectId(record.id)
            : record.id;

        const result = await collection.updateOne(
          { _id: docId },
          {
            $set: {
              population: record.population,
              population_source: record.population_source,
              population_updated: new Date().toISOString(),
            },
          }
        );

        if (result.matchedCount === 0) {
          notFound++;
          console.log(`[${processed}/${total}] Not found: ${record.name} (${collectionName})`);
        } else if (result.modifiedCount > 0) {
          updated++;
        }
      } catch (err) {
        errors++;
        console.log(`[${processed}/${total}] Error: ${record.name}: ${err.message}`);
      }
    }

    console.log(`\nUpsert complete:`);
    console.log(`  Processed : ${processed}`);
    console.log(`  Updated   : ${updated}`);
    console.log(`  Not found : ${notFound}`);
    console.log(`  Errors    : ${errors}`);

  } finally {
    await client.close();
  }
}

upsertPopulation().catch(console.error);
