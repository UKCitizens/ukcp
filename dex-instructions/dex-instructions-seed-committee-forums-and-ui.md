# DEX INSTRUCTIONS -- SPRINT N+1: COMMITTEE FORUMS + FORUM UI
Date: 30 Apr 2026
Author: Ali
Status: Ready to execute after dex-instructions-seed-constituency-committees.md is complete

Read this file in full before starting.
Do not proceed past a section if it fails.
Prerequisite: committees collection seeded (~632 records). Verify with
db.committees.countDocuments() before starting.

---

## CONTEXT

This sprint does two things:
  1. Seeds the committee_forums collection (one forum per committee)
     and back-fills committee_forum_ref on each committees record.
  2. Surfaces the forum in the UI via a CommitteeTab component wired
     into the existing MidPaneTabs tab system.

Reference schema: UKCP/Ali/ukcp-entity-manifests-v0.2.txt
Reference baseline: UKCP/Ali/forum-join-onboarding-baseline.md
Tab system: src/components/TabStubs.jsx (Committee stub to replace)

---

## SECTION 1 -- SEED COMMITTEE FORUMS

Create: scripts/seed-committee-forums.js

### 1.1 Logic

  Connect to MongoDB (MONGODB_URI env var, fallback localhost:27017).
  Load all documents from the committees collection.
  For each committee:
    Generate a forum document (schema below).
    Insert into committee_forums collection.
    On insert success: update the parent committee record --
      set committee_forum_ref = inserted forum _id.

  Use ordered inserts (one at a time, not bulk) so each committee gets
  its forum_ref set correctly.
  Print progress every 100 records.
  Print summary: total processed, inserted, failed.

### 1.2 Forum slug generation

  committee.slug + '-forum'
  Example: 'liverpool-riverside' -> 'liverpool-riverside-forum'

### 1.3 committee_forum document structure

  {
    committee_ref:     <committee._id>,
    name:              committee.name + ' Forum',
    slug:              <committee.slug + '-forum'>,
    status:            'active',
    membership_model:  'open',
    location_scope:    committee.location_scope,
    con_gss:           committee.con_gss,
    region:            committee.region,
    region_gss:        committee.region_gss,
    country:           committee.country,
    moderation_level:  null,
    member_count:      0,
    created_at:        new Date(),
    updated_at:        new Date()
  }

### 1.4 Indexes on committee_forums

Create before inserting:
  { slug: 1 }                                                  -- unique: true
  { committee_ref: 1 }                                         -- unique: true
  { 'location_scope.type': 1, 'location_scope.slug': 1 }
  { con_gss: 1 }

### 1.5 Run locally

  cd C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP
  node scripts/seed-committee-forums.js

Confirm:
  db.committee_forums.countDocuments()       -- should match committees count
  db.committees.findOne({ committee_forum_ref: { $ne: null } })  -- verify back-fill

### 1.6 Seed Atlas

  MONGODB_URI=<atlas-uri> node scripts/seed-committee-forums.js

Confirm Atlas count matches local.

---

## SECTION 2 -- SERVER: FORUMS ROUTE

Create: routes/forums.js
Wire into server.js: app.use('/api/forums', forumsRouter)

### GET /api/forums

Query committee_forums by location scope.

Query params:
  type   -- location type (must be 'constituency' for now)
  slug   -- location_scope.slug value

Logic:
  Query: { 'location_scope.type': type, 'location_scope.slug': slug }
  Find one matching forum.
  If not found: return 404.
  Join parent committee: load committees record via forum.committee_ref.
  Return combined object:
    {
      ...forum fields,
      committee: {
        name:         committee.name,
        con_gss:      committee.con_gss,
        jurisdiction: committee.jurisdiction,
        mp_name:      committee.mp_name,
        mp_party:     committee.mp_party
      }
    }

No auth required.

### GET /api/forums/:id

Return a single forum by _id. Same join as above. No auth required.
Returns 404 if not found.

No POST or join routes in this sprint. Those are in the next instruction file.

---

## SECTION 3 -- CLIENT: COMMITTEE TAB

Replace the Committee stub in TabStubs.jsx with a real component.

### 3.1 CommitteeTab.jsx (new file: src/components/Committee/CommitteeTab.jsx)

Receives props: locationType, locationSlug (from MidPaneTabs, same
pattern as GroupsTab and PostsTab).

Behaviour:

  If locationType !== 'constituency':
    Render: "Select a constituency to see its committee forum."
    No fetch.

  If locationType === 'constituency':
    On mount or locationSlug change: fetch GET /api/forums?type=constituency&slug={locationSlug}
    Show loading state while fetching.
    On 404: render "No committee forum found for this constituency."

  On success render:
    Forum name (heading)
    Description line (brief -- "The public forum for [constituency name] constituency")
    Member count ("X members")
    Join Forum button -- placeholder only in this sprint. onClick logs
    "join clicked" to console. Actual join flow is in the next sprint.
    Button disabled if user is already a member (is_member check --
    see Section 3.2).

    Below the forum info: post feed.
    Fetch GET /api/posts?location_type=constituency&location_slug={locationSlug}&collective_id={forum._id}&collective_col=committee_forums
    Render posts newest first using the same pattern as PostsTab.jsx.
    Show "No posts yet in this forum." if feed is empty.

    Do not render a post form in this sprint. Post form is in the next sprint.

### 3.2 is_member check

  GET /api/forums returns is_member: true/false if the request carries
  a valid Authorization header.
  In CommitteeTab: read session from useAuth(). If session exists, pass
  Authorization: Bearer {session.access_token} header with the forum fetch.
  Server-side: in GET /api/forums, if Authorization header present and
  valid, look up group_membership for (collection_type: 'committee_forums',
  collective_id: forum._id, user_id from JWT). Add is_member to response.

### 3.3 Wire into MidPaneTabs

In MidPaneTabs.jsx:
  Import CommitteeTab from '../Committee/CommitteeTab'.
  Replace the Committee TabStub with CommitteeTab.
  Pass locationType and locationSlug props (already available from
  Locations.jsx -- same pattern as GroupsTab).

In TabStubs.jsx:
  Remove the Committee stub export (or leave it -- it is unused once
  replaced).

---

## SECTION 4 -- COMMIT AND DEPLOY

  git add scripts/seed-committee-forums.js routes/forums.js \
          src/components/Committee/CommitteeTab.jsx \
          src/components/TabStubs.jsx \
          src/components/MidPaneTabs/MidPaneTabs.jsx \
          server.js
  git commit -m "Sprint N+1: committee_forums seeded, forums route, CommitteeTab UI"
  git push

Verify Railway deploy. Verify Vercel deploy.

---

## ACCEPTANCE CRITERIA

  [ ] committee_forums count matches committees count in both local and Atlas
  [ ] committees records have committee_forum_ref set (not null)
  [ ] GET /api/forums?type=constituency&slug=Liverpool,_Riverside returns forum JSON
  [ ] CommitteeTab renders at constituency scope with forum name and member count
  [ ] CommitteeTab renders "Select a constituency" message at non-constituency scope
  [ ] Post feed renders (empty is acceptable -- no posts exist yet)
  [ ] Join Forum button renders (disabled/placeholder)
  [ ] is_member: true suppresses Join button for logged-in members
  [ ] Deployed and confirmed live on www.ukcportal.co.uk

---

END OF INSTRUCTIONS
