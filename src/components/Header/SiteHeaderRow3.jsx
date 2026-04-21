/**
 * @file SiteHeaderRow3.jsx
 * @description Row 3 — location navigator.
 *
 * Two modes:
 *   Full (walkerOpen true)  — options row + crumb row, ROW3_HEIGHT.
 *   Crumb-only (walkerOpen false) — crumb row only, ROW3_CRUMB_HEIGHT.
 *
 * Options row is suppressed once county depth is reached (auto-close
 * triggered in Locations.jsx). Crumb trail is always visible while a
 * path exists, regardless of walker state.
 *
 * crumbs prop: Array<{ label: string, onClick?: () => void }>
 *   Items with onClick are rendered as clickable anchors.
 *   Items without onClick are rendered as plain text (last item or place).
 */

import { useRef, useEffect, useState } from 'react'
import { Anchor, Box, Group, Text } from '@mantine/core'
import { ROW3_HEIGHT, ROW3_CRUMB_HEIGHT } from './HEADER_ROWS.js'
import classes from './SiteHeaderRow3.module.css'

// 2 lines at 12px / 1.5 lineHeight + 1 row-gap of 3px
const TWO_LINE_THRESHOLD = 36

const NAV_LEVELS = [
  { label: 'Country',      nextLevel: 'country'      },
  { label: 'Region',       nextLevel: 'region'       },
  { label: 'County',       nextLevel: 'county'       },
  { label: 'Constituency', nextLevel: 'constituency' },
  { label: 'Ward',         nextLevel: 'ward'         },
  { label: 'Place',        nextLevel: 'place'        },
]

/**
 * @param {{
 *   walkerOpen:     boolean,
 *   currentOptions: string[],
 *   navDepth:       number,
 *   crumbs:         Array<{ label: string, onClick?: () => void }>,
 *   onSelect:       (level: string, value: string) => void,
 * }} props
 */
export default function SiteHeaderRow3({ walkerOpen, currentOptions, navDepth, crumbs, onSelect }) {
  const depth          = Math.min(navDepth, NAV_LEVELS.length - 1)
  const levelConfig    = NAV_LEVELS[depth]
  const height         = walkerOpen ? ROW3_HEIGHT : ROW3_CRUMB_HEIGHT
  const optionsWrapRef = useRef(null)
  const [scrollable, setScrollable] = useState(false)

  useEffect(() => {
    const el = optionsWrapRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setScrollable(el.scrollHeight > TWO_LINE_THRESHOLD)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [walkerOpen, currentOptions])

  return (
    <Box h={height} className={`${classes.row3} ${classes.row}`}>
      <Box className={classes.rowInner}>

        {/* Options row — only when walker is open */}
        {walkerOpen && (
          <Box className={classes.optionsRow}>
            <Text className={classes.levelLabel}>{levelConfig.label}:</Text>
            <Box
              ref={optionsWrapRef}
              className={`${classes.optionsWrap}${scrollable ? ` ${classes.optionsWrapScroll}` : ''}`}
            >
              {currentOptions.map(opt => (
                <button
                  key={opt}
                  className={classes.optionLink}
                  onClick={() => onSelect(levelConfig.nextLevel, opt)}
                >
                  {opt}
                </button>
              ))}
            </Box>
          </Box>
        )}

        {/* Crumb row — always visible when crumbs exist */}
        {crumbs.length > 0 && (
          <Group gap={4} className={classes.crumbRow} wrap="nowrap">
            {crumbs.map((crumb, i) => (
              <Group key={i} gap={4} wrap="nowrap">
                {i > 0 && <Text size="sm" c="dimmed">›</Text>}
                {crumb.isRoot ? (
                  <Anchor
                    component="button"
                    size="sm"
                    onClick={crumb.onClick}
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <svg width="8" height="8" style={{ flexShrink: 0 }}>
                      <circle cx="4" cy="4" r="4" fill="#2f9e44" />
                    </svg>
                    {crumb.label}
                  </Anchor>
                ) : crumb.onClick ? (
                  <Anchor
                    component="button"
                    size="sm"
                    onClick={crumb.onClick}
                  >
                    {crumb.label}
                  </Anchor>
                ) : (
                  <Text size="sm" fw={500}>{crumb.label}</Text>
                )}
              </Group>
            ))}
          </Group>
        )}

      </Box>
    </Box>
  )
}
