/**
 * @file src/components/Civic/CivicTab.jsx
 * @description Civic tab panel. Hosts the constituency committee forum and
 * placeholder sections for petitions and civic acts (not yet built).
 *
 * Props:
 *   locationType  -- geo node type
 *   locationSlug  -- geo node slug
 */
import { Text, Tabs, Center } from '@mantine/core'
import CommitteeTab from '../Committee/CommitteeTab.jsx'

// Placeholder panel for sections not yet built
function ComingSoon({ label }) {
  return (
    <Center style={{ height: '100%', minHeight: 120, padding: 24 }}>
      <Text size="sm" c="dimmed">{label} -- coming soon</Text>
    </Center>
  )
}

export default function CivicTab({ locationType, locationSlug }) {
  return (
    <Tabs defaultValue="committee" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs.List style={{ flexShrink: 0 }}>
        <Tabs.Tab value="committee" fz="xs">Committee Forum</Tabs.Tab>
        <Tabs.Tab value="petitions" fz="xs">Petitions</Tabs.Tab>
        <Tabs.Tab value="civic-acts" fz="xs">Civic Acts</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="committee" style={{ flex: 1, overflowY: 'auto' }}>
        <CommitteeTab locationType={locationType} locationSlug={locationSlug} />
      </Tabs.Panel>

      <Tabs.Panel value="petitions" style={{ flex: 1, overflowY: 'auto' }}>
        <ComingSoon label="Petitions" />
      </Tabs.Panel>

      <Tabs.Panel value="civic-acts" style={{ flex: 1, overflowY: 'auto' }}>
        <ComingSoon label="Civic Acts" />
      </Tabs.Panel>
    </Tabs>
  )
}
