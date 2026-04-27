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
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [busy,     setBusy]     = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)

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
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <PasswordInput
        label="Password"
        required
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <Button type="submit" loading={busy}>Sign in</Button>
      <Text size="sm">
        No account? <a href="/register">Create one</a>
      </Text>
    </Stack>
  )
}
