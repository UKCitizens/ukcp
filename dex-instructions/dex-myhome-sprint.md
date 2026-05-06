# Dex Sprint -- MyHome Full Build
> Ali, 5 May 2026. Single sequential run. Do not skip steps.
> Build, rebuild, smoke test at the end.

---

## Context

MyHome shell is live (MyHome.jsx, MyIncludes.jsx, MyMeta.jsx, ContentActions.jsx).
This sprint wires in the data: feed aggregator, right pane live counts, ContentActions
placed on existing cards, and the notification model foundation.

Stack reminder: React SPA + Express (routes/ at project root). No TypeScript.
ES modules throughout. LIVE ONLY -- `npm run build` then `node server.js`.

---

## Step 1 -- db/mongo.js: add user_notifications collection

In connectMongo(), after the user_follows indexes, add:

```js
await db.collection('user_notifications').createIndex({ user_id: 1, category: 1, read: 1, created_at: -1 })
await db.collection('user_notifications').createIndex({ user_id: 1, resolved: 1 })
```

Add accessor at the bottom of the file:

```js
export function notificationsCol() { return db ? db.collection('user_notifications') : null }
```

---

## Step 2 -- routes/myhome.js: feed aggregator + meta endpoint

New file. Mount in server.js as:
  import myhomeRouter from './routes/myhome.js'
  app.use('/api/myhome', myhomeRouter)
  (add after the follows line)

### GET /api/myhome/feed

Auth required. Query params: page (int, default 1), limit (int, default 20, max 50),
types (comma string, optional), since (ISO8601, optional), scope (string, optional).

Logic:
1. Fetch all caller follows: followsCol().find({ user_id: req.user._id }).toArray()
2. If no follows, return { items: [], total: 0, page: 1, limit, types_present: [] }
3. Build followSet: array of { entity_type, entity_id } objects.
4. Query posts:
   filter = {
     $or: followSet.map(f => ({ 'origin.entity_type': f.entity_type, 'origin.entity_id': f.entity_id })),
     status: 'active'
   }
   If scope param: add reach_effective: scope to filter.
   If since param: add created_at: { $gt: new Date(since) } to filter.
5. Query community network chapter posts for followed network_chapter entity_ids:
   chapterIds = followSet.filter(f => f.entity_type === 'network_chapter').map(f => f.entity_id)
   If chapterIds.length > 0:
     fetch from posts collection where origin.entity_type = 'network_chapter'
     and origin.entity_id $in chapterIds -- these are already covered by step 4.
   (No separate query needed -- posts collection covers all entity types.)
6. Get total count from posts query (countDocuments).
7. Fetch paginated results: .sort({ created_at: -1 }).skip((page-1)*limit).limit(limit)
8. Map each post to common envelope:
   {
     feed_type:   'post',
     entity_type: post.origin.entity_type,
     entity_id:   post.origin.entity_id,
     entity_name: follow.entity_name for matching follow (or post.origin.entity_id as fallback),
     timestamp:   post.created_at,
     summary:     post.body.slice(0, 120),
     scope:       post.reach_effective,
     payload: {
       post_type:    post.post_type,
       body:         post.body.slice(0, 200),
       author_name:  post.author?.is_anonymous ? 'Anonymous' : (post.author?.display_name ?? 'Unknown'),
       is_anonymous: post.author?.is_anonymous ?? false,
       reach:        post.reach_effective,
       reactions:    post.reactions ?? {},
     }
   }
9. Apply types filter if supplied (filter envelope array by feed_type).
10. Build types_present from unfiltered result set.
11. Return { items, total, page, limit, types_present }

### GET /api/myhome/meta

Auth required. Returns notification, alert, count, response data.

Logic:
1. Load notificationsCol results for the user:
   notifications: find({ user_id, category: 'notification', read: false }).sort({ created_at: -1 }).limit(20)
   alerts:        find({ user_id, category: 'alert',        resolved: false }).sort({ created_at: -1 }).limit(10)
   responses:     find({ user_id, category: 'response',     resolved: false }).sort({ created_at: -1 }).limit(10)
2. Compute counts:
   a. Get user last_seen_at from sessionCol().findOne({ user_id: req.user._id }) -- field: last_seen_at.
      If null, use 7 days ago.
   b. Get follows: followsCol().find({ user_id }).toArray()
   c. Count posts since last_seen_at across followed entities:
      followSet = follows.map(f => ({ 'origin.entity_type': f.entity_type, 'origin.entity_id': f.entity_id }))
      If followSet.length > 0:
        newPosts = await postsCol().countDocuments({
          $or: followSet,
          status: 'active',
          created_at: { $gt: lastSeenAt }
        })
      Else: newPosts = 0
   d. counts array: [{ subtype: 'new_posts', value: newPosts, label: `${newPosts} new post${newPosts===1?'':'s'} since your last visit` }]
      (only include if newPosts > 0)
3. Return { notifications, alerts, counts, responses }

### PATCH /api/myhome/meta/read

Auth required. Body: { ids: string[] }
Mark each id as read: notificationsCol().updateMany({ _id: { $in: ids.map(ObjectId) }, user_id }, { $set: { read: true } })
Return { ok: true }

### PATCH /api/myhome/meta/resolve

Auth required. Body: { ids: string[] }
Mark as resolved: notificationsCol().updateMany({ _id: { $in: ids.map(ObjectId) }, user_id }, { $set: { resolved: true } })
Return { ok: true }

---

## Step 3 -- routes/posts.js: reply notification writer

In the POST /api/posts handler, after the post is inserted successfully:
If req.body has reply_to field (a post _id string referring to the parent post):
  1. Fetch the parent post: postsCol().findOne({ _id: new ObjectId(reply_to) })
  2. If parent found and parent.author.user_id exists and parent.author.user_id !== req.user._id:
     Write to notificationsCol():
     {
       user_id:     parent.author.user_id,
       category:    'notification',
       subtype:     'reply',
       entity_type: post.origin.entity_type,
       entity_id:   post.origin.entity_id,
       entity_name: post.origin.entity_id,  // best available without a join
       summary:     `${authorName} replied to your post`,
       detail_url:  null,
       read:        false,
       resolved:    false,
       created_at:  new Date(),
       expires_at:  null,
     }
     where authorName = req.user.display_name ?? 'Someone'
  3. Fire and forget -- do not await, do not let errors block the post response.

Note: reply_to is not currently part of the post schema. If it is not already stored
on the post document, add it: if reply_to is present in req.body, include reply_to in
the inserted document so replies can be threaded later.

---

## Step 4 -- src/components/MyHome/MyMeta.jsx: wire live data

Replace the static shell with a data-fetching version.

On mount: fetch /api/myhome/meta. Store { notifications, alerts, counts, responses } in state.

Counts section: if counts array has items, render each as:
  Text size="sm": label (e.g. "14 new posts since your last visit")
  Replace "Nothing yet." with "You are all caught up." when counts is empty.

Notifications, Alerts, Responses: for now still render "Nothing yet." (no writers for
alerts/responses yet). Update badges: Badge shows notifications.length, alerts.length etc.
Not just 0.

No read/resolve UI interaction yet -- badges only. Clicking a notification does nothing for POC.

---

## Step 5 -- src/components/MyHome/FeedZone.jsx (new) + wire into MyHome.jsx

Create src/components/MyHome/FeedZone.jsx.

Props: { feedContext }  (feedContext = { entity_type, entity_id, entity_name } or null for All)

Behaviour:
- If feedContext is null (All mode): fetch /api/myhome/feed, show FeedControls + PostFeedCard list.
- If feedContext is set (specific entity): fetch /api/posts?entity_type=X&entity_id=Y&limit=20,
  render PostFeedCard list. No FeedControls shown in specific mode.
- Loading state: simple Text "Loading..."
- Empty state: Text "Nothing posted here yet."

In MyHome.jsx, replace the FeedZone placeholder with <FeedZone feedContext={selectedContext} />
where selectedContext comes from MyIncludes selection state (already wired -- check MyHome.jsx
for the state prop name and pass it through).

---

## Step 6 -- src/components/MyHome/FeedControls.jsx (new)

Props: { typeOptions: string[], onFilter: fn }
onFilter receives { types: string[], since: string|null, scope: string|null }

Render (horizontal strip, Mantine Group):
- Type chips: one Chip per typeOptions value. "post" -> label "Posts", "network_post" -> "Network".
  All selected by default. Toggle chip deselects that type.
- Date buttons: SegmentedControl with options "7d" / "30d" / "All". Default "All".
  "7d" -> since = ISO string for now minus 7 days. "30d" -> minus 30. "All" -> null.
- Scope select: Mantine Select, options ward/constituency/county/region/national + "Any".
  Default "Any" (null).

Call onFilter on any change.

---

## Step 7 -- src/components/MyHome/PostFeedCard.jsx (new)

Props: { item }  (item = common envelope from /api/myhome/feed)

Render (Mantine Paper, withBorder, p="sm", mb="xs"):
- Top row: entity_name (Text size="xs" c="dimmed") + scope badge (Badge size="xs" color="gray") + ContentActions
- Body: payload.body (Text size="sm", lineClamp=3)
- Bottom row: author_name (Text size="xs" c="dimmed") + timestamp (Text size="xs" c="dimmed", formatted as relative or date)

ContentActions props:
  entityType={item.entity_type}
  entityId={item.entity_id}
  entityName={item.entity_name}
  isFollowing={true}  (if it is in the feed, user already follows it)
  onOpen={() => { /* navigate to entity -- use useNavigate, build path from entity_type */ }}
  onUnfollow={handleUnfollow}  (DELETE /api/follows/:type/:id then refetch feed)
  onFollow={null}  (already following)

For onOpen path: entity_type 'place'/'county'/'region' -> /locations, others best effort /locations.
Keep it simple for POC -- all open to /locations.

---

## Step 8 -- ContentActions on existing cards

### SchoolsRightNav.jsx

The school detail card (rendered when a school is expanded/focused) already has a
follow/unfollow button using selectedUrns. Wire ContentActions alongside it.

In the school detail render block (around line 161):
- Import ContentActions.
- Add local isFollowing state: const [isFollowing, setIsFollowing] = useState(selectedUrns.includes(school.urn))
- Add onFollow: POST /api/follows with { entity_type: 'school', entity_id: String(school.urn), entity_name: school.name }
  then setIsFollowing(true)
- Add onUnfollow: DELETE /api/follows/school/[urn] then setIsFollowing(false)
- Render <ContentActions entityType="school" entityId={String(school.urn)} entityName={school.name}
    isFollowing={isFollowing} onFollow={onFollow} onUnfollow={onUnfollow} />
  Place it at the trailing edge of the school name row.

Note: existing toggle button (selectedUrns) is for the map selection -- keep it.
ContentActions is the My Home save, parallel to it.

### CommunityNetworkCard.jsx

Card currently takes { name, description, topicCategory, isSelected, onClick } -- no entity_id.
The parent (CommunityNetworksSection.jsx) renders these cards -- it has the chapter data.

In CommunityNetworksSection.jsx:
- Pass chapter._id and chapter.name down to CommunityNetworkCard as chapterId, chapterName.
In CommunityNetworkCard.jsx:
- Accept chapterId, chapterName as additional props.
- Local state: isFollowing (check on mount via GET /api/follows?entity_type=network_chapter,
  compare to chapterId).
- onFollow / onUnfollow handlers as above.
- Render ContentActions at card top-right. Wrap card outer div in position:relative.
  ContentActions wrapper: position:absolute, top:8px, right:8px, opacity:0 on default,
  opacity:1 on parent hover. Use inline style or a CSS class.

### CommitteeTab.jsx

Forum header (around the forumName/forumDesc block) -- add ContentActions.
forum._id and forum.name are already in scope (line 122-123 shows this).
con_gss is also available on forum.

- Import ContentActions.
- Local isFollowing state, initialised false, checked on mount via GET /api/follows?entity_type=committee_forum.
- onFollow: POST /api/follows { entity_type: 'committee_forum', entity_id: String(forum._id), entity_name: forum.name, scope_gss: forum.con_gss }
- onUnfollow: DELETE /api/follows/committee_forum/[forum._id]
- Render ContentActions at the trailing edge of the forumHeader row.

---

## Step 9 -- build and restart

npm run build
node server.js (or restart via your process manager)

Smoke checks:
- /myhome loads, left pane shows followed entity sections.
- All mode (nothing selected): feed loads from /api/myhome/feed. FeedControls visible.
- Right pane: Counts section shows "N new posts since your last visit" if posts exist.
- Notification/Alert/Response sections show badges with correct counts (0 is fine, not hardcoded).
- CommunityNetworkCard: hover shows ContentActions ... icon. Click Add to My Home -> network_chapter
  appears in MyIncludes left pane on next load.
- CommitteeTab: ContentActions visible in forum header.
- School detail card: ContentActions alongside existing toggle.

---

## Do not build in this sprint

- Alerts writers (no vote/meeting endpoints yet)
- Response writers (no invite/nomination endpoints yet)
- Read/resolve click interactions in MyMeta
- FollowsContext (global follow state)
- Text search in FeedControls
- school_update feed card type
- URL-persisted filter state
