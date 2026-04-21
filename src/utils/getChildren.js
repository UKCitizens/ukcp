/**
 * @file getChildren.js
 * @description Returns child names at the next hierarchy level given the current path.
 *
 * Path indices (v2 hierarchy — no Area level):
 *   path[0] = country, path[1] = region, path[2] = county,
 *   path[3] = constituency, path[4] = ward.
 *
 * For countries not present in the data hierarchy (Scotland, Wales, NI),
 * regions are sourced from navConfig. Counties for those regions are also
 * sourced from navConfig (currently empty arrays — populated in later sprints).
 *
 * Returns [] when path is empty, input is invalid, or the path is at leaf level.
 */

import { NAV_CONFIG } from '../config/navConfig.js'

/**
 * Maps country display names (as they appear in path) to navConfig keys.
 * @type {Record<string, string>}
 */
const COUNTRY_KEY = {
  'England':          'england',
  'Scotland':         'scotland',
  'Wales':            'wales',
  'Northern Ireland': 'ni',
}

/**
 * @param {object} hierarchy - Full hierarchy from buildHierarchy.
 * @param {Array<{ level: string, value: string }>} path - Current selection path.
 * @returns {string[]}
 */
export function getChildren(hierarchy, path) {
  try {
    if (!hierarchy || !Array.isArray(path) || path.length === 0) return []

    const countryName = path[0].value
    const countryNode = hierarchy[countryName]

    // ── Country → Regions ────────────────────────────────────────────────
    if (path.length === 1) {
      if (countryNode) return Object.keys(countryNode.regions ?? {}).sort()
      // Fallback: curated regions from navConfig.
      const configKey = COUNTRY_KEY[countryName]
      const configNode = configKey ? NAV_CONFIG[configKey] : null
      return configNode ? Object.keys(configNode.regions ?? {}).sort() : []
    }

    const regionName = path[1].value

    // ── Region → Counties ────────────────────────────────────────────────
    if (path.length === 2) {
      const regionNode = countryNode?.regions?.[regionName]
      if (regionNode) return Object.keys(regionNode.counties ?? {}).sort()
      // Fallback: curated counties from navConfig (empty for Scot/Wales for now).
      const configKey    = COUNTRY_KEY[countryName]
      const configRegion = configKey ? NAV_CONFIG[configKey]?.regions?.[regionName] : null
      return Array.isArray(configRegion?.counties) ? [...configRegion.counties].sort() : []
    }

    // ── Below region: only data hierarchy has this depth ─────────────────
    if (!countryNode) return []

    const regionNode = countryNode.regions?.[regionName]
    if (!regionNode) return []

    const countyNode = regionNode.counties?.[path[2].value]
    if (!countyNode) return []
    if (path.length === 3) return Object.keys(countyNode.constituencies ?? {}).sort()

    const constiNode = countyNode.constituencies?.[path[3].value]
    if (!constiNode) return []
    if (path.length === 4) return Object.keys(constiNode.wards ?? {}).sort()

    return []
  } catch {
    return []
  }
}
