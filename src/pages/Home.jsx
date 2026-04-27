/**
 * @file Home.jsx
 * @description Entry point for the UKCP portal.
 *
 * If an active Supabase session exists, redirects straight to /locations.
 * Otherwise shows the sign-in form plus an "Access anonymously" option.
 * The device cookie is issued server-side on first request -- no client check needed.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TextInput, PasswordInput, Button, Stack, Title, Text, Alert, Anchor, Divider,
} from '@mantine/core'
import { supabase } from '../lib/supabase.js'

export default function Home() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [error,    setError]    = useState(null)
  const [busy,     setBusy]     = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/locations', { replace: true })
      } else {
        setChecking(false)
      }
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const form     = e.currentTarget
    const email    = form.elements.namedItem('email').value
    const password = form.elements.namedItem('password').value
    const { error: sbError } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (sbError) {
      setError(sbError.message)
    } else {
      navigate('/locations', { replace: true })
    }
  }

  if (checking) return null

  return (
    <Stack p="xl" maw={400} mx="auto" mt="xl">
      <Title order={2}>UK Citizens Portal</Title>

      <Stack component="form" onSubmit={handleSubmit} gap="sm">
        <Text c="dimmed" size="sm">Sign in to continue.</Text>
        {error && <Alert color="red">{error}</Alert>}
        <TextInput     label="Email"    type="email" name="email"    required />
        <PasswordInput label="Password"              name="password" required />
        <Button type="submit" color="green" loading={busy}>Sign in</Button>
        <Text size="sm">
          No account? <Anchor href="/register">Register</Anchor>
        </Text>
      </Stack>

      <Divider my="md" label="or" labelPosition="center" />

      <Button variant="subtle" color="gray" onClick={() => navigate('/locations')}>
        Access anonymously
      </Button>

    </Stack>
  )
}
