# Dex Instruction File -- Post: Base Object, API, Composer
# Phase 3 -- Produced 1 May 2026
# Read design note first: UKCP/Ali/post-design-note.md

---

## Overview

Post is the atomic unit of the platform. This sprint builds the foundation only --
base object, API, PostComposer base component, and two initial variants
(GeneralPostComposer, SchoolNoticeComposer). Existing PostsTab already renders
posts -- this sprint gives it a real data layer and a real composer.

Four sections. Stop after each and confirm before proceeding.

1. Collections + seed post_type_config
2. API routes (posts collection CRUD)
3. PostComposer base component + two variants
4. Wire PostsTab to real data + composer

---

## SECTION 1 -- Collections + seed post_type_config

### 1a. Add to db/mongo.js

```js
export const postsCol = () => db().collection('posts');
export const postTypeConfigCol = () => db().collection('post_type_config');
```

### 1b. Indexes on posts collection (add to connectDB or ensureIndexes)

```js
await postsCol().createIndex({ 'origin.entity_type': 1, 'origin.entity_id': 1 });
await postsCol().createIndex({ 'origin.geo_scope.ward_gss': 1 });
await postsCol().createIndex({ 'origin.geo_scope.constituency_gss': 1 });
await postsCol().createIndex({ reach_effective: 1 });
await postsCol().createIndex({ 'author.user_id': 1 });
await postsCol().createIndex({ created_at: -1 });
await postsCol().createIndex({ status: 1 });
```

### 1c. Seed post_type_config

Create scripts/seed-post-type-config.js:

```js
import { connectDB, postTypeConfigCol } from '../db/mongo.js';

const configs = [
  {
    post_type: 'general_comment',
    reach_default: 'origin',
    reach_floor: 'origin',
    reach_ceiling: 'constituency',
    user_override: true
  },
  {
    post_type: 'reaction',
    reach_default: 'origin',
    reach_floor: 'origin',
    reach_ceiling: 'origin',
    user_override: false
  },
  {
    post_type: 'question',
    reach_default: 'ward',
    reach_floor: 'origin',
    reach_ceiling: 'county',
    user_override: true
  },
  {
    post_type: 'call_to_arms',
    reach_default: 'constituency',
    reach_floor: 'ward',
    reach_ceiling: 'national',
    user_override: true
  },
  {
    post_type: 'announcement',
    reach_default: 'constituency',
    reach_floor: 'constituency',
    reach_ceiling: 'region',
    user_override: false,
    affiliated_only: true
  },
  {
    post_type: 'school_notice',
    reach_default: 'origin',
    reach_floor: 'origin',
    reach_ceiling: 'constituency',
    user_override: true
  },
  {
    post_type: 'news_discussion',
    reach_default: 'origin',
    reach_floor: 'origin',
    reach_ceiling: 'county',
    user_override: true
  },
  {
    post_type: 'trader_offer',
    reach_default: 'ward',
    reach_floor: 'origin',
    reach_ceiling: 'county',
    user_override: true
  },
  {
    post_type: 'petition_signature',
    reach_default: 'constituency',
    reach_floor: 'constituency',
    reach_ceiling: 'national',
    user_override: false
  },
  {
    post_type: 'evidence_submission',
    reach_default: 'origin',
    reach_floor: 'origin',
    reach_ceiling: 'origin',
    user_override: false
  }
];

await connectDB();
await postTypeConfigCol().deleteMany({});
await postTypeConfigCol().insertMany(configs);
console.log('post_type_config seeded:', configs.length, 'records');
process.exit(0);
```

Run: `node scripts/seed-post-type-config.js`
Also seed to Atlas after local confirm.

---

## SECTION 2 -- API routes

Create routes/posts.js. Register in server.js: `app.use('/api/posts', postsRouter);`

### GET /api/posts -- Tier 0 (public)

Query params:
- entity_type (required)
- entity_id (required)
- reach (optional) -- filter by reach_effective value
- page (default 1), limit (default 20)

```js
const filter = {
  'origin.entity_type': entity_type,
  'origin.entity_id': entity_id,
  status: 'active'
};
if (reach) filter.reach_effective = reach;

const posts = await postsCol()
  .find(filter)
  .sort({ created_at: -1 })
  .skip((page - 1) * limit)
  .limit(limit)
  .toArray();

// Scrub anonymous author identity before returning
const sanitised = posts.map(p => ({
  ...p,
  author: p.author.is_anonymous
    ? { ...p.author, user_id: null, display_name: 'Anonymous' }
    : p.author
}));
```

Return: { posts: sanitised, total, page, limit }

### POST /api/posts -- Tier 1 (verifyJwt)

Body: { post_type, body, origin, reach_set, meta }

Validate:
- body must be non-empty string, max 2000 chars
- post_type must exist in post_type_config
- origin.entity_type and origin.entity_id required
- origin.geo_scope required (ward_gss or constituency_gss or county_gss at minimum)

Resolve reach:
```js
const config = await postTypeConfigCol().findOne({ post_type });
const reach_effective = reach_set ?? config.reach_default;
// Clamp to floor/ceiling if user_override is true
```

Build document:
```js
{
  post_type,
  body: body.trim(),
  author: {
    user_id: req.user.id,
    display_name: req.claims.display_name || null,
    is_anonymous: body_is_anonymous ?? (profile?.preferences?.default_posting_mode === 'anonymous'),
    persona: req.claims.platform_role === 'affiliated' ? 'affiliated' : 'citizen'
  },
  created_at: new Date(),
  updated_at: new Date(),
  edited: false,
  origin,
  reach_default: config.reach_default,
  reach_set: reach_set || null,
  reach_effective,
  reach_floor: config.reach_floor,
  reach_ceiling: config.reach_ceiling,
  reaction_counts: {},
  reply_count: 0,
  reach_score: 0,
  status: 'active',
  flagged_by: [],
  meta: meta || {}
}
```

Note on is_anonymous: POST body should include is_anonymous boolean. Server does not
guess -- client sends it explicitly based on user preference + per-post toggle.

Return: created post doc (with author scrubbed if anonymous).

### PATCH /api/posts/:id/react -- Tier 1

Body: { reaction_type }
Valid reaction_types: 'agree' | 'disagree' | 'support' | 'flag_concern'
(extend this list as UI evolves -- store as open string, validate against allowlist)

```js
await postsCol().updateOne(
  { _id: new ObjectId(id) },
  { $inc: { [`reaction_counts.${reaction_type}`]: 1, reach_score: 1 } }
);
```

Return: { ok: true }

### DELETE /api/posts/:id -- Tier 1

Check: req.user.id === post.author.user_id OR req.claims.platform_role === 'admin'
If neither: 403.

Soft delete:
```js
await postsCol().updateOne(
  { _id: new ObjectId(id) },
  { $set: { status: 'removed', updated_at: new Date() } }
);
```

Return: { ok: true }

### POST /api/posts/:id/flag -- Tier 1

```js
await postsCol().updateOne(
  { _id: new ObjectId(id) },
  { $addToSet: { flagged_by: req.user.id }, $inc: { reach_score: -1 } }
);
```

Auto-shadow if flagged_by.length >= 5:
```js
const post = await postsCol().findOne({ _id: new ObjectId(id) });
if (post.flagged_by.length >= 5) {
  await postsCol().updateOne({ _id: post._id }, { $set: { status: 'shadow' } });
}
```

Return: { ok: true }

### GET /api/posts/config -- Tier 0

Returns all post_type_config docs. Client caches on first load.

---

## SECTION 3 -- PostComposer base + two variants

### 3a. src/components/Post/PostComposer.jsx (new file)

Base component. Handles all invariants.

Props:
- postType: string (required)
- origin: { entity_type, entity_id, entity_name, geo_scope } (required)
- onSuccess: function (required) -- called with new post doc on successful submit
- defaultReach: string (optional)
- children: variant fields rendered above body textarea (optional)

Internal state:
- body: string
- isAnonymous: boolean (initialise from user preferences default_posting_mode)
- reachOverride: string | null
- submitting: boolean
- error: string | null

On mount: fetch GET /api/posts/config, find config for postType, store in state.

Render:
```
[children -- variant fields if any]
[body textarea -- placeholder "What's on your mind?", maxLength 2000]
[character count]
[row: anon toggle | reach selector (if user_override) | submit button]
[error message if any]
```

Anon toggle: checkbox "Post anonymously". Only shown if user is logged in.
If not logged in, is_anonymous = true always (anon-traceable by user_id from auth).

Reach selector: shown only if config.user_override === true.
Options: hierarchy values between reach_floor and reach_ceiling inclusive.
Labels: Origin (this [entity_name]) | Ward | Constituency | County | Region | National

Submit handler:
```js
const res = await fetch(`${API}/api/posts`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    post_type: postType,
    body,
    origin,
    reach_set: reachOverride,
    is_anonymous: isAnonymous,
    meta: variantMeta  // passed down from variant via ref or callback
  })
});
```

On success: clear body, call onSuccess(newPost).

### 3b. src/components/Post/GeneralPostComposer.jsx

Thin wrapper -- no variant fields. Pure base.

```jsx
export default function GeneralPostComposer({ origin, onSuccess }) {
  return (
    <PostComposer
      postType="general_comment"
      origin={origin}
      onSuccess={onSuccess}
    />
  );
}
```

### 3c. src/components/Post/SchoolNoticeComposer.jsx

Adds notice_category selector to meta.

```jsx
export default function SchoolNoticeComposer({ origin, onSuccess }) {
  const [category, setCategory] = useState('Community');

  const variantFields = (
    <select value={category} onChange={e => setCategory(e.target.value)}>
      <option>Community</option>
      <option>Event</option>
      <option>Alert</option>
    </select>
  );

  return (
    <PostComposer
      postType="school_notice"
      origin={origin}
      onSuccess={onSuccess}
      meta={{ notice_category: category }}
    >
      {variantFields}
    </PostComposer>
  );
}
```

Note: PostComposer needs to accept a meta prop (or use a ref/callback pattern) so
variant meta is included in the POST body. Implement whichever is cleaner -- meta
prop on PostComposer is simplest.

### 3d. src/components/Post/PostCard.jsx (new file)

Renders a single post in a feed.

Props: post (full post doc)

Render:
```
[author name or "Anonymous" | timestamp | reach_effective badge]
[body text]
[reaction row: agree / disagree / support counts + react buttons]
[flag link]
[delete link -- shown only if author or admin]
```

Reaction buttons call PATCH /api/posts/:id/react.
Delete calls DELETE /api/posts/:id, removes post from local state on success.
Flag calls POST /api/posts/:id/flag.

Keep styling minimal -- Mantine components, consistent with existing card styles.

---

## SECTION 4 -- Wire PostsTab to real data + composer

### 4a. src/components/TabContent/PostsTab.jsx -- replace stub with real implementation

Current PostsTab receives: forumId (or equivalent entity ref), user context.

Replace with:

Props:
- origin: { entity_type, entity_id, entity_name, geo_scope } (required)
- postType: string (default 'general_comment')
- composerVariant: component (optional -- defaults to GeneralPostComposer)

On mount: fetch GET /api/posts?entity_type=...&entity_id=...
Paginate: "Load more" button, not infinite scroll.

State: posts array. On new post submitted (onSuccess callback): prepend to posts array.

Render:
```
[composerVariant or GeneralPostComposer]
[posts list: PostCard for each]
[load more button if more pages]
[empty state: "No posts yet. Be the first."]
```

### 4b. Wire SchoolGatesMid.jsx

SchoolGatesMid currently renders PostsTab with forumId. Update to pass full origin:

```js
const origin = {
  entity_type: 'school',
  entity_id: selectedSchoolUrn,
  entity_name: selectedSchoolName,
  geo_scope: {
    ward_gss: locationScope === 'ward' ? wardGss : null,
    constituency_gss: constituencyGss,
    county_gss: null,
    region: region,
    country: 'England'
  }
};
```

Pass composerVariant={SchoolNoticeComposer} when Community tab is active.
Pass composerVariant={GeneralPostComposer} when Notices tab is active.

### 4c. GroupsTab -- wire PostsTab for group posts

GroupsTab already has a PostsTab instance. Update to pass origin with:
- entity_type: 'group'
- entity_id: activeGroup._id
- entity_name: activeGroup.name
- geo_scope: derived from activeGroup's location fields

composerVariant: GeneralPostComposer (default).

---

## Deploy

Standard flow: npm run build -> git add . -> git commit -> git push
After deploy: run seed-post-type-config.js against Atlas.

---

## Stop points

Stop after Section 1 -- confirm post_type_config seeded, indexes created.
Stop after Section 2 -- confirm POST /api/posts creates a doc, GET retrieves it, anon scrubbing works.
Stop after Section 3 -- confirm PostComposer renders and submits cleanly in isolation.
Stop after Section 4 -- confirm PostsTab loads posts and new post appears on submit in School Gates and Groups.

---

## Test extension

Add tests/sprint-34.spec.js:
- POST /api/posts creates doc with correct reach_effective
- Anon post scrubs user_id and display_name in GET response
- React increments count
- Flag x5 auto-shadows post
- Delete by non-author returns 403
- Delete by author soft-deletes (status=removed, not returned in GET)
- PostComposer renders, submits, clears body on success
