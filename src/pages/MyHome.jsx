/**
 * @file src/pages/MyHome.jsx
 * @description Personal dashboard and civic feed for logged-in citizens.
 *
 * Three zones:
 *   A -- Identity strip: name, home location, civic footprint at a glance.
 *   B -- Control bar: reach dial + watching pills (context switcher).
 *   C -- Feed: posts from the selected context at the selected reach.
 *
 * Feed context defaults to the first committee_forum in the user's follows,
 * falling back to the first joined group. Watching pills switch context.
 * Reach dial widens/narrows what posts are surfaced (ward -> national).
 *
 * Social vs civic posts are distinguished by a left-border accent on the feed zone.
 * Compose is built into the feed via PostsTab's embedded composer.
 *
 * Requires session -- bounces to /login if not authenticated.
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Stack, Paper, Group, Text, Badge, Avatar, SegmentedControl,
  ScrollArea, Divider, Title, Anchor, Tooltip,
} from '@mantine/core'
import { useAuth }     from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import PostsTab        from '../components/Posts/PostsTab.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REACH_OPTIONS = [
  { label: 'Ward',         value: 'ward'         },
  { label: 'Constituency', value: 'constituency'  },
  { label: 'County',       value: 'county'        },
  { label: 'Region',       value: 'region'        },
  { label: 'National',     value: 'national'      },
]

const ENTITY_COLOUR = {
  committee_forum: 'blue',
  association:     'green',
  space:           'teal',
  network_chapter: 'violet',
}

const ENTITY_LABEL = {
  committee_forum: 'Civic',
  association:     'Group',
  space:           'Space',
  network_chapter: 'Network',
}

const ROLE_COLOUR = { admin: 'red', affiliated: 'blue', citizen: 'teal' }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function memberSince(d) {
  if (!d) return null
  try { return new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) }
  catch { return null }
}

function followToOrigin(f) {
  return {
    entity_type: f.entity_type,
    entity_id:   String(f.entity_id),
    entity_name: f.entity_name ?? f.entity_type,
    geo_scope:   f.geo_scope ?? {},
  }
}

function groupToOrigin(g) {
  return {
    entity_type: g.entity_type ?? 'association',
    entity_id:   String(g.entity_id ?? g._id),
    entity_name: g.name ?? g.entity_name ?? 'Group',
    geo_scope:   g.geo_scope ?? {},
  }
}

// ---------------------------------------------------------------------------
// Zone A -- Identity strip
// ---------------------------------------------------------------------------

function IdentityStrip({ user, follows, joinedGroups }) {
  const platformRole = user?.platform_role ?? 'citizen'
  const displayName  = user?.display_name  ?? user?.email ?? 'citizen'
  const homeLocation = user?.confirmed_location?.name ?? null
  const since        = memberSince(user?.created_at)

  return (
    <Paper withBorder p="sm" radius="md">
      <Group gap="md" wrap="nowrap">
        <Avatar
          size={52}
          radius="xl"
          color={ROLE_COLOUR[platformRole] ?? 'teal'}
          style={{ flexShrink: 0 }}
        >
          {initials(displayName)}
        </Avatar>

        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" align="center">
            <Text fw={700} size="md" style={{ lineHeight: 1.2 }}>
              {displayName}
            </Text>
            <Badge size="xs" color={ROLE_COLOUR[platformRole] ?? 'teal'} variant="light">
              {platformRole}
            </Badge>
          </Group>
          <Group gap="xs" wrap="wrap">
            {homeLocation && (
              <Text size="xs" c="dimmed">
                {'Home: '}
                <Text component="span" size="xs" fw={500} c="dark">{homeLocation}</Text>
              </Text>
            )}
            {since && (
              <Text size="xs" c="dimmed">Member since {since}</Text>
            )}
          </Group>
        </Stack>

        <Group gap="xs" style={{ flexShrink: 0 }} visibleFrom="sm">
          <Tooltip label="Entities you follow">
            <Badge size="sm" color="gray" variant="light">{follows.length} following</Badge>
          </Tooltip>
          <Tooltip label="Groups and networks you have joined">
            <Badge size="sm" color="gray" variant="light">{joinedGroups.length} joined</Badge>
          </Tooltip>
          <Anchor href="/profile" size="xs" c="dimmed">Profile</Anchor>
        </Group>
      </Group>
    </Paper>
  )
}

// ---------------------------------------------------------------------------
// Zone B -- Control bar
// ---------------------------------------------------------------------------

function ControlBar({ reach, onReachChange, contexts, selectedId, onSelectContext }) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Stack gap="xs">
        <Group gap="sm" align="center" wrap="nowrap">
          <Text size="xs" fw={600} c="dimmed" style={{ flexShrink: 0, minWidth: 44 }}>
            Reach
          </Text>
          <SegmentedControl
            data={REACH_OPTIONS}
            value={reach}
            onChange={onReachChange}
            size="xs"
            style={{ flex: 1 }}
          />
        </Group>

        <Divider />

        <Group gap="xs" align="center" wrap="nowrap">
          <Text size="xs" fw={600} c="dimmed" style={{ flexShrink: 0, minWidth: 44 }}>
            Feed
          </Text>
          {contexts.length === 0 ? (
            <Text size="xs" c="dimmed" fs="italic">
              No contexts yet -- join a committee or group from Locations.
            </Text>
          ) : (
            <ScrollArea scrollbarSize={4} style={{ flex: 1 }}>
              <Group gap={6} wrap="nowrap" pb={2}>
                {contexts.map(ctx => {
                  const colour  = ENTITY_COLOUR[ctx.entity_type] ?? 'gray'
                  const typeTag = ENTITY_LABEL[ctx.entity_type]  ?? ctx.entity_type
                  const active  = ctx.entity_id === selectedId
                  return (
                    <Badge
                      key={ctx.entity_id}
                      color={colour}
                      variant={active ? 'filled' : 'light'}
                      style={{ cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => onSelectContext(ctx)}
                    >
                      {typeTag}: {ctx.entity_name}
                    </Badge>
                  )
                })}
              </Group>
            </ScrollArea>
          )}
        </Group>
      </Stack>
    </Paper>
  )
}

// ---------------------------------------------------------------------------
// Zone C -- Feed
// ---------------------------------------------------------------------------

function FeedZone({ context, reach }) {
  if (!context) {
    return (
      <Paper withBorder p="xl" radius="md">
        <Stack align="center" gap="sm">
          <Text size="sm" c="dimmed" ta="center">
            You are not following any civic entities yet.
          </Text>
          <Text size="xs" c="dimmed" ta="center">
            Find your constituency committee in Locations and join it to start
            seeing and posting in your local civic feed.
          </Text>
          <Anchor href="/locations" size="sm">Go to Locations</Anchor>
        </Stack>
      </Paper>
    )
  }

  const accent = ENTITY_COLOUR[context.entity_type] ?? 'gray'
  const label  = ENTITY_LABEL[context.entity_type]  ?? context.entity_type

  return (
    <Stack gap="xs">
      <Group gap="xs" align="center">
        <Badge color={accent} variant="dot" size="sm">{label}</Badge>
        <Text size="sm" fw={500}>{context.entity_name}</Text>
        <Text size="xs" c="dimmed">-- posts within {reach} reach</Text>
      </Group>
      <div style={{
        borderLeft: `3px solid var(--mantine-color-${accent}-5)`,
        paddingLeft: 10,
      }}>
        <PostsTab origin={context} reach={reach} />
      </div>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * @returns {JSX.Element}
 */
export default function MyHome() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()

  const [reach,      setReach]      = useState('constituency')
  const [selectedId, setSelectedId] = useState(null)

  // Auth gate
  useEffect(() => {
    if (!loading && !session) {
      sessionStorage.setItem('ukcp_login_redirect', '/myhome')
      navigate('/login', { replace: true })
    }
  }, [loading, session, navigate])

  // Build context list: civic (committee_forum, network_chapter) first, social second
  const contexts = useMemo(() => {
    if (!profile) return []
    const civic  = (profile.follows ?? [])
      .filter(f => ['committee_forum', 'network_chapter'].includes(f.entity_type))
      .map(followToOrigin)
    const social = (profile.joined_groups ?? [])
      .filter(g => ['association', 'space'].includes(g.entity_type ?? 'association'))
      .map(groupToOrigin)
    return [...civic, ...social]
  }, [profile])

  // Auto-select first context
  useEffect(() => {
    if (contexts.length > 0 && !selectedId) {
      setSelectedId(contexts[0].entity_id)
    }
  }, [contexts, selectedId])

  const selectedContext = useMemo(
    () => contexts.find(c => c.entity_id === selectedId) ?? null,
    [contexts, selectedId]
  )

  if (loading) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
        <Text c="dimmed" size="sm">Loading...</Text>
      </div>
    )
  }

  if (!session || !profile) return null

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      <Stack gap="md">
        <Title order={4} c="dimmed" fw={500}>My Home</Title>

        <IdentityStrip
          user={profile.user ?? {}}
          follows={profile.follows ?? []}
          joinedGroups={profile.joined_groups ?? []}
        />

        <ControlBar
          reach={reach}
          onReachChange={setReach}
          contexts={contexts}
          selectedId={selectedId}
          onSelectContext={ctx => setSelectedId(ctx.entity_id)}
        />

        <FeedZone context={selectedContext} reach={reach} />
      </Stack>
    </div>
  )
}
