# Dex Instruction File -- User Session State, Follows, Identity Strip
# Produced: 1 May 2026
# Read design note first: UKCP/Ali/user-session-state-design-note.md

---

## Overview

Three constructs to implement in one sprint:
1. Session snapshot -- persist and restore app state across sessions
2. user_follows collection -- Follow/Save wiring for School Gates (schools)
3. UserStateContext + identity strip in SiteHeaderRow1

Implement in order. Stop after each section and confirm before proceeding.

---

## SECTION 1 -- Session Snapshot

### 1a. Mongo collection

No seed needed. Collection `user_session` is created on first upsert.
Add to db/mongo.js:

```js
export const sessionCol = () => db().collection('user_session');
```

### 1b. API routes -- add to routes/auth.js (or create routes/session.js)

GET /api/session/snapshot
- Auth: read device cookie (req.userId from middleware). If no userId return 404.
- Query: sessionCol().findOne({ user_id: req.userId })
- Return: doc or null

PATCH /api/session/snapshot
- Auth: req.userId required.
- Body: partial snapshot fields (any subset of the shape below)
- Upsert: sessionCol().updateOne(
    { user_id: req.userId },
    { $set: { ...body, user_id: req.userId, updated_at: new Date() } },
    { upsert: true }
  )
- Return: { ok: true }

Snapshot shape (all fields optional on patch):
```
geo_path, active_tab, active_network, selected_school_urn, tab_nav_mode, group_filter
```

Register routes in server.js if creating new file.

### 1c. Client hook -- src/hooks/useSessionSnapshot.js (new file)

```js
import { useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || '';
const LS_KEY = 'ukcp_session_snapshot';
const DEBOUNCE_MS = 500;

export function useSessionSnapshot({ user, snapshot, onRestore }) {
  const timer = useRef(null);

  // On mount: load snapshot and call onRestore
  useEffect(() => {
    if (user) {
      fetch(`${API}/api/session/snapshot`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) onRestore(data); })
        .catch(() => {});
    } else {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) onRestore(JSON.parse(raw));
      } catch {}
    }
  }, [user]);

  // Write snapshot -- debounced
  useEffect(() => {
    if (!snapshot) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (user) {
        fetch(`${API}/api/session/snapshot`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(snapshot)
        }).catch(() => {});
      } else {
        try { localStorage.setItem(LS_KEY, JSON.stringify(snapshot)); } catch {}
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [snapshot, user]);
}
```

### 1d. Wire into Locations.jsx

Import useSessionSnapshot and useAuth.

Build snapshot object from current state:
```js
const snapshot = useMemo(() => ({
  geo_path: path.map(p => p.value),
  active_tab: midTab,
  active_network: activeNetwork,
  selected_school_urn: selectedSchoolUrn,
  tab_nav_mode: tabNavMode,
  group_filter: groupsFilter
}), [path, midTab, activeNetwork, selectedSchoolUrn, tabNavMode, groupsFilter]);
```

onRestore callback: receives saved snapshot, applies each field back to state setters.
Only apply if the field is non-null. Do not overwrite state that is already set from
URL params or prop-driven navigation.

```js
const handleRestore = useCallback((snap) => {
  if (snap.geo_path?.length) { /* rebuild path from geo_path array -- use existing
    navCoords/containment logic to resolve slugs back to path objects */ }
  if (snap.active_tab) setMidTab(snap.active_tab);
  if (snap.active_network) setActiveNetwork(snap.active_network);
  if (snap.selected_school_urn) setSelectedSchoolUrn(snap.selected_school_urn);
  if (snap.tab_nav_mode != null) setTabNavMode(snap.tab_nav_mode);
  if (snap.group_filter) setGroupsFilter(snap.group_filter);
}, []);
```

Call the hook:
```js
useSessionSnapshot({ user, snapshot, onRestore: handleRestore });
```

Note on geo_path restore: path items are objects { level, value, label }. The simplest
restore is to fire the existing handleNavSelect/handleSelect sequence for each node in
geo_path in order. If this is complex, restore tab/network/filter only for now and leave
geo_path restore as a follow-up -- note it clearly.

---

## SECTION 2 -- user_follows

### 2a. Mongo collection

Add to db/mongo.js:
```js
export const followsCol = () => db().collection('user_follows');
```

Create indexes on first connect (add to connectDB or a separate ensureIndexes call):
```js
await followsCol().createIndex({ user_id: 1, entity_type: 1 });
await followsCol().createIndex({ entity_type: 1, entity_id: 1 });
```

### 2b. API routes -- create routes/follows.js

```
POST /api/follows
  body: { entity_type, entity_id, entity_name, scope_gss? }
  auth: req.userId required
  action: upsert { user_id, entity_type, entity_id, entity_name, scope_gss, followed_at: new Date() }
  return: { ok: true }

DELETE /api/follows/:entity_type/:entity_id
  auth: req.userId required
  action: deleteOne({ user_id, entity_type, entity_id })
  return: { ok: true }

GET /api/follows
  query param: entity_type (required)
  auth: req.userId required
  action: find({ user_id, entity_type })
  return: array of follow docs
```

Register in server.js: `app.use('/api/follows', followsRouter);`

### 2c. SchoolsRightNav.jsx -- wire Follow button

Import useAuth. Get user from context.

State: `const [followed, setFollowed] = useState(false);`

On mount (and when school changes): check if this URN is already followed.
- Logged-in: GET /api/follows?entity_type=school, check if entity_id === urn in result
- Anon: read localStorage key `ukcp_saves`, parse, check for matching entry

Follow click handler:
```js
const handleFollow = async () => {
  if (user) {
    if (followed) {
      await fetch(`${API}/api/follows/school/${urn}`, { method: 'DELETE', credentials: 'include' });
    } else {
      await fetch(`${API}/api/follows`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: 'school', entity_id: urn, entity_name: schoolName })
      });
    }
  } else {
    // anon: localStorage
    const LS_KEY = 'ukcp_saves';
    const saves = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    if (followed) {
      localStorage.setItem(LS_KEY, JSON.stringify(saves.filter(s => s.entity_id !== urn)));
    } else {
      saves.push({ entity_type: 'school', entity_id: urn, entity_name: schoolName, saved_at: new Date().toISOString() });
      localStorage.setItem(LS_KEY, JSON.stringify(saves));
    }
  }
  setFollowed(f => !f);
};
```

Button label: user ? (followed ? 'Following' : 'Follow') : (followed ? 'Saved' : 'Save')

### 2d. SchoolsLeftNav.jsx -- Mine default

On mount, after fetching follows/saves:
- If result length > 0, default toggle to 'mine'
- If result length === 0, default toggle to 'all'

Pass followed URNs down as a set for filtering the Mine view.

---

## SECTION 3 -- UserStateContext + Identity Strip

### 3a. Create src/context/UserStateContext.jsx

```jsx
import { createContext, useContext, useState, useCallback } from 'react';

const UserStateContext = createContext(null);

export function UserStateProvider({ children }) {
  const [scopeLabel, setScopeLabel] = useState('');
  const [activeNetworkLabel, setActiveNetworkLabel] = useState('');

  const updateUserState = useCallback(({ scope, network }) => {
    if (scope !== undefined) setScopeLabel(scope);
    if (network !== undefined) setActiveNetworkLabel(network);
  }, []);

  return (
    <UserStateContext.Provider value={{ scopeLabel, activeNetworkLabel, updateUserState }}>
      {children}
    </UserStateContext.Provider>
  );
}

export const useUserState = () => useContext(UserStateContext);
```

Wrap App.jsx children with UserStateProvider (alongside AuthProvider).

### 3b. Locations.jsx -- write to UserStateContext

Import useUserState. Call updateUserState whenever path or activeNetwork changes:

```js
const { updateUserState } = useUserState();

useEffect(() => {
  const last = path[path.length - 1];
  updateUserState({
    scope: last ? last.label : 'UK',
    network: activeNetwork ? NETWORK_LABELS[activeNetwork] : ''
  });
}, [path, activeNetwork]);
```

NETWORK_LABELS: a simple map e.g. `{ 'school-gates': 'School Gates' }`.
Add new entries as networks are built.

### 3c. SiteHeaderRow1.jsx -- identity strip

Import useUserState and useAuth.

Add a strip below (or alongside) the existing header content:

```jsx
const { scopeLabel, activeNetworkLabel } = useUserState();
const { user, profile } = useAuth();

const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Guest';
```

Render (plain, no heavy styling -- match existing header tone):
```jsx
<div className={styles.identityStrip}>
  <span className={styles.who}>{displayName}</span>
  {scopeLabel && <span className={styles.where}>{scopeLabel}</span>}
  {activeNetworkLabel && <span className={styles.network}>{activeNetworkLabel}</span>}
</div>
```

Add corresponding CSS in SiteHeaderRow1.module.css. Keep it subtle -- small text,
muted colour, sits beneath the main row1 content without competing with it.

---

## SECTION 4 -- Anon merge on login

In Home.jsx (the login/OTP page), after onAuthStateChange fires SIGNED_IN:

Before navigating to /locations, run a merge function:

```js
const mergeAnonData = async (userId) => {
  // Merge session snapshot
  const snap = localStorage.getItem('ukcp_session_snapshot');
  if (snap) {
    await fetch(`${API}/api/session/snapshot`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: snap
    });
    localStorage.removeItem('ukcp_session_snapshot');
  }
  // Merge saves to follows
  const saves = JSON.parse(localStorage.getItem('ukcp_saves') || '[]');
  for (const save of saves) {
    await fetch(`${API}/api/follows`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...save, followed_at: save.saved_at })
    });
  }
  if (saves.length) localStorage.removeItem('ukcp_saves');
};
```

Call before navigate('/locations').

---

## Deploy

Standard flow: npm run build -> git add . -> git commit -> git push
Vercel and Railway auto-deploy from master.
No new seed scripts needed.

---

## Stop points

Stop after Section 1 and confirm snapshot read/write working.
Stop after Section 2 and confirm Follow persists across refresh.
Stop after Section 3 and confirm identity strip showing correctly.
Section 4 (merge) can be run last.
