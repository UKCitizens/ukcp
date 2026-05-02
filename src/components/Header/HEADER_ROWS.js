/**
 * @file HEADER_ROWS.js
 * @description Named height constants for all UKCP header rows.
 * Every header component references these constants — no numeric row-height
 * literals may appear in any component file.
 */

/** Row 1 — permanent nav bar, always visible. */
export const ROW1_HEIGHT = 60

/** Row 2 — nav map + emblem + content image banner strip. */
export const ROW2_HEIGHT = 120

/** Row 3 — full walker (options row + crumb row). */
export const ROW3_HEIGHT = 58

/** Row 3 crumb-only mode — no options row. */
export const ROW3_CRUMB_HEIGHT = 26

/** Row 4 — ticker / label nav bar, always visible. */
export const ROW4_HEIGHT = 40
