/**
 * @file TabStubs.jsx
 * @description Placeholder panels for tabs not yet implemented.
 * Each stub renders a centred "coming soon" message.
 * Replace individual exports with real components as features are built.
 */

import { Center, Text } from '@mantine/core'

const stub = (label) => (
  <Center style={{ height: '100%', minHeight: 120 }}>
    <Text size="sm" c="dimmed">{label} -- coming soon</Text>
  </Center>
)

export const NewsStub         = () => stub('News')
export const GroupsStub       = () => stub('Groups')
export const LocalTradersStub = () => stub('Local Traders')
export const CivicStub        = () => stub('Civic')
export const CommitteeStub    = () => stub('Committee')
export const PostsStub        = () => stub('Posts')      // retained -- used internally by CommitteeTab / CommunityNetworksSection
