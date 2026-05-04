/**
 * @file Login.jsx
 * @description Citizen login form. Calls Supabase directly.
 * On success, AuthContext detects the session change and fetches/creates the
 * MongoDB profile record via GET /api/profile.
 *
 * Uses plain HTML inputs (not Mantine wrappers) so Edge/Chrome autofill works reliably.
 * Navigation on success is handled by AuthContext.onAuthStateChange -- do not navigate here.
 */

import { useState } from 'react'
import { Button, Text, Title, Alert } from '@mantine/core'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const [error, setError] = useState(null)
  const [busy,  setBusy]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const form     = e.currentTarget
    const email    = form.elements.namedItem('email').value
    const password = form.elements.namedItem('password').value

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setBusy(false)
    if (error) setError(error.message)
    // Navigation handled by AuthContext.onAuthStateChange (SIGNED_IN).
    // Do not navigate here -- double navigation causes stale login page to persist.
  }

  return (
    <form style={wrap} onSubmit={handleSubmit}>
      <Title order={2} mb="md">Sign in</Title>
      {error && <Alert color="red" mb="sm">{error}</Alert>}

      <div style={field}>
        <label htmlFor="email" style={lbl}>Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required style={inp} />
      </div>

      <div style={field}>
        <label htmlFor="password" style={lbl}>Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required style={inp} />
      </div>

      <Button type="submit" loading={busy} fullWidth mt="md">Sign in</Button>
      <Text size="sm" mt="sm">No account? <a href="/register">Create one</a></Text>
    </form>
  )
}

const wrap  = { maxWidth: 400, margin: '60px auto 0', padding: '32px 24px', display: 'flex', flexDirection: 'column' }
const field = { display: 'flex', flexDirection: 'column', marginBottom: 12 }
const lbl   = { fontSize: 13, fontWeight: 500, color: '#212529', marginBottom: 4 }
const inp   = { height: 36, padding: '0 10px', fontSize: 14, border: '1px solid #ced4da', borderRadius: 4, outline: 'none', boxSizing: 'border-box', width: '100%' }
