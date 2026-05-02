/**
 * @file SiteHeader.jsx
 * @description Three-row UKCP site header container.
 *
 * Row structure:
 *   Row 1 -- SiteHeaderRow1 (permanent nav bar, always rendered)
 *   Row 2 -- SiteHeaderRow2 (nav map + emblem + content image banner)
 *   Row 3 -- SiteHeaderRow3 (location walker + crumb trail)
 *
 * Row 4 (ticker bar) removed -- real estate reclaimed for nav map.
 * All state is received as props -- no hooks called here.
 */

import { Box } from '@mantine/core'
import SiteHeaderRow1 from './Header/SiteHeaderRow1.jsx'
import SiteHeaderRow2 from './Header/SiteHeaderRow2.jsx'
import SiteHeaderRow3 from './Header/SiteHeaderRow3.jsx'

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
  navMapProps,
  onMapClick,
}) {
  return (
    <Box>
      {/* Row 1 -- always rendered */}
      <SiteHeaderRow1 onWalkerToggle={onWalkerToggle} loading={loading} />

      {/* Row 2 -- nav map banner, hidden in expand mode */}
      {!mapExpand && row2Visible && (
        <SiteHeaderRow2
          pendingPlace={pendingPlace}
          path={path}
          bannerImage={bannerImage}
          navMapProps={navMapProps}
          onMapClick={onMapClick}
        />
      )}

      {/* Row 3 -- walker + crumb trail */}
      {row3Visible && (
        <SiteHeaderRow3
          walkerOpen={walkerOpen}
          currentOptions={currentOptions}
          navDepth={navDepth}
          crumbs={crumbs}
          onSelect={onSelect}
        />
      )}
    </Box>
  )
}
