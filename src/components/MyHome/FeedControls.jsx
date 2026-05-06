/**
 * @file FeedControls.jsx
 * @description Horizontal filter strip for the MyHome feed in All mode.
 *
 * Props:
 *   typeOptions  — string[] of feed_type values present in the feed
 *   onFilter     — fn({ types: string[], since: string|null, scope: string|null })
 */

import { useState, useEffect } from 'react'
import { Group, Chip, SegmentedControl, Select, Text } from '@mantine/core'

const DATE_OPTIONS = [
  { label: '7d',  value: '7d'  },
  { label: '30d', value: '30d' },
  { label: 'All', value: 'all' },
]

const SCOPE_OPTIONS = [
  { label: 'Any',          value: 'any'         },
  { label: 'Ward',         value: 'ward'         },
  { label: 'Constituency', value: 'constituency'  },
  { label: 'County',       value: 'county'        },
  { label: 'Region',       value: 'region'        },
  { label: 'National',     value: 'national'      },
]

const TYPE_LABELS = { post: 'Posts', network_post: 'Network' }

/** @returns {JSX.Element} */
export default function FeedControls({ typeOptions, onFilter }) {
  const [selectedTypes, setSelectedTypes] = useState(typeOptions ?? [])
  const [dateRange,     setDateRange]     = useState('all')
  const [scope,         setScope]         = useState('any')

  // Keep selectedTypes in sync if typeOptions changes
  useEffect(() => {
    setSelectedTypes(typeOptions ?? [])
  }, [typeOptions?.join(',')])

  function buildFilter(types, date, sc) {
    let since = null
    if (date === '7d')  since = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString()
    if (date === '30d') since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    onFilter({ types, since, scope: sc === 'any' ? null : sc })
  }

  function handleTypeToggle(type) {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type]
    setSelectedTypes(next)
    buildFilter(next, dateRange, scope)
  }

  function handleDate(val) {
    setDateRange(val)
    buildFilter(selectedTypes, val, scope)
  }

  function handleScope(val) {
    setScope(val)
    buildFilter(selectedTypes, dateRange, val)
  }

  return (
    <Group gap="xs" wrap="wrap" align="center">
      <Text size="xs" fw={500} c="dimmed">Filter</Text>

      {(typeOptions ?? []).map(type => (
        <Chip
          key={type}
          size="xs"
          checked={selectedTypes.includes(type)}
          onChange={() => handleTypeToggle(type)}
        >
          {TYPE_LABELS[type] ?? type}
        </Chip>
      ))}

      <SegmentedControl
        data={DATE_OPTIONS}
        value={dateRange}
        onChange={handleDate}
        size="xs"
      />

      <Select
        data={SCOPE_OPTIONS}
        value={scope}
        onChange={handleScope}
        size="xs"
        w={130}
        checkIconPosition="right"
      />
    </Group>
  )
}
