/**
 * @file PageLayout.jsx
 * @description UKCP application shell.
 *
 * Layout model:
 *   pageOuter        — 100vw × 100vh, overflow hidden. PageBackground renders here.
 *   pageFrame        — 95% wide, centred, flex column, 8px gap, 8px vertical padding.
 *   headerZone       — flex-shrink 0, z-index 200.
 *   midZone          — flex 1, overflow-y auto. Three columns (left / mid / right)
 *                      laid out with flexbox, responsive via CSS.
 *   mobilePanelSlot  — hidden on desktop; renders above midCol on mobile.
 *   footerZone       — flex-shrink 0, 48px height.
 *
 * Responsive column behaviour:
 *   Desktop  (≥1200px): left (21.667%) | mid (flex 1) | right (21.667%)
 *   Tablet   (768–899px): all three columns stack vertically
 *   Mobile   (<768px): leftCol/rightCol CSS-hidden; mobilePanelSlot + midCol visible
 *
 * headerHeight prop is accepted but unused — retained for call-site compatibility.
 */

import { Paper } from '@mantine/core'
import PageBackground from './Layout/PageBackground.jsx'
import classes from './PageLayout.module.css'

/**
 * Renders the UKCP application shell.
 *
 * @param {object}          props
 * @param {React.ReactNode} props.header         - Header zone content.
 * @param {number}          [props.headerHeight] - Unused; retained for compat.
 * @param {React.ReactNode} props.leftPane       - Left column content.
 * @param {React.ReactNode} props.midPane        - Main centre column content.
 * @param {React.ReactNode} props.rightPane      - Right column content.
 * @param {React.ReactNode} props.footer         - Footer zone content.
 * @param {boolean}         [props.mapExpand]    - Collapses header/footer for map view.
 * @param {React.ReactNode} [props.mobilePanel]  - Mobile nav panel above midCol on mobile.
 * @returns {JSX.Element}
 */
export default function PageLayout({ header, headerHeight, leftPane, midPane, rightPane, footer, mapExpand, mobilePanel }) {
  return (
    <div className={classes.pageOuter}>
      <PageBackground />

      <div className={`${classes.pageFrame}${mapExpand ? ` ${classes.mapExpand}` : ''}`}>

        {/* Header — top flex child */}
        <div className={classes.headerZone}>
          {header}
        </div>

        {/* Mid zone — scrollable three-column area */}
        <div className={classes.midZone}>

          {/* Mobile nav panel — CSS-hidden on desktop, sits above midCol on mobile */}
          {mobilePanel && (
            <div className={classes.mobilePanelSlot}>
              {mobilePanel}
            </div>
          )}

          {/* Left column — CSS-hidden on mobile */}
          <div className={classes.leftCol}>
            <Paper p="md" className={classes.column}>
              {leftPane}
            </Paper>
          </div>

          {/* Mid column — full width on mobile */}
          <div className={classes.midCol}>
            <Paper p="md" className={classes.column}>
              {midPane}
            </Paper>
          </div>

          {/* Right column — CSS-hidden on mobile */}
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
