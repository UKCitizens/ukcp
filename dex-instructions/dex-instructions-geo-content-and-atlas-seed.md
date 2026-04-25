# Dex Instructions — Geo Content Seeding + Atlas Places Seed

Working directory for all commands: `C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP`

---

## Part 1 — Seed geo-content.json (f4, f5, f13, seed_text)

Runs against Wikipedia and Wikidata. Writes to `public/data/geo-content.json` in place.
Safe to re-run — only overwrites fields that were successfully fetched.

```bash
python Ali/geo_content_seed.py
```

Expected output: ~2 minutes runtime (114 entries, 0.5s rate limit per Wikipedia call).
Reports counts for f4 (motto), f5 (area), f13 (website) written.
Also writes `public/data/geo-content-seed.json` sidecar (seed_text + QIDs — reference only, not shipped).

If any entries fail (HTTP 404 etc.), they'll be listed. Note them — they'll need manual QID or slug overrides added to `SLUG_OVERRIDES` in the script.

---

## Part 2 — Seed geo-content.json (f6 — political composition)

Fetches current Commons MPs from Parliament Members API. Rolls up party seat counts to county → region → country.
Writes f6 to the same `public/data/geo-content.json`.

```bash
python Ali/geo_content_politics.py
```

Expected output: ~10 seconds (2–3 API calls + optional fallback for unmatched constituencies ~90s).
Reports: counties written, regions written, country totals.

Run this AFTER Part 1 so both write to the same updated file.

---

## Part 3 — Commit updated geo-content.json

After both scripts complete:

```bash
git add public/data/geo-content.json
git commit -m "Seed geo-content f4/f5/f6/f13 from Wikipedia/Wikidata/Parliament"
git push
```

---

## Part 4 — Seed Atlas places collection

The `places` collection in local Mongo is already seeded. Atlas needs the same seed run against it.

Set MONGODB_URI to the Atlas connection string and run:

```bash
set MONGODB_URI=mongodb+srv://ukcp99_db_user:bFhTUmtJuFkdOxFE@ukcp-dev.ujrjkvz.mongodb.net/ukcp?appName=UKCP-Dev
node scripts/seed-places.js
```

Or in PowerShell:

```powershell
$env:MONGODB_URI = "mongodb+srv://ukcp99_db_user:bFhTUmtJuFkdOxFE@ukcp-dev.ujrjkvz.mongodb.net/ukcp?appName=UKCP-Dev"
node scripts/seed-places.js
```

Expected output:
- `parsed 54209 rows`
- Corrections count
- Progress counter to 54209
- `indexes created`
- `done`

Note: seed-places.js uses `process.env.MONGODB_URI` if set, falling back to `mongodb://localhost:27017`. Confirm the script honours this before running — check top of `scripts/seed-places.js` for the connection line.

---

## Part 5 — Seed Atlas geo_content collection

After geo-content.json is updated (Parts 1–2), seed geo_content into Atlas:

```powershell
$env:MONGODB_URI = "mongodb+srv://ukcp99_db_user:bFhTUmtJuFkdOxFE@ukcp-dev.ujrjkvz.mongodb.net/ukcp?appName=UKCP-Dev"
node scripts/seed-geo-content.js
```

This script uses `insertMany` with `ordered:false` — it skips existing docs (duplicate key) and inserts new ones. To force a full refresh, drop the `geo_content` collection in Atlas first via the Atlas UI, then re-run.

Note: seed-geo-content.js was using `MONGO_URI` (no DB suffix) — this has been corrected to `MONGODB_URI` to match all other scripts.

---

## Part 6 — Smoke test Atlas via Railway

After Atlas is seeded, hit the live Railway endpoint to confirm it's reading from Atlas:

```bash
curl "https://ukcp-production.up.railway.app/api/places/search?q=Preston&limit=5"
```

Should return JSON place results. If it returns `MongoDB unavailable`, Railway env var `MONGODB_URI` may need checking — it should already be set to the Atlas string.

---

## Ongoing sync model

Local Mongo and Atlas are separate stores and will drift. The sync discipline is:

**To push local → Atlas (before deploy):**
1. `node scripts/export-places.js` — dumps local places Mongo → newplace.csv
2. `node scripts/export-geo-content.js` — dumps local geo_content Mongo → geo-content.json
3. `git add . && git commit && git push`
4. Re-seed Atlas if places data changed: `MONGODB_URI=<atlas> node scripts/seed-places.js`
5. Re-seed Atlas geo if geo changed: drop `geo_content` in Atlas UI, then `MONGODB_URI=<atlas> node scripts/seed-geo-content.js`

**To pull Atlas → local (after production edits via DataManager):**
1. `MONGODB_URI=<atlas> node scripts/export-geo-content.js` — pulls Atlas geo_content → geo-content.json
2. `MONGODB_URI=<atlas> node scripts/export-places.js` — pulls Atlas places → newplace.csv
3. Review diff, commit if correct.

`export-geo-content.js` is a merge — it overlays Mongo values on the existing JSON, preserving fields not tracked in Mongo (f2 population etc.).
