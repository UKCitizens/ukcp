/**
 * @file Home.jsx
 * @description Entry point for the UKCP portal.
 *
 * Authentication: magic link (OTP). User enters email, Supabase sends a
 * sign-in link via Resend/ukcportal.co.uk. Clicking the link creates a
 * session. First-time users are created automatically (shouldCreateUser:true).
 * No password required or stored.
 *
 * Bypass: active Supabase session -> /locations immediately (silent).
 * Anonymous access: available via "Continue without signing in" below the form.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Stack, Title, Text, TextInput, Button, Alert, Anchor, Divider, Image,
} from '@mantine/core'
import { supabase } from '../lib/supabase.js'
import UKCPLogo from '../assets/UKCPlogo.png'

export default function Home() {
  const navigate  = useNavigate()
  const [checking, setChecking] = useState(true)
  const [sent,     setSent]     = useState(false)
  const [email,    setEmail]    = useState('')
  const [error,    setError]    = useState(null)
  const [busy,     setBusy]     = useState(false)

  useEffect(() => {
    // If auth params are in the URL (magic link callback), keep the spinner
    // up while AuthContext handles SIGNED_IN -> merge -> redirect. Don't show
    // the form prematurely.
    const hasAuthParams =
      window.location.hash.includes('access_token') ||
      window.location.search.includes('code=')

    // Hide the form when we know there is no session waiting. Post-SIGNED_IN
    // navigation is owned by AuthContext (Section 4) -- no listener here.
    // We still need an INITIAL_SESSION listener so a logged-in user landing
    // on /login is bounced out (AuthContext only navigates on SIGNED_IN).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && session) {
        navigate('/locations', { replace: true })
        return
      }
      if (!session && !hasAuthParams) {
        setChecking(false)
      }
    })

    if (!hasAuthParams) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          navigate('/locations', { replace: true })
        } else {
          setChecking(false)
        }
      })
    }

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: sbError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser:  true,
        emailRedirectTo:   window.location.origin,
      },
    })
    setBusy(false)
    if (sbError) {
      setError(sbError.message)
    } else {
      setSent(true)
    }
  }

  if (checking) return null

  if (sent) {
    return (
      <Stack align="center" p="xl" mt="xl" gap="sm">
        <Image src={UKCPLogo} h={48} w="auto" />
        <Title order={3}>Check your email</Title>
        <Text c="dimmed" size="sm" ta="center" maw={360}>
          A sign-in link has been sent to {email}.<br />
          Click it to access the portal. You can close this tab.
        </Text>
        <Anchor size="sm" onClick={() => setSent(false)}>Use a different email</Anchor>
      </Stack>
    )
  }

  return (
    <Stack align="center" p="xl" mt="xl" gap="md" maw={400} mx="auto">
      <Image src={UKCPLogo} h={48} w="auto" />
      <Title order={2} ta="center">UK Citizens Portal</Title>
      <Text c="dimmed" size="sm" ta="center">
        Enter your email and we will send you a secure sign-in link.
        No password required.
      </Text>

      <Stack component="form" onSubmit={handleSubmit} gap="sm" w="100%">
        {error && <Alert color="red" size="sm">{error}</Alert>}
        <TextInput
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <Button type="submit" color="green" fullWidth loading={busy}>
          Send sign-in link
        </Button>
      </Stack>

      <Divider w="100%" label="or" labelPosition="center" />

      <Button
        variant="subtle"
        color="gray"
        fullWidth
        onClick={() => navigate('/locations')}
      >
        Continue without signing in
      </Button>
    </Stack>
  )
}
