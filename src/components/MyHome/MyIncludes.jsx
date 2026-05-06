/**
 * @file MyIncludes.jsx
 * @description Left pane for MyHome — the user's saved site items.
 *
 * Fetches all user follows from /api/follows/all and renders one
 * Accordion section per entity type. Clicking an item selects it as
 * the feed context for the mid pane. ContentActions provides remove.
 *
 * Entity types are displayed in a fixed priority order; types with no
 * saved items are omitted entirely.
 */

import { useState, useEffect } from 'react'
import {
  Stack, Text, Accordion, Group, Badge, UnstyledButton,
} from '@mantine/core'
import ContentActions from '../ContentActions.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const TYPE_META = {
  place:           { label: 'Places',      colour: 'blue'   },
  school:          { label: 'Schools',     colour: 'green'  },
  committee_forum: { label: 'Committees',  colour: 'violet' },
  network_chapter: { label: 'Networks',    colour: 'teal'   },
  association:     { label: 'Groups',      colour: 'orange' },
  space:           { label: 'Spaces',      colour: 'pink'   },
}

const TYPE_ORDER = Object.keys(TYPE_META)

/**
 * @param {object}        props
 * @param {object|null}   props.session        - Supabase session (for auth header)
 * @param {string|null}   props.selectedId     - Currently selected entity_id
 * @param {Function}      props.onSelect       - (origin) => void — item clicked
 */
export default function MyIncludes({ session, selectedId, onSelect }) {
  const [follows, setFollows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.access_token) return
    fetch(`${API_BASE}/api/follows/all`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(setFollows)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session?.access_token])

  function handleUnfollow(entityType, entityId) {
    fetch(`${API_BASE}/api/follows/${entityType}/${entityId}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => {})

    setFollows(prev =>
      prev.filter(f => !(f.entity_type === entityType && String(f.entity_id) === String(entityId)))
    )
  }

  const grouped = TYPE_ORDER
    .map(type => ({
      type,
      ...(TYPE_META[type] ?? { label: type, colour: 'gray' }),
      items: follows.filter(f => f.entity_type === type),
    }))
    .filter(g => g.items.length > 0)

  if (loading) {
    return <Text size="xs" c="dimmed" p="md">Loading…</Text>
  }

  if (grouped.length === 0) {
    return (
      <Stack gap="xs" p="md">
        <Text size="sm" fw={600}>My Home</Text>
        <Text size="xs" c="dimmed" lh={1.5}>
          Nothing saved yet. Use the … menu on any place, school, group, or
          committee to add it here.
        </Text>
      </Stack>
    )
  }

  return (
    <Stack gap={0}>
      <Text size="sm" fw={600} p="md" pb="xs">My Home</Text>

      <Accordion
        multiple
        chevronPosition="right"
        variant="default"
        defaultValue={grouped.map(g => g.type)}
      >
        {grouped.map(({ type, label, colour, items }) => (
          <Accordion.Item key={type} value={type}>
            <Accordion.Control py="xs">
              <Group gap="xs">
                <Badge size="xs" color={colour} variant="light">{items.length}</Badge>
                <Text size="sm" fw={500}>{label}</Text>
              </Group>
            </Accordion.Control>

            <Accordion.Panel>
              <Stack gap={2}>
                {items.map(item => {
                  const id       = String(item.entity_id)
                  const isActive = id === selectedId
                  const origin   = {
                    entity_type: item.entity_type,
                    entity_id:   id,
                    entity_name: item.entity_name ?? id,
                    geo_scope:   item.scope_gss ? { gss: item.scope_gss } : {},
                  }
                  return (
                    <Group
                      key={id}
                      justify="space-between"
                      gap="xs"
                      px="xs"
                      py={3}
                      style={{
                        borderRadius: 4,
                        background: isActive ? 'var(--mantine-color-blue-0)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <UnstyledButton
                        style={{ flex: 1, minWidth: 0 }}
                        onClick={() => onSelect(origin)}
                      >
                        <Text
                          size="xs"
                          truncate
                          fw={isActive ? 600 : 400}
                          c={isActive ? 'blue' : undefined}
                        >
                          {item.entity_name ?? id}
                        </Text>
                      </UnstyledButton>

                      <ContentActions
                        entityType={item.entity_type}
                        entityId={id}
                        entityName={item.entity_name}
                        isFollowing={true}
                        onUnfollow={() => handleUnfollow(item.entity_type, id)}
                      />
                    </Group>
                  )
                })}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Stack>
  )
}
