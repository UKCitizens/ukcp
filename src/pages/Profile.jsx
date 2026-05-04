/**
 * @file Profile.jsx
 * @description Citizen profile page. Five panels:
 *   1. Identity        -- display_name (editable), email, member-since, role badges
 *   2. Civic footprint -- followed schools, joined groups, committee/network forums,
 *                          confirmed location
 *   3. Contributions   -- post count + recent posts (anon posts not attributable)
 *   4. Roles           -- platform_role, affiliated_roles
 *   5. Preferences     -- default_load_page, default_tab, default_posting_mode
 *
 * Data source: AuthContext.profile (loaded at sign-in by AuthProvider).
 * Identity edits write via PATCH /api/profile.
 * Preference edits write via PATCH /api/profile/preferences.
 *
 * If no session, stash the current path in sessionStorage and route to /login
 * so the post-login flow (Section 4) can return the user here.
 */

import { useState, useEffect } from 'react'
import {
  TextInput, Select, Button, Stack, Title, Text,
  Alert, Badge, Group, Divider, Paper, List,
} from '@mantine/core'
import { useAuth }     from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import { supabase }    from '../lib/supabase.js'
import PageLayout      from '../components/PageLayout.jsx'
import SiteHeader      from '../components/SiteHeader.jsx'
import Footer          from '../components/Layout/Footer.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const VISIBILITY_OPTIONS = [
  { value: 'anonymous', label: 'Anonymous' },
  { value: 'named',     label: 'Named' },
]
const LOAD_PAGE_OPTIONS = [
  { value: 'locations', label: 'Locations' },
  { value: 'myhome',    label: 'My Home' },
]
const TAB_OPTIONS = [
  { value: 'map',     label: 'Map' },
  { value: 'info',    label: 'Info' },
  { value: 'groups',  label: 'Groups' },
  { value: 'news',    label: 'News' },
  { value: 'traders', label: 'Traders' },
  { value: 'civic',   label: 'Civic' },
]

const ROLE_BADGE_COLOUR = { admin: 'red', affiliated: 'blue', citizen: 'gray' }

function formatDate(d) {
  if (!d) return '--'
  try { return new Date(d).toLocaleDateString('en-GB') } catch { return '--' }
}

export default function Profile() {
  const { session, profile, claims, loading, signOut } = useAuth()
  const navigate = useNavigate()

  const user           = profile?.user           ?? null
  const follows        = profile?.follows        ?? []
  const joinedGroups   = profile?.joined_groups  ?? []
  const recentPosts    = profile?.recent_posts   ?? []
  const postCount      = profile?.post_count     ?? 0

  const [profileTimeout, setProfileTimeout] = useState(false)

  // If profile hasn't loaded within 8 seconds, surface an error rather than
  // spinning forever. Almost always a silent fetchProfile failure server-side.
  useEffect(() => {
    if (user) return
    const t = setTimeout(() => setProfileTimeout(true), 8000)
    return () => clearTimeout(t)
  }, [user])

  const [displayName, setDisplayName] = useState('')
  const [savingIdentity,    setSavingIdentity]    = useState(false)
  const [identityMsg,       setIdentityMsg]       = useState(null)

  const [defaultLoadPage,   setDefaultLoadPage]   = useState('locations')
  const [defaultTab,        setDefaultTab]        = useState('map')
  const [defaultPostingMode, setDefaultPostingMode] = useState('anonymous')
  const [savingPrefs,       setSavingPrefs]       = useState(false)
  const [prefsMsg,          setPrefsMsg]          = useState(null)

  const isNewUser = !claims?.registration_complete

  // Hydrate form state from profile.
  useEffect(() => {
    if (!user) return
    setDisplayName(user.display_name ?? '')
    const prefs = user.preferences ?? {}
    setDefaultLoadPage(prefs.default_load_page ?? 'locations')
    setDefaultTab(prefs.default_tab ?? 'map')
    setDefaultPostingMode(prefs.default_posting_mode ?? user.default_post_visibility ?? 'anonymous')
  }, [user])

  async function saveIdentity() {
    if (!session?.access_token) return
    setSavingIdentity(true)
    setIdentityMsg(null)
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method:  'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ display_name: displayName }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed')
      // If this was a new user completing registration, refresh the session so the
      // JWT picks up registration_complete=true (may already be set server-side),
      // then navigate out regardless of whether the server set it this call.
      if (isNewUser) {
        await supabase.auth.refreshSession()
        navigate('/locations', { replace: true })
        return
      }
      setIdentityMsg({ type: 'ok', text: 'Saved.' })
    } catch (e) {
      setIdentityMsg({ type: 'err', text: e.message })
    } finally {
      setSavingIdentity(false)
    }
  }

  async function savePreferences() {
    if (!session?.access_token) return
    setSavingPrefs(true)
    setPrefsMsg(null)
    try {
      const res = await fetch(`${API_BASE}/api/profile/preferences`, {
        method:  'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          default_load_page:    defaultLoadPage,
          default_tab:          defaultTab,
          default_posting_mode: defaultPostingMode,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed')
      setPrefsMsg({ type: 'ok', text: 'Preferences saved.' })
    } catch (e) {
      setPrefsMsg({ type: 'err', text: e.message })
    } finally {
      setSavingPrefs(false)
    }
  }

  const shell = (left, mid, right) => (
    <PageLayout
      header={
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
      }
      leftPane={left}
      midPane={mid}
      rightPane={right}
      footer={<Footer />}
    />
  )

  if (loading || !user) return shell(
    null,
    profileTimeout
      ? <Alert color="red" maw={400}>Profile failed to load. Try signing out and back in.</Alert>
      : <Text c="dimmed" size="sm">Loading...</Text>,
    null
  )

  const followedSchools = follows.filter(f => f.entity_type === 'school')
  const followedOther   = follows.filter(f => f.entity_type !== 'school')

  const groupKindLabel = (k) => ({
    associations:     'Association',
    spaces:           'Space',
    committee_forums: 'Committee forum',
    network_chapters: 'Network chapter',
  }[k] ?? k)

  return shell(

    /* ── Left: Preferences (function) ──────────────────────────────── */
    <Stack gap="sm">
      <Title order={5} c="dimmed">Preferences</Title>
      <Select
        label="Default landing page"
        description="Where you arrive after signing in."
        data={LOAD_PAGE_OPTIONS}
        value={defaultLoadPage}
        onChange={v => setDefaultLoadPage(v ?? 'locations')}
        size="xs"
      />
      <Select
        label="Default tab"
        description="Tab opened on Locations when no session is restored."
        data={TAB_OPTIONS}
        value={defaultTab}
        onChange={v => setDefaultTab(v ?? 'map')}
        size="xs"
      />
      <Select
        label="Posting mode"
        description="Default for new posts."
        data={VISIBILITY_OPTIONS}
        value={defaultPostingMode}
        onChange={v => setDefaultPostingMode(v ?? 'anonymous')}
        size="xs"
      />
      {prefsMsg && (
        <Alert color={prefsMsg.type === 'ok' ? 'green' : 'red'} py={6} px={8}>
          {prefsMsg.text}
        </Alert>
      )}
      <Button size="xs" loading={savingPrefs} onClick={savePreferences} fullWidth>
        Save preferences
      </Button>
    </Stack>,

    /* ── Mid: Footprint + Contributions + Roles (content) ──────────── */
    <Stack gap="md">
      <Title order={4}>Your profile</Title>

      {/* Civic footprint */}
      <Paper p="md" withBorder>
        <Stack gap="sm">
          <Title order={5}>Civic footprint</Title>
          {user.confirmed_location?.constituency ? (
            <Text size="sm">
              Location: <strong>{user.confirmed_location.ward ?? '--'}</strong>
              {' / '}
              <strong>{user.confirmed_location.constituency}</strong>
            </Text>
          ) : (
            <Text size="sm" c="dimmed">No confirmed location -- join a forum to set one.</Text>
          )}
          <Divider label="Followed schools" labelPosition="left" />
          {followedSchools.length === 0
            ? <Text size="sm" c="dimmed">None followed yet.</Text>
            : <List size="sm" spacing={2}>
                {followedSchools.map(f => (
                  <List.Item key={f._id ?? f.entity_id}>{f.entity_name ?? f.entity_id}</List.Item>
                ))}
              </List>
          }
          <Divider label="Joined groups + forums" labelPosition="left" />
          {joinedGroups.length === 0
            ? <Text size="sm" c="dimmed">No memberships yet.</Text>
            : <List size="sm" spacing={2}>
                {joinedGroups.map(m => (
                  <List.Item key={String(m._id)}>
                    <Text size="sm" component="span">
                      {groupKindLabel(m.collection_type)}{' '}
                      <Text span c="dimmed" size="xs">
                        ({m.membership_role ?? 'member'} since {formatDate(m.joined_at)})
                      </Text>
                    </Text>
                  </List.Item>
                ))}
              </List>
          }
          {followedOther.length > 0 && (
            <>
              <Divider label="Other follows" labelPosition="left" />
              <List size="sm" spacing={2}>
                {followedOther.map(f => (
                  <List.Item key={f._id ?? `${f.entity_type}:${f.entity_id}`}>
                    {f.entity_type}: {f.entity_name ?? f.entity_id}
                  </List.Item>
                ))}
              </List>
            </>
          )}
        </Stack>
      </Paper>

      {/* Contributions */}
      <Paper p="md" withBorder>
        <Stack gap="sm">
          <Title order={5}>Contributions</Title>
          <Group gap="lg">
            <Text size="sm">Named posts: <strong>{postCount}</strong></Text>
            <Text size="sm" c="dimmed">Anonymous posts: not attributable</Text>
          </Group>
          {recentPosts.length === 0
            ? <Text size="sm" c="dimmed">No posts yet.</Text>
            : <List size="sm" spacing={4}>
                {recentPosts.map(p => (
                  <List.Item key={String(p._id)}>
                    <Text size="sm" lineClamp={2}>
                      {p.title ? <strong>{p.title} -- </strong> : null}{p.body}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatDate(p.created_at)} · {p.location_scope?.type}/{p.location_scope?.slug}
                    </Text>
                  </List.Item>
                ))}
              </List>
          }
        </Stack>
      </Paper>

      {/* Roles */}
      <Paper p="md" withBorder>
        <Stack gap="xs">
          <Title order={5}>Roles</Title>
          <Text size="sm">
            Platform:{' '}
            <Badge color={ROLE_BADGE_COLOUR[claims?.platform_role] ?? 'gray'} variant="filled">
              {claims?.platform_role ?? 'citizen'}
            </Badge>
          </Text>
          <Text size="sm">
            Affiliated:{' '}
            {claims?.affiliated_roles?.length
              ? claims.affiliated_roles.map(r => (
                  <Badge key={r} color="violet" variant="light" mr={4}>{r}</Badge>
                ))
              : <Text span c="dimmed" size="sm">none</Text>
            }
          </Text>
          <Text size="xs" c="dimmed">Roles are server-controlled.</Text>
        </Stack>
      </Paper>
    </Stack>,

    /* ── Right: Identity + status ───────────────────────────────────── */
    <Stack gap="sm">
      {isNewUser && (
        <Alert color="blue" mb="xs">
          Choose a display name to complete your registration.
        </Alert>
      )}
      <Title order={5} c="dimmed">Identity</Title>
      <Group gap="xs" wrap="wrap">
        <Badge color={ROLE_BADGE_COLOUR[claims?.platform_role] ?? 'gray'} variant="filled">
          {claims?.platform_role ?? 'citizen'}
        </Badge>
        <Badge color={user.is_verified ? 'green' : 'gray'} variant="light">
          {user.is_verified ? 'verified' : 'unverified'}
        </Badge>
        {claims?.affiliated_roles?.map(r => (
          <Badge key={r} color="violet" variant="light">{r}</Badge>
        ))}
      </Group>
      <TextInput
        label="Display name"
        description="Shown on named posts."
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
        size="xs"
      />
      <Text size="xs" c="dimmed">{user.email}</Text>
      <Text size="xs" c="dimmed">Member since {formatDate(user.created_at)}</Text>
      {identityMsg && (
        <Alert color={identityMsg.type === 'ok' ? 'green' : 'red'} py={6} px={8}>
          {identityMsg.text}
        </Alert>
      )}
      <Button
        size="xs"
        loading={savingIdentity}
        onClick={saveIdentity}
        fullWidth
        disabled={!displayName.trim()}
      >
        {isNewUser ? 'Complete registration' : 'Save'}
      </Button>
      <Divider mt="xs" />
      <Button size="xs" variant="subtle" color="red" onClick={signOut} fullWidth>
        Sign out
      </Button>
    </Stack>
  )
}
