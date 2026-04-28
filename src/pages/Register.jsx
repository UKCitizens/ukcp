/**
 * @file Register.jsx
 * @description Citizen registration stub.
 *
 * Sends a magic link via Supabase (signInWithOtp). User clicks the link in
 * their email and lands back at the app already authenticated. No password
 * required at this stage -- full registration flow is a later sprint.
 */

import { useState } from 'react'
import { TextInput, Button, Text, Stack, Title, Alert, Anchor } from '@mantine/core'
import { supabase } from '../lib/supabase.js'

export default function Register() {
  const [done,  setDone]  = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [busy,  setBusy]  = useState(false)

  async function handleRegister(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const form  = e.currentTarget
    const addr  = form.elements.namedItem('email').value
    const { error: sbError } = await supabase.auth.signInWithOtp({
      email: addr,
      options: {
        shouldCreateUser: true,
        emailRedirectTo:  window.location.origin,
      },
    })
    setBusy(false)
    if (sbError) {
      setError(sbError.message)
    } else {
      setEmail(addr)
      setDone(true)
    }
  }

  if (done) {
    return (
      <Stack p="xl" maw={400} mx="auto" mt="xl">
        <Title order={3}>Check your email</Title>
        <Text>A sign-in link has been sent to {email}. Click it to access your account.</Text>
        <Anchor href="/" size="sm">Back to sign in</Anchor>
      </Stack>
    )
  }

  return (
    <Stack p="xl" maw={400} mx="auto" mt="xl" component="form" onSubmit={handleRegister}>
      <Title order={2}>Register</Title>
      <Text c="dimmed" size="sm">Enter your email and we will send you a link to get started.</Text>
      {error && <Alert color="red">{error}</Alert>}
      <TextInput label="Email" name="email" type="email" required />
      <Button type="submit" color="green" size="lg" loading={busy}>Register</Button>
      <Text size="sm">
        Already registered? <Anchor href="/">Sign in</Anchor>
      </Text>
    </Stack>
  )
}
