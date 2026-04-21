/**
 * @file SiteHeaderRow2.jsx
 * @description Row 2 of the UKCP site header — the location context banner.
 *
 * Always visible on the Locations page. Displays a single centred label
 * tracking the most specific location context:
 *   - Selected place name     (if a place has been clicked in the left pane)
 *   - Deepest nav path value  (country / region / county / constituency / ward)
 *   - "UK"                    (default, before any navigation)
 *
 * Background: UKBanner.png. Label: black, centred H and V, bold.
 * A subtle text-shadow is applied for legibility against the image.
 *
 * Standards: no inline styles, no sx prop. All colours via CSS module.
 * Row height is ROW2_HEIGHT constant.
 */

import { Box, Text } from '@mantine/core'
import { ROW2_HEIGHT } from './HEADER_ROWS.js'
import classes from './SiteHeaderRow2.module.css'

/**
 * Derives the banner label from current navigation state.
 *
 * @param {object|null} pendingPlace - Place clicked in left pane ({ name, place_type }).
 * @param {Array<{ level: string, value: string }>} path - Navigation path.
 * @returns {string}
 */
function resolveLabel(pendingPlace, path) {
  if (pendingPlace?.name) return pendingPlace.name
  if (path.length > 0)    return path[path.length - 1].value
  return 'UK'
}

/**
 * Renders the always-on location context banner (Row 2).
 *
 * @param {object}      props
 * @param {object|null} props.pendingPlace  - Place selected in left pane.
 * @param {Array}       props.path          - Navigation path array.
 * @param {string|null} props.bannerImage   - Wikipedia thumbnail URL. When provided,
 *                                            overrides the static UKBanner.png background.
 * @returns {JSX.Element}
 */
export default function SiteHeaderRow2({ pendingPlace, path, bannerImage }) {
  const label = resolveLabel(pendingPlace, path)

  // Dynamic background override — inline style required for data-driven image URLs.
  // Local asset paths (starting with '/') are used directly — no gradient needed.
  // Wikipedia thumbnails (http/https) get a white overlay for label legibility.
  // Falls back to the static UKBanner.png defined in the CSS module when null.
  const isLocal = bannerImage?.startsWith('/')
  const dynamicStyle = bannerImage
    ? {
        backgroundImage:    isLocal
          ? `url(${bannerImage})`
          : `linear-gradient(rgba(255,255,255,0.45), rgba(255,255,255,0.45)), url(${bannerImage})`,
        backgroundSize:     '100% 100%',
        backgroundPosition: 'center center',
      }
    : undefined

  return (
    <Box h={ROW2_HEIGHT} className={`${classes.row2} ${classes.row}`} style={dynamicStyle}>
      <Box className={classes.rowInner}>
        <Text className={classes.contextLabel} size="xl">
          {label}
        </Text>
      </Box>
    </Box>
  )
}
