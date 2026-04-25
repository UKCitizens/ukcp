# Dex Instruction File — Population Gather (v2)
> Pattern: AI-gather → validate → upsert
> Goal: populate `population` field across all places + geo_content entries.
> Updated: relaxed entity matching, country constraint, test mode, full scope.
> Read this file fully before starting. Execute each step in order.

---

## Context

This is the UKCP content pipeline POC pattern:

1. A Node gather script runs locally — no LLM, pure API calls, writes an intermediate file.
2. Dex reads the intermediate file, validates quality, flags exceptions.
3. A Node upsert script writes clean rows to Mongo. Exceptions preserved for review.

The LLM (Dex) is involved only in step 2 — judgment on edge cases, not mechanical fetching.

---

## Pre-flight — check geo_content _qid

Before running the gather, check whether the `geo_content` Mongo collection has `_qid` populated:

```js
db.geo_content.findOne({ _qid: { $exists: true, $ne: null } }, { name: 1, _qid: 1 })
db.geo_content.countDocuments({ _qid: { $exists: true, $ne: "" } })
```

Report the count. If zero, check whether the field is stored as `qid` (without underscore) or
another variant:

```js
db.geo_content.findOne({}, { name: 1, _qid: 1, qid: 1 })
```

Report the actual field name found. Use whichever field holds the Wikidata QID in the gather
script below. If no QID field exists at all in geo_content, skip Source 1 for those records
and proceed with Source 2.

---

## Step 1 — Write and run gather-population.js

Create `scripts/gather-population.js`.

### Scope

- `geo_content` collection: all 115 docs.
- `places` collection: ALL docs (54,209 rows) — not filtered by place_type.

### Test mode

Script accepts an optional `--test` flag:

```bash
node scripts/gather-population.js --test
```

In test mode: take 10 records only — 5 from `geo_content`, 5 from `places` (random sample).
Run full pipeline on those 10, write output files, report results. Use this to verify the
script before the full run.

Full run (no flag): processes all records. At 200ms per call, ~54K records ≈ 3 hours.
Script should log progress every 500 records: `[500/54209] ...`.

### Source resolution — try in order until a population value is found

For every record, attempt sources in the order below. Stop at the first success.
Record which source resolved in `population_source`. Record every source attempted in `sources_tried`.

**Source 1 — Wikidata P1082 via QID (direct)**
Available when a QID field is present and non-empty.
Normalise to bare numeric ID (strip `Q` prefix if present). Call:
```
https://www.wikidata.org/wiki/Special:EntityData/Q{id}.json
```
Extract `entities.Q{id}.claims.P1082` — take the most recent `mainsnak.datavalue.value.amount`.
Strip leading `+`. Parse as integer.
`population_source`: `"wikidata_p1082_direct"`

**Source 2 — Wikipedia REST Summary → QID → Wikidata P1082**
Call:
```
https://en.wikipedia.org/api/rest_v1/page/summary/{name}
```
URL-encode name. If response contains `wikibase_item`, store as resolved QID and query
Wikidata P1082 as above.
`population_source`: `"wikidata_p1082_via_wikipedia"`

**Source 3 — Wikidata entity search → P1082**
```
https://www.wikidata.org/w/api.php?action=wbsearchentities&search={name}&language=en&type=item&limit=10&format=json
```

Entity matching rules — apply in order, take the first result that passes:
1. `description` contains any of: "city", "town", "village", "hamlet", "settlement", "parish",
   "district", "county", "region", "country" (case-insensitive).
2. AND `description` contains any of: "England", "Scotland", "Wales", "Northern Ireland",
   "United Kingdom", "British" (case-insensitive).
3. If no result passes both checks, relax rule 1 — accept any result where rule 2 passes
   and `label` is a case-insensitive match for the place name.
4. If still no match, set `error: "entity search no confident match"` and move to Source 4.

**Country constraint — prevent wrong-country matches (e.g. Perth, Australia):**
After resolving a QID via Sources 2 or 3, verify the entity is UK-located before accepting
the population value. Call `Special:EntityData` and check:
- `claims.P17` (country) contains Q145 (United Kingdom), OR
- `claims.P131` (located in) resolves to any UK administrative entity.

If the country check fails, do not use this QID. Set `error: "entity resolved to non-UK location"`,
`qid_resolved: false`, and move to Source 4.

`population_source`: `"wikidata_p1082_search"`

**Source 4 — DBpedia SPARQL**
Last resort. If QID is known (from any prior source attempt), query via `owl:sameAs`:
```
https://dbpedia.org/sparql?query=SELECT+?pop+WHERE+{+<http://www.wikidata.org/entity/Q{id}>+owl:sameAs+?s+.+?s+dbo:populationTotal+?pop+}&format=json
```
If no QID, substitute `dbr:{Name}` (underscore-encode spaces).
Parse `?pop` as integer.
`population_source`: `"dbpedia_populationtotal"`

**All sources failed**
Set `population: null`, `qid_resolved: false`, `error: "all sources exhausted"`.

### Rate limiting

200ms delay between each external API call. Do not parallelise.
Log progress every 500 records to stdout.

### Output schema

```json
{
  "id": "string — Mongo _id as string",
  "name": "string",
  "source_collection": "geo_content | places",
  "place_type": "string",
  "qid": "string | null",
  "qid_resolved": true,
  "population": 3200000,
  "population_source": "wikidata_p1082_direct | wikidata_p1082_via_wikipedia | wikidata_p1082_search | dbpedia_populationtotal | null",
  "sources_tried": ["wikidata_p1082_direct", "wikipedia_summary"],
  "population_fetched": "2026-04-24T00:00:00.000Z",
  "error": null
}
```

### Run — test mode first

```bash
cd C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP
node scripts/gather-population.js --test
```

Review test output with Phil before proceeding to full run. If test passes:

```bash
node scripts/gather-population.js
```

---

## Step 2 — Validate and flag exceptions

Read `scripts/data/population-gather.json`. Apply checks:

| Check | Rule | Action |
|---|---|---|
| Null population | population === null | Exception |
| Zero population | population === 0 | Exception |
| Implausibly large | population > 15,000,000 | Exception — no UK entity exceeds this |
| Implausibly small | place_type City/Town and population < 500 | Suspicious |
| Non-UK entity | error contains "non-UK" | Exception |
| QID unresolved | qid_resolved === false | Exception |
| Error field set | error !== null | Exception |

Write:
- `scripts/data/population-validated.json` — clean records only
- `scripts/data/population-exceptions.json` — flagged records with `exception_reason`

Report: validated count, exception count, suspicious-but-passed count, breakdown of
`population_source` values across validated set (shows which sources are pulling weight).

Do not modify population values. Do not re-fetch. Flag and move on.

---

## Step 3 — Write and run upsert-population.js

Create `scripts/upsert-population.js`:

- Reads `scripts/data/population-validated.json`.
- `geo_content`: updateOne by `_id`, `$set` → `population`, `population_source`, `population_updated`.
- `places`: same.
- Reports: processed, updated, not-found, errors.

```bash
node scripts/upsert-population.js
```

---

## Step 4 — Spot check

```js
db.geo_content.findOne({ name: "Wales" }, { population: 1, population_source: 1, population_updated: 1 })
db.places.findOne({ name: "Aberdeen" }, { population: 1, population_source: 1 })
db.places.findOne({ name: "Cardiff" }, { population: 1, population_source: 1 })
```

Report all three results in chat.

---

## Deliverables

- `scripts/gather-population.js` (updated)
- `scripts/upsert-population.js`
- `scripts/data/population-gather.json`
- `scripts/data/population-validated.json`
- `scripts/data/population-exceptions.json`
- Chat summary: pre-flight result, test run result, full run counts, source breakdown, spot check

Do not push to GitHub until Phil reviews exceptions.

---

*Written by Ali — April 2026. v2: full scope, relaxed matching, country constraint, test mode.*
