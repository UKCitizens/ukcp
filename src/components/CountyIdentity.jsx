/**
 * @file CountyIdentity.jsx
 * @description Mid-pane county identity panel. Renders the county name,
 * geographic context (region + country), a stats row (places, constituencies,
 * wards), and a divider placeholder for future sprint content.
 *
 * Renders null if county is not active (county prop is null/undefined).
 */

import { Title, Text, Stack, Group, Divider } from '@mantine/core'

/** @type {string[]} Group order for total places count. */
const GROUP_ORDER = ['City', 'Town', 'Village', 'Hamlet']

/**
 * A single stat block: bold number + dimmed label.
 *
 * @param {{ value: string|number, label: string }} props
 * @returns {JSX.Element}
 */
function StatBlock({ value, label }) {
  return (
    <Stack gap={2} align="center">
      <Text fw={700} size="lg">{value}</Text>
      <Text size="xs" c="dimmed">{label}</Text>
    </Stack>
  )
}

/**
 * CountyIdentity — renders county name, region/country subline, stats row,
 * and a divider placeholder for future content.
 *
 * @param {{
 *   county:         string|null,
 *   region:         string|null,
 *   country:        string|null,
 *   grouped:        { City: object[], Town: object[], Village: object[], Hamlet: object[] }|null,
 *   constituencies: Array<{ id: string, name: string, partial: boolean, wards: string[] }>|null,
 *   totalWards:     number
 * }} props
 * @returns {JSX.Element|null}
 */
export default function CountyIdentity({ county, region, country, grouped, constituencies, totalWards }) {
  if (!county) return null

  const totalPlaces = GROUP_ORDER.reduce(
    (sum, type) => sum + (grouped?.[type]?.length ?? 0), 0
  )

  const fullCount    = constituencies?.filter(c => !c.partial).length ?? 0
  const partialCount = constituencies?.filter(c =>  c.partial).length ?? 0
  const constiLabel  = `${fullCount} full, ${partialCount} partial`

  return (
    <Stack gap="md" p="md">
      <Stack gap={2}>
        <Title order={3}>{county}</Title>
        <Text c="dimmed" size="xs">{region}, {country}</Text>
      </Stack>

      <Group gap="xl" justify="center">
        <StatBlock value={totalPlaces}  label="Places" />
        <StatBlock value={constiLabel}  label="Constituencies" />
        <StatBlock value={totalWards}   label="Wards" />
      </Group>

      <Divider label="County content coming soon" labelPosition="center" />
    </Stack>
  )
}
