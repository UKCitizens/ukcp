/**
 * @file src/components/Traders/TradersTab.jsx
 * @description Local Traders tab panel.
 * Displays registered local traders for the current location scope.
 * Shell only -- no trader data exists yet (self-registration deferred).
 * Layout: category filter strip + trader card list.
 *
 * Props:
 *   locationType  -- geo node type
 *   locationSlug  -- geo node slug
 *   locationLabel -- human-readable label
 */
import { useState } from 'react'
import { Text, Stack, Paper, Group, Badge, Button } from '@mantine/core'

const CATEGORIES = ['All', 'Food & Drink', 'Health', 'Services', 'Retail', 'Trades']

// Placeholder trader card -- replace with real TraderCard when data exists
function PlaceholderTraderCard({ name, category, description }) {
  return (
    <Paper withBorder p="sm" radius="sm">
      <Group justify="space-between" mb={4}>
        <Text size="sm" fw={600}>{name}</Text>
        <Badge size="xs" variant="light" color="teal">{category}</Badge>
      </Group>
      <Text size="xs" c="dimmed" lineClamp={2}>{description}</Text>
    </Paper>
  )
}

export default function TradersTab({ locationType, locationSlug, locationLabel }) {
  const [activeCategory, setActiveCategory] = useState('All')

  if (!locationType) {
    return (
      <div style={empty}>
        <Text size="sm" c="dimmed">Select a location to see local traders.</Text>
      </div>
    )
  }

  // Placeholder data -- removed when self-registration sprint delivers real records
  const placeholders = [
    { name: 'The Corner Bakery', category: 'Food & Drink', description: 'Fresh bread and pastries baked daily. Family run since 1987.' },
    { name: 'Apex Plumbing', category: 'Trades', description: 'Local plumber, gas safe registered. Call-outs across the constituency.' },
    { name: 'Green Leaf Health', category: 'Health', description: 'Independent pharmacy and wellness shop serving the local community.' },
  ]

  const filtered = activeCategory === 'All'
    ? placeholders
    : placeholders.filter(t => t.category === activeCategory)

  return (
    <div style={wrap}>
      {/* Category filter strip */}
      <div style={filterStrip}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            style={activeCategory === cat ? { ...filterBtn, ...filterBtnActive } : filterBtn}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={content}>
        {/* Register CTA -- will link to self-registration flow when built */}
        <Paper withBorder p="sm" radius="sm" mb="md" style={{ background: '#f8fff9', borderColor: '#b2f2bb' }}>
          <Text size="xs" fw={600} c="teal.8" mb={4}>Are you a local trader?</Text>
          <Text size="xs" c="dimmed" mb={6}>
            Register your business on UKCP Local Traders and reach your community.
            Self-registration coming soon.
          </Text>
          <Button size="xs" variant="light" color="teal" disabled>
            Register your business
          </Button>
        </Paper>

        {/* Trader list */}
        <Text size="xs" c="dimmed" mb={8}>
          {locationLabel ?? locationSlug?.replace(/_/g, ' ')} -- {filtered.length} trader{filtered.length !== 1 ? 's' : ''} listed
          {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
          {' '}(placeholder data)
        </Text>
        <Stack gap={8}>
          {filtered.map((t, i) => (
            <PlaceholderTraderCard key={i} {...t} />
          ))}
        </Stack>
      </div>
    </div>
  )
}

const wrap        = { height: '100%', display: 'flex', flexDirection: 'column' }
const filterStrip = { display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid #f1f3f5', overflowX: 'auto', flexShrink: 0 }
const filterBtn   = { fontSize: 11, padding: '3px 8px', border: '1px solid #dee2e6', borderRadius: 12, background: '#fff', color: '#495057', cursor: 'pointer', whiteSpace: 'nowrap' }
const filterBtnActive = { background: '#0ca678', color: '#fff', borderColor: '#0ca678' }
const content     = { overflowY: 'auto', flex: 1, padding: 12 }
