# Dex Instructions -- Sprint A: Active User Foundation

## Context

This sprint wires in the citizen user model. The goal is a working registration, login,
session, device cookie, and profile edit. No role enforcement yet -- that is Sprint B+.

Working directory for all commands: `C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP`

Reference documents (Ali has authored these -- read if you need field-level detail):
- `UKCP/Ali/ukcp-citizen-user-data-definition.docx` -- collections spec
- `UKCP/Ali/tech-note-dual-persona-auth.md` -- auth architecture

All code uses ES modules (package.json has "type": "module"). Match the existing style.

---

## Architecture Note -- Auth Pattern

Supabase handles authentication (credentials, password hashing, email confirmation, tokens).
MongoDB holds the extended user profile (display name, tier, posting preferences, home location).

Flow:
1. Client calls Supabase directly for sign-up and sign-in (Supabase SDK).
2. On first API call after sign-in, Express creates the MongoDB users record if it does not exist.
3. All protected Express routes validate the Supabase JWT via supabaseAdmin.auth.getUser(token).
   This makes one API call to Supabase per protected request -- acceptable for v1. The Supabase
   admin client handles ECC P-256 key verification automatically. No local JWT secret needed.
4. Device cookie is set server-side on every first visit (middleware). Linked to user on first
   authenticated API call.

Supabase JWTs use ECC P-256 (asymmetric). The `sub` claim in the decoded token is the Supabase
user ID. Store it in the users collection as `supabase_id`. All lookups use this field.

---

## Step 1 -- Install Dependencies

```bash
npm install @supabase/supabase-js cookie-parser
```

No devDependencies needed. `jsonwebtoken` is not required -- JWT verification is handled by the
Supabase admin client.

---

## Step 2 -- Environment Variables

### server .env (local development)

Add to `.env` (do NOT commit this file -- it is already in .gitignore):

```
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<sb_secret_... key>
```

Where to find these:
- SUPABASE_URL: https://<project-id>.supabase.co -- the project ID is shown on the Supabase
  dashboard overview page. Construct the URL from it.
- SUPABASE_SERVICE_ROLE_KEY: the key prefixed sb_secret_... in Supabase dashboard.
  Do NOT use the sb_publishable_... key server-side.

No JWT secret is required. ECC key verification is handled internally by the admin client.

### Railway env vars

Add both vars to Railway via the Railway dashboard: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

### Vite client .env

Create `.env.local` (already gitignored by Vite defaults):

```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<sb_publishable_... key>
```

The sb_publishable_... key is the anon key -- safe to expose in browser code.
The sb_secret_... key must never appear in client code or .env.local.

### Vercel env vars

Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel (project Settings > Environment Variables).
These are baked into the Vite build at build time -- Vercel must trigger a redeploy after adding them.

---

## Step 3 -- server.js Additions

Make the following additions to server.js. Insert each block at the location described.
Do not remove any existing code.

### 3a. New imports (add after existing imports at top of file)

```js
import cookieParser        from 'cookie-parser'
import { createClient }    from '@supabase/supabase-js'
import { randomUUID }      from 'crypto'
```

### 3b. Supabase admin client (add after MONGO_URI / connectMongo block)

```js
// --- Supabase Admin Client ---
// Used server-side only for user creation. Service role key is required.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the client.

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

### 3c. MongoDB collection helpers (add after existing placesCol() function)

```js
/** Returns the users collection, or null if Mongo is unavailable. */
function usersCol() {
  return db ? db.collection('users') : null
}

/** Returns the anon_device_cookies collection, or null if Mongo is unavailable. */
function anonCookiesCol() {
  return db ? db.collection('anon_device_cookies') : null
}
```

### 3d. connectMongo -- add index creation (inside connectMongo(), after existing index lines)

```js
await db.collection('users').createIndex({ supabase_id: 1 }, { unique: true })
await db.collection('users').createIndex({ email: 1 }, { unique: true })
await db.collection('anon_device_cookies').createIndex({ token: 1 }, { unique: true })
await db.collection('anon_device_cookies').createIndex({ user_id: 1 })
```

### 3e. Middleware -- cookieParser and device cookie (add before existing app.use(express.static(...)))

```js
// --- Cookie parser ---
app.use(cookieParser())

// --- Device cookie middleware ---
// Runs on every request. Sets a long-lived device cookie if not present.
// Creates an anon_device_cookies record in Mongo.
// Does not block the request -- failure is silent (cookie features degrade gracefully).

const DEVICE_COOKIE_NAME = 'ukcp_device'
const DEVICE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000 // 1 year in ms

async function deviceCookieMiddleware(req, res, next) {
  try {
    let token = req.cookies[DEVICE_COOKIE_NAME]

    if (!token) {
      // New device -- generate token, set cookie, create Mongo record
      token = randomUUID()
      res.cookie(DEVICE_COOKIE_NAME, token, {
        httpOnly:  true,
        sameSite:  'lax',
        maxAge:    DEVICE_COOKIE_MAX_AGE,
        secure:    process.env.NODE_ENV === 'production',
      })

      const col = anonCookiesCol()
      if (col) {
        await col.insertOne({
          token,
          user_id:     null,
          created_at:  new Date(),
          last_seen:   new Date(),
          ip:          req.ip ?? null,
        })
      }
    } else {
      // Known device -- update last_seen (throttled: only if more than 1hr stale)
      const col = anonCookiesCol()
      if (col) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        await col.updateOne(
          { token, last_seen: { $lt: oneHourAgo } },
          { $set: { last_seen: new Date() } }
        )
      }
    }

    req.deviceToken = token
  } catch (err) {
    // Non-fatal -- log and continue
    console.error('[device-cookie]', err.message)
  }

  next()
}

app.use(deviceCookieMiddleware)
```

### 3f. Auth middleware -- requireAuth (add after deviceCookieMiddleware, before routes)

```js
// --- Auth middleware ---
// Validates the Supabase JWT via the admin client (handles ECC P-256 automatically).
// On valid token: looks up or creates the MongoDB users record, attaches to req.user.
// On invalid token: 401.

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.slice(7)

  // Validate token with Supabase -- one API call per protected request (acceptable for v1)
  const { data: { user: sbUser }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !sbUser) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const supabase_id = sbUser.id
  const col = usersCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })

  // Find existing MongoDB user record
  let user = await col.findOne({ supabase_id })

  if (!user) {
    // First authenticated request -- create the MongoDB profile record.
    // Supabase has confirmed the identity; we trust sbUser.
    const email = sbUser.email ?? null
    const now   = new Date()

    const doc = {
      supabase_id,
      email,
      display_name:            email ? email.split('@')[0] : 'citizen',
      username:                null,
      avatar_url:              null,
      bio:                     null,
      access_tier:             'seen',
      is_verified:             false,
      verification_method:     null,
      home_ward_gss:           null,
      home_constituency_gss:   null,
      default_post_visibility: 'anonymous',
      device_cookie_id:        null,
      is_active:               true,
      is_suspended:            false,
      created_at:              now,
      updated_at:              now,
    }

    const result = await col.insertOne(doc)
    user = { ...doc, _id: result.insertedId }

    // Link the device cookie to this new user record
    const cookieCol = anonCookiesCol()
    if (cookieCol && req.deviceToken) {
      await cookieCol.updateOne(
        { token: req.deviceToken, user_id: null },
        { $set: { user_id: result.insertedId } }
      )
      await col.updateOne(
        { _id: result.insertedId },
        { $set: { device_cookie_id: req.deviceToken } }
      )
    }
  }

  req.user = user
  next()
}
```

### 3g. Profile routes (add in the API routes section, before the catch-all route)

```js
// --- Profile routes ---

// GET /api/profile -- returns the authenticated user's profile
app.get('/api/profile', requireAuth, (req, res) => {
  const { _id, email, display_name, username, bio, access_tier,
          is_verified, home_ward_gss, home_constituency_gss,
          default_post_visibility, created_at } = req.user

  res.json({
    id: _id,
    email,
    display_name,
    username,
    bio,
    access_tier,
    is_verified,
    home_ward_gss,
    home_constituency_gss,
    default_post_visibility,
    created_at,
  })
})

// PATCH /api/profile -- update editable profile fields
// Accepts: display_name, username, bio, default_post_visibility,
//          home_ward_gss, home_constituency_gss
app.patch('/api/profile', requireAuth, async (req, res) => {
  const allowed = [
    'display_name', 'username', 'bio',
    'default_post_visibility', 'home_ward_gss', 'home_constituency_gss',
  ]

  const update = {}
  for (const field of allowed) {
    if (req.body[field] !== undefined) update[field] = req.body[field]
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' })
  }

  // Validate default_post_visibility if provided
  if (update.default_post_visibility &&
      !['anonymous', 'named'].includes(update.default_post_visibility)) {
    return res.status(400).json({ error: 'default_post_visibility must be anonymous or named' })
  }

  update.updated_at = new Date()

  const col = usersCol()
  await col.updateOne({ _id: req.user._id }, { $set: update })

  res.json({ ok: true })
})
```

---

## Step 4 -- Client: Supabase module

Create file: `src/lib/supabase.js`

```js
/**
 * @file supabase.js
 * @description Supabase client for client-side auth operations.
 * Uses the anon key -- safe to expose in browser code.
 */

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## Step 5 -- Client: AuthContext

Create file: `src/context/AuthContext.jsx`

```jsx
/**
 * @file AuthContext.jsx
 * @description Authentication context. Wraps the app and provides useAuth().
 *
 * Listens to Supabase auth state changes. On sign-in, calls GET /api/profile
 * to retrieve (or trigger creation of) the MongoDB user record.
 *
 * Exposes: { session, user, profile, loading, signOut }
 * - session: raw Supabase session (has access_token)
 * - user:    raw Supabase user object
 * - profile: MongoDB profile record (display_name, tier, home location etc.)
 * - loading: true while initial auth state is being resolved
 * - signOut: function
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(accessToken) {
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      }
    } catch (err) {
      console.error('[auth] profile fetch failed:', err.message)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.access_token) fetchProfile(session.access_token)
      setLoading(false)
    })

    // Listen for sign-in / sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.access_token) {
          fetchProfile(session.access_token)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
```

---

## Step 6 -- Client: Wrap App with AuthProvider

In `src/main.jsx`, import AuthProvider and wrap App:

```jsx
import { AuthProvider } from './context/AuthContext.jsx'

// Inside the render call, wrap App:
<MantineProvider theme={theme} defaultColorScheme="light">
  <AuthProvider>
    <App />
  </AuthProvider>
</MantineProvider>
```

---

## Step 7 -- Client: Register page

Create file: `src/pages/Register.jsx`

```jsx
/**
 * @file Register.jsx
 * @description Citizen registration form. Calls Supabase directly.
 * On success, Supabase sends a confirmation email. User must confirm before logging in.
 */

import { useState } from 'react'
import { TextInput, PasswordInput, Button, Text, Stack, Title, Alert } from '@mantine/core'
import { supabase } from '../lib/supabase.js'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState(null)
  const [busy,     setBusy]     = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const { error } = await supabase.auth.signUp({ email, password })

    setBusy(false)

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <Stack p="xl" maw={400} mx="auto" mt="xl">
        <Title order={3}>Check your email</Title>
        <Text>We have sent a confirmation link to {email}. Click it to activate your account.</Text>
        <Button variant="subtle" onClick={() => navigate('/login')}>Go to login</Button>
      </Stack>
    )
  }

  return (
    <Stack p="xl" maw={400} mx="auto" mt="xl" component="form" onSubmit={handleSubmit}>
      <Title order={2}>Create account</Title>
      {error && <Alert color="red">{error}</Alert>}
      <TextInput
        label="Email"
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <PasswordInput
        label="Password"
        required
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <Button type="submit" loading={busy}>Register</Button>
      <Text size="sm">
        Already have an account? <a href="/login">Sign in</a>
      </Text>
    </Stack>
  )
}
```

---

## Step 8 -- Client: Login page

Create file: `src/pages/Login.jsx`

```jsx
/**
 * @file Login.jsx
 * @description Citizen login form. Calls Supabase directly.
 * On success, AuthContext detects the session change and fetches/creates the
 * MongoDB profile record via GET /api/profile.
 */

import { useState } from 'react'
import { TextInput, PasswordInput, Button, Text, Stack, Title, Alert } from '@mantine/core'
import { supabase } from '../lib/supabase.js'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [busy,     setBusy]     = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setBusy(false)

    if (error) {
      setError(error.message)
    } else {
      navigate('/profile')
    }
  }

  return (
    <Stack p="xl" maw={400} mx="auto" mt="xl" component="form" onSubmit={handleSubmit}>
      <Title order={2}>Sign in</Title>
      {error && <Alert color="red">{error}</Alert>}
      <TextInput
        label="Email"
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <PasswordInput
        label="Password"
        required
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <Button type="submit" loading={busy}>Sign in</Button>
      <Text size="sm">
        No account? <a href="/register">Create one</a>
      </Text>
    </Stack>
  )
}
```

---

## Step 9 -- Client: Profile page (replace stub)

Replace `src/pages/Profile.jsx` (currently a stub):

```jsx
/**
 * @file Profile.jsx
 * @description Citizen profile page. Editable fields:
 *   display_name, default_post_visibility, home_ward_gss, home_constituency_gss.
 *
 * Reads from AuthContext (profile loaded at sign-in).
 * Writes via PATCH /api/profile.
 */

import { useState, useEffect } from 'react'
import {
  TextInput, Select, Button, Stack, Title, Text,
  Alert, Badge, Group, Divider,
} from '@mantine/core'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const VISIBILITY_OPTIONS = [
  { value: 'anonymous', label: 'Anonymous (platform knows who I am, others do not)' },
  { value: 'named',     label: 'Named (my display name is shown on posts)' },
]

export default function Profile() {
  const { session, profile, loading, signOut } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName]   = useState('')
  const [visibility,  setVisibility]    = useState('anonymous')
  const [homeWard,    setHomeWard]       = useState('')
  const [homeCon,     setHomeCon]        = useState('')
  const [saving, setSaving]             = useState(false)
  const [saved,  setSaved]              = useState(false)
  const [error,  setError]              = useState(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !session) navigate('/login')
  }, [loading, session])

  // Populate form from profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setVisibility(profile.default_post_visibility ?? 'anonymous')
      setHomeWard(profile.home_ward_gss ?? '')
      setHomeCon(profile.home_constituency_gss ?? '')
    }
  }, [profile])

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setSaving(true)

    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method:  'PATCH',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          display_name:            displayName,
          default_post_visibility: visibility,
          home_ward_gss:           homeWard || null,
          home_constituency_gss:   homeCon  || null,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Save failed')
      } else {
        setSaved(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !profile) return <Text p="xl">Loading...</Text>

  return (
    <Stack p="xl" maw={520} mx="auto" mt="xl">
      <Group justify="space-between">
        <Title order={2}>Your profile</Title>
        <Badge color={profile.access_tier === 'trusted' ? 'green' : profile.access_tier === 'known' ? 'blue' : 'gray'}>
          {profile.access_tier}
        </Badge>
      </Group>

      <Text size="sm" c="dimmed">{profile.email}</Text>

      <Divider my="sm" />

      {error  && <Alert color="red">{error}</Alert>}
      {saved  && <Alert color="green">Saved.</Alert>}

      <Stack component="form" onSubmit={handleSave} gap="md">
        <TextInput
          label="Display name"
          description="Shown when you post as named. Not shown when posting anonymously."
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
        />

        <Select
          label="Default posting mode"
          description="Your default when posting. You can change it per post."
          data={VISIBILITY_OPTIONS}
          value={visibility}
          onChange={setVisibility}
        />

        <TextInput
          label="Home ward (GSS code)"
          description="e.g. E05001234. Optional. Used to personalise your Home view."
          value={homeWard}
          onChange={e => setHomeWard(e.target.value)}
        />

        <TextInput
          label="Home constituency (GSS code)"
          description="e.g. E14001234. Optional."
          value={homeCon}
          onChange={e => setHomeCon(e.target.value)}
        />

        <Group>
          <Button type="submit" loading={saving}>Save changes</Button>
          <Button variant="subtle" color="red" onClick={signOut}>Sign out</Button>
        </Group>
      </Stack>
    </Stack>
  )
}
```

---

## Step 10 -- Wire new routes in app.jsx

Add imports and routes for Login and Register:

```jsx
import Login    from './pages/Login.jsx'
import Register from './pages/Register.jsx'
```

Add routes inside `<Routes>`:

```jsx
<Route path="/login"    element={<Login />}    />
<Route path="/register" element={<Register />} />
```

---

## Step 11 -- Supabase project setup (one-time, Phil to confirm or do)

Before Dex runs the smoke tests, the Supabase project needs:

1. Email auth enabled: Supabase Dashboard > Authentication > Providers > Email -- enable.
2. Email confirmation on (default). Users must confirm before logging in.
3. Site URL set to http://localhost:5173 (dev) and https://ukcp.vercel.app (prod).
   Supabase Dashboard > Authentication > URL Configuration > Site URL.
4. Redirect URLs: add both localhost and Vercel URL.

Phil holds the Supabase credentials. If the project does not yet exist, create one at supabase.com,
copy the URL, anon key, service role key, and JWT secret into .env as described in Step 2.

---

## Step 12 -- Smoke Tests

After completing Steps 1-10 and setting env vars, run the following in order:

### 12a. Server start

```bash
node server.js
```

Expected log output includes:
- `MongoDB connected`
- No errors about missing env vars (if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing,
  requireAuth will return 401 or 503 on first use)

### 12b. Device cookie test

```bash
curl -v http://localhost:3000/api/profile
```

Expected:
- 401 Unauthorized (no auth token)
- Response headers include `Set-Cookie: ukcp_device=<uuid>; ...`
- MongoDB anon_device_cookies has one record

### 12c. Registration (browser)

1. Navigate to http://localhost:5173/register
2. Submit a valid email and password
3. Expect "Check your email" screen
4. Check email -- click confirmation link
5. Navigate to http://localhost:5173/login
6. Sign in with same credentials
7. Expect redirect to /profile

### 12d. Profile load

After sign-in:
- Profile page loads with display_name, access_tier badge, email
- MongoDB users collection has one record with supabase_id set

### 12e. Profile save

- Edit display name on profile page
- Click Save
- Expect "Saved." alert
- MongoDB users record updated_at has changed

### 12f. Device cookie linkage

In MongoDB shell or Atlas UI:
```js
db.anon_device_cookies.find({})
```
The record created before login should now have user_id set to the users._id.

---

## Notes and Constraints

- The `access_tier` field is set to `seen` on record creation. Promotion to `known` or `trusted`
  is not in this sprint -- it requires a separate verification flow (OQ-U2, deferred).

- `is_verified` starts false. Supabase confirms the email -- that is auth-layer verification.
  UKCP's `is_verified` flag is for a separate civic identity verification step, not defined yet.

- Home location fields accept raw GSS codes in v1. A picker wired to the UKCP geo data
  is a UI nicety for a later sprint -- for now, text input is sufficient.

- Do not add any role enforcement in this sprint. req.user is available on protected routes
  but role checking is Sprint B+ scope.

- The `cookie-parser` middleware must run before `deviceCookieMiddleware`. The order in
  server.js matters -- cookie-parser first, then deviceCookieMiddleware, then express.static.
