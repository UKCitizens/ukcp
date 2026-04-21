/**
 * @file HEADER_ROWS.js
 * @description Named height constants for all four UKCP header rows.
 * Every header component references these constants — no numeric row-height
 * literals may appear in any component file.
 */

/**
 * Height in pixels for Row 1 — permanent nav bar, always visible.
 * @type {number}
 */
export const ROW1_HEIGHT = 60

/**
 * Height in pixels for Row 2 — contextual location banner,
 * conditionally visible.
 * @type {number}
 */
export const ROW2_HEIGHT = 120

/**
 * Height in pixels for Row 3 — full walker (options row + crumb row).
 * @type {number}
 */
export const ROW3_HEIGHT = 72

/**
 * Height in pixels for Row 3 in crumb-only mode — no options row.
 * @type {number}
 */
export const ROW3_CRUMB_HEIGHT = 32

/**
 * Height in pixels for Row 4 — ticker / label nav bar, always visible
 * in Sprint 3.
 * @type {number}
 */
export const ROW4_HEIGHT = 40
