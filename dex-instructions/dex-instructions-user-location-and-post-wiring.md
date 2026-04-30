# Dex Instruction File -- User Location Persistence + Post Composer Wiring
Date: 30 Apr 2026
Author: Ali
Reference: community-networks-state-matrix.md

Three targeted changes. No new collections. No new routes. All changes are
surgical edits to existing files.

Stop after each numbered stop and await Phil's go/stop.

Plain ASCII throughout. UTF-8 encoding on all file writes.

---

## STOP 1 -- Backend changes (2 files)

### 1a. routes/forums.js -- write confirmed location to user record on join

In the POST /api/forums/:id/join handler, locate step 7 (the insertOne for
GroupMembership). It currently reads something like:

```js
  await memCol.insertOne({
    collection_type: 'committee_forums',
    collective_id:   forumObjectId,
    user_id:         req.user._id,
    membership_role: 'member',
    status:          'active',
    joined_at:       new Date(),
    postcode:        resolved.postcode,
    con_gss:         resolved.con_gss,
    reason,
  })
```

Immediately after that insertOne (and before any response is sent), add:

```js
  // Persist confirmed location to user record.
  // Overwrites on re-join with updated data -- intentional.
  const usrColRef = usersCol()
  if (usrColRef) {
    await usrColRef.updateOne(
      { _id: req.user._id },
      {
        $set: {
          'confirmed_location.postcode':     resolved.postcode,
          'confirmed_location.ward':         resolved.ward,
          'confirmed_location.ward_gss':     resolved.ward_gss,
          'confirmed_location.constituency': resolved.constituency,
          'confirmed_location.con_gss':      resolved.con_gss,
          'confirmed_location.confirmed_at': new Date(),
        },
      }
    )
  }
```

Note: usersCol is already imported in routes/forums.js -- no import change needed.
resolved.ward and resolved.ward_gss are already returned by lookupPostcode()
in services/postcodes.js (fields: ward, ward_gss). resolved.constituency is
the parliamentary_constituency name from postcodes.io.

### 1b. routes/posts.js -- add committee_forums to collective_ref whitelist

In the POST /api/posts handler, locate the collective_ref validation block.
It currently ends with network_chapters added in the previous sprint:

```js
    const targetCol = collective_ref.collection === 'associations'
      ? associationsCol()
      : collective_ref.collection === 'spaces'
        ? spacesCol()
        : collective_ref.collection === 'network_chapters'
          ? networkChaptersCol()
          : null
```

Replace with:

```js
    const targetCol = collective_ref.collection === 'associations'
      ? associationsCol()
      : collective_ref.collection === 'spaces'
        ? spacesCol()
        : collective_ref.collection === 'network_chapters'
          ? networkChaptersCol()
          : collective_ref.collection === 'committee_forums'
            ? committeeForumsCol()
            : null
```

Add committeeForumsCol to the import at the top of routes/posts.js:

```js
import {
  postsCol,
  groupMembershipsCol,
  associationsCol,
  spacesCol,
  networkChaptersCol,
  committeeForumsCol,
  usersCol,
} from '../db/mongo.js'
```

The existing membership check (named posts require active membership) is
already collection-type agnostic -- it uses collective_ref.collection as the
discriminator -- so no change needed there.

### 1c. Verify backend locally

```
npm run build
node server.js
```

Test the forum join flow end-to-end:
  -- Join a forum via the UI (postcode gate)
  -- Check the user document in Mongo: confirm confirmed_location fields written
  -- Attempt a POST to /api/posts with collective_ref.collection = 'committee_forums'
     via curl or the UI -- confirm it no longer returns 400

---

## STOP 2 -- UI changes (2 files)

### 2a. src/components/Committee/CommitteeTab.jsx -- wire in PostsTab

CommitteeTab currently fetches posts in a chained fetch inside useEffect and
renders them via an inline PostCard. Replace this with PostsTab, which has
the full composer and handles its own data fetching.

CHANGES:

1. Add PostsTab import at the top (after existing imports):

```js
import PostsTab from '../Posts/PostsTab.jsx'
```

2. Remove the `posts` state declaration:
   Remove: `const [posts, setPosts] = useState([])`

3. In useEffect, remove the chained posts fetch entirely. The block to remove
   starts at:
   ```js
   // Fetch post feed for this forum
   const url = ...
   fetch(url)
     .then(...)
     .then(feed => { if (!cancelled) setPosts(feed) })
     .catch(() => { if (!cancelled) setPosts([]) })
   ```
   Delete all of it. PostsTab will handle its own fetch.

4. In the JSX return, locate the post feed section:
   ```jsx
   {/* Post feed */}
   <p style={sectionHead}>Forum Posts</p>
   {posts.length === 0
     ? <p style={dim}>No posts yet in this forum.</p>
     : posts.map(post => <PostCard key={post._id} post={post} />)
   }
   ```
   Replace with:
   ```jsx
   {/* Post feed + composer */}
   <PostsTab
     locationType="constituency"
     locationSlug={locationSlug}
     collectiveRef={{ collection: 'committee_forums', id: String(forum._id) }}
   />
   ```

5. Remove the inner PostCard function and its associated styles (card) --
   they are no longer used. The timeAgo helper function can also be removed
   as PostsTab has its own.

6. Remove from the styles block at the bottom:
   sectionHead, card (if not used elsewhere in the file).
   Keep: wrap, dim, forumHeader, forumName, forumDesc, memberCountStyle,
   mpLine, joinedBadge, joinBtn.

### 2b. src/components/Groups/CommunityNetworksSection.jsx -- wire in PostsTab

Each NetworkCard currently shows two toggles: a read-only feedPanel for
national posts and nothing for local chapter posts. Add a local posts toggle
that mounts PostsTab with the chapter's collective ref when expanded.

CHANGES:

1. Add PostsTab import at the top (after existing imports):

```js
import PostsTab from '../Posts/PostsTab.jsx'
```

2. In the NetworkCard function, add a new piece of state alongside showFeed:

```js
const [showLocalPosts, setShowLocalPosts] = useState(false)
```

3. In the cardFooter div, add a local posts toggle button alongside the
   existing national feed toggle:

```jsx
<div style={cardFooter}>
  {chapter && (
    <button style={feedToggle} onClick={() => setShowLocalPosts(p => !p)}>
      {showLocalPosts ? 'Hide local posts' : 'Local posts'}
    </button>
  )}
  <button style={{ ...feedToggle, marginLeft: chapter ? 12 : 0 }} onClick={toggleNationalFeed}>
    {showFeed ? 'Hide national posts' : 'National posts'}
  </button>
</div>
```

4. Below the existing national feed panel (the {showFeed && ...} block),
   add the local posts panel:

```jsx
{showLocalPosts && chapter && (
  <div style={feedPanel}>
    <PostsTab
      locationType={chapter.location_scope.type}
      locationSlug={chapter.location_scope.slug}
      collectiveRef={{ collection: 'network_chapters', id: String(chapter._id) }}
    />
  </div>
)}
```

Note: chapter.location_scope is { type, slug } -- the geo scope (e.g.
{ type: 'ward', slug: 'Mossley_Hill' }). PostsTab uses this to scope
the post feed and the location_scope on new posts.

### 2c. Build and verify locally

```
npm run build
node server.js
```

Verify:
  CommitteeTab:
    -- Navigate to a constituency. Committee tab shows forum header as before.
    -- Post composer appears below the header (logged-in user).
    -- Anonymous toggle works.
    -- Submitting a post inserts it into the feed.
    -- Anon user sees read-only feed, "Log in to post" link.

  CommunityNetworksSection:
    -- Navigate to a ward (logged-in). Groups tab -> Community Networks filter.
    -- Each network card shows "Local posts" and "National posts" toggles.
    -- "Local posts" toggle opens PostsTab with composer (for members).
    -- Posting to a chapter posts with collective_ref: network_chapters.
    -- "National posts" toggle shows the aggregated national feed as before.

  User location:
    -- Join a forum via the postcode modal.
    -- Check the users collection in Mongo:
       confirmed_location.ward, ward_gss, constituency, con_gss, confirmed_at
       should all be populated.

---

## STOP 3 -- Deploy

### 3a. Commit and push

```
git add .
git commit -m "User location persistence, post composer wired to forum and chapters"
git push
```

### 3b. Railway redeploy

Trigger manual redeploy in Railway dashboard.
Vercel auto-deploys from push.

### 3c. Verify live

Open https://www.ukcportal.co.uk.
  -- CommitteeTab: composer present for logged-in users at constituency scope.
  -- Community Networks: local posts toggle present on each chapter card.
  -- Join a forum: check Atlas users collection for confirmed_location fields.

---

END OF INSTRUCTION FILE
