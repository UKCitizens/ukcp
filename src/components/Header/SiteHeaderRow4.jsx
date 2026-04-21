/**
 * @file SiteHeaderRow4.jsx
 * @description Row 4 of the UKCP site header — ticker / label nav bar.
 *
 * Sprint 3 delivers a static placeholder: centred white text on a dark
 * background. Row 4 is always visible in Sprint 3.
 *
 * Background: Mantine dark theme token (var(--mantine-color-dark-8)) —
 * visually anchors the base of the header.
 *
 * @todo Future sprint: replace static text with scroll-triggered ticker or
 * single-level nav bar.
 */

import { Box } from '@mantine/core'
import { ROW4_HEIGHT } from './HEADER_ROWS.js'
import classes from './SiteHeaderRow4.module.css'

/**
 * Renders the ticker / label nav bar (Row 4).
 * Always visible in Sprint 3 — no visibility prop required.
 *
 * @returns {JSX.Element}
 */
export default function SiteHeaderRow4() {
  return (
    <Box h={ROW4_HEIGHT} className={classes.row4}>
      <Box className={classes.rowInner}>
        <span className={classes.tickerText}>
          UK Citizens Party &mdash; Building democracy from the ground up
        </span>
      </Box>
    </Box>
  )
}
