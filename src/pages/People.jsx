/**
 * @file src/pages/People.jsx
 * @description People directory page.
 * Full-width layout: search bar + scope selector + user card list.
 * Browse modes: Local (ward/const) and All.
 *
 * Local scope requires geo_path in session snapshot -- disabled until a
 * snapshot reader is wired into this page (deferred, localGss = null).
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth }     from '../context/AuthContext.jsx'
import {
  TextInput, SegmentedControl, Text, Stack, Paper,
  Group, Badge, Pagination, Center, Loader, Title,
} from '@mantine/core'
import { IconSearch, IconUser } from '@tabler/icons-react'
import PageLayout from '../components/PageLayout.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import Footer     from '../components/Layout/Footer.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

function UserCard({ user }) {
  const roleColour = {
    admin:      'red',
    affiliated: 'violet',
    citizen:    'blue',
  }[user.platform_role] ?? 'blue'

  const locationLabel = user.confirmed_location?.label
    ?? user.confirmed_location?.slug?.replace(/_/g, ' ')
    ?? null

  return (
    <Paper withBorder p="sm" radius="sm">
      <Group justify="space-between" mb={4}>
        <Group gap={8}>
          <IconUser size={14} color="#868e96" />
          <Text size="sm" fw={600}>{user.display_name}</Text>
        </Group>
        <Badge size="xs" variant="light" color={roleColour}>
          {user.platform_role ?? 'citizen'}
        </Badge>
      </Group>
      {user.bio && (
        <Text size="xs" c="dimmed" lineClamp={2} mb={4}>{user.bio}</Text>
      )}
      {locationLabel && (
        <Text size="xs" c="dimmed">Based in {locationLabel}</Text>
      )}
    </Paper>
  )
}

export default function People() {
  const { profile } = useAuth()

  // Derive local scope from the user's confirmed_location (set on forum join).
  // Falls back to constituency if no ward GSS available. Null if not yet confirmed.
  const localGss = useMemo(() => {
    const loc = profile?.user?.confirmed_location
    if (loc?.ward_gss) return { scope: 'ward',         gss: loc.ward_gss }
    if (loc?.con_gss)  return { scope: 'constituency', gss: loc.con_gss }
    return null
  }, [profile])

  const [scope,   setScope]   = useState('all')
  const [query,   setQuery]   = useState('')
  const [users,   setUsers]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const fetchPeople = useCallback(async (pg = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: pg, limit: 20 })
      if (query.trim()) params.set('q', query.trim())
      if (scope === 'local' && localGss) {
        params.set('scope', localGss.scope)
        params.set('gss',   localGss.gss)
      } else if (scope !== 'all') {
        params.set('scope', scope)
      }

      const res  = await fetch(`${API_BASE}/api/people?${params}`)
      if (!res.ok) throw new Error(res.status)
      const data = await res.json()
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
      setPage(pg)
    } catch {
      setError('Failed to load people')
    }
    setLoading(false)
  }, [query, scope])

  useEffect(() => { fetchPeople(1) }, [scope, query])

  const totalPages = Math.ceil(total / 20)

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

  return (
    <PageLayout
      header={header}
      leftPane={
        <Stack gap="sm">
          <Title order={5} c="dimmed">Find people</Title>
          <TextInput
            placeholder="Search by name..."
            leftSection={<IconSearch size={14} />}
            value={query}
            onChange={e => setQuery(e.currentTarget.value)}
            size="xs"
          />
          <SegmentedControl
            value={scope}
            onChange={setScope}
            size="xs"
            fullWidth
            data={[
              { label: 'Local', value: 'local', disabled: !localGss },
              { label: 'All',   value: 'all' },
            ]}
          />
          {!localGss && (
            <Text size="xs" c="dimmed">
              Navigate to a ward or constituency on Locations to enable Local view.
            </Text>
          )}
        </Stack>
      }
      midPane={
        <Stack gap="sm">
          <Title order={4}>People</Title>
          <Text size="xs" c="dimmed">{total} member{total !== 1 ? 's' : ''} found</Text>
          {loading && <Center py="xl"><Loader size="sm" /></Center>}
          {error   && <Text size="sm" c="red">{error}</Text>}
          {!loading && !error && users.length === 0 && (
            <Text size="sm" c="dimmed">No members found.</Text>
          )}
          {!loading && !error && (
            <Stack gap={6}>
              {users.map(u => <UserCard key={u.public_id} user={u} />)}
            </Stack>
          )}
          {totalPages > 1 && (
            <Center mt="md">
              <Pagination
                total={totalPages}
                value={page}
                onChange={p => fetchPeople(p)}
                size="sm"
              />
            </Center>
          )}
        </Stack>
      }
      footer={<Footer />}
    />
  )
}
