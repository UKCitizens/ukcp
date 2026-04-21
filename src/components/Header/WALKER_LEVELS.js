/**
 * @file WALKER_LEVELS.js
 * @description Level definitions for the UKCP 5-level location walker.
 *
 * Levels: Country (implicit) -> Region -> County -> Constituency -> Ward.
 * Place (pathIndex 4) is a leaf shown in PlacesCard, not a nav step.
 *
 * County values correspond to ctyhistnm field in newplace.csv.
 * For London rows, ctyhistnm = Inner London or Outer London (cty23nm override).
 * For metro LAD rows, ctyhistnm = metro county name (METRO_LAD override).
 *
 * @see navConfig.js for the curated list of valid values at each level.
 * @see UKCP Technical Specification v2.0 Section 4.3
 */

/**
 * Six-level walker step definitions ordered from broadest to finest granularity.
 *
 * @type {Array<{ label: string, pathIndex: number }>}
 *
 * @property {string} label      - Display label shown in the stepper step.
 * @property {number} pathIndex  - Index into the useNavigation path array for
 *                                 the selected value at this level. -1 for
 *                                 Country (implicit, always first path entry).
 */
export const WALKER_LEVELS = [
  { label: 'Country',      pathIndex: -1 },
  { label: 'Region',       pathIndex:  0 },
  { label: 'County',       pathIndex:  1 },
  { label: 'Constituency', pathIndex:  2 },
  { label: 'Ward',         pathIndex:  3 },
  { label: 'Place',        pathIndex:  4 },
]
