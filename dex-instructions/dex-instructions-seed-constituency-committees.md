# DEX INSTRUCTIONS -- SEED CONSTITUENCY COMMITTEES
Date: 30 Apr 2026
Author: Ali
Status: Ready to execute

Read this file in full before starting.
Do not proceed past a section if it fails.

---

## CONTEXT

This sprint seeds the `committees` MongoDB collection with one record per
UK constituency. No UI changes. No committee_forum creation. No MP API
lookup. Those are deferred. The goal is to establish the committees
collection with correct schema so subsequent sprints have a stable base.

Reference schema: UKCP/Ali/ukcp-entity-manifests-v0.2.txt -- ENTITY: COMMITTEE

Data source: public/data/newplace.csv -- constituency name and con_gss
extracted from place rows. 632 unique constituencies are present in this
file. NI constituencies and a small number of others may be absent --
that is acceptable at this stage.

Architecture: committees collection in MongoDB Atlas (ukcp db). Local Mongo
is also seeded for parity. Seed script targets local first; Atlas seeded
via MONGODB_URI env var (same script, different connection).

---

## SECTION 1 -- SEED SCRIPT

Create: scripts/seed-committees.js

The script must:

1. Parse public/data/newplace.csv using the csv-parse or a manual CSV
   reader (csv-parse is already a dependency -- check package.json; if
   not present use Node built-ins with line splitting, but csv-parse is
   preferred to handle quoted fields correctly).

2. Extract unique constituency records. Keyed by con_gss. For each
   con_gss keep the first occurrence of:
     - constituency name  (column: constituency)
     - con_gss            (column: con_gss)
     - region             (column: region)
     - region_gss         (column: region_gss)
     - country            (column: country)

3. Skip rows where constituency or con_gss is empty.

4. For each unique constituency, build a committee document (schema below).

5. Bulk insert into `committees` collection (batches of 100).
   Use insertMany with ordered: false so a duplicate slug does not halt
   the batch.

6. Create indexes (see Section 2) before inserting.

7. Print summary: total processed, inserted, skipped (duplicates).

### Slug generation

The committee slug is derived from the constituency name:
  - lowercase the name
  - replace spaces with hyphens
  - remove any characters not in [a-z0-9-]
  - collapse multiple hyphens to one
  - trim leading/trailing hyphens

Example: "Liverpool, Riverside" -> "liverpool-riverside"
Example: "Berwickshire, Roxburgh and Selkirk" -> "berwickshire-roxburgh-and-selkirk"

### location_scope slug convention

The location_scope.slug follows the existing platform convention:
spaces replaced with underscores, case preserved from source data.

Example: "Liverpool, Riverside" -> "Liverpool,_Riverside"

Wait -- this will not match how ConstituencyPane references constituency
names. Check: ConstituencyPane.jsx calls select('constituency', name)
where name is the raw constituency name from the places data. The
location_scope.slug must match what the client sends in API requests.

Use the raw constituency name with spaces replaced by underscores as the
location_scope.slug. This matches the existing groups.js query pattern:
  { 'location_scope.type': type, 'location_scope.slug': slug }

Example:
  location_scope: { type: 'constituency', slug: 'Liverpool,_Riverside' }

Note: constituency names with commas will produce slugs with commas.
That is correct for now -- it mirrors how the client already references
these names. Do not strip commas from location_scope.slug.

### Committee document structure

  {
    name:                  <constituency name>,
    slug:                  <url-safe slug -- see Slug generation above>,
    description:           'Constituency committee for ' + name,
    founder_user_ref:      null,
    membership_model:      'closed',
    status:                'active',
    location_scope:        { type: 'constituency', slug: <name with spaces->underscores> },
    tier:                  'constituency',
    parent_committee_ref:  null,
    jurisdiction:          <constituency name>,
    term_start:            null,
    term_end:              null,
    committee_forum_ref:   null,
    con_gss:               <con_gss>,
    region:                <region>,
    region_gss:            <region_gss>,
    country:               <country>,
    mp_name:               null,
    mp_party:              null,
    mp_party_colour:       null,
    mp_thumbnail:          null,
    created_at:            new Date(),
    updated_at:            new Date()
  }

---

## SECTION 2 -- INDEXES

Create these indexes on the `committees` collection before inserting.
Use createIndex with { background: true }.

  { slug: 1 }               -- unique: true
  { con_gss: 1 }            -- unique: true
  { 'location_scope.type': 1, 'location_scope.slug': 1 }
  { tier: 1 }
  { country: 1 }
  { region_gss: 1 }

---

## SECTION 3 -- RUN LOCALLY

  cd C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP
  node scripts/seed-committees.js

Confirm output: ~632 inserted, 0 errors.
Spot-check in Compass or mongosh:
  db.committees.countDocuments()
  db.committees.findOne({ name: /Liverpool/ })

---

## SECTION 4 -- SEED ATLAS

Run the same script against Atlas. Set MONGODB_URI to the Atlas connection
string before running. The script must read MONGODB_URI from process.env
and fall back to 'mongodb://localhost:27017' if absent.

  MONGODB_URI=<atlas-uri> node scripts/seed-committees.js

Atlas URI is in Railway env vars (MONGODB_URI). Phil will supply it or
Dex can read it from the Railway dashboard.

Confirm: Atlas committees collection count matches local.

---

## SECTION 5 -- COMMIT

  git add scripts/seed-committees.js
  git commit -m "Seed: constituency committees collection (632 records)"
  git push

No server.js or route changes in this sprint.
No client changes in this sprint.
Railway and Vercel do not need redeployment.

---

## ACCEPTANCE CRITERIA

  [ ] committees collection exists in local Mongo with ~632 documents
  [ ] committees collection exists in Atlas with same count
  [ ] slug index is unique -- no duplicates
  [ ] con_gss index is unique -- no duplicates
  [ ] db.committees.findOne({ name: 'Ashfield' }) returns correct record
  [ ] mp_name field is null on all records (deferred)
  [ ] committee_forum_ref is null on all records (deferred)
  [ ] git commit pushed to UKCitizens/ukcp

---

END OF INSTRUCTIONS
