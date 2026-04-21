/**
 * @file Home.jsx
 * @description UKCP site home page.
 * Entry point for the portal — links to all six functional areas.
 */

import { Container, Title, Text, Button, Stack, Group } from '@mantine/core'
import { useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'My Home',            path: '/myhome'    },
  { label: 'Location Selector',  path: '/locations' },
  { label: 'My Vote',            path: '/myvote'    },
  { label: 'Profile',            path: '/profile'   },
  { label: 'Help',               path: '/help'      },
  { label: 'Settings',           path: '/settings'  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <Container mt="xl">
      <Stack gap="sm">
        <Title order={1}>UK Citizens Portal</Title>
        <Text c="dimmed" mb="md">Welcome. Select a section to get started.</Text>
        <Group gap="sm" wrap="wrap">
          {NAV_ITEMS.map(({ label, path }) => (
            <Button
              key={path}
              color="green"
              variant="filled"
              onClick={() => navigate(path)}
            >
              {label}
            </Button>
          ))}
        </Group>
      </Stack>
    </Container>
  )
}
