# Dex Instruction File -- People Page
# Produced 2 May 2026
# Run after dex-instructions-civic-restructure.md is complete.
#
# Scope:
# (1) New GET /api/people endpoint -- public directory, safe fields only.
# (2) People.jsx -- full page implementation replacing StubPage.
#     Layout: search bar + user card list (full width, not three-pane).
#     Three browse modes: Local (ward/constituency), Regional (county/region), All.
#
# Two sections. Stop after each and confirm.
#
# 1. API route
# 2. People.jsx

---

## SECTION 1 -- API route

### 1a. Create routes/people.js

```js
/**
 * @file routes/people.js
 * @description Public people directory.
 *
 * GET /api/people -- browse registered users (safe fields only)
 *
 * Query params:
 *   q            -- display_name search (optional)
 *   scope        -- 'ward' | 'constituency' | 'county' | 'region' | 'all'
 *   gss          -- GSS code for the scope (required when scope != 'all')
 *   page         -- default 1
 *   limit        -- default 20, max 50
 *
 * NEVER returns: email, supabase_id, device_cookie_id, _id, or any auth field.
 * Returns a stable public_id (hex string from _id) for linking purposes.
 */

import { Router } from 'express'
import { usersCol, postsCol } from '../db/mongo.js'

const router = Router()

// Safe fields returned to any caller
const SAFE_PROJECTION = {
  display_name:          1,
  bio:                   1,
  platform_role:         1,
  confirmed_location:    1,
  home_ward_gss:         1,
  home_constituency_gss: 1,
  status:                1,
  created_at:            1,
}

// Scope field map -- maps scope name to the user field to filter on
const SCOPE_FIELD = {
  ward:         'home_ward_gss',
  constituency: 'home_constituency_gss',
}

router.get('/', async (req, res) => {
  const usrCol = usersCol()
  if (!usrCol) return res.status(503).json({ error: 'Database unavailable' })

  const { q, scope = 'all', gss } = req.query
  const page  = Math.max(1, parseInt(req.query.page  ?? '1',  10))
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit ?? '20', 10)))

  try {
    const filter = { status: { $ne: 'deleted' } }

    // Scope filter
    if (scope !== 'all' && gss) {
      const field = SCOPE_FIELD[scope]
      if (field) {
        filter[field] = gss
      }
      // county and region scope: filter by confirmed_location fields
      if (scope === 'county' || scope === 'region') {
        filter['confirmed_location.scope'] = scope
        filter['confirmed_location.gss']   = gss
      }
    }

    // Name search
    if (q?.trim()) {
      filter.display_name = { $regex: q.trim(), $options: 'i' }
    }

    const total = await usrCol.countDocuments(filter)
    const users = await usrCol
      .find(filter, { projection: SAFE_PROJECTION })
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    // Map _id to a safe public_id string -- never expose ObjectId directly
    const safe = users.map(u => ({
      public_id:          u._id.toHexString(),
      display_name:       u.display_name ?? 'Citizen',
      bio:                u.bio ?? null,
      platform_role:      u.platform_role ?? 'citizen',
      confirmed_location: u.confirmed_location ?? null,
      created_at:         u.created_at ?? null,
    }))

    res.json({ users: safe, total, page, limit })
  } catch (err) {
    console.error('people route error', err)
    res.status(500).json({ error: 'Failed to load people' })
  }
})

export default router
```

### 1b. Register in server.js

Find the router registration block. Add:

```js
import peopleRouter from './routes/people.js'
```

And in the app.use block:

```js
app.use('/api/people', peopleRouter)
```

Stop. Confirm:
- GET /api/people returns an array of users with safe fields only.
- No email, supabase_id, or _id in response.
- q= search works.
- scope=all returns paginated results.

---

## SECTION 2 -- People.jsx

Replace src/pages/People.jsx (currently a StubPage) with a full implementation.

```jsx
/**
 * @file src/pages/People.jsx
 * @description People directory page.
 * Full-width layout: search bar + scope selector + user card list.
 * Three browse modes: Local (ward/const), Regional (county/region), All.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  TextInput, SegmentedControl, Text, Stack, Paper,
  Group, Badge, Pagination, Center, Loader
} from '@mantine/core'
import { IconSearch, IconUser } from '@tabler/icons-react'
import PageLayout from '../components/Layout/PageLayout.jsx'
import SiteHeader from '../components/SiteHeader/SiteHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSessionSnapshot } from '../hooks/useSessionSnapshot.js'

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
  const { session }              = useAuth()
  const { snapshot }             = useSessionSnapshot?.() ?? {}

  const [scope,     setScope]    = useState('all')
  const [query,     setQuery]    = useState('')
  const [users,     setUsers]    = useState([])
  const [total,     setTotal]    = useState(0)
  const [page,      setPage]     = useState(1)
  const [loading,   setLoading]  = useState(false)
  const [error,     setError]    = useState(null)

  // Derive GSS for local scope from session snapshot geo_path
  const localGss = (() => {
    const path = snapshot?.geo_path ?? []
    const ward = path.find(p => p.level === 'ward')
    const con  = path.find(p => p.level === 'constituency')
    if (ward?.gss) return { scope: 'ward', gss: ward.gss }
    if (con?.gss)  return { scope: 'constituency', gss: con.gss }
    return null
  })()

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
  }, [query, scope, localGss?.gss])

  // Fetch on mount and when scope/query changes
  useEffect(() => { fetchPeople(1) }, [scope, query])

  const totalPages = Math.ceil(total / 20)

  return (
    <PageLayout
      header={<SiteHeader minimal />}
    >
      <div style={wrap}>
        <div style={controls}>
          <TextInput
            placeholder="Search by name..."
            leftSection={<IconSearch size={14} />}
            value={query}
            onChange={e => setQuery(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: 320 }}
            size="sm"
          />
          <SegmentedControl
            value={scope}
            onChange={setScope}
            size="xs"
            data={[
              { label: 'Local',  value: 'local',        disabled: !localGss },
              { label: 'All',    value: 'all' },
            ]}
          />
        </div>

        {!localGss && scope === 'local' && (
          <Text size="xs" c="dimmed" mb="sm">
            Navigate to a ward or constituency on the Locations page to enable Local view.
          </Text>
        )}

        <Text size="xs" c="dimmed" mb="sm">
          {total} member{total !== 1 ? 's' : ''} found
        </Text>

        {loading && (
          <Center py="xl"><Loader size="sm" /></Center>
        )}
        {error && (
          <Text size="sm" c="red">{error}</Text>
        )}
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
      </div>
    </PageLayout>
  )
}

const wrap     = { maxWidth: 680, margin: '0 auto', padding: '16px 16px 32px' }
const controls = { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }
```

Note on PageLayout / SiteHeader usage: People is a full page route (not embedded
in Locations). Check how other full page routes (Profile.jsx, Settings.jsx) import
and use PageLayout + SiteHeader and match that pattern exactly. Do not invent a
new layout pattern.

Note on useSessionSnapshot: this hook may not export a named export -- check the
actual export signature in src/hooks/useSessionSnapshot.js and adapt the import
accordingly. If the hook is not available or not yet built, replace the localGss
derivation with a simple null (scope selector will show Local as disabled).

Stop. Confirm:
- /people page loads without error.
- User cards render with display_name and role badge.
- Search filters by name.
- Pagination works when more than 20 results.
- Local scope disabled gracefully when no geo path in session.
- No email or sensitive fields visible in UI or network responses.
