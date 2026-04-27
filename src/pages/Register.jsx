/**
 * @file Register.jsx
 * @description Citizen registration form. Calls Supabase directly.
 * On success, Supabase sends a confirmation email. User must confirm before logging in.
 */

import { useState } from 'react'
import { TextInput, PasswordInput, Button, Text, Stack, Title, Alert } from '@mantine/core'
import { supabase } from '../lib/supabase.js'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState(null)
  const [busy,     setBusy]     = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const { error } = await supabase.auth.signUp({ email, password })

    setBusy(false)

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <Stack p="xl" maw={400} mx="auto" mt="xl">
        <Title order={3}>Check your email</Title>
        <Text>We have sent a confirmation link to {email}. Click it to activate your account.</Text>
        <Button variant="subtle" onClick={() => navigate('/login')}>Go to login</Button>
      </Stack>
    )
  }

  return (
    <Stack p="xl" maw={400} mx="auto" mt="xl" component="form" onSubmit={handleSubmit}>
      <Title order={2}>Create account</Title>
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
      <Button type="submit" loading={busy}>Register</Button>
      <Text size="sm">
        Already have an account? <a href="/login">Sign in</a>
      </Text>
    </Stack>
  )
}
