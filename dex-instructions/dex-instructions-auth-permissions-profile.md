# Dex Instruction File -- Auth, Permissions and Profile
# Phase 2 -- Produced 1 May 2026
# Read design notes first:
#   UKCP/Ali/auth-permission-design-note.md
#   UKCP/Ali/profile-design-note.md

---

## Overview

Four sections in order. Stop after each and confirm before proceeding.

1. Roles into Supabase app_metadata + server middleware tiers
2. AuthContext claims + useAuth() extension
3. Profile page (GET /api/profile, PATCH /api/profile/preferences, Profile.jsx)
4. Login redirect fix

Prerequisite: Phase 1 Bug 1 + Bug 2 fixes confirmed complete before starting here.

---

## SECTION 1 -- Roles into Supabase app_metadata + middleware tiers

### 1a. app_metadata shape

Platform roles live in Supabase app_metadata (server-controlled, not user-editable).
JWT carries app_metadata automatically -- no custom hook needed.

Shape:
```json
{
  "platform_role": "citizen",
  "affiliated_roles": [],
  "display_name": "",
  "registration_complete": false
}
```

platform_role values: 'citizen' | 'affiliated' | 'admin'
affiliated_roles: array of strings e.g. ['content_manager', 'proctor']

### 1b. Server endpoint to set app_metadata

Add to routes/admin.js:

PUT /api/admin/users/:supabaseId/claims
- Auth: Tier 2 (verifyJwt + requireRole('admin'))
- Body: { platform_role, affiliated_roles, display_name, registration_complete }
- Action: call Supabase Admin API to update app_metadata
  ```js
  await supabaseAdmin.auth.admin.updateUserById(supabaseId, {
    app_metadata: { platform_role, affiliated_roles, display_name, registration_complete }
  });
  ```
- Also update users collection in Mongo to keep in sync:
  PATCH users where supabase_id = supabaseId, set same fields
- Return: { ok: true }

supabaseAdmin client: import from existing supabase.js or create with
SUPABASE_SERVICE_ROLE_KEY env var (already set in Railway).

### 1c. Middleware -- extend middleware/auth.js

Current verifyJwt reads Bearer token and attaches req.user. Extend it:

After verifying token, decode payload and attach claims:
```js
req.claims = {
  platform_role: payload.app_metadata?.platform_role || 'citizen',
  affiliated_roles: payload.app_metadata?.affiliated_roles || [],
  display_name: payload.app_metadata?.display_name || '',
  registration_complete: payload.app_metadata?.registration_complete || false
}
```

Add requireRole middleware:
```js
export const requireRole = (role) => (req, res, next) => {
  if (!req.claims || req.claims.platform_role !== role) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
```

### 1d. Apply middleware tiers to all routes

Audit every route in server.js and all routes/ files. Apply the correct tier:

Tier 0 (public -- no change needed):
- GET /api/content/:type/:slug
- GET /api/places/search
- GET /api/schools
- GET /api/forums (read)
- GET /api/posts (read)

Tier 1 (verifyJwt -- authenticated):
- POST /api/follows
- DELETE /api/follows/:type/:id
- GET /api/follows
- GET/PATCH /api/session/snapshot
- POST /api/posts
- PATCH /api/posts/:id/react
- POST /api/posts/:id/flag
- DELETE /api/posts/:id (also check author ownership)
- POST /api/forums/:id/join
- GET /api/profile
- PATCH /api/profile/preferences

Tier 2 (verifyJwt + requireRole('admin')):
- GET /api/admin/users
- PATCH /api/admin/users/:id
- DELETE /api/admin/users/:id/auth
- PUT /api/admin/users/:id/claims
- PATCH /api/admin/geo-content/:key
- PATCH /api/admin/places/:id

Tier 3 (verifyJwt + scope check -- DB lookup):
- Not implemented this sprint. Note any routes that will need it (committee
  forum posts requiring constituency membership) but leave as Tier 1 for now.

### 1e. Seed Phil's account as admin

After deploying, run once in Railway shell or via admin endpoint:
Set Phil's Supabase user app_metadata: platform_role = 'admin'.
Use the new PUT /api/admin/users/:id/claims endpoint or directly via Supabase dashboard.

### 1f. UserManager.jsx -- wire role assignment

Add a "Roles" section to the user editor in UserManager.jsx:
- platform_role select (citizen / affiliated / admin)
- affiliated_roles checkboxes (content_manager, proctor -- extend as roles grow)
- Save button calls PUT /api/admin/users/:supabaseId/claims

---

## SECTION 2 -- AuthContext claims + useAuth() extension

### 2a. src/context/AuthContext.jsx -- extend

On session load (onAuthStateChange SIGNED_IN or INITIAL_SESSION):
Decode the JWT to extract app_metadata claims.

```js
const claims = session?.user?.app_metadata || {
  platform_role: 'citizen',
  affiliated_roles: [],
  display_name: '',
  registration_complete: false
};
```

Store claims in AuthContext state alongside user and session.

### 2b. useAuth() hook -- extend return

Add claims to the return object:
```js
return { user, session, claims, profile, loading };
```

claims shape matches app_metadata above.

### 2c. Fetch profile on login

On SIGNED_IN, after auth state resolves, fetch GET /api/profile and store
result in AuthContext as `profile`. This gives all components access to the
full user record (display_name, preferences, confirmed_location etc.)
without each needing its own fetch.

```js
const profileRes = await fetch(`${API}/api/profile`, {
  headers: { Authorization: `Bearer ${session.access_token}` }
});
if (profileRes.ok) setProfile(await profileRes.json());
```

---

## SECTION 3 -- Profile page

### 3a. GET /api/profile -- add to routes/profile.js (already exists, extend)

Auth: Tier 1 (verifyJwt)

Assemble from three sources:
```js
const user = await usersCol().findOne({ supabase_id: req.user.id });
const follows = await followsCol().find({ user_id: req.user._id.toString() }).toArray();
const recentPosts = await postsCol()
  .find({ 'author.user_id': req.user.id, status: 'active' })
  .sort({ created_at: -1 })
  .limit(5)
  .toArray();
const anonPostCount = await postsCol().countDocuments({
  'author.user_id': req.user.id,
  'author.is_anonymous': true,
  status: 'active'
});
```

Note: postsCol() does not exist yet (posts collection is Phase 3). For now,
return empty arrays for posts fields -- stub them so profile renders cleanly.

Return:
```js
{
  user,          // full user record minus sensitive fields
  follows,       // array of user_follows docs
  recent_posts,  // array (empty until Phase 3)
  anon_post_count, // 0 until Phase 3
  claims: req.claims
}
```

### 3b. PATCH /api/profile/preferences

Auth: Tier 1

Body: any subset of preferences fields:
```
{ default_load_page, default_tab, default_posting_mode }
```

Action: usersCol().updateOne(
  { supabase_id: req.user.id },
  { $set: { 'preferences.default_load_page': body.default_load_page, ... } }
)

Only update fields present in body. Return: { ok: true }

### 3c. Profile.jsx -- src/pages/Profile.jsx

Replace existing stub. Structure:

```jsx
// On mount: fetch GET /api/profile (or read from AuthContext profile if fresh)
// Five panels rendered in order:

// 1. Identity panel
// display_name (inline editable -- PATCH /api/profile/preferences on blur? or separate endpoint)
// email (read-only from user.email)
// member since (user.created_at)
// platform_role badge (from claims.platform_role)
// affiliated_roles list if any

// 2. Civic footprint
// Followed schools (follows filtered by entity_type=school)
// Joined groups (entity_type=group)
// Committee forums (entity_type=committee or network_chapter)
// Confirmed location (user.confirmed_location ward/constituency if set)
// Each item: name + link back to context (Locations page with scope set)

// 3. Contributions
// post_count (0 until Phase 3)
// recent_posts list (empty until Phase 3 -- show "No posts yet" placeholder)
// anon_post_count shown as number only

// 4. Roles
// platform_role label
// affiliated_roles list
// (scoped civic roles deferred -- needs Tier 3 middleware)

// 5. Preferences
// default_load_page select: Locations | My Home
// default_tab select: Map | Groups | News | Civic
// default_posting_mode select: Named | Anonymous
// Save button: PATCH /api/profile/preferences
// On save success: update preferences in AuthContext profile
```

Add /profile route to App.jsx if not already present.
Gate: if no session, store intended path in sessionStorage and redirect to /login.

```js
// In Profile.jsx useEffect on mount:
if (!user) {
  sessionStorage.setItem('ukcp_login_redirect', '/profile');
  navigate('/login');
}
```

### 3d. Preferences feed into app behaviour

In Locations.jsx, after session snapshot restore (useSessionSnapshot onRestore):
If no snapshot exists but profile.preferences does, apply preferences as defaults:

```js
if (!snapRestored && profile?.preferences) {
  if (profile.preferences.default_tab) setMidTab(profile.preferences.default_tab);
}
```

In App.jsx, after auth resolves:
If profile.preferences.default_load_page === 'myhome', navigate to /myhome.
(MyHome is a stub -- this wiring just needs to not crash.)

---

## SECTION 4 -- Login redirect fix

### 4a. Store intended destination before routing to /login

In SiteHeaderRow1.jsx, profile icon click handler:
```js
if (!user) {
  sessionStorage.setItem('ukcp_login_redirect', '/profile');
  navigate('/login');
} else {
  navigate('/profile');
}
```

In Profile.jsx mount guard (above): same pattern.

Any other component that routes to /login should follow the same pattern.

### 4b. Restore destination after login

This now lives in AuthContext (Bug 1 fix from Phase 1 -- mergeAnonData already moved here).
Extend the SIGNED_IN handler in AuthContext:

```js
// After merge completes:
const returnTo = sessionStorage.getItem('ukcp_login_redirect') || '/profile';
sessionStorage.removeItem('ukcp_login_redirect');
navigate(returnTo);
```

Remove any navigate('/locations') calls from Home.jsx SIGNED_IN handler --
AuthContext now owns post-login routing.

---

## Deploy

Standard flow: npm run build -> git add . -> git commit -> git push
Vercel and Railway auto-deploy.

After deploy: seed Phil's admin claim via Supabase dashboard or PUT endpoint.

---

## Stop points

Stop after Section 1 -- confirm middleware tiers applied, admin claim set, UserManager role editor working.
Stop after Section 2 -- confirm claims in useAuth(), profile loaded into AuthContext on login.
Stop after Section 3 -- confirm profile page renders all five panels, preferences save and apply.
Stop after Section 4 -- confirm login redirect round-trip works from profile icon and from direct /profile access.

---

## Test extension

Extend tests/sprint-32.spec.js or create tests/sprint-33.spec.js covering:
- Unauthenticated /profile redirects to /login with return path stored
- Post-login lands on /profile not /locations
- Preferences save and survive reload
- Admin-only route returns 403 for citizen user
