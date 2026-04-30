/**
 * @file src/components/Committee/JoinForumModal.jsx
 * @description Modal for joining a constituency committee forum.
 * Requires postcode verification — hard gate, constituency must match.
 *
 * Props:
 *   forum     — forum object from CommitteeTab state
 *   onClose   — callback to close modal
 *   onSuccess — callback(forum) called on successful join
 */

import { useState } from 'react'
import { Modal, TextInput, Textarea, Button, Text, Stack } from '@mantine/core'
import { useAuth } from '../../context/AuthContext.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

/**
 * @param {{ forum: object, onClose: () => void, onSuccess: (forum: object) => void }} props
 */
export default function JoinForumModal({ forum, onClose, onSuccess }) {
  const { session } = useAuth()
  const [state,    setState]    = useState('idle')   // idle | submitting | success | error
  const [postcode, setPostcode] = useState('')
  const [reason,   setReason]   = useState('')
  const [errMsg,   setErrMsg]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!postcode.trim()) return
    setState('submitting')
    setErrMsg('')

    try {
      const res = await fetch(`${API_BASE}/api/forums/${forum._id}/join`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ postcode: postcode.trim(), reason: reason.trim() }),
      })

      if (res.status === 201) {
        setState('success')
        return
      }

      if (res.status === 401) {
        setErrMsg('Session expired. Please sign in again.')
        setState('error')
        return
      }

      const body = await res.json()
      setErrMsg(body.error ?? 'Something went wrong. Please try again.')
      setState('error')
    } catch {
      setErrMsg('Network error — please try again.')
      setState('error')
    }
  }

  function handleSignIn() {
    sessionStorage.setItem('pendingForumJoin', forum._id)
    window.location.href = '/'
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title={`Join ${forum.name}`}
      centered
      size="sm"
    >
      {/* Not logged in */}
      {!session && (
        <Stack gap="md">
          <Text size="sm" c="dimmed">You need to be signed in to join this forum.</Text>
          <Button onClick={handleSignIn} fullWidth>Sign in</Button>
          <Button variant="subtle" onClick={onClose} fullWidth>Cancel</Button>
        </Stack>
      )}

      {/* Success */}
      {session && state === 'success' && (
        <Stack gap="md">
          <Text size="sm" fw={600} c="green.7">You are now a member of {forum.name}.</Text>
          <Text size="sm" c="dimmed">You can now read and post in this forum.</Text>
          <Button onClick={() => onSuccess(forum)} fullWidth>Close</Button>
        </Stack>
      )}

      {/* Form: idle or error */}
      {session && (state === 'idle' || state === 'error' || state === 'submitting') && (
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Enter your postcode to confirm you live in this constituency.
            </Text>

            {state === 'error' && errMsg && (
              <Text size="sm" c="red.7">{errMsg}</Text>
            )}

            <TextInput
              label="Your postcode"
              placeholder="e.g. L17 1AA"
              value={postcode}
              onChange={e => setPostcode(e.target.value)}
              required
              disabled={state === 'submitting'}
              styles={{ input: { textTransform: 'uppercase' } }}
            />

            <Textarea
              label="Why do you want to join? (optional)"
              placeholder="Optional — max 500 characters"
              maxLength={500}
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={state === 'submitting'}
            />

            <Button type="submit" loading={state === 'submitting'} fullWidth>
              Join Forum
            </Button>
            <Button variant="subtle" onClick={onClose} disabled={state === 'submitting'} fullWidth>
              Cancel
            </Button>
          </Stack>
        </form>
      )}
    </Modal>
  )
}
