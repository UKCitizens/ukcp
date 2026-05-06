/**
 * @file PageLayout.jsx
 * @description UKCP application shell.
 *
 * Layout model:
 *   pageOuter    — 100vw × 100vh, overflow hidden. PageBackground renders here.
 *   pageFrame    — 95% wide, centred, flex column, 8px gap, 8px vertical padding.
 *   headerZone   — flex-shrink 0, z-index 200.
 *   midZone      — flex 1, overflow-y auto. Three columns (left / mid / right)
 *                  laid out with flexbox, responsive via CSS.
 *   footerZone   — flex-shrink 0, 48px height.
 *
 * Responsive column behaviour:
 *   Desktop  (≥1200px): left (21.667%) | mid (flex 1) | right (21.667%)
 *   Tablet   (768–899px): all three columns stack vertically
 *   Mobile   (<768px): leftCol/rightCol CSS-hidden; MobileDrawerWrapper handles
 *             left/right content via side-edge drawer handles inside midCol.
 *
 * headerHeight prop is accepted but unused — retained for call-site compatibility.
 */

import { Paper } from '@mantine/core'
import PageBackground from './Layout/PageBackground.jsx'
import MobileDrawerWrapper from './Layout/MobileDrawerWrapper.jsx'
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
 * @returns {JSX.Element}
 */
export default function PageLayout({ header, headerHeight, leftPane, midPane, rightPane, footer, mapExpand }) {
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

          {/* Left column — CSS-hidden on mobile */}
          <div className={classes.leftCol}>
            <Paper p="md" className={classes.column}>
              {leftPane}
            </Paper>
          </div>

          {/* Mid column — full width on mobile; drawers provide left/right access */}
          <div className={classes.midCol}>
            <Paper p="md" className={classes.column}>
              <MobileDrawerWrapper leftContent={leftPane} rightContent={rightPane}>
                {midPane}
              </MobileDrawerWrapper>
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
