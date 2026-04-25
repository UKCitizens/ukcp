/**
 * gather-population.js
 * Fetches population data for all geo_content and places records.
 * Sources tried in order: Wikidata direct → Wikipedia → Wikidata search → DBpedia.
 * Usage: node scripts/gather-population.js [--test]
 */

import { MongoClient } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const RATE_LIMIT_MS = 200;

let lastFetchTime = 0;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** Enforces 200ms gap between external API calls. */
async function rateLimitedFetch(url) {
  const wait = RATE_LIMIT_MS - (Date.now() - lastFetchTime);
  if (wait > 0) await sleep(wait);
  lastFetchTime = Date.now();
  return fetch(url);
}

// Q145=UK, Q4421=Great Britain, Q21=England, Q22=Scotland, Q25=Wales, Q26=Northern Ireland
const UK_QIDS = new Set(['Q145', 'Q4421', 'Q21', 'Q22', 'Q25', 'Q26']);

/** Returns true if entity claims P17 (country) or P131 (located in) contains a UK QID. */
function isUKEntity(entity) {
  const claims = entity?.claims || {};
  for (const prop of ['P17', 'P131']) {
    for (const claim of (claims[prop] || [])) {
      const id = claim.mainsnak?.datavalue?.value?.id;
      if (UK_QIDS.has(id)) return true;
    }
  }
  return false;
}

/** Extracts population integer from Wikidata P1082 claims array. */
function extractPopulation(entity) {
  const claims = entity?.claims?.P1082 || [];
  if (!claims.length) return null;
  const amount = claims[0].mainsnak?.datavalue?.value?.amount;
  if (!amount) return null;
  const pop = parseInt(String(amount).replace(/^\+/, ''), 10);
  return isNaN(pop) ? null : pop;
}

/** Source 1: Wikidata P1082 via known QID. */
async function source1_wikidataDirect(qid) {
  try {
    const id = String(qid).replace(/^Q/i, '');
    const resp = await rateLimitedFetch(`https://www.wikidata.org/wiki/Special:EntityData/Q${id}.json`);
    if (!resp.ok) return null;
    const data = await resp.json();
    const entity = data.entities?.[`Q${id}`];
    if (!entity) return null;
    const pop = extractPopulation(entity);
    return pop ? { population: pop, qid: `Q${id}` } : null;
  } catch {
    return null;
  }
}

/** Source 2: Wikipedia REST summary → wikibase_item → Wikidata P1082, with UK constraint. */
async function source2_viaWikipedia(name) {
  try {
    const resp = await rateLimitedFetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.wikibase_item) return null;
    const resolvedQid = data.wikibase_item;
    const id = resolvedQid.replace(/^Q/i, '');
    const entityResp = await rateLimitedFetch(
      `https://www.wikidata.org/wiki/Special:EntityData/Q${id}.json`
    );
    if (!entityResp.ok) return null;
    const entityData = await entityResp.json();
    const entity = entityData.entities?.[`Q${id}`];
    if (!entity) return null;
    if (!isUKEntity(entity)) {
      return { error: 'entity resolved to non-UK location', qid: resolvedQid };
    }
    const pop = extractPopulation(entity);
    return pop ? { population: pop, qid: resolvedQid } : null;
  } catch {
    return null;
  }
}

const PLACE_TYPES = [
  'city', 'town', 'village', 'hamlet', 'settlement',
  'parish', 'district', 'county', 'region', 'country',
];
const UK_TERMS = [
  'england', 'scotland', 'wales', 'northern ireland',
  'united kingdom', 'british',
];

/** Source 3: Wikidata entity search → P1082, with relaxed matching and UK constraint. */
async function source3_wikidataSearch(name) {
  try {
    const resp = await rateLimitedFetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=10&format=json`
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const results = data.search || [];

    let matched = null;

    // Rule 1+2: description has recognised place type AND UK term
    for (const r of results) {
      const desc = (r.description || '').toLowerCase();
      if (PLACE_TYPES.some(t => desc.includes(t)) && UK_TERMS.some(t => desc.includes(t))) {
        matched = r;
        break;
      }
    }

    // Rule 3: relax place type — UK term present AND label is exact name match
    if (!matched) {
      for (const r of results) {
        const desc = (r.description || '').toLowerCase();
        const labelMatch = (r.label || '').toLowerCase() === name.toLowerCase();
        if (UK_TERMS.some(t => desc.includes(t)) && labelMatch) {
          matched = r;
          break;
        }
      }
    }

    if (!matched) return { error: 'entity search no confident match' };

    const id = matched.id.replace(/^Q/i, '');
    const entityResp = await rateLimitedFetch(
      `https://www.wikidata.org/wiki/Special:EntityData/Q${id}.json`
    );
    if (!entityResp.ok) return null;
    const entityData = await entityResp.json();
    const entity = entityData.entities?.[`Q${id}`];
    if (!entity) return null;
    if (!isUKEntity(entity)) {
      return { error: 'entity resolved to non-UK location', qid: matched.id };
    }
    const pop = extractPopulation(entity);
    return pop ? { population: pop, qid: matched.id } : null;
  } catch {
    return null;
  }
}

/** Source 4: DBpedia SPARQL, last resort. */
async function source4_dbpedia(qidOrName) {
  try {
    let subject;
    if (qidOrName && /^Q\d+$/i.test(qidOrName)) {
      const id = qidOrName.replace(/^Q/i, '');
      subject = `<http://www.wikidata.org/entity/Q${id}>`;
    } else {
      subject = `dbr:${(qidOrName || '').replace(/\s+/g, '_')}`;
    }
    const query = `SELECT ?pop WHERE { ${subject} owl:sameAs ?s . ?s dbo:populationTotal ?pop }`;
    const resp = await rateLimitedFetch(
      `https://dbpedia.org/sparql?query=${encodeURIComponent(query)}&format=json`
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const bindings = data.results?.bindings || [];
    if (!bindings.length) return null;
    const pop = parseInt(bindings[0].pop?.value || '0', 10);
    return (!isNaN(pop) && pop > 0) ? { population: pop } : null;
  } catch {
    return null;
  }
}

/**
 * Runs all four sources in order for a single record, stopping at first success.
 * @param {object} record - MongoDB document
 * @param {'geo_content'|'places'} sourceCollection
 */
async function gatherPopulation(record, sourceCollection) {
  const result = {
    id: record._id.toString(),
    name: record.name,
    source_collection: sourceCollection,
    place_type: sourceCollection === 'geo_content' ? record.type : record.place_type,
    qid: record._qid || null,
    qid_resolved: false,
    population: null,
    population_source: null,
    sources_tried: [],
    population_fetched: new Date().toISOString(),
    error: null,
  };

  const hasQid = !!record._qid;

  // Source 1 — only when QID is known
  if (hasQid) {
    result.sources_tried.push('wikidata_p1082_direct');
    const s1 = await source1_wikidataDirect(record._qid);
    if (s1?.population) {
      result.population = s1.population;
      result.population_source = 'wikidata_p1082_direct';
      result.qid_resolved = true;
      return result;
    }
  }

  // Source 2 — Wikipedia REST
  result.sources_tried.push('wikidata_p1082_via_wikipedia');
  const s2 = await source2_viaWikipedia(record.name);
  if (s2?.population) {
    result.population = s2.population;
    result.population_source = 'wikidata_p1082_via_wikipedia';
    result.qid_resolved = true;
    result.qid = s2.qid;
    return result;
  }

  const s2NonUK = s2?.error === 'entity resolved to non-UK location';
  if (s2NonUK) {
    // Per spec: non-UK from Source 2 → skip Source 3, go straight to Source 4
    result.error = s2.error;
    if (s2.qid) result.qid = s2.qid;
  } else {
    // Source 3 — Wikidata entity search
    result.sources_tried.push('wikidata_p1082_search');
    const s3 = await source3_wikidataSearch(record.name);
    if (s3?.population) {
      result.population = s3.population;
      result.population_source = 'wikidata_p1082_search';
      result.qid_resolved = true;
      result.qid = s3.qid;
      return result;
    }
    if (s3?.error && s3.error !== 'entity search no confident match') {
      result.error = s3.error;
      if (s3.qid) result.qid = s3.qid;
    }
  }

  // Source 4 — DBpedia
  result.sources_tried.push('dbpedia_populationtotal');
  const s4 = await source4_dbpedia(result.qid || record.name);
  if (s4?.population) {
    result.population = s4.population;
    result.population_source = 'dbpedia_populationtotal';
    result.qid_resolved = true;
    return result;
  }

  if (!result.error) result.error = 'all sources exhausted';
  return result;
}

const STAGING_FILE = path.join(DATA_DIR, 'population-gather-staging.json');
const FINAL_FILE = path.join(DATA_DIR, 'population-gather.json');
const CHECKPOINT_EVERY = 100;

async function main() {
  const isTest = process.argv.includes('--test');
  const isFresh = process.argv.includes('--fresh');
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('ukcp');
    await fs.mkdir(DATA_DIR, { recursive: true });

    // Load staging file unless --fresh or --test
    let results = [];
    let processedIds = new Set();
    if (!isTest && !isFresh) {
      try {
        const staged = JSON.parse(await fs.readFile(STAGING_FILE, 'utf8'));
        results = staged;
        processedIds = new Set(staged.map(r => r.id));
        if (processedIds.size > 0) {
          console.log(`Resuming from staging — ${processedIds.size} records already done`);
        }
      } catch {
        // No staging file — fresh start
      }
    }

    let geoContent = await db.collection('geo_content').find({}).toArray();
    let places = await db.collection('places').find({}).toArray();

    if (isTest) {
      const pick = (arr, n) => arr.sort(() => Math.random() - 0.5).slice(0, n);
      geoContent = pick(geoContent, 5);
      places = pick(places, 5);
      console.log(`TEST MODE — ${geoContent.length} geo_content + ${places.length} places`);
    }

    let all = [
      ...geoContent.map(r => ({ record: r, col: 'geo_content' })),
      ...places.map(r => ({ record: r, col: 'places' })),
    ];

    // Skip already-processed records
    if (processedIds.size > 0) {
      all = all.filter(({ record }) => !processedIds.has(record._id.toString()));
    }

    const grandTotal = results.length + all.length;
    console.log(`Full run — ${grandTotal} total, ${all.length} remaining`);
    if (!isTest) {
      console.log(`Estimated remaining time: ~${Math.ceil(all.length * 0.2 / 60)} min`);
    }

    let newThisBatch = 0;

    for (let i = 0; i < all.length; i++) {
      const { record, col } = all[i];
      const res = await gatherPopulation(record, col);
      results.push(res);
      newThisBatch++;

      const overall = results.length;

      if (newThisBatch % CHECKPOINT_EVERY === 0) {
        await fs.writeFile(STAGING_FILE, JSON.stringify(results, null, 2), 'utf8');
        console.log(`[${overall}/${grandTotal}] checkpoint saved — last: ${record.name}`);
      } else if (overall % 500 === 0 || overall === grandTotal) {
        console.log(`[${overall}/${grandTotal}] ${record.name}`);
      }
    }

    // Final write
    await fs.writeFile(FINAL_FILE, JSON.stringify(results, null, 2), 'utf8');

    // Remove staging file on clean completion
    try { await fs.unlink(STAGING_FILE); } catch { /* already gone */ }

    const successful = results.filter(r => r.population !== null).length;
    const failed = results.filter(r => r.population === null).length;

    console.log(`\nDone:`);
    console.log(`  Total    : ${results.length}`);
    console.log(`  Resolved : ${successful}`);
    console.log(`  Failed   : ${failed}`);
    console.log(`\nOutput: scripts/data/population-gather.json`);

  } finally {
    await client.close();
  }
}

main().catch(console.error);
