/**
 * @file LocationNav.jsx
 * @description Two-panel hierarchy navigator for the UKCP mid pane.
 *
 * Panel 1 (Regions) is always rendered and lists English regions from panel1.
 * Panel 2 (dynamic children) renders when panel1 has entries. Its label and
 * the level passed to select() are driven by DEPTH_CONFIG, keyed on path.length
 * capped at 4.
 *
 * At path.length === 0, Panel 2 shows a dimmed "Select a region" prompt.
 * At path.length >= 1, Panel 2 shows the children at the current depth
 * (counties, areas, constituencies, or localities).
 *
 * No hook calls — all state arrives via props from Locations.jsx.
 *
 * Standards: no inline styles, no sx prop. Layout via Mantine components.
 * Visual styles via CSS module.
 *
 * @todo Open Decision 4 — panel1 English regions only. Scotland, Wales, and
 *   Northern Ireland hierarchy deferred to a future sprint.
 */

import { Box, Group, NavLink, ScrollArea, Text } from '@mantine/core'
import classes from './LocationNav.module.css'

/**
 * Maps path.length (capped at 4) to the Panel 2 label and the hierarchy level
 * passed to select() when the user clicks an item.
 *
 * @type {Record<number, { label: string|null, nextLevel: string|null }>}
 */
const DEPTH_CONFIG = {
  0: { label: null,             nextLevel: null           },
  1: { label: 'Counties',       nextLevel: 'county'       },
  2: { label: 'Constituencies', nextLevel: 'constituency' },
  3: { label: 'Wards',          nextLevel: 'ward'         },
  4: { label: 'Places',         nextLevel: 'place'        },
}

/**
 * Renders the two-panel location hierarchy navigator.
 *
 * @param {object}   props
 * @param {string[]} props.panel1 - English region names for Panel 1.
 * @param {string[]} props.panel2 - Children at the current depth for Panel 2.
 * @param {Array<{ level: string, value: string }>} props.path - Current
 *                   navigation path from useNavigation.
 * @param {Function} props.select - Callback to advance the navigation path.
 *                   Signature: (level: string, value: string) => void.
 * @returns {JSX.Element}
 */
export default function LocationNav({ panel1, panel2, path, select }) {
  const depth  = Math.min(path.length, 4)
  const config = DEPTH_CONFIG[depth]

  return (
    <Group grow align="flex-start" gap="md">

      {/* Panel 1 — Regions (always rendered) */}
      <Box className={classes.panel}>
        <Text className={classes.panelLabel}>Regions</Text>
        <ScrollArea h={280}>
          {panel1.map(region => (
            <NavLink
              key={region}
              label={region}
              active={path[0]?.value === region}
              onClick={() => select('region', region)}
            />
          ))}
        </ScrollArea>
      </Box>

      {/* Panel 2 — Dynamic children (rendered when regions are available) */}
      {panel1.length > 0 && (
        <Box className={classes.panel}>
          {depth === 0 ? (
            <Text c="dimmed" size="sm">Select a region</Text>
          ) : (
            <>
              <Text className={classes.panelLabel}>{config.label}</Text>
              <ScrollArea h={280}>
                {panel2.map((item, i) => (
                  <NavLink
                    key={`${i}-${item}`}
                    label={item}
                    active={path[depth]?.value === item}
                    onClick={() => select(config.nextLevel, item)}
                  />
                ))}
              </ScrollArea>
            </>
          )}
        </Box>
      )}

    </Group>
  )
}
