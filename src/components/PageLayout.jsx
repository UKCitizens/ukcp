/**
 * @file PageLayout.jsx
 * @description UKCP application shell — Sprint 6 layout remediation.
 *
 * Replaces Mantine AppShell with a plain CSS flex layout.
 *
 * Layout model:
 *   pageOuter  — 100vw × 100vh, overflow hidden. PageBackground renders here
 *                at z-index 0.
 *   pageFrame  — 95% wide, centred, flex column, 8px gap, 8px vertical padding.
 *                The 5% horizontal and 8px vertical margins expose the
 *                PageBackground around all zone edges, giving each zone a
 *                visually contained appearance (the "border" effect).
 *   headerZone — flex-shrink 0, z-index 200. Stays fixed at top of frame while
 *                mid zone scrolls.
 *   midZone    — flex 1, overflow-y auto. The scrolling area. Three columns
 *                (left / mid / right) laid out with flexbox, responsive via CSS.
 *   footerZone — flex-shrink 0, 48px height. Always visible at bottom of frame.
 *
 * Responsive column behaviour:
 *   Desktop  (≥1200px): left (16.667%) | mid (flex 1) | right (16.667%)
 *   Tablet   (768–1199px): left hidden | mid (flex 1) | right (16.667%)
 *   Mobile   (<768px): left hidden | mid (100%) | right hidden
 *
 * headerHeight prop is accepted but unused — retained for call-site compatibility
 * with Locations.jsx. Height is now driven automatically by header content.
 *
 * No hardcoded colours, no inline styles. All visual rules in PageLayout.module.css.
 */

import { Paper } from '@mantine/core'
import PageBackground from './Layout/PageBackground.jsx'
import classes from './PageLayout.module.css'

/**
 * Renders the UKCP application shell.
 *
 * @param {object}          props
 * @param {React.ReactNode} props.header       - Header zone content.
 * @param {number}          [props.headerHeight] - Unused; retained for compat.
 * @param {React.ReactNode} props.leftPane     - Left column content.
 * @param {React.ReactNode} props.midPane      - Main centre column content.
 * @param {React.ReactNode} props.rightPane    - Right column content.
 * @param {React.ReactNode} props.footer       - Footer zone content.
 * @returns {JSX.Element}
 */
export default function PageLayout({ header, headerHeight, leftPane, midPane, rightPane, footer, mapExpand }) {
  return (
    <div className={classes.pageOuter}>
      <PageBackground />

      <div className={`${classes.pageFrame}${mapExpand ? ` ${classes.mapExpand}` : ''}`}>

        {/* Header — top flex child, content scrolls beneath it */}
        <div className={classes.headerZone}>
          {header}
        </div>

        {/* Mid zone — scrollable area between header and footer */}
        <div className={classes.midZone}>

          {/* Left column — hidden on tablet and mobile */}
          <div className={classes.leftCol}>
            <Paper p="md" className={classes.column}>
              {leftPane}
            </Paper>
          </div>

          {/* Mid column — main content area */}
          <div className={classes.midCol}>
            <Paper p="md" className={classes.column}>
              {midPane}
            </Paper>
          </div>

          {/* Right column — hidden on mobile */}
          <div className={classes.rightCol}>
            <Paper p="md" className={classes.column}>
              {rightPane}
            </Paper>
          </div>

        </div>

        {/* Footer — bottom flex child, always visible */}
        <div className={classes.footerZone}>
          {footer}
        </div>

      </div>
    </div>
  )
}
