/**
 * @file LoginModal.jsx
 * @description Auth gate modal. Two-panel: Sign In (email + password) and
 * Register (display name + email + password). Standard browser auth flow.
 *
 * Sign in:   signInWithPassword -- SIGNED_IN fires, AuthContext sets session, modal closes.
 * Register:  signUp -- confirmation email sent, modal shows "check your email".
 *            On confirmation click the token is processed, SIGNED_IN fires, modal closes.
 *
 * Not dismissible. Closes automatically when session is established.
 */

import { useState } from 'react'
import {
  Modal, Stack, Title, TextInput, PasswordInput,
  Button, Alert, Anchor, Image, Tabs, Text,
} from '@mantine/core'
import { supabase } from '../lib/supabase.js'
import { useAuth }  from '../context/AuthContext.jsx'
import UKCPLogo     from '../assets/UKCPlogo.png'

export default function LoginModal() {
  const { session, loading } = useAuth()

  const [tab,         setTab]         = useState('signin')
  const [confirmed,   setConfirmed]   = useState(false)   // registration email sent
  const [regEmail,    setRegEmail]    = useState('')       // held for "sent to" message

  // Sign-in state
  const [siEmail,     setSiEmail]     = useState('')
  const [siPassword,  setSiPassword]  = useState('')
  const [siError,     setSiError]     = useState(null)
  const [siBusy,      setSiBusy]      = useState(false)

  // Register state
  const [regName,     setRegName]     = useState('')
  const [regPass,     setRegPass]     = useState('')
  const [regError,    setRegError]    = useState(null)
  const [regBusy,     setRegBusy]     = useState(false)

  const hasAuthParams =
    window.location.hash.includes('access_token') ||
    window.location.search.includes('code=')

  const opened = !loading && !session && !hasAuthParams

  async function handleSignIn(e) {
    e.preventDefault()
    setSiError(null)
    setSiBusy(true)
    const { error } = await supabase.auth.signInWithPassword({
      email:    siEmail,
      password: siPassword,
    })
    setSiBusy(false)
    if (error) setSiError(error.message)
    // Success: SIGNED_IN fires in AuthContext, session set, modal closes.
  }

  async function handleRegister(e) {
    e.preventDefault()
    setRegError(null)
    setRegBusy(true)
    const { error } = await supabase.auth.signUp({
      email:    regEmail,
      password: regPass,
      options:  {
        data:            { display_name: regName.trim() },
        emailRedirectTo: window.location.origin,
      },
    })
    setRegBusy(false)
    if (error) {
      setRegError(error.message)
    } else {
      setConfirmed(true)
    }
  }

  const modalProps = {
    opened,
    onClose:              () => {},
    closeOnClickOutside:  false,
    closeOnEscape:        false,
    withCloseButton:      false,
    centered:             true,
    size:                 'xs',
    overlayProps:         { backgroundOpacity: 0.55, blur: 3 },
  }

  if (confirmed) {
    return (
      <Modal {...modalProps}>
        <Stack align="center" gap="xs">
          <Image src={UKCPLogo} h={32} w="auto" />
          <Title order={4}>Check your email</Title>
          <Text c="dimmed" size="xs" ta="center">
            Confirmation link sent to {regEmail}.<br />
            Click it to activate your account.
          </Text>
          <Anchor size="xs" onClick={() => setConfirmed(false)}>Back</Anchor>
        </Stack>
      </Modal>
    )
  }

  return (
    <Modal {...modalProps}>
      <Stack gap="sm">
        <Stack align="center" gap={4}>
          <Image src={UKCPLogo} h={32} w="auto" />
          <Title order={4} ta="center">UK Citizens Portal</Title>
        </Stack>

        <Tabs value={tab} onChange={setTab}>
          <Tabs.List grow>
            <Tabs.Tab value="signin">Sign in</Tabs.Tab>
            <Tabs.Tab value="register">Register</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="signin" pt="sm">
            <Stack component="form" onSubmit={handleSignIn} autoComplete="on" gap="xs">
              {siError && <Alert color="red" size="xs" py={6}>{siError}</Alert>}
              <TextInput
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                size="sm"
                value={siEmail}
                onChange={e => setSiEmail(e.target.value)}
                required
              />
              <PasswordInput
                label="Password"
                name="current-password"
                autoComplete="current-password"
                size="sm"
                value={siPassword}
                onChange={e => setSiPassword(e.target.value)}
                required
              />
              <Button type="submit" color="green" size="sm" fullWidth loading={siBusy} mt={4}>
                Sign in
              </Button>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="register" pt="sm">
            <Stack component="form" onSubmit={handleRegister} autoComplete="on" gap="xs">
              {regError && <Alert color="red" size="xs" py={6}>{regError}</Alert>}
              <TextInput
                label="Display name"
                name="name"
                autoComplete="name"
                size="sm"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                required
              />
              <TextInput
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                size="sm"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                required
              />
              <PasswordInput
                label="Password"
                name="new-password"
                autoComplete="new-password"
                size="sm"
                value={regPass}
                onChange={e => setRegPass(e.target.value)}
                minLength={8}
                required
              />
              <Button type="submit" color="green" size="sm" fullWidth loading={regBusy} mt={4}>
                Create account
              </Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Modal>
  )
}
