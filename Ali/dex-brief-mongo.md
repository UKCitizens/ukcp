# Dex Brief — MongoDB Content Layer

## Context

UKCP is a React SPA (Vite) + Express server (`server.js`, port 3000). ES modules throughout (`"type": "module"` in package.json). No TypeScript. Live only — no dev server.

MongoDB Community Server is running locally at `mongodb://localhost:27017`. No Mongo driver is currently installed.

## Goal

Wire MongoDB into `server.js` as the content store for geographic entity content. Replace the current Wikipedia-only pipeline for places with a local-first lookup: if a content record exists in Mongo, return it; otherwise fall back to Wikipedia and optionally cache the result.

---

## Step 1 — Install driver

Use the native MongoDB Node.js driver (not Mongoose — keep dependencies light, ES module compatible).

```
npm install mongodb
```

---

## Step 2 — Database and collection

Database: `ukcp`
Collection: `geo_content`

Each document represents one geographic entity — place, constituency, ward, county, region, or country.

### Document schema

```json
{
  "_id":        "<ObjectId>",
  "type":       "place | constituency | ward | county | region | country",
  "slug":       "string — URL-safe name, matches the key used in /api/content/:type/:slug",
  "name":       "string — display name",
  "summary":    "string — curated short summary (replaces Wikipedia extract when present)",
  "extract":    "string — full Wikipedia extract (cached from API, populated on first fetch)",
  "thumbnail":  "string — image URL",
  "wikiUrl":    "string — Wikipedia page URL",
  "geoData":    {
    "motto":       "string",
    "area":        "string",
    "politics":    "string",
    "economic":    "string",
    "cultural":    "string",
    "history":     "string",
    "website":     "string",
    "environment": "string"
  },
  "updatedAt":  "ISODate"
}
```

Index on `{ type: 1, slug: 1 }` — unique.

---

## Step 3 — Connect in server.js

Add a MongoClient connect at startup. Use a module-level client, connect once, reuse. Connection string in an env var `MONGO_URI` defaulting to `mongodb://localhost:27017`.

Pattern (ES module):

```js
import { MongoClient } from 'mongodb'

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017'
const mongoClient = new MongoClient(MONGO_URI)
let db

async function connectMongo() {
  await mongoClient.connect()
  db = mongoClient.db('ukcp')
  console.log('MongoDB connected')
}
```

Call `connectMongo()` before `app.listen()`.

---

## Step 4 — Modify `/api/content/:type/:slug`

Current behaviour: always calls Wikipedia REST API.

New behaviour:
1. Query `geo_content` for `{ type, slug }`.
2. If doc exists and has `summary` or `extract` — return it (shaped to match current response format).
3. If no doc (or doc has no content) — call Wikipedia as now, then upsert the result into `geo_content` for future use.

### Response shape (must match what the client already expects)

```json
{
  "contentType": "wiki | mp | ward | geo",
  "extract":     "string",
  "thumbnail":   "string | null",
  "title":       "string",
  "wikiUrl":     "string | null"
}
```

When returning from Mongo: `contentType` should reflect origin — use `"wiki"` for Wikipedia-cached, `"curated"` for records where `summary` was manually set.

---

## Step 5 — New endpoint: PATCH `/api/admin/geo-content-mongo/:type/:slug`

Upsert a content record into `geo_content`. Body can include any subset of: `summary`, `extract`, `thumbnail`, `wikiUrl`, `geoData`. Always sets `updatedAt: new Date()`.

This will be used by DataManager to save curated content per entity. Do not wire the frontend yet — endpoint only.

---

## Step 6 — Seed from existing geo-content.json (optional, do if straightforward)

Read `public/data/geo-content.json`, for each entry create a `geo_content` document (type derived from key prefix: `country:`, `region:`, `county:`). Map f1–f14 fields to the schema. Use `insertMany` with `ordered: false` to skip duplicates.

Provide this as a one-shot seed script: `scripts/seed-geo-content.js`. Do not run automatically.

---

## Constraints

- ES modules throughout — use `import`, not `require`
- No Mongoose
- No breaking changes to existing endpoints
- `server.js` must still start cleanly if Mongo is unavailable — log the error, continue serving static/Wikipedia routes
- Agricultural code — readable without AI assistance

## Deliverables

1. `npm install mongodb` done
2. `server.js` updated with connection + modified content endpoint + new admin patch endpoint
3. `scripts/seed-geo-content.js` seed script
4. Brief summary of what was changed and any decisions made
