/**
 * @file ResetPassword.jsx
 * @description Handles the password-reset link from Supabase email.
 *
 * Supabase (implicit flow) delivers the recovery token in the URL hash:
 *   /reset-password#access_token=...&type=recovery
 *
 * The Supabase client detects the hash on mount and fires an onAuthStateChange
 * event with event === 'PASSWORD_RECOVERY'. We listen for that event, then
 * render a form that calls supabase.auth.updateUser({ password }) to commit
 * the new password.
 *
 * This page is public -- no RequireAuth wrapper. The recovery session is
 * established by Supabase from the URL token, not from a stored session.
 */

import { useEffect, useState } from 'react'
import { useNavigate }         from 'react-router-dom'
import {
  Center, Paper, Stack, Title, Text,
  PasswordInput, Button, Alert, Anchor,
} from '@mantine/core'
import { supabase } from '../lib/supabase.js'

export default function ResetPassword() {
  const navigate = useNavigate()

  const [ready,    setReady]    = useState(false)   // recovery session established
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState(null)
  const [done,     setDone]     = useState(false)

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event -- fired when Supabase processes the
    // recovery token from the URL hash. Until then, show a waiting state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      setDone(true)
      // Sign out so the user logs in fresh with the new password.
      await supabase.auth.signOut()
      setTimeout(() => navigate('/'), 2500)
    }
  }

  return (
    <Center h="100vh">
      <Paper withBorder p="xl" w={340}>
        <Stack gap="sm">
          <Title order={4} ta="center">Set new password</Title>

          {done ? (
            <Stack align="center" gap="xs">
              <Text c="green" size="sm" ta="center">Password updated. Redirecting to sign in...</Text>
            </Stack>
          ) : !ready ? (
            <Stack align="center" gap="xs">
              <Text c="dimmed" size="sm" ta="center">Verifying reset link...</Text>
              <Anchor size="xs" onClick={() => navigate('/')}>Back to home</Anchor>
            </Stack>
          ) : (
            <Stack component="form" onSubmit={handleSubmit} gap="xs">
              {error && <Alert color="red" size="xs" py={6}>{error}</Alert>}
              <PasswordInput
                label="New password"
                name="new-password"
                autoComplete="new-password"
                size="sm"
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <PasswordInput
                label="Confirm password"
                name="confirm-password"
                autoComplete="new-password"
                size="sm"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
              <Button type="submit" color="green" size="sm" fullWidth loading={busy} mt={4}>
                Set password
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Center>
  )
}
