# UKCP Data Build — Source Decisions
**April 2026 | Ali + Phil**

---

## Source files (in /data-build/sources/)

| File | Rows | Purpose |
|------|------|---------|
| IPN_GB_2024.csv | 104,395 | Political and geographic hierarchy spine |
| GBPN.csv | 299,481 | Settlement type classifier |

---

## IPN_GB_2024.csv

### Rows we keep

| descnm | Count | Why |
|--------|-------|-----|
| LOC | 61,569 | Geographic named places — the place population of the output |
| WD | 10,862 | Electoral wards — the political leaf nodes of the output |
| **Total** | **72,431** | |

All other row types (PAR, BUA, CED, COM, CA, CTYHIST, NMD, LONB, MD, UA, NPARK, CTY, RGN) are discarded. The hierarchy data is already denormalised onto LOC and WD rows — we do not need the entity rows.

### Fields we keep and why

| IPN field | Maps to | Why |
|-----------|---------|-----|
| place23cd | id | Stable ONS identifier for places |
| place23nm | name | Place or ward name |
| descnm | type | LOC / WD discriminator |
| ctry23nm | country | Country name |
| rgn23nm | region | ONS region — navigation level 1 |
| rgn23cd | region_gss | GSS code for region |
| cty23nm | county | County-level navigation name — level 2 |
| cty23cd | county_gss | GSS code for county |
| ctyhistnm | ceremonial_county | Historic/ceremonial county — display identity field |
| lad23nm | lad_name | LAD name — display identity field |
| lad23cd | lad_gss | GSS code for LAD |
| lad23desc | *(derived)* | Used to derive ua_name and metro_name — not kept as-is |
| pcon23nm | constituency | Westminster constituency — navigation level 3 |
| pcon23cd | con_gss | GSS code for constituency (2023 boundaries) |
| wd23cd | ward_gss | Ward GSS — authoritative for WD rows; empty on LOC rows (spatial join task) |
| lat | lat | WGS84 latitude |
| long | lng | WGS84 longitude |

**Derived at build time from IPN fields:**
- `ua_name` — lad23nm where lad23desc in (UA, LONB, CC), else empty
- `metro_name` — cty23nm where lad23desc = MD (metropolitan county name sits in cty23nm for metro district rows), else empty
- `country_gss` — static map from ctry23nm (England=E92000001, Wales=W92000004, Scotland=S92000003, NI=N92000002)
- `ward` — place23nm for WD rows; derived by spatial join for LOC rows (separate pipeline step)

**Fields discarded from IPN:**
tempcode, placeid, placesort, splitind — internal ONS sequencing, not needed.
cty61nm, cty91nm — historical county names from 1961/1991, not in target schema.
ctyltnm — county long-term name, absorbed into ceremonial_county.
lad61nm, lad61desc, lad91nm, lad91desc — historical LAD data, not needed.
ced23cd — county electoral division, not in scope.
par23cd — parish code, deferred.
hlth23cd/nm — health geography, not in scope.
regd23cd/nm — registration district, not in scope.
npark23cd/nm — national park, not in scope for MVP.
bua22cd — built-up area code, not needed (BUA rows discarded).
eer23cd/nm — European electoral region, obsolete.
pfa23cd/nm — police force area, not in scope.
gridgb1m, gridgb1e, gridgb1n, grid1km — OS grid references, superseded by lat/long.

---

## GBPN.csv

### Rows we keep

| Type | Count | Why |
|------|-------|-----|
| City | 79 | Settlement type — lived locations |
| Town | 1,814 | Settlement type — lived locations |
| Village | 20,209 | Settlement type — lived locations |
| Hamlet | 27,300 | Settlement type — lived locations |
| **Total** | **49,402** | |

Urban locality (9,668) discarded. Phil's call: city/town/village/hamlet covers 99.9% of the UK living population. Urban localities either fall under one of those types or will self-identify via their parent locality in the IPN.

All other types (Wood/Forest, Hill/Mountain, Coastal Feature, etc.) discarded — geographic features, not lived settlements.

### Fields we keep

| GBPN field | Used for | Why |
|------------|----------|-----|
| PlaceName | Join key | Name match to IPN place23nm |
| Lat | Join key | Lat/lng proximity join to IPN row |
| Lng | Join key | Lat/lng proximity join to IPN row |
| Type | place_type | City / Town / Village / Hamlet — the only field GBPN uniquely contributes |

**Fields discarded from GBPN:**
GBPNID — internal GBPN identifier, superseded by IPN place23cd.
NameType — GBPN primary/alternate flag, not needed.
GRIDREFLONG — OS grid reference, superseded by lat/long.
HistCounty — superseded by IPN ctyhistnm.
Division, Island — geographic subdivision, not in scope.
AdCounty, District, UniAuth, CivilParish, Police, Region — all superseded by IPN fields.
Alternative_Names, Notes, GBPN_URL — metadata, not in output.

---

## County nav key — synthesised field (county_nav)

`cty23nm` is empty on 45% of LOC rows. Breakdown of the gap:

| lad23desc | Empty-county LOC rows | Resolution |
|-----------|----------------------|------------|
| UA | 22,439 | Use `lad23nm` — the UA is the county-equivalent |
| CA | 5,599 | Scottish civil areas — deferred with rest of Scotland scope |

All other lad23desc values (NMD, MD, LONB, CC) have `cty23nm` populated. MD rows confirmed carrying correct metropolitan county names (Greater Manchester, West Midlands, South Yorkshire, West Yorkshire).

**Synthesis rule (England):**
```
county_nav = cty23nm  if populated
             lad23nm   if cty23nm empty and lad23desc = UA
```

Result: one field, 100% populated for all English LOC and WD rows. Added to output schema as `county_nav`.

**County object — display:**
No alias array, no generated summary string. Publish the existing meta fields as-is — county_nav, constituency, region, country, lad_name, place_type. The UI composes whatever display it needs from the raw values at render time. Simpler pipeline, more flexible front end.

---

## LOC participation in the navigation tree

LOC entries are not a lookup hanging off the ward level. They are nodes in the navigation tree at county level, alongside constituencies. The tree structure at county:

```
County (county_nav)
├── Constituencies → Constituency → Ward (WD rows)
└── Places by type → City / Town / Village / Hamlet (LOC rows)
```

Both branches use `county_nav` as the county key. LOC rows contribute to the Places branch. Their place_type (from GBPN join) groups them within that branch. Their full hierarchy (constituency, region, country) is already intact from the IPN — no reverse-engineering needed.

Ward association for LOC rows is a soft proximity relationship (which wards is this place near?) resolved at query time, not a baked field. A place may span or straddle multiple wards — asserting a single ward assignment would be false precision. Constituency on the LOC row is the honest political anchor.

---

## Join strategy: IPN LOC → GBPN place_type

The IPN has no settlement type classification. GBPN provides it. Join approach:
1. Filter GBPN to City/Town/Village/Hamlet rows (~49K).
2. For each IPN LOC row, find the nearest GBPN row by lat/lng within a distance threshold (suggest 500m).
3. Assign place_type from the matched GBPN row.
4. LOC rows with no match within threshold: place_type = empty string (acceptable — small number).

Same pipeline pattern as the ward spatial join.

---

## Ward spatial join (LOC rows only)

IPN LOC rows have no ward_gss. WD rows are authoritative. Join approach:
1. Load ONS ward boundary GeoJSON (to be sourced — not in Reference_Data).
2. For each LOC row, point-in-polygon to find containing ward.
3. Write ward and ward_gss.
4. LOC rows outside all boundaries: ward/ward_gss = empty string.

*This is a deferred pipeline step. Constituency-level linking (already in IPN) is sufficient for the current sprint.*

---

## Output

Single file: `newplace.csv` (replaces both current newplace.csv and place.csv)
~72,431 rows | 22 fields | UTF-8 with BOM | Both LOC and WD rows
