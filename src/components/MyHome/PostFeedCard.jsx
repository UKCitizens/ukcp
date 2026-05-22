/**
 * @file PostFeedCard.jsx
 * @description Card rendering one item from the MyHome feed common envelope.
 *
 * Props:
 *   item        — common envelope ({ feed_type, entity_type, entity_id, entity_name,
 *                 timestamp, scope, payload: { body, author_name, ... } })
 *   onUnfollow  — fn(entity_type, entity_id) — remove from My Home + refetch
 */

import { Paper, Group, Text, Badge } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import ContentActions  from '../ContentActions.jsx'

function relativeTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)   return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** @returns {JSX.Element} */
export default function PostFeedCard({ item, onUnfollow }) {
  const navigate = useNavigate()

  // Map entity_type to the tab that owns it in Locations.jsx.
  // Locations reads location.state.openTab on mount to switch tab.
  const TAB_FOR_TYPE = {
    committee_forum: 'civic',
    school:          'schools',
    network_chapter: 'groups',
    association:     'groups',
    space:           'groups',
  }

  function handleOpen() {
    const openTab = TAB_FOR_TYPE[item.entity_type] ?? null
    navigate('/locations', openTab ? { state: { openTab } } : {}  )
  }

  function handleUnfollow() {
    if (onUnfollow) onUnfollow(item.entity_type, item.entity_id)
  }

  return (
    <Paper withBorder p="sm" mb="xs" radius="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb={4}>
        <Group gap="xs" align="center" style={{ minWidth: 0, flex: 1 }}>
          <Text size="xs" c="dimmed" truncate>{item.entity_name}</Text>
          {item.scope && (
            <Badge size="xs" color="gray" variant="outline">{item.scope}</Badge>
          )}
        </Group>
        <ContentActions
          entityType={item.entity_type}
          entityId={item.entity_id}
          entityName={item.entity_name}
          isFollowing={true}
          onOpen={handleOpen}
          onUnfollow={handleUnfollow}
          onFollow={null}
        />
      </Group>

      <Text size="sm" lineClamp={3} mb={4}>{item.payload?.body ?? item.summary}</Text>

      <Group justify="space-between" align="center">
        <Text size="xs" c="dimmed">{item.payload?.author_name ?? ''}</Text>
        <Text size="xs" c="dimmed">{relativeTime(item.timestamp)}</Text>
      </Group>
    </Paper>
  )
}
