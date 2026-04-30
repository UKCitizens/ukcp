# DEX INSTRUCTIONS -- SPRINT B+C: GROUPS + POSTS POC
Date: 30 Apr 2026
Author: Ali
Status: Ready to execute

Read this file in full before starting. Execute sections in order.
Do not proceed to a later section if an earlier section fails.

---

## CONTEXT

This sprint builds the combined Groups + Posts POC. Groups (associations
and spaces) and Posts are entangled from the start -- a post always needs
a location context and optionally a collective context. They are built
together, not sequentially.

Reference documents (read before starting):
  UKCP/Ali/ukcp-entity-manifests-v0.2.txt -- all schemas for this sprint
  UKCP/Ali/ukcp-entity-manifests-v0.1.txt -- User and Role schemas

Architecture decisions already taken (do not revisit):
  - Three separate collections: committees, associations, spaces
  - committee_forums is a child entity of committees (not in POC scope)
  - Association category/sub_type are plain strings, not foreign key refs
  - Post uses location_scope + collective_ref, not relevant_to
  - "Collective" is internal term only. UI labels: Groups, Local Spaces

POC scope (minimum to deliver -- no more, no less):
  1. User sees groups (associations + spaces) at current location scope
  2. User joins one (open membership -- immediate active status)
  3. User posts into it (anonymous/named choice)
  4. Server enforces login on join and post
  5. Groups tab renders the list and join UI
  6. Posts tab renders the post form and feed

Out of scope for POC:
  - Committees and committee_forums (separate sprint)
  - Closed/invite_only membership (approval flow)
  - Post moderation
  - member_news post_type
  - Group creation UI (seed data only for POC)
  - Feed ranking or sorting beyond newest-first

---

## SECTION 1 -- MONGODB: NEW COLLECTIONS AND INDEXES

Run via scripts/seed-sprint-bc.js (create this script -- see below).

### 1.1 Create collections and indexes

associations collection:
  createIndex({ slug: 1 }, { unique: true })
  createIndex({ "location_scope.type": 1, "location_scope.slug": 1 })
  createIndex({ category: 1 })
  createIndex({ national: 1 })

spaces collection:
  createIndex({ slug: 1 }, { unique: true })
  createIndex({ "location_scope.type": 1, "location_scope.slug": 1 })

group_memberships collection:
  createIndex({ collection_type: 1, collective_id: 1, user_id: 1 }, { unique: true })
  createIndex({ user_id: 1 })
  createIndex({ collective_id: 1 })

posts collection:
  createIndex({ "location_scope.type": 1, "location_scope.slug": 1 })
  createIndex({ collective_ref_id: 1 }, { sparse: true })
  createIndex({ status: 1 })
  createIndex({ created_at: -1 })

Note: if posts collection already exists (it does not yet), add the
new indexes without dropping the collection.

### 1.2 Seed associations with POC test data

Insert a small set of seed associations covering varied categories and
location scopes. Sufficient to demonstrate the UI at ward, constituency,
and county level. Use the structure below exactly.

Seed records (5 minimum, spread across location types):

  {
    name: "Mossley Hill Cyclists",
    slug: "mossley-hill-cyclists",
    description: "Road and leisure cycling group for Mossley Hill ward",
    founder_user_ref: null,
    membership_model: "open",
    status: "active",
    location_scope: { type: "ward", slug: "Mossley_Hill" },
    category: "Sports and Leisure",
    sub_type: "Cycling",
    national: false,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "Liverpool Environment Network",
    slug: "liverpool-environment-network",
    description: "Environmental action and conservation across Liverpool",
    founder_user_ref: null,
    membership_model: "open",
    status: "active",
    location_scope: { type: "county", slug: "Merseyside" },
    category: "Environment and Green",
    sub_type: "Conservation",
    national: false,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "UK Premier League Supporters",
    slug: "uk-premier-league-supporters",
    description: "National group for Premier League football supporters",
    founder_user_ref: null,
    membership_model: "open",
    status: "active",
    location_scope: null,
    category: "Sports and Leisure",
    sub_type: "Football",
    national: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "Riverside Residents",
    slug: "riverside-residents",
    description: "Residents group for the Riverside constituency",
    founder_user_ref: null,
    membership_model: "open",
    status: "active",
    location_scope: { type: "constituency", slug: "Liverpool_Riverside" },
    category: "Community and Neighbourhood",
    sub_type: "Residents Association",
    national: false,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "Greater London Arts Collective",
    slug: "greater-london-arts",
    description: "Arts and culture network across Greater London",
    founder_user_ref: null,
    membership_model: "open",
    status: "active",
    location_scope: { type: "county", slug: "Greater_London" },
    category: "Arts and Culture",
    sub_type: "Visual Arts",
    national: false,
    created_at: new Date(),
    updated_at: new Date()
  }

### 1.3 Seed spaces with POC test data

  {
    name: "Mossley Hill Local",
    slug: "mossley-hill-local",
    description: "General discussion space for Mossley Hill ward",
    founder_user_ref: null,
    membership_model: "open",
    status: "active",
    location_scope: { type: "ward", slug: "Mossley_Hill" },
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "Riverside Constituency Notice Board",
    slug: "riverside-notice-board",
    description: "Open discussion for Liverpool Riverside constituency",
    founder_user_ref: null,
    membership_model: "open",
    status: "active",
    location_scope: { type: "constituency", slug: "Liverpool_Riverside" },
    created_at: new Date(),
    updated_at: new Date()
  }

---

## SECTION 2 -- SERVER ROUTES

All new routes go in routes/groups.js and routes/posts.js.
Wire both into server.js: app.use('/api/groups', groupsRouter) and
app.use('/api/posts', postsRouter).

### 2.1 routes/groups.js

--- GET /api/groups ---
Query groups (associations + spaces) at a given location scope.
Returns both collections merged, newest first.

Query params:
  type    -- location type (ward | constituency | county | region | country)
  slug    -- location slug
  kind    -- optional filter: "associations" | "spaces" | omit for both

Logic:
  Build a location_scope query: { "location_scope.type": type,
                                   "location_scope.slug": slug }
  Query associations collection with this filter (unless kind = "spaces")
  Query spaces collection with this filter (unless kind = "associations")
  For each result, add a "kind" field: "association" or "space"
  Merge arrays, sort by created_at descending
  For each item, if the request carries a valid Supabase session, look up
  the user's GroupMembership record and add is_member: true/false to the
  response item.
  Return merged array.

No auth required to read. Auth only affects is_member field on response.

--- POST /api/groups/:kind/:id/join ---
Join a group. Auth required.

Params:
  kind  -- "associations" | "spaces"
  id    -- _id of the target record

Auth: extract Supabase JWT from Authorization header. Reject 401 if absent.
Resolve user_id from token.

Logic:
  Confirm the target record exists in the correct collection.
  Check for existing GroupMembership (collection_type + collective_id +
  user_id). If active record exists, return 200 (idempotent -- already a
  member).
  Insert GroupMembership:
    { collection_type: kind, collective_id: ObjectId(id),
      user_id: ObjectId(user_id), membership_role: "member",
      status: "active", joined_at: new Date() }
  Increment member_count on the parent record (associations or spaces).
  Return 201.

Only open membership_model is supported in POC. If target record has
membership_model != "open", return 403 with message "Closed membership
not yet supported."

--- GET /api/groups/:kind/:id/members ---
List members of a group. Auth required (members only -- check
GroupMembership before returning). POC stub -- return count and first 20
members only.

### 2.2 routes/posts.js

--- GET /api/posts ---
Fetch posts for a given location scope. Optional collective filter.

Query params:
  location_type   -- geo node type
  location_slug   -- geo node slug
  collective_id   -- optional. filter to posts in a specific collective
  collective_col  -- required if collective_id present: "associations" |
                     "spaces" | "committee_forums"
  limit           -- default 20, max 50
  offset          -- default 0

Logic:
  Base query: { "location_scope.type": location_type,
                "location_scope.slug": location_slug,
                status: "published" }
  If collective_id present, add:
    { "collective_ref.collection": collective_col,
      "collective_ref.id": ObjectId(collective_id) }
  Sort created_at descending. Apply limit/offset.
  Return array. For each post include author display_name if available
  (lookup users collection by author_user_id -- project display_name only).
  Anonymous posts: author field = "Anonymous".

No auth required to read.

--- POST /api/posts ---
Create a post. Auth required (Supabase JWT).

Body:
  {
    post_type: "standard",
    body: String (required, max 2000 chars),
    title: String (optional),
    is_anonymous: Boolean,
    location_scope: { type, slug },
    collective_ref: { collection, id } (optional)
  }

Auth: reject 401 if no valid JWT.

Logic:
  Validate body present and within length.
  Validate location_scope present.
  If collective_ref present: confirm the referenced record exists in the
  correct collection. If not found, return 400.
  If collective_ref present and is_anonymous = false: confirm the user
  has an active GroupMembership for that collective. If not, return 403
  with message "Join the group to post here."
  Build post record:
    author_user_id: is_anonymous ? null : user_id from JWT
    anon_token: is_anonymous ? generate uuid : null
    is_anonymous: Boolean from body
    status: "published"
    published_at: new Date()
    created_at/updated_at: new Date()
    All other fields from body.
  Insert to posts collection.
  Return 201 with inserted post _id and anon_token (if applicable).

---

## SECTION 3 -- CLIENT: NEW COMPONENTS AND WIRING

### 3.1 GroupsTab.jsx (new file: src/components/Groups/GroupsTab.jsx)

Rendered by the Groups tab in MidPaneTabs when the Groups tab is active.
Receives: locationType, locationSlug (current location context from
Locations.jsx).

Behaviour:
  On mount (or when location changes): fetch GET /api/groups with current
  location_type and location_slug. Show loading state.

  Render two sections: "Groups" (associations) and "Local Spaces" (spaces).
  If kind filter is "both" (default), split results by kind field.

  Each item renders:
    - Name (bold)
    - Description (truncated to 2 lines)
    - Category / sub_type badge (associations only)
    - Member count
    - Join button (if is_member = false and user is logged in)
    - "Joined" badge (if is_member = true)
    - "Log in to join" link (if user is not logged in)

  Join button click: POST /api/groups/:kind/:id/join with JWT.
  On success: update is_member to true in local state (no full refetch).

  If no results for current location: show "No groups at this location yet."

### 3.2 PostsTab.jsx (new file: src/components/Posts/PostsTab.jsx)

Rendered by the Posts tab in MidPaneTabs.
Receives: locationType, locationSlug, collectiveRef (optional -- passed
when user is viewing a group and clicks through to its posts).

Behaviour:
  Feed section: fetch GET /api/posts with current location context.
  Render posts newest first. Each post shows:
    - Author (display_name or "Anonymous")
    - Body text
    - Location scope label
    - Group name if collective_ref present (lookup from loaded groups)
    - Timestamp (relative: "2 hours ago")

  Post form section (above feed):
    - Body textarea (required)
    - Anonymous toggle (checkbox: "Post anonymously")
    - If user is a member of groups at this location: group selector
      dropdown (optional -- post to a group or just to the location)
    - Submit button
    - If not logged in: replace form with "Log in to post" prompt

  On submit: POST /api/posts. On success: prepend new post to feed
  without full refetch.

### 3.3 Wire GroupsTab and PostsTab into MidPaneTabs

MidPaneTabs already has stub components for Groups and Posts tabs
(TabStubs.jsx from PRG:81). Replace the stubs:

  In MidPaneTabs.jsx: import GroupsTab and PostsTab.
  Pass locationType and locationSlug as props (derive from current
  path/selection in Locations.jsx, same pattern as other tab components).
  Pass collectiveRef (null by default) to PostsTab.

### 3.4 Locations.jsx -- prop pass

Ensure locationType and locationSlug are derived and passed down to
MidPaneTabs for the new tabs. These should already be available from
the existing path/selection state -- confirm and wire if not.

---

## SECTION 4 -- AUTH INTEGRATION

The JWT pattern is already established (Supabase, Sprint A).
In routes/groups.js and routes/posts.js: reuse the existing auth
middleware from middleware/auth.js. Do not duplicate JWT verification
logic.

For the client: the Supabase session is available via useAuth() hook
(already exists). Pass the session token in Authorization header for
join and post requests:
  headers: { Authorization: `Bearer ${session.access_token}` }

---

## SECTION 5 -- ACCEPTANCE CRITERIA

The POC is complete when all of the following are true in the live
environment (www.ukcportal.co.uk):

  [ ] Groups tab shows associations and spaces for the current location
  [ ] Logged-in user can join an open group -- membership persists on
      page reload
  [ ] Logged-out user sees "Log in to join" and cannot join
  [ ] Posts tab shows a feed of posts for the current location
  [ ] Logged-in user can submit a post (named or anonymous)
  [ ] Post appears in feed immediately after submission
  [ ] Post made within a group context shows the group name
  [ ] Logged-out user cannot submit a post (form replaced by prompt)
  [ ] Server returns 401 for join/post requests with no valid JWT
  [ ] Server returns 403 if non-member attempts to post in a group

---

## SECTION 6 -- COMMIT AND DEPLOY

On completion:
  git add .
  git commit -m "Sprint B+C POC: Groups and Posts -- associations, spaces, membership, post feed"
  git push

Railway will auto-deploy from push to master.
Verify Railway deploy log -- no errors.
Verify Vercel auto-deploy completes.
Confirm acceptance criteria on www.ukcportal.co.uk.

---

END OF INSTRUCTIONS
