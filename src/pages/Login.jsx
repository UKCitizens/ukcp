/**
 * @file Login.jsx
 * @description Citizen login form. Calls Supabase directly.
 * On success, AuthContext detects the session change and fetches/creates the
 * MongoDB profile record via GET /api/profile.
 */

import { useState } from 'react'
import { TextInput, PasswordInput, Button, Text, Stack, Title, Alert } from '@mantine/core'
import { supabase } from '../lib/supabase.js'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [error, setError] = useState(null)
  const [busy,  setBusy]  = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    // Read from DOM directly — catches autofilled values that bypass React onChange
    const form     = e.currentTarget
    const email    = form.elements.namedItem('email').value
    const password = form.elements.namedItem('password').value

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setBusy(false)

    if (error) {
      setError(error.message)
    } else {
      navigate('/profile')
    }
  }

  return (
    <Stack p="xl" maw={400} mx="auto" mt="xl" component="form" onSubmit={handleSubmit}>
      <Title order={2}>Sign in</Title>
      {error && <Alert color="red">{error}</Alert>}
      <TextInput
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <PasswordInput
        label="Password"
        name="password"
        autoComplete="current-password"
        required
      />
      <Button type="submit" loading={busy}>Sign in</Button>
      <Text size="sm">
        No account? <a href="/register">Create one</a>
      </Text>
    </Stack>
  )
}
