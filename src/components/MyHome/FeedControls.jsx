/**
 * @file FeedControls.jsx
 * @description Horizontal filter strip for the MyHome feed in All mode.
 *
 * Props:
 *   typeOptions  — string[] of feed_type values present in the feed
 *   onFilter     — fn({ types: string[], since: string|null, scope: string|null })
 */

import { useState, useEffect } from 'react'
import { Group, Chip, SegmentedControl, Text } from '@mantine/core'

const DATE_OPTIONS = [
  { label: '7d',  value: '7d'  },
  { label: '30d', value: '30d' },
  { label: 'All', value: 'all' },
]

const TYPE_LABELS = { post: 'Posts', network_post: 'Network' }

/**
 * @param {object}    props
 * @param {string[]}  props.typeOptions - feed_type values present in the current feed
 * @param {Function}  props.onFilter    - fn({ types, since }) -- scope removed, driven by reach in MyHome
 */
export default function FeedControls({ typeOptions, onFilter }) {
  const [selectedTypes, setSelectedTypes] = useState(typeOptions ?? [])
  const [dateRange,     setDateRange]     = useState('all')

  // Keep selectedTypes in sync if typeOptions changes
  useEffect(() => {
    setSelectedTypes(typeOptions ?? [])
  }, [typeOptions?.join(',')])

  function buildFilter(types, date) {
    let since = null
    if (date === '7d')  since = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString()
    if (date === '30d') since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    onFilter({ types, since })
  }

  function handleTypeToggle(type) {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type]
    setSelectedTypes(next)
    buildFilter(next, dateRange)
  }

  function handleDate(val) {
    setDateRange(val)
    buildFilter(selectedTypes, val)
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
    </Group>
  )
}
