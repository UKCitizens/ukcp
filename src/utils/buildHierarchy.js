/**
 * @file buildHierarchy.js
 * @description Pure utility that builds the UKCP navigation hierarchy from
 * all rows in newplace.csv (v2 schema).
 *
 * Hierarchy shape:
 *   {
 *     [country]: {
 *       regions: {
 *         [region]: {
 *           counties: {
 *             [ctyhistnm]: {
 *               constituencies: {
 *                 [constituency]: {
 *                   wards: {
 *                     [wardName]: { id, lat, lng, ward_gss }
 *                   }
 *                 }
 *               },
 *               places: {
 *                 City:    [ { id, name, lat, lng, constituency } ],
 *                 Town:    [ ... ],
 *                 Village: [ ... ],
 *                 Hamlet:  [ ... ]
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 *
 * Build strategy:
 *   Pass 0 — WD rows (pre-pass): build the full country → region →
 *   ctyhistnm → constituency tree and the constiIndex from ward rows.
 *   WD rows carry reliable constituency data; this decouples the index
 *   from LOC rows, which may have blank constituency (GBPN-sourced places).
 *
 *   Pass 1 — LOC rows: add places into county.places grouped by place_type.
 *   constituency is NOT required on LOC rows.
 *
 *   Pass 2 — WD rows: use constituency index to locate the correct county
 *   node and add ward entries under constituency.wards.
 *
 * This function is intentionally free of side effects and imports.
 * It can be imported and tested independently of the hook layer.
 */

/** @type {string[]} Valid place_type values for the places branch. */
const PLACE_TYPES = ['City', 'Town', 'Village', 'Hamlet']

/**
 * Normalise a string value for safe hierarchy insertion.
 * Returns null when the value is absent, empty, or non-string.
 * @param {*} value - Raw field value from the parsed CSV row.
 * @returns {string|null} Trimmed string, or null if unusable.
 */
function normalise(value) {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s.length > 0 ? s : null
}

/**
 * Build the UKCP navigation hierarchy from all newplace.csv rows.
 *
 * Accepts the full parsed CSV array (LOC + WD rows). Rows with unexpected
 * types are silently ignored. Rows missing required hierarchy fields are
 * skipped with a console.warn; the function never throws.
 *
 * @param {object[]} allRows - Full parsed CSV from newplace.csv v2.
 *   LOC row expected fields: id, name, type, place_type, country, region,
 *   ctyhistnm, lat, lng. (constituency is blank on GBPN-sourced LOC rows)
 *   WD row expected fields: id, name, type, country, region, ctyhistnm,
 *   constituency, ward_gss, lat, lng. (ward name = row.name for WD rows)
 * @returns {object} Nested hierarchy object. Empty object if no valid rows.
 */
export function buildHierarchy(allRows) {
  const hierarchy   = {}
  // Index: constituency name → { country, region, county } for WD pass.
  const constiIndex = {}

  // ── Pass 0: WD rows → build hierarchy tree + constiIndex ─────────────
  // WD rows carry reliable constituency. Build the full nav tree and index
  // here so LOC rows (which may have blank constituency) can still attach.
  for (const row of allRows) {
    if (row.type !== 'WD') continue

    try {
      const country      = normalise(row.country)
      const region       = normalise(row.region)
      const county       = normalise(row.ctyhistnm)
      const constituency = normalise(row.constituency)

      if (!country || !region || !county || !constituency) continue

      if (!hierarchy[country]) hierarchy[country] = { regions: {} }
      const regions = hierarchy[country].regions
      if (!regions[region]) regions[region] = { counties: {} }
      const counties = regions[region].counties
      if (!counties[county]) {
        counties[county] = {
          constituencies: {},
          places: { City: [], Town: [], Village: [], Hamlet: [] },
        }
      }
      const constituencies = counties[county].constituencies
      if (!constituencies[constituency]) {
        constituencies[constituency] = { wards: {} }
      }
      if (!constiIndex[constituency]) {
        constiIndex[constituency] = { country, region, county }
      }
    } catch (err) {
      console.warn('[buildHierarchy] Unexpected error in WD pre-pass — row skipped:', row, err)
    }
  }

  // ── Pass 1: LOC rows → places branch only ─────────────────────────────
  // constituency not required — GBPN-sourced LOC rows carry blank constituency
  for (const row of allRows) {
    if (row.type !== 'LOC') continue

    try {
      const country   = normalise(row.country)
      const region    = normalise(row.region)
      const county    = normalise(row.ctyhistnm)
      const id        = normalise(row.id)
      const name      = normalise(row.name)
      const placeType = normalise(row.place_type)

      if (!country || !region || !county) {
        console.warn(
          '[buildHierarchy] Skipping LOC row — missing required hierarchy field:',
          { id: row.id, name: row.name, country, region, county }
        )
        continue
      }

      // Ensure nodes exist (county may have no WD rows)
      if (!hierarchy[country]) hierarchy[country] = { regions: {} }
      const regions = hierarchy[country].regions
      if (!regions[region]) regions[region] = { counties: {} }
      const counties = regions[region].counties
      if (!counties[county]) {
        counties[county] = {
          constituencies: {},
          places: { City: [], Town: [], Village: [], Hamlet: [] },
        }
      }

      // Places branch — add LOC row if it has a valid place_type
      if (placeType && PLACE_TYPES.includes(placeType)) {
        counties[county].places[placeType].push({
          id:       id   ?? '',
          name:     name ?? '',
          lat:      normalise(row.lat)      ?? '',
          lng:      normalise(row.lng)      ?? '',
          ward:     normalise(row.ward)     ?? '',
          ward_gss: normalise(row.ward_gss) ?? '',
        })
      }
    } catch (err) {
      console.warn('[buildHierarchy] Unexpected error in LOC pass — row skipped:', row, err)
    }
  }

  // Sort places within each county alphabetically by name
  for (const country of Object.values(hierarchy)) {
    for (const region of Object.values(country.regions)) {
      for (const county of Object.values(region.counties)) {
        for (const type of PLACE_TYPES) {
          county.places[type].sort((a, b) =>
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
          )
        }
      }
    }
  }

  // ── Pass 2: WD rows → ward entries under constituency nodes ───────────
  for (const row of allRows) {
    if (row.type !== 'WD') continue

    try {
      const constituency = normalise(row.constituency)
      const wardName     = normalise(row.name)         // ward name is row.name for WD rows
      const id           = normalise(row.id)

      if (!constituency || !wardName) continue

      const loc = constiIndex[constituency]
      if (!loc) continue  // constituency not found in LOC tree — skip

      const constiNode =
        hierarchy[loc.country]
          ?.regions?.[loc.region]
          ?.counties?.[loc.county]
          ?.constituencies?.[constituency]

      if (!constiNode) continue

      // Only add first occurrence (wards can appear in multiple WD rows)
      if (!constiNode.wards[wardName]) {
        constiNode.wards[wardName] = {
          id:       id ?? '',
          lat:      normalise(row.lat)      ?? '',
          lng:      normalise(row.lng)      ?? '',
          ward_gss: normalise(row.ward_gss) ?? '',
        }
      }
    } catch (err) {
      console.warn('[buildHierarchy] Unexpected error in WD pass — row skipped:', row, err)
    }
  }

  return hierarchy
}
