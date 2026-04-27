/**
 * @file UserManager.jsx
 * @description Admin panel for the users collection.
 *
 * Left panel  -- searchable paginated list of users.
 * Right panel -- all user fields, all editable.
 *
 * Actions (separate, explicit buttons):
 *   Save changes      -- PATCH /api/admin/users/:id (Mongo field update)
 *   Set status: deleted -- PATCH /api/admin/users/:id with {status:'deleted'} (soft delete)
 *   Delete from auth  -- DELETE /api/admin/users/:supabaseId/auth (Supabase hard delete)
 */

import { useState, useEffect, useCallback } from 'react'
import API_BASE from '../../config.js'
import {
  TextInput, Select, Checkbox, Button, Stack, Group, Text, Title,
  ScrollArea, Divider, Badge, Alert, Loader, Paper,
} from '@mantine/core'

const ACCESS_TIERS     = ['seen', 'known', 'trusted']
const VISIBILITY_OPTS  = [
  { value: 'anonymous', label: 'Anonymous' },
  { value: 'named',     label: 'Named' },
]
const STATUS_COLOUR = { deleted: 'red', active: 'green' }

function userLabel(u) {
  return u.display_name || u.email || u.supabase_id
}

function StatusBadge({ u }) {
  const s = u.status ?? (u.is_active ? 'active' : 'inactive')
  return <Badge color={STATUS_COLOUR[s] ?? 'gray'} size="xs">{s}</Badge>
}

export default function UserManager() {
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(0)
  const [total,    setTotal]    = useState(0)
  const [users,    setUsers]    = useState([])
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null)  // {type:'ok'|'err', text}

  const LIMIT = 50

  const fetchUsers = useCallback(async (q, pg) => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/users?q=${encodeURIComponent(q)}&page=${pg}&limit=${LIMIT}`
      )
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setUsers(data.results)
      setTotal(data.total)
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers(search, page) }, [search, page])

  function selectUser(u) {
    setSelected(u)
    setForm({ ...u })
    setMsg(null)
  }

  function fieldSet(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!selected || !form) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${selected.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name:            form.display_name,
          username:                form.username,
          avatar_url:              form.avatar_url,
          bio:                     form.bio,
          access_tier:             form.access_tier,
          is_verified:             form.is_verified,
          verification_method:     form.verification_method,
          home_ward_gss:           form.home_ward_gss,
          home_constituency_gss:   form.home_constituency_gss,
          default_post_visibility: form.default_post_visibility,
          is_active:               form.is_active,
          is_suspended:            form.is_suspended,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setMsg({ type: 'ok', text: 'Saved.' })
      fetchUsers(search, page)
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleSoftDelete() {
    if (!selected) return
    if (!window.confirm(`Set status to 'deleted' for ${userLabel(selected)}?`)) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${selected.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'deleted', is_active: false }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setMsg({ type: 'ok', text: 'Status set to deleted in Mongo.' })
      fetchUsers(search, page)
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleAuthDelete() {
    if (!selected?.supabase_id) return
    if (!window.confirm(
      `Hard-delete ${userLabel(selected)} from Supabase auth? This cannot be undone. Mongo record stays.`
    )) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/users/${selected.supabase_id}/auth`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error((await res.json()).error)
      setMsg({ type: 'ok', text: 'Deleted from Supabase auth. Mongo record retained.' })
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Group align="flex-start" gap={0} style={{ height: '100%' }}>

      {/* Left panel -- user list */}
      <Stack style={{ width: 280, borderRight: '1px solid var(--mantine-color-gray-3)', height: '100%' }} gap={0}>
        <TextInput
          placeholder="Search email or name..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          m="xs"
          size="xs"
        />
        <Text size="xs" c="dimmed" px="xs">{total} users</Text>
        <ScrollArea style={{ flex: 1 }}>
          {loading && <Loader size="xs" m="sm" />}
          {users.map(u => (
            <Paper
              key={u.id}
              px="xs" py={6}
              style={{
                cursor: 'pointer',
                background: selected?.id === u.id ? 'var(--mantine-color-green-0)' : 'transparent',
                borderBottom: '1px solid var(--mantine-color-gray-2)',
              }}
              onClick={() => selectUser(u)}
            >
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text size="xs" truncate>{userLabel(u)}</Text>
                <StatusBadge u={u} />
              </Group>
              <Text size="xs" c="dimmed" truncate>{u.email}</Text>
            </Paper>
          ))}
        </ScrollArea>
        <Group p="xs" gap="xs">
          <Button size="xs" variant="subtle" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Text size="xs">{page + 1} / {Math.max(1, Math.ceil(total / LIMIT))}</Text>
          <Button size="xs" variant="subtle" disabled={(page + 1) * LIMIT >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
        </Group>
      </Stack>

      {/* Right panel -- editor */}
      {form ? (
        <ScrollArea style={{ flex: 1, height: '100%' }} p="md">
          <Stack gap="sm" p="md">
            <Title order={5}>{userLabel(selected)}</Title>
            <Text size="xs" c="dimmed">Supabase ID: {form.supabase_id}</Text>
            <Text size="xs" c="dimmed">Mongo ID: {form.id}</Text>
            <Text size="xs" c="dimmed">Created: {form.created_at ? new Date(form.created_at).toLocaleString('en-GB') : '--'}</Text>

            <Divider label="Identity" labelPosition="left" />
            <TextInput size="xs" label="Email"        value={form.email        ?? ''} readOnly />
            <TextInput size="xs" label="Display name" value={form.display_name ?? ''} onChange={e => fieldSet('display_name', e.target.value)} />
            <TextInput size="xs" label="Username"     value={form.username     ?? ''} onChange={e => fieldSet('username',     e.target.value)} />
            <TextInput size="xs" label="Avatar URL"   value={form.avatar_url   ?? ''} onChange={e => fieldSet('avatar_url',   e.target.value)} />
            <TextInput size="xs" label="Bio"          value={form.bio          ?? ''} onChange={e => fieldSet('bio',          e.target.value)} />

            <Divider label="Access" labelPosition="left" />
            <Select
              size="xs"
              label="Access tier"
              data={ACCESS_TIERS}
              value={form.access_tier ?? 'seen'}
              onChange={v => fieldSet('access_tier', v)}
            />
            <Checkbox
              size="xs"
              label="Verified"
              checked={!!form.is_verified}
              onChange={e => fieldSet('is_verified', e.currentTarget.checked)}
            />
            <TextInput
              size="xs"
              label="Verification method"
              value={form.verification_method ?? ''}
              onChange={e => fieldSet('verification_method', e.target.value)}
            />

            <Divider label="Location" labelPosition="left" />
            <TextInput size="xs" label="Home ward GSS"          value={form.home_ward_gss         ?? ''} onChange={e => fieldSet('home_ward_gss',         e.target.value)} />
            <TextInput size="xs" label="Home constituency GSS"  value={form.home_constituency_gss ?? ''} onChange={e => fieldSet('home_constituency_gss',  e.target.value)} />

            <Divider label="Posting" labelPosition="left" />
            <Select
              size="xs"
              label="Default post visibility"
              data={VISIBILITY_OPTS}
              value={form.default_post_visibility ?? 'anonymous'}
              onChange={v => fieldSet('default_post_visibility', v)}
            />

            <Divider label="Status" labelPosition="left" />
            <Checkbox
              size="xs"
              label="Active"
              checked={!!form.is_active}
              onChange={e => fieldSet('is_active', e.currentTarget.checked)}
            />
            <Checkbox
              size="xs"
              label="Suspended"
              checked={!!form.is_suspended}
              onChange={e => fieldSet('is_suspended', e.currentTarget.checked)}
            />
            <Text size="xs" c="dimmed">Status field: {form.status ?? 'not set'}</Text>

            {msg && (
              <Alert color={msg.type === 'ok' ? 'green' : 'red'} size="xs">{msg.text}</Alert>
            )}

            <Divider />

            <Group gap="xs">
              <Button size="xs" color="green" loading={saving} onClick={handleSave}>
                Save changes
              </Button>
              <Button size="xs" color="orange" variant="outline" loading={saving} onClick={handleSoftDelete}>
                Set status: deleted
              </Button>
              <Button size="xs" color="red" variant="outline" loading={saving} onClick={handleAuthDelete}>
                Delete from Supabase auth
              </Button>
            </Group>
          </Stack>
        </ScrollArea>
      ) : (
        <Text p="xl" c="dimmed" size="sm">Select a user to edit.</Text>
      )}

    </Group>
  )
}
