/**
 * @file MyHome.jsx
 * @description Personal dashboard for logged-in citizens.
 *
 * Three-pane layout:
 *   Left  -- MyIncludes + Geo groups (systemic group visibility controls)
 *   Mid   -- IdentityStrip, Reach control, content feed
 *   Right -- MyMeta: Notifications, Alerts, Counts, Responses
 *
 * Requires session -- bounces to /login if not authenticated.
 */

import { useState, useEffect, useCallback } from 'react'
import { IconX } from '@tabler/icons-react'
import {
  Stack, Text, Group, SegmentedControl,
  Badge, Avatar, Anchor, Paper, Button, Title, Divider, Loader,
} from '@mantine/core'
import { useAuth }      from '../context/AuthContext.jsx'
import { useNavigate }  from 'react-router-dom'
import PageLayout       from '../components/PageLayout.jsx'
import SiteHeader       from '../components/SiteHeader.jsx'
import Footer           from '../components/Layout/Footer.jsx'
import MyIncludes       from '../components/MyHome/MyIncludes.jsx'
import MyMeta           from '../components/MyHome/MyMeta.jsx'
import FeedZone         from '../components/MyHome/FeedZone.jsx'

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

// ---------------------------------------------------------------------------
// Identity strip -- compact header in mid pane
// ---------------------------------------------------------------------------

function IdentityStrip({ user }) {
  const role        = user?.platform_role ?? 'citizen'
  const displayName = user?.display_name  ?? user?.email ?? 'citizen'
  const homeLabel   = user?.confirmed_location?.name ?? null
  const since       = memberSince(user?.created_at)

  return (
    <Paper withBorder p="xs" radius="md">
      <Group gap="sm" wrap="nowrap">
        <Avatar size={36} radius="xl" color={ROLE_COLOUR[role] ?? 'teal'} style={{ flexShrink: 0 }}>
          {initials(displayName)}
        </Avatar>
        <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" align="center">
            <Text fw={600} size="sm" style={{ lineHeight: 1.2 }}>{displayName}</Text>
            <Badge size="xs" color={ROLE_COLOUR[role] ?? 'teal'} variant="light">{role}</Badge>
          </Group>
          <Group gap="xs" wrap="wrap">
            {homeLabel && (
              <Text size="xs" c="dimmed">Home: <Text component="span" size="xs" fw={500} c="dark">{homeLabel}</Text></Text>
            )}
            {since && <Text size="xs" c="dimmed">Member since {since}</Text>}
            <Anchor href="/profile" size="xs" c="dimmed" ml="auto">Profile</Anchor>
          </Group>
        </Stack>
      </Group>
    </Paper>
  )
}

// ---------------------------------------------------------------------------
// Geo groups -- systemic group visibility controls
// ---------------------------------------------------------------------------

function GeoGroups({ session }) {
  const [groups,       setGroups]       = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [stateMsg,     setStateMsg]     = useState({})

  const fetchGroups = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/profile/groups`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) setGroups(await res.json())
    } catch (_) { /* non-fatal */ }
    finally { setLoading(false) }
  }, [session])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  async function setGroupState(groupKey, state) {
    if (!session?.access_token) return
    setStateMsg(prev => ({ ...prev, [groupKey]: null }))
    try {
      const res = await fetch(`${API_BASE}/api/profile/groups/${encodeURIComponent(groupKey)}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ state }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setGroups(prev => {
        if (!prev) return prev
        const update = arr => arr.map(g => g.group_key === groupKey ? { ...g, state } : g)
        return { civic: update(prev.civic), place: update(prev.place) }
      })
    } catch (_) {
      setStateMsg(prev => ({ ...prev, [groupKey]: 'err' }))
    }
  }

  if (loading) return <Loader size="xs" />
  if (!groups) return null
  if (groups.civic.length === 0 && groups.place.length === 0) {
    return <Text size="xs" c="dimmed">Set your postcode in Profile to configure geo groups.</Text>
  }

  const GroupRow = ({ g }) => (
    <Group key={g.group_key} justify="space-between" wrap="nowrap" gap="xs">
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text size="xs" c="dimmed" tt="capitalize">{g.tier}</Text>
        <Text size="xs" fw={500} truncate>{g.label}</Text>
      </Stack>
      <Button.Group style={{ flexShrink: 0 }}>
        {['Member', 'Viewer'].map(s => (
          <Button
            key={s}
            size="compact-xs"
            variant={g.state === s ? 'filled' : 'default'}
            onClick={() => setGroupState(g.group_key, s)}
          >{s}</Button>
        ))}
        <Button
          size="compact-xs"
          variant={g.state === 'None' ? 'filled' : 'default'}
          color={g.state === 'None' ? 'red' : undefined}
          onClick={() => setGroupState(g.group_key, 'None')}
          px={6}
          title="None -- hide from feed"
        >
          <IconX size={10} />
        </Button>
      </Button.Group>
    </Group>
  )

  return (
    <Stack gap={6}>
      <Title order={6} c="dimmed" tt="uppercase">Geo groups</Title>
      <Text size="xs" c="dimmed">
        Control feed visibility. Civic: None mutes display only -- democratic standing is retained.
      </Text>
      {groups.civic.length > 0 && (
        <>
          <Text size="xs" fw={600} c="dimmed">Civic</Text>
          {groups.civic.map(g => <GroupRow key={g.group_key} g={g} />)}
        </>
      )}
      {groups.place.length > 0 && (
        <>
          <Divider />
          <Text size="xs" fw={600} c="dimmed">Place</Text>
          {groups.place.map(g => <GroupRow key={g.group_key} g={g} />)}
        </>
      )}
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/** @returns {JSX.Element} */
export default function MyHome() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()

  const [selectedContext, setSelectedContext] = useState(null)
  const [reach,           setReach]           = useState('constituency')

  useEffect(() => {
    if (!loading && !session) {
      sessionStorage.setItem('ukcp_login_redirect', '/myhome')
      navigate('/login', { replace: true })
    }
  }, [loading, session, navigate])

  const header = (
    <SiteHeader
      onWalkerToggle={() => {}}
      row2Visible={false}
      row3Visible={false}
      loading={false}
      pendingPlace={null}
      walkerOpen={false}
      path={[]}
      onDismiss={() => {}}
      currentOptions={[]}
      onSelect={() => {}}
      crumbs={[]}
      navDepth={0}
    />
  )

  if (loading) {
    return (
      <PageLayout
        header={header}
        midPane={<Text c="dimmed" size="sm">Loading...</Text>}
        footer={<Footer />}
      />
    )
  }

  if (!session || !profile) return null

  return (
    <PageLayout
      header={header}

      leftPane={
        <Stack gap="md">
          <MyIncludes
            session={session}
            selectedId={selectedContext?.entity_id ?? null}
            onSelect={setSelectedContext}
          />
          <Divider />
          <GeoGroups session={session} />
        </Stack>
      }

      midPane={
        <Stack gap="md">
          <IdentityStrip user={profile.user ?? {}} />

          <Group gap="sm" align="center" wrap="nowrap">
            <Text size="xs" fw={600} c="dimmed" style={{ flexShrink: 0 }}>Reach</Text>
            <SegmentedControl
              data={REACH_OPTIONS}
              value={reach}
              onChange={setReach}
              size="xs"
              style={{ flex: 1 }}
            />
          </Group>

          <FeedZone feedContext={selectedContext} reach={reach} />
        </Stack>
      }

      rightPane={<MyMeta />}

      footer={<Footer />}
    />
  )
}
