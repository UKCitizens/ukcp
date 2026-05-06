/**
 * @file MyMeta.jsx
 * @description Right pane for MyHome — meta-consolidator and update dashboard.
 *
 * Four structured sections:
 *   Notifications — social and civic activity across followed entities
 *   Alerts        — time-sensitive items requiring the user's attention
 *   Counts        — ambient totals and activity summaries
 *   Responses     — items awaiting the user's input
 */

import { useState, useEffect } from 'react'
import { Stack, Text, Accordion, Group, Badge, ThemeIcon } from '@mantine/core'
import {
  IconBell,
  IconAlertTriangle,
  IconHash,
  IconMessageCircle2,
} from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const SECTION_META = [
  { id: 'notifications', label: 'Notifications', icon: IconBell,           colour: 'blue',   description: 'Replies, joins, committee decisions, and activity across your followed entities.' },
  { id: 'alerts',        label: 'Alerts',         icon: IconAlertTriangle,  colour: 'orange', description: 'Time-sensitive items — votes open, meetings due, petitions closing.' },
  { id: 'counts',        label: 'Counts',          icon: IconHash,           colour: 'teal',   description: 'Totals and activity summaries across your home entities.' },
  { id: 'responses',     label: 'Responses',       icon: IconMessageCircle2, colour: 'violet', description: 'Awaiting your input — mentions, invitations, votes, questions.' },
]

/** @returns {JSX.Element} */
export default function MyMeta() {
  const { session } = useAuth()
  const [meta, setMeta] = useState({ notifications: [], alerts: [], counts: [], responses: [] })

  useEffect(() => {
    if (!session?.access_token) return
    fetch(`${API_BASE}/api/myhome/meta`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMeta(d) })
      .catch(() => {})
  }, [session])

  const counts = {
    notifications: meta.notifications?.length ?? 0,
    alerts:        meta.alerts?.length ?? 0,
    counts:        meta.counts?.length ?? 0,
    responses:     meta.responses?.length ?? 0,
  }

  return (
    <Stack gap={0}>
      <Text size="sm" fw={600} p="md" pb="xs">My Updates</Text>

      <Accordion
        multiple
        chevronPosition="right"
        variant="default"
        defaultValue={SECTION_META.map(s => s.id)}
      >
        {SECTION_META.map(({ id, label, icon: Icon, colour, description }) => (
          <Accordion.Item key={id} value={id}>
            <Accordion.Control py="xs">
              <Group gap="xs" align="center">
                <ThemeIcon size={18} color={colour} variant="light" radius="sm">
                  <Icon size={11} />
                </ThemeIcon>
                <Text size="sm" fw={500}>{label}</Text>
                <Badge size="xs" color={counts[id] > 0 ? colour : 'gray'} variant="outline" ml="auto">
                  {counts[id]}
                </Badge>
              </Group>
            </Accordion.Control>

            <Accordion.Panel>
              <Stack gap={4}>
                <Text size="xs" c="dimmed" lh={1.4}>{description}</Text>

                {id === 'counts' && meta.counts?.length > 0
                  ? meta.counts.map((c, i) => (
                      <Text key={i} size="sm">{c.label}</Text>
                    ))
                  : id === 'counts'
                    ? <Text size="xs" c="dimmed" fs="italic">You are all caught up.</Text>
                  : <Text size="xs" c="dimmed" fs="italic">Nothing yet.</Text>
                }
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Stack>
  )
}
