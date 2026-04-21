/**
 * @file HeaderNavigation.jsx
 * @description Two-panel hierarchy navigation component for UKCP.
 * Panel 1 shows English regions; Panel 2 shows children at the current depth.
 * Navigation state is owned by the parent (SiteHeader) via useNavigation and
 * passed down as props. Renders null when not visible.
 *
 * TODO: Open Decision 4 — Scotland, Wales, and Northern Ireland excluded from Panel 1.
 * Panel 1 shows English regions only until the hierarchy differences are resolved.
 * Reference: UKCP Technical Specification v1.0 Section 9, Decision 4.
 *
 * @deprecated Superseded by SiteHeaderRow3 (Sprint 3). Retained for reference
 * only. Do not use in new code.
 */

import { Box, Group, ScrollArea, NavLink, Text } from '@mantine/core'

/**
 * Maps current path depth to Panel 2 label and the level label passed to select().
 * Index = path.length (capped at 4).
 */
const DEPTH_CONFIG = [
  { label: '',               nextLevel: ''             },
  { label: 'Counties',       nextLevel: 'county'       },
  { label: 'Areas',          nextLevel: 'area'         },
  { label: 'Constituencies', nextLevel: 'constituency' },
  { label: 'Localities',     nextLevel: 'locale'       },
]

/**
 * HeaderNavigation renders two scrollable panels for hierarchy drill-down.
 * Panel 1 always lists English regions. Panel 2 lists children of the current
 * deepest selection, with its label updating to reflect the current depth.
 *
 * @param {{
 *   hierarchy: object,
 *   visible:   boolean,
 *   path:      Array<{ level: string, value: string }>,
 *   panel1:    string[],
 *   panel2:    string[],
 *   select:    (level: string, value: string) => void
 * }} props
 * @returns {JSX.Element|null}
 */
export default function HeaderNavigation({ hierarchy, visible, path, panel1, panel2, select }) {
  if (!visible) return null

  const depth          = Math.min(path.length, 4)
  const config         = DEPTH_CONFIG[depth]
  const selectedRegion = path[0]?.value
  // Highlighted item in panel2: the path entry at the panel2 depth, if any.
  const selectedPanel2 = path[depth]?.value

  return (
    <Box p="sm">
      <Group align="flex-start" gap="md" grow>

        {/* Panel 1 — Regions */}
        <Box>
          <Text fw={600} size="sm" mb="xs">Regions</Text>
          <ScrollArea h={320}>
            {panel1.map(region => (
              <NavLink
                key={region}
                component="button"
                label={region}
                active={selectedRegion === region}
                onClick={() => select('region', region)}
              />
            ))}
          </ScrollArea>
        </Box>

        {/* Panel 2 — Children at current depth */}
        <Box>
          {config.label ? (
            <Text fw={600} size="sm" mb="xs">{config.label}</Text>
          ) : (
            <Text fw={600} size="sm" mb="xs" c="dimmed">Select a region</Text>
          )}
          <ScrollArea h={320}>
            {panel2.map(item => (
              <NavLink
                key={item}
                component="button"
                label={item}
                active={selectedPanel2 === item}
                onClick={() => select(config.nextLevel, item)}
              />
            ))}
          </ScrollArea>
        </Box>

      </Group>
    </Box>
  )
}
