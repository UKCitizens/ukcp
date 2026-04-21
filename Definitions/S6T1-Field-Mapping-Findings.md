# S6T1 — Field Mapping & Use-Case Matrix
*Session: 8 Apr 2026 | Deliverable for UKCP Technical Specification v2.0 §5.4*
*Status: DRAFT — awaiting Phil sign-off*

---

## 1. Source data verified

| File | Encoding | Rows (LOC+WD) |
|---|---|---|
| IPN_GB_2024.csv | latin-1 | 72,431 (LOC: 61,569 / WD: 10,862) |
| GBPN.csv | latin-1 | 299,481 |

---

## 2. The county key field — how it is built

The application uses a single county key field in every data row. This field is populated at build time from IPN source fields — no synthesis, no derivation. The rule is:

**If `cty91nm == 'Greater London'` → use `cty23nm` (Inner London / Outer London)**
**Otherwise → use `ctyhistnm` (historic county)**

Both `cty23nm` and `ctyhistnm` are real IPN fields. The London override is a deliberate field selection, not a fabrication. It applies to both LOC and WD rows.

This field is written to the output as `ctyhistnm` in newplace.csv. The old `county_nav` synthesis field is retired.

### Why this rule

`ctyhistnm` for London boroughs reflects pre-1974 county boundaries (Middlesex, Surrey, Kent, Essex, Hertfordshire). These are historically correct but not navigable — Surrey and Kent also cover large non-London areas and a user navigating to "Surrey" from the London region would get Croydon mixed with Guildford. `cty23nm` in IPN gives Inner London / Outer London, which is both IPN-authoritative and navigable. `cty91nm` = 'Greater London' is the discriminator that identifies which rows to apply the override to.

### Coverage confirmation

| Country | Row type | Total | county key populated | Distinct values |
|---|---|---|---|---|
| England (non-London) | LOC | 48,511 | **100%** | 39 historic counties |
| England (London) | LOC | 1,190 | **100%** | Inner London, Outer London |
| England (non-London) | WD | 8,374 | **100%** | 42 |
| England (London LONB) | WD | 889 | **100%** | Inner London, Outer London |
| Scotland | LOC | 5,599 | **100%** | 34 |
| Scotland | WD | 615 | **100%** | 34 |
| Wales | LOC | 6,269 | **100%** | 13 |
| Wales | WD | 984 | **100%** | 15 |
| Northern Ireland | LOC | 0 | N/A | N/A |

---

## 3. What navConfig is and is not

**navConfig.js is a curated lookup of known nav nodes.** It is not derived from the CSV at runtime. It is maintained by hand and updated when nav structure changes. Its values must exactly match the county key values in newplace.csv — it is referential to IPN, but it is not generated from IPN.

**What navConfig contains:**
- The four countries (static)
- The regions per country (England: 9 ONS regions; Scotland/Wales: curated groupings; NI: none)
- The county nodes per region — the list of county key values that belong under each region

**What navConfig does NOT do:**
- It does not list constituencies or wards — those are queried from data rows at runtime
- It does not store row counts or data
- It does not replace the CSV — it is the navigation skeleton only

**How navConfig and the data connect:**

```
navConfig region node  →  filters newplace.csv rows by region field
navConfig county node  →  filters newplace.csv rows by ctyhistnm field
                           (where ctyhistnm = the county key value)
constituency list      →  queried from containment.json by ctyhistnm key
ward list              →  queried from WD rows filtered by con_gss
```

The county key value in navConfig must be an exact string match for the `ctyhistnm` field in newplace.csv. If they diverge, filtering breaks silently. This is why we use IPN field values directly — no paraphrasing, no reformatting.

---

## 4. Region → county → endpoint link table

This is the complete nav chain for England. Each cell shows the data field that satisfies the link.

| Nav level | From | To | Field used | Source |
|---|---|---|---|---|
| Country → Region | England | e.g. North West | navConfig (static list) | Curated |
| Region → County | e.g. North West | e.g. Lancashire | navConfig (static list) | Curated; values = IPN ctyhistnm |
| County → Places (left pane) | e.g. Lancashire | LOC rows in county | `ctyhistnm` filter on newplace.csv LOC rows | IPN via build |
| County → Constituencies (right pane) | e.g. Lancashire | Constituencies in county | `ctyhistnm` key in containment.json | Build-time WD walk |
| Constituency → Wards | e.g. Fylde | WD rows for constituency | `con_gss` filter on newplace.csv WD rows | IPN via build |
| Ward → selection | e.g. Kirkham | Locked location context | `ward_gss` (wd23cd) | IPN via build |

Scotland and Wales follow the same chain using `ctyhistnm` throughout. NI is flat (Country → constituency) — deferred.

---

## 5. England navConfig county-to-region mapping

All 39 historic county nodes + 2 London nodes + 7 metropolitan additions = **48 county-level nodes** for England.

County key values must exactly match IPN field values.

| Region | County nodes (exact IPN values) |
|---|---|
| North East | Durham, Northumberland, Tyne and Wear* |
| North West | Cheshire, Cumberland, Lancashire, Merseyside*, Westmorland, Greater Manchester* |
| Yorkshire and The Humber | Yorkshire, South Yorkshire*, West Yorkshire* |
| East Midlands | Derbyshire, Huntingdonshire, Leicestershire, Lincolnshire, Northamptonshire, Nottinghamshire, Rutland |
| West Midlands | Herefordshire, Shropshire, Staffordshire, Warwickshire, West Midlands*, Worcestershire |
| East of England | Bedfordshire, Cambridgeshire, Essex, Hertfordshire, Norfolk, Suffolk |
| London | Inner London†, Outer London† |
| South East | Berkshire, Buckinghamshire, Hampshire, Kent, Oxfordshire, Surrey, Sussex |
| South West | Cornwall, Devon, Dorset, Gloucestershire, Somerset, Wiltshire |

\* Metropolitan addition — not an IPN `ctyhistnm` value. Static node in navConfig only. Rows under these nodes are identified by `lad23nm` match at build time, not by `ctyhistnm`.

† London nodes — IPN `cty23nm` values, applied via the Greater London override rule (§2).

### Metro additions — how they work in the data

**Decision: Option A — build-time LAD override.**

Metro county names do not exist in `ctyhistnm`. Rows for metro areas carry their historic county (e.g. Lancashire, Yorkshire, Durham). At build time, if `lad23nm` matches a metro LAD, the county key is overwritten with the metro name. This runs after the Greater London override (§2) — London rows are already handled and excluded from this table.

Metro LAD → county key mapping for build.py `METRO_LAD`:

| Metro county key | LADs (lad23nm exact match) |
|---|---|
| Tyne and Wear | Gateshead, Newcastle upon Tyne, North Tyneside, South Tyneside, Sunderland |
| Merseyside | Knowsley, Liverpool, Sefton, St. Helens, Wirral |
| Greater Manchester | Bolton, Bury, Manchester, Oldham, Rochdale, Salford, Stockport, Tameside, Trafford, Wigan |
| South Yorkshire | Barnsley, Doncaster, Rotherham, Sheffield |
| West Yorkshire | Bradford, Calderdale, Kirklees, Leeds, Wakefield |
| West Midlands | Birmingham, Coventry, Dudley, Sandwell, Solihull, Walsall, Wolverhampton |

Build logic order of precedence (applied in process_ipn):
1. `cty91nm == 'Greater London'` → use `cty23nm` (Inner/Outer London)
2. `lad23nm` in `METRO_LAD` → use metro county name
3. Otherwise → use `ctyhistnm`

---

## 6. build.py schema change

`ctyhistnm` is not in the current newplace.csv output schema. Required changes:

1. Replace `county_nav` with `ctyhistnm` in `OUT_FIELDS`
2. In `process_ipn()`, populate using the county key rule:
   ```python
   if row.get('cty91nm', '').strip() == 'Greater London':
       out['ctyhistnm'] = row.get('cty23nm', '').strip()
   else:
       out['ctyhistnm'] = row.get('ctyhistnm', '').strip()
   ```
3. Remove the `county_nav()` synthesis function
4. Bump cache key to `UKCP_LOCATIONS_v3`
5. Update validate() to check `ctyhistnm` not `county_nav`

---

## 7. Field adequacy — use-case matrix

| Use case | Field(s) | Row type | Coverage | Notes |
|---|---|---|---|---|
| Display county nav nodes | navConfig.js | N/A | 100% by design | Static curated config |
| Filter LOC rows to county | ctyhistnm | LOC | 100% all nations | Primary county filter |
| Filter WD rows to county (containment build) | ctyhistnm | WD | 100% all nations | Used in S6T5 containment walk |
| List constituencies in county (right pane) | containment.json keyed by ctyhistnm | N/A | Build-time | No runtime CSV walk |
| List living places in county (left pane) | ctyhistnm + place_type | LOC | 81.6% place_type | ~18% have empty place_type — included, rendered without type label |
| Navigate to constituency | constituency + con_gss | LOC + WD | 100% England | All lad23desc types covered |
| Navigate to ward | ward + ward_gss | WD | 100% | WD rows only |
| Resolve region (England) | rgn23nm (shire) / UA_REGION lookup (UA) | LOC + WD | 100% resolved | build.py resolve_region() handles both |
| Place coordinates | lat / lng | LOC + WD | 100% | Rows without coords skipped at build |

---

## 8. Data quality notes

**Flintshire:** 8 England LOC rows carry `ctyhistnm='Flintshire'` — Welsh border settlements. Exclude from England navConfig. Include when Wales nav is built.

**place_type coverage (81.6%):** ~9,100 England LOC rows have no GBPN match. Valid named places not in GBPN as settlement centroids. Included in county left pane without type label.

**rgn23nm for UA rows:** Broken in IPN source (all UA rows default to North East). Corrected by `UA_REGION` lookup in build.py `resolve_region()`. Not a data gap — handled at build.

---

## 9. S6T1 checklist

- [x] IPN source data verified readable
- [x] ctyhistnm population confirmed: 100% LOC and WD, all nations
- [x] London county key decision: cty91nm='Greater London' → cty23nm (Inner/Outer London)
- [x] Field adequacy matrix produced
- [x] build.py schema changes identified
- [x] navConfig county-to-region mapping drafted (48 nodes)
- [x] Metro additions: Option A confirmed — LAD override at build time
- [ ] **Phil sign-off on full county-to-region mapping**

---

*S6T1 complete pending Phil sign-off. Dex pipeline (S6T2–S6T5) gates on this.*
