/**
 * @file SiteHeaderRow2.jsx
 * @description Row 2 of the UKCP site header -- nav map banner strip.
 *
 * Three zones:
 *   Left  (20%) -- emblem/flag for current location. Shows location label
 *                  until emblem content is wired from geo-content.
 *   Centre (60%) -- MidPaneMap in headerMode. Always-visible navigation map.
 *                   Clicking fires onMapClick (switches side panes to location
 *                   navigator mode).
 *   Right  (20%) -- content image (Wikipedia thumbnail or location photo).
 *
 * Props:
 *   pendingPlace  -- place object or null
 *   path          -- navigation path array
 *   bannerImage   -- content image URL for the right slot
 *   navMapProps   -- props object spread directly into MidPaneMap
 *   onMapClick    -- () => void  called when user clicks the centre map
 */

import MidPaneMap from '../MidPaneMap.jsx'
import { ROW2_HEIGHT } from './HEADER_ROWS.js'
import classes from './SiteHeaderRow2.module.css'

function resolveLabel(pendingPlace, path) {
  if (pendingPlace?.name) return pendingPlace.name
  if (path?.length > 0)   return path[path.length - 1].value
  return 'UK'
}

export default function SiteHeaderRow2({ pendingPlace, path, bannerImage, navMapProps, onMapClick }) {
  const label = resolveLabel(pendingPlace, path)

  return (
    <div
      style={{ height: ROW2_HEIGHT, display: 'flex', width: '100%', overflow: 'hidden' }}
      className={classes.row}
    >
      {/* Left -- emblem/flag zone (20%) */}
      <div className={`${classes.slot} ${classes.slotEmblem}`}>
        <span className={classes.emblemLabel}>{label}</span>
      </div>

      {/* Centre -- navigation map (60%) */}
      <div className={classes.slotMap}>
        {navMapProps ? (
          <MidPaneMap
            {...navMapProps}
            headerMode
            onMapClick={onMapClick}
          />
        ) : (
          <div className={classes.slotEmpty} style={{ width: '100%', height: '100%' }} />
        )}
      </div>

      {/* Right -- content image (20%) */}
      <div
        className={`${classes.slot} ${bannerImage ? classes.slotContent : classes.slotEmpty}`}
        style={bannerImage ? {
          backgroundImage:    `linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url(${bannerImage})`,
          backgroundSize:     'cover',
          backgroundPosition: 'center center',
        } : undefined}
      />
    </div>
  )
}
