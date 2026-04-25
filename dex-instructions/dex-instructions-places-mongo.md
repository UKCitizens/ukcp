# Dex Instructions — Places MongoDB Migration

## Context
Ali has migrated the `places` data layer from in-memory CSV to MongoDB. The `places` collection needs seeding from the existing newplace.csv + place-corrections.json. Three steps to execute, in order.

Working directory for all commands: `C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP`

---

## Step 1 — Seed the places collection

Run the seed script against local MongoDB:

```bash
node scripts/seed-places.js
```

Expected output:
- `parsed 54209 rows` (approx)
- Corrections count (however many are in place-corrections.json)
- Progress counter to 54209
- `indexes created`
- `done`

If local Mongo is not running, start it first (`mongod`).

---

## Step 2 — Smoke test both search endpoints

After seeding, restart the server (`node server.js`) and test:

```bash
# Public typeahead
curl "http://localhost:3000/api/places/search?q=Preston&limit=5"

# Admin search
curl "http://localhost:3000/api/admin/places?q=Preston&limit=5"

# Corrections map (should return {} if no corrections yet, or a populated map)
curl "http://localhost:3000/api/admin/places/corrections"
```

All three should return JSON without errors. If any return `MongoDB unavailable`, check that `connectMongo()` completed successfully in server startup logs.

---

## Notes
- `place_corrections` collection in Mongo is now superseded — the `places` collection is master
- `_corrected: true` flag is set on any document that had a correction applied during seed, or saved via PlaceCorrector going forward
- `scripts/export-places.js` regenerates newplace.csv from Mongo — run before `npm run build`
