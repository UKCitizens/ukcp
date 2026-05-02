/**
 * @file SiteHeaderRow2.jsx
 * @description Row 2 of the UKCP site header -- the location context banner.
 *
 * Five-slot image strip. Each slot is 20% of the row width, full row height.
 * Slot 2 (middle, zero-indexed) is the primary image slot and carries the
 * location label overlay. Slots 0, 1, 3, 4 show placeholder grey until
 * content is assigned via the bannerImages prop.
 *
 * Props:
 *   pendingPlace  -- place clicked in left pane ({ name, place_type })
 *   path          -- navigation path array
 *   bannerImage   -- single image URL (legacy / Wikipedia thumbnail).
 *                    Used as slot 2 when bannerImages is not provided.
 *   bannerImages  -- array of 5 image URLs [slot0..slot4]. Overrides bannerImage.
 *                    Pass null for slots with no image yet.
 *
 * Standards: no sx prop. Row height is ROW2_HEIGHT constant.
 */

import { ROW2_HEIGHT } from './HEADER_ROWS.js'
import classes from './SiteHeaderRow2.module.css'

function resolveLabel(pendingPlace, path) {
  if (pendingPlace?.name) return pendingPlace.name
  if (path.length > 0)    return path[path.length - 1].value
  return 'UK'
}

function slotBackground(url) {
  if (!url) return undefined
  const isLocal = url.startsWith('/')
  return {
    backgroundImage:    isLocal
      ? `url(${url})`
      : `linear-gradient(rgba(255,255,255,0.35), rgba(255,255,255,0.35)), url(${url})`,
    backgroundSize:     'cover',
    backgroundPosition: 'center center',
  }
}

export default function SiteHeaderRow2({ pendingPlace, path, bannerImage, bannerImages }) {
  const label = resolveLabel(pendingPlace, path)

  // Resolve 5-slot array. bannerImages prop takes precedence; falls back to
  // placing bannerImage in the middle slot (index 2).
  const slots = bannerImages ?? [null, null, bannerImage ?? null, null, null]

  return (
    <div
      style={{ height: ROW2_HEIGHT, display: 'flex', width: '100%', overflow: 'hidden' }}
      className={classes.row}
    >
      {slots.map((url, i) => {
        const isMiddle = i === 2
        return (
          <div
            key={i}
            className={[classes.slot, url ? '' : classes.slotEmpty].join(' ')}
            style={slotBackground(url)}
          >
            {isMiddle && (
              <span className={classes.contextLabel}>{label}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
