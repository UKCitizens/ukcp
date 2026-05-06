/**
 * @file MyHome.jsx
 * @description Personal dashboard for logged-in citizens.
 *
 * Three-pane layout:
 *   Left  — MyIncludes: saved places, schools, groups, committees, networks.
 *            Clicking an item selects it as the feed context.
 *   Mid   — Content feed for the selected context. Reach control at top.
 *            Maximum space; no controls that belong in the panes.
 *   Right — MyMeta: Notifications, Alerts, Counts, Responses (shells for POC).
 *
 * Requires session — bounces to /login if not authenticated.
 */

import { useState, useEffect } from 'react'
import {
  Stack, Text, Group, SegmentedControl,
  Badge, Avatar, Anchor, Paper,
} from '@mantine/core'
import { useAuth }      from '../context/AuthContext.jsx'
import { useNavigate }  from 'react-router-dom'
import PageLayout       from '../components/PageLayout.jsx'
import SiteHeader       from '../components/SiteHeader.jsx'
import Footer           from '../components/Layout/Footer.jsx'
import MyIncludes       from '../components/MyHome/MyIncludes.jsx'
import MyMeta           from '../components/MyHome/MyMeta.jsx'
import FeedZone         from '../components/MyHome/FeedZone.jsx'

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
  school:          'green',
  place:           'blue',
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

// ---------------------------------------------------------------------------
// Identity strip — compact header in mid pane
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
// Page
// ---------------------------------------------------------------------------

/** @returns {JSX.Element} */
export default function MyHome() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()

  const [selectedContext, setSelectedContext] = useState(null)
  const [reach,           setReach]           = useState('constituency')

  // Auth gate
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
        midPane={<Text c="dimmed" size="sm">Loading…</Text>}
        footer={<Footer />}
      />
    )
  }

  if (!session || !profile) return null

  return (
    <PageLayout
      header={header}

      leftPane={
        <MyIncludes
          session={session}
          selectedId={selectedContext?.entity_id ?? null}
          onSelect={setSelectedContext}
        />
      }

      midPane={
        <Stack gap="md">
          <IdentityStrip user={profile.user ?? {}} />

          {/* Reach control — modifies feed scope, lives in mid pane as a view modifier */}
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

          <FeedZone feedContext={selectedContext} />
        </Stack>
      }

      rightPane={<MyMeta />}

      footer={<Footer />}
    />
  )
}
