/**
 * @file Profile.jsx
 * @description Citizen profile page. Editable fields:
 *   display_name, default_post_visibility, home_ward_gss, home_constituency_gss.
 *
 * Reads from AuthContext (profile loaded at sign-in).
 * Writes via PATCH /api/profile.
 */

import { useState, useEffect } from 'react'
import {
  TextInput, Select, Button, Stack, Title, Text,
  Alert, Badge, Group, Divider,
} from '@mantine/core'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const VISIBILITY_OPTIONS = [
  { value: 'anonymous', label: 'Anonymous (platform knows who I am, others do not)' },
  { value: 'named',     label: 'Named (my display name is shown on posts)' },
]

export default function Profile() {
  const { session, profile, loading, signOut } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [visibility,  setVisibility]  = useState('anonymous')
  const [homeWard,    setHomeWard]     = useState('')
  const [homeCon,     setHomeCon]      = useState('')
  const [saving, setSaving]           = useState(false)
  const [saved,  setSaved]            = useState(false)
  const [error,  setError]            = useState(null)

  useEffect(() => {
    if (!loading && !session) navigate('/login')
  }, [loading, session])

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setVisibility(profile.default_post_visibility ?? 'anonymous')
      setHomeWard(profile.home_ward_gss ?? '')
      setHomeCon(profile.home_constituency_gss ?? '')
    }
  }, [profile])

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setSaving(true)

    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method:  'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          display_name:            displayName,
          default_post_visibility: visibility,
          home_ward_gss:           homeWard || null,
          home_constituency_gss:   homeCon  || null,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Save failed')
      } else {
        setSaved(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !profile) return <Text p="xl">Loading...</Text>

  return (
    <Stack p="xl" maw={520} mx="auto" mt="xl">
      <Group justify="space-between">
        <Title order={2}>Your profile</Title>
        <Badge color={profile.access_tier === 'trusted' ? 'green' : profile.access_tier === 'known' ? 'blue' : 'gray'}>
          {profile.access_tier}
        </Badge>
      </Group>

      <Text size="sm" c="dimmed">{profile.email}</Text>

      <Divider my="sm" />

      {error && <Alert color="red">{error}</Alert>}
      {saved && <Alert color="green">Saved.</Alert>}

      <Stack component="form" onSubmit={handleSave} gap="md">
        <TextInput
          label="Display name"
          description="Shown when you post as named. Not shown when posting anonymously."
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
        />

        <Select
          label="Default posting mode"
          description="Your default when posting. You can change it per post."
          data={VISIBILITY_OPTIONS}
          value={visibility}
          onChange={setVisibility}
        />

        <TextInput
          label="Home ward (GSS code)"
          description="e.g. E05001234. Optional. Used to personalise your Home view."
          value={homeWard}
          onChange={e => setHomeWard(e.target.value)}
        />

        <TextInput
          label="Home constituency (GSS code)"
          description="e.g. E14001234. Optional."
          value={homeCon}
          onChange={e => setHomeCon(e.target.value)}
        />

        <Group>
          <Button type="submit" loading={saving}>Save changes</Button>
          <Button variant="subtle" color="red" onClick={signOut}>Sign out</Button>
        </Group>
      </Stack>
    </Stack>
  )
}
