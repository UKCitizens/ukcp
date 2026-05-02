# Dex Instruction File -- Civic Tab Restructure
# Produced 2 May 2026 / Reviewed 2 May 2026
# Run after dex-instructions-traders-shell.md is complete.
#
# NOTE (added on review): Item (2) below is ALREADY DONE.
# CommitteeTab.jsx was updated to origin-based PostsTab interface in PRG:39 (post sprint).
# Do NOT re-apply that fix. Skip straight to CivicTab creation (Section 1b) and wiring (Section 2).
#
# Scope:
# (1) Create CivicTab.jsx -- wraps CommitteeTab content + placeholder sections
#     for petitions and civic acts (not yet built).
# (2) DONE -- CommitteeTab PostsTab usage already updated in PRG:39. Skip.
# (3) Wire CivicTab into Locations.jsx replacing CommitteeTab direct reference.
#
# Two sections. Stop after each and confirm.
#
# 1. Fix CommitteeTab + create CivicTab
# 2. Wire into Locations.jsx

---

## SECTION 1 -- Fix CommitteeTab + create CivicTab

### 1a. Fix CommitteeTab PostsTab usage

The post sprint replaced PostsTab with a new interface:
  OLD props: locationType, locationSlug, collectiveRef
  NEW props: origin { entity_type, entity_id, entity_name, geo_scope }, postType, composerVariant

CommitteeTab currently calls PostsTab with the old interface and will be broken
after the post sprint. Fix it now.

File: src/components/Committee/CommitteeTab.jsx

Find the PostsTab usage at the bottom of the return block:

```jsx
<PostsTab
  locationType="constituency"
  locationSlug={locationSlug}
  collectiveRef={{ collection: 'committee_forums', id: String(forum._id) }}
/>
```

Replace with:

```jsx
<PostsTab
  origin={{
    entity_type: 'committee_forum',
    entity_id:   String(forum._id),
    entity_name: forum.name,
    geo_scope: {
      constituency_gss: forum.committee?.con_gss ?? null,
      ward_gss:         null,
      county_gss:       null,
      region:           null,
      country:          'United Kingdom',
    }
  }}
/>
```

Note: forum.committee.con_gss may not be populated on all forum docs.
The geo_scope is best-effort here -- PostsTab uses it for reach resolution
on POST, not for GET filtering. GET still queries by entity_type + entity_id.

### 1b. Create src/components/Civic/CivicTab.jsx

```jsx
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
```

Stop. Confirm:
- CommitteeTab still renders the committee forum with the new PostsTab origin props.
- CivicTab renders three internal tabs: Committee Forum / Petitions / Civic Acts.
- Petitions and Civic Acts show "coming soon".
- No console errors.

---

## SECTION 2 -- Wire into Locations.jsx

### 2a. Replace CommitteeTab import with CivicTab

In src/pages/Locations.jsx, find:

```js
import CommitteeTab from '../components/Committee/CommitteeTab.jsx'
```

Replace with:

```js
import CivicTab from '../components/Civic/CivicTab.jsx'
```

### 2b. Replace civicPane prop

Find (around line 690):

```jsx
civicPane={<CommitteeTab locationType={contentContext?.type} locationSlug={contentContext?.slug} />}
```

Replace with:

```jsx
civicPane={<CivicTab locationType={contentContext?.type} locationSlug={contentContext?.slug} />}
```

No server changes. No other files changed.

Stop. Confirm:
- Civic tab in mid pane shows Committee Forum / Petitions / Civic Acts sub-tabs.
- Committee forum still loads and posts still work within the Committee Forum sub-tab.
- No remaining direct CommitteeTab import in Locations.jsx.
- No console errors.
