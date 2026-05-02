# Dex Instruction File -- Local Traders Shell + Schema
# Produced 2 May 2026
# Run after dex-instructions-news-tab.md is complete.
#
# Scope: trader Mongo schema, collection accessor, TradersTab shell component.
# Self-registration flow is NOT in scope -- deferred to a separate sprint.
# TradersLeftNav and TradersRightNav already exist as stubs in src/components/TabNavs/.
#
# Three sections. Stop after each and confirm.
#
# 1. Trader schema -- db/mongo.js
# 2. TradersTab component
# 3. Wire into Locations.jsx

---

## SECTION 1 -- Trader schema

### 1a. Add traders collection accessor to db/mongo.js

Find the block of collection accessor functions (around line 87). Add:

```js
/** Returns the traders collection, or null if Mongo is unavailable. */
export function tradersCol() { return db ? db.collection('traders') : null }
```

### 1b. Add traders indexes to ensureIndexes in db/mongo.js

Find the ensureIndexes / connectDB function. Add inside it:

```js
await db.collection('traders').createIndex({ user_id: 1 }, { unique: true })
await db.collection('traders').createIndex({ 'location.ward_gss': 1 })
await db.collection('traders').createIndex({ 'location.con_gss': 1 })
await db.collection('traders').createIndex({ 'location.county_gss': 1 })
await db.collection('traders').createIndex({ status: 1 })
await db.collection('traders').createIndex({ category: 1 })
```

### Trader document shape (reference -- no seed script needed)

```js
{
  _id:         ObjectId,
  user_id:     ObjectId,           // ref users._id -- the registered trader
  business_name: String,           // required
  category:    String,             // e.g. 'Food & Drink', 'Health', 'Services', 'Retail', 'Trades'
  description: String,             // short blurb, max 500 chars
  website:     String,             // optional
  phone:       String,             // optional, display only
  email:       String,             // optional, display only (not the auth email)
  address: {
    line1:     String,
    town:      String,
    postcode:  String,
  },
  location: {
    ward:          String,
    ward_gss:      String,
    constituency:  String,
    con_gss:       String,
    county:        String,
    county_gss:    String,
    lat:           Number,
    lng:           Number,
  },
  agreement_accepted: Boolean,     // UKCP Local Traders Agreement -- false until self-reg sprint
  status:      String,             // 'pending' | 'active' | 'suspended'
  created_at:  Date,
  updated_at:  Date,
}
```

No seed script. Schema is reference documentation for the self-registration sprint.

Stop. Confirm db/mongo.js changes are clean -- server starts without error.

---

## SECTION 2 -- TradersTab component

### Create src/components/Traders/TradersTab.jsx

```jsx
/**
 * @file src/components/Traders/TradersTab.jsx
 * @description Local Traders tab panel.
 * Displays registered local traders for the current location scope.
 * Shell only -- no trader data exists yet (self-registration deferred).
 * Layout: category filter strip + trader card list.
 *
 * Props:
 *   locationType  -- geo node type
 *   locationSlug  -- geo node slug
 *   locationLabel -- human-readable label
 */
import { useState } from 'react'
import { Text, Stack, Paper, Group, Badge, Button } from '@mantine/core'

const CATEGORIES = ['All', 'Food & Drink', 'Health', 'Services', 'Retail', 'Trades']

// Placeholder trader card -- replace with real TraderCard when data exists
function PlaceholderTraderCard({ name, category, description }) {
  return (
    <Paper withBorder p="sm" radius="sm">
      <Group justify="space-between" mb={4}>
        <Text size="sm" fw={600}>{name}</Text>
        <Badge size="xs" variant="light" color="teal">{category}</Badge>
      </Group>
      <Text size="xs" c="dimmed" lineClamp={2}>{description}</Text>
    </Paper>
  )
}

export default function TradersTab({ locationType, locationSlug, locationLabel }) {
  const [activeCategory, setActiveCategory] = useState('All')

  if (!locationType) {
    return (
      <div style={empty}>
        <Text size="sm" c="dimmed">Select a location to see local traders.</Text>
      </div>
    )
  }

  // Placeholder data -- removed when self-registration sprint delivers real records
  const placeholders = [
    { name: 'The Corner Bakery', category: 'Food & Drink', description: 'Fresh bread and pastries baked daily. Family run since 1987.' },
    { name: 'Apex Plumbing', category: 'Trades', description: 'Local plumber, gas safe registered. Call-outs across the constituency.' },
    { name: 'Green Leaf Health', category: 'Health', description: 'Independent pharmacy and wellness shop serving the local community.' },
  ]

  const filtered = activeCategory === 'All'
    ? placeholders
    : placeholders.filter(t => t.category === activeCategory)

  return (
    <div style={wrap}>
      {/* Category filter strip */}
      <div style={filterStrip}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            style={activeCategory === cat ? { ...filterBtn, ...filterBtnActive } : filterBtn}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={content}>
        {/* Register CTA -- will link to self-registration flow when built */}
        <Paper withBorder p="sm" radius="sm" mb="md" style={{ background: '#f8fff9', borderColor: '#b2f2bb' }}>
          <Text size="xs" fw={600} c="teal.8" mb={4}>Are you a local trader?</Text>
          <Text size="xs" c="dimmed" mb={6}>
            Register your business on UKCP Local Traders and reach your community.
            Self-registration coming soon.
          </Text>
          <Button size="xs" variant="light" color="teal" disabled>
            Register your business
          </Button>
        </Paper>

        {/* Trader list */}
        <Text size="xs" c="dimmed" mb={8}>
          {locationLabel ?? locationSlug?.replace(/_/g, ' ')} -- {filtered.length} trader{filtered.length !== 1 ? 's' : ''} listed
          {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
          {' '}(placeholder data)
        </Text>
        <Stack gap={8}>
          {filtered.map((t, i) => (
            <PlaceholderTraderCard key={i} {...t} />
          ))}
        </Stack>
      </div>
    </div>
  )
}

const wrap        = { height: '100%', display: 'flex', flexDirection: 'column' }
const filterStrip = { display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid #f1f3f5', overflowX: 'auto', flexShrink: 0 }
const filterBtn   = { fontSize: 11, padding: '3px 8px', border: '1px solid #dee2e6', borderRadius: 12, background: '#fff', color: '#495057', cursor: 'pointer', whiteSpace: 'nowrap' }
const filterBtnActive = { background: '#0ca678', color: '#fff', borderColor: '#0ca678' }
const content     = { overflowY: 'auto', flex: 1, padding: 12 }
```

Stop. Confirm component renders cleanly with placeholder data and category filter works.

---

## SECTION 3 -- Wire into Locations.jsx

### 3a. Replace LocalTradersStub import with TradersTab

In src/pages/Locations.jsx, find:

```js
import { LocalTradersStub } from '../components/TabStubs.jsx'
```

Remove that import. Add:

```js
import TradersTab from '../components/Traders/TradersTab.jsx'
```

If LocalTradersStub was the only remaining import from TabStubs.jsx, remove the
TabStubs import entirely. If NewsStub was already removed (it was, in the news tab
sprint), TabStubs.jsx is no longer imported by Locations.jsx.

### 3b. Replace tradersPane prop

Find (around line 689):

```jsx
tradersPane={<LocalTradersStub />}
```

Replace with:

```jsx
tradersPane={
  <TradersTab
    locationType={contentContext?.type}
    locationSlug={contentContext?.slug}
    locationLabel={contentContext?.label ?? contentContext?.slug?.replace(/_/g, ' ')}
  />
}
```

No server changes. No other files changed.

Stop. Confirm:
- Traders tab renders correctly at any location scope.
- Category filter strips work.
- Register CTA is visible but disabled.
- No remaining references to LocalTradersStub in Locations.jsx.
- No console errors.
