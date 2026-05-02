/**
 * @file src/components/News/NewsTab.jsx
 * @description News tab panel. Three zones: Local / Regional / National.
 * Each zone shows a header + placeholder feed cards.
 * Feed wiring is deferred to the feed aggregation sprint.
 *
 * Props:
 *   locationType  -- geo node type (ward | constituency | county | region | country)
 *   locationSlug  -- geo node slug
 *   locationLabel -- human-readable label for the current location
 */
import { Text, Stack, Paper, Group, Badge, Anchor } from '@mantine/core'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

// Placeholder card -- replace with real NewsCard when feed is wired
function PlaceholderCard({ index }) {
  const titles = [
    'Council announces new local initiative',
    'Community meeting scheduled for next week',
    'Planning application submitted for town centre',
    'Road closure notice: works begin Monday',
    'Local charity reaches fundraising milestone',
  ]
  return (
    <Paper withBorder p="xs" radius="sm" style={{ opacity: 0.6 }}>
      <Text size="xs" fw={600} c="dark" mb={2}>{titles[index % titles.length]}</Text>
      <Group gap={6}>
        <Text size="xs" c="dimmed">Placeholder</Text>
        <Badge size="xs" variant="light" color="gray">Coming soon</Badge>
      </Group>
    </Paper>
  )
}

function NewsZone({ label, colour, locationLabel, itemCount = 3 }) {
  return (
    <div style={zone}>
      <div style={{ ...zoneHeader, borderLeftColor: colour }}>
        <Text size="sm" fw={700} c="dark">{label}</Text>
        {locationLabel && (
          <Text size="xs" c="dimmed">{locationLabel}</Text>
        )}
      </div>
      <Stack gap={6} style={{ padding: '8px 12px 12px' }}>
        {Array.from({ length: itemCount }).map((_, i) => (
          <PlaceholderCard key={i} index={i} />
        ))}
        <Anchor size="xs" c="blue" style={{ display: 'block', textAlign: 'right', marginTop: 2 }}>
          More {label.toLowerCase()} news
        </Anchor>
      </Stack>
    </div>
  )
}

export default function NewsTab({ locationType, locationSlug, locationLabel }) {
  // Derive scope labels for each zone
  const localLabel    = locationLabel ?? locationSlug?.replace(/_/g, ' ') ?? 'Local'
  const regionalLabel = null   // will be derived from path when feed is wired
  const nationalLabel = 'UK'

  if (!locationType) {
    return (
      <div style={empty}>
        <Text size="sm" c="dimmed">Select a location to see local news.</Text>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <NewsZone
        label="Local"
        colour="#2f9e44"
        locationLabel={localLabel}
        itemCount={3}
      />
      <NewsZone
        label="Regional"
        colour="#1971c2"
        locationLabel={regionalLabel}
        itemCount={2}
      />
      <NewsZone
        label="National"
        colour="#e03131"
        locationLabel={nationalLabel}
        itemCount={2}
      />
    </div>
  )
}

const wrap       = { overflowY: 'auto', height: '100%' }
const empty      = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }
const zone       = { borderBottom: '1px solid #f1f3f5' }
const zoneHeader = { padding: '10px 12px 6px', borderLeft: '3px solid #dee2e6' }
