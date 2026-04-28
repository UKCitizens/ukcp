/**
 * @file SiteHeader.jsx
 * @description Four-row UKCP site header container — Sprint 5.
 *
 * Row structure:
 *   Row 1 — SiteHeaderRow1 (permanent nav bar, always rendered)
 *   Row 2 — SiteHeaderRow2 (contextual banner, conditionally rendered)
 *   Row 3 — SiteHeaderRow3 (location navigator, conditionally rendered)
 *   Row 4 — SiteHeaderRow4 (ticker bar, always rendered)
 *
 * Row 2 is conditionally rendered via row2Visible.
 * Row 3 is conditionally rendered via row3Visible.
 * Row 4 is always rendered.
 *
 * All state is received as props — no hooks are called here.
 */

import { Box } from '@mantine/core'
import SiteHeaderRow1 from './Header/SiteHeaderRow1.jsx'
import SiteHeaderRow2 from './Header/SiteHeaderRow2.jsx'
import SiteHeaderRow3 from './Header/SiteHeaderRow3.jsx'
import SiteHeaderRow4 from './Header/SiteHeaderRow4.jsx'

/**
 * Renders the full four-row UKCP site header.
 *
 * @param {object}      props
 * @param {Function}    props.onWalkerToggle  - Passed to Row 1 Places icon.
 * @param {boolean}     props.row2Visible     - When true Row 2 is rendered.
 * @param {boolean}     props.row3Visible     - When true Row 3 is rendered.
 * @param {boolean}     props.loading         - Passed to Row 1 data loader.
 * @param {object|null} props.pendingPlace    - Passed to SiteHeaderRow2.
 * @param {boolean}     props.walkerOpen      - Passed to SiteHeaderRow3.
 * @param {string|null} props.bannerImage     - Wikipedia thumbnail URL for banner bg swap.
 * @param {Array<{ level: string, value: string }>} props.path - Navigation
 *                                               path; passed to Row 2 and Row 3.
 * @param {string[]}    props.currentOptions  - Option list for Row 3 line 1.
 * @param {Function}    props.onSelect        - Called when a Row 3 option is clicked.
 * @param {Array<{ label: string, onClick?: () => void }>} props.crumbs - Pre-built crumb trail.
 * @param {number}      props.navDepth        - Current nav path length (for level label).
 * @returns {JSX.Element}
 */
export default function SiteHeader({
  onWalkerToggle,
  row2Visible,
  row3Visible,
  loading,
  pendingPlace,
  walkerOpen,
  path,
  onDismiss,
  currentOptions,
  onSelect,
  crumbs,
  navDepth,
  bannerImage,
  mapExpand,
}) {
  return (
    <Box>
      {/* Row 1 — always rendered, always first, never conditional */}
      <SiteHeaderRow1 onWalkerToggle={onWalkerToggle} loading={loading} />

      {/* Row 2 (banner) + Row 4 (ticker) — hidden in map expand mode */}
      {!mapExpand && row2Visible && (
        <SiteHeaderRow2
          pendingPlace={pendingPlace}
          path={path}
          bannerImage={bannerImage}
        />
      )}

      {/* Row 3 (location walker + crumbs) — always shown when active */}
      {row3Visible && (
        <SiteHeaderRow3
          walkerOpen={walkerOpen}
          currentOptions={currentOptions}
          navDepth={navDepth}
          crumbs={crumbs}
          onSelect={onSelect}
        />
      )}

      {!mapExpand && <SiteHeaderRow4 />}
    </Box>
  )
}
