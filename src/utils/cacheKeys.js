/**
 * @file cacheKeys.js
 * @description Version-keyed localStorage cache key constants for UKCP data.
 *
 * v6: LOC rows now sourced from GBPN (settlements) not IPN.
 *     constituency blank on LOC rows — hierarchy tree built from WD rows.
 *     buildHierarchy Pass 0 builds constiIndex from WD rows.
 */

/**
 * localStorage key for the built navigation hierarchy.
 * Built from all rows in newplace.csv (LOC rows for nav tree, WD rows for
 * ward branches). Changing this value invalidates any previously cached data.
 * @type {string}
 */
export const CACHE_KEY_HIERARCHY   = 'UKCP_HIERARCHY_v7'

/**
 * localStorage key for the flat LOC-row array used by filterPlaces.
 * Sourced from newplace.csv — type === 'LOC' rows only.
 * Changing this value invalidates any previously cached places data.
 * @type {string}
 */
export const CACHE_KEY_PLACES      = 'UKCP_PLACES_v7'

/**
 * localStorage key for the constituency containment map.
 * Maps con_gss -> { name, counties: [{ ctyhistnm, partial }] }.
 * Sourced from containment.json built by build_containment.py.
 * @type {string}
 */
export const CACHE_KEY_CONTAINMENT = 'UKCP_CONTAINMENT_v1'

/**
 * localStorage key for the flat WD-row array used by MidPaneMap.
 * Sourced from newplace.csv — type === 'WD' rows only.
 * @type {string}
 */
export const CACHE_KEY_WARDS = 'UKCP_WARDS_v7'
