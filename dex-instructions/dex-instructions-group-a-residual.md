# Dex Instruction File -- Group A Residual
# Produced 2 May 2026
# Run AFTER dex-instructions-post.md is complete and confirmed.
#
# Four sections. Stop after each and confirm before proceeding.
#
# 1. Crumb fix -- constituency + ward always visible in crumb trail
# 2. County scope -- add county GSS to schoolLocationScope
# 3. School Gates scope selector -- manual scope radio in SchoolsLeftNav
# 4. Chapter lazy-create -- find-or-create in chapter-by-institution endpoint

---

## SECTION 1 -- Crumb fix

### Problem
When activeNetwork is set (School Gates mode), constituency and ward disappear from
the crumb trail. Root cause: the crumbs useMemo in Locations.jsx lists pendingConstituency
and pendingWard in its deps array but never renders them as crumb items.
The fix is the same regardless of activeNetwork -- add them to the rendered output.

### File: src/pages/Locations.jsx

Find the crumbs useMemo (around line 498). It currently reads:

```js
const crumbs = useMemo(() => {
  const items = [
    { label: 'UK', onClick: handleReset, isRoot: true },
  ]
  path.forEach((p, i) => {
    const isLast    = i === path.length - 1
    const clickable = !isLast || !!pendingPlace
    items.push({
      label:   p.value,
      onClick: clickable ? () => handleGoTo(i) : undefined,
    })
  })
  if (pendingPlace) {
    items.push({
      label:   `${pendingPlace.name} (${pendingPlace.place_type})`,
      onClick: undefined,
    })
  }
  return items
}, [path, pendingPlace, pendingConstituency, pendingWard, handleGoTo, handleReset])
```

Replace with:

```js
const crumbs = useMemo(() => {
  const items = [
    { label: 'UK', onClick: handleReset, isRoot: true },
  ]
  path.forEach((p, i) => {
    const isLast    = i === path.length - 1
    const clickable = !isLast || !!pendingPlace || !!pendingConstituency || !!pendingWard
    items.push({
      label:   p.value,
      onClick: clickable ? () => handleGoTo(i) : undefined,
    })
  })
  if (pendingConstituency) {
    items.push({
      label:   pendingConstituency,
      onClick: undefined,
    })
  }
  if (pendingWard) {
    items.push({
      label:   pendingWard,
      onClick: undefined,
    })
  }
  if (pendingPlace) {
    items.push({
      label:   `${pendingPlace.name} (${pendingPlace.place_type})`,
      onClick: undefined,
    })
  }
  return items
}, [path, pendingPlace, pendingConstituency, pendingWard, handleGoTo, handleReset])
```

No other files changed for this fix.

Stop. Confirm crumb shows county > constituency > ward correctly in both normal and
School Gates (activeNetwork) modes.

---

## SECTION 2 -- County scope (la_gss)

### Problem
schoolLocationScope in Locations.jsx only resolves to ward or constituency.
County scope is needed for the scope selector (Section 3) and for users who navigate
to county level before opening School Gates.

### File: src/pages/Locations.jsx

Step 2a -- Add countyGss derived value.

After the existing pendingConGss useMemo (around line 431), add:

```js
const countyGss = useMemo(() => {
  if (!county || !wards) return null
  return wards.find(w => w.ctyhistnm === county)?.county_gss ?? null
}, [county, wards])
```

Step 2b -- Update schoolLocationScope to include county as a fallback.

Replace:

```js
const schoolLocationScope = useMemo(() => {
  if (pendingWardGss) return { scope: 'ward',         gss: pendingWardGss }
  if (wardGss)        return { scope: 'ward',         gss: wardGss }
  if (pendingConGss)  return { scope: 'constituency', gss: pendingConGss }
  if (conGss)         return { scope: 'constituency', gss: conGss }
  return null
}, [wardGss, conGss, pendingWardGss, pendingConGss])
```

With:

```js
const schoolLocationScope = useMemo(() => {
  if (pendingWardGss) return { scope: 'ward',         gss: pendingWardGss }
  if (wardGss)        return { scope: 'ward',         gss: wardGss }
  if (pendingConGss)  return { scope: 'constituency', gss: pendingConGss }
  if (conGss)         return { scope: 'constituency', gss: conGss }
  if (countyGss)      return { scope: 'county',       gss: countyGss }
  return null
}, [wardGss, conGss, pendingWardGss, pendingConGss, countyGss])
```

Step 2c -- Also pass availableScopes to SchoolsLeftNav so the selector (Section 3)
knows which scope levels are available. Build the array in Locations.jsx:

After the schoolLocationScope useMemo, add:

```js
const schoolAvailableScopes = useMemo(() => {
  const scopes = []
  if (pendingWardGss || wardGss)
    scopes.push({ scope: 'ward', gss: pendingWardGss ?? wardGss, label: 'Ward' })
  if (pendingConGss || conGss)
    scopes.push({ scope: 'constituency', gss: pendingConGss ?? conGss, label: 'Constituency' })
  if (countyGss)
    scopes.push({ scope: 'county', gss: countyGss, label: 'County' })
  return scopes
}, [wardGss, conGss, pendingWardGss, pendingConGss, countyGss])
```

Update the SchoolsLeftNav JSX (around line 620) to also pass availableScopes:

```jsx
<SchoolsLeftNav
  selectedUrns={selectedSchoolUrns}
  focusUrn={focusSchoolUrn}
  onFocusSchool={handleFocusSchool}
  onToggleSchool={handleToggleSchool}
  onBack={handleNetworkBack}
  locationScope={schoolLocationScope}
  availableScopes={schoolAvailableScopes}
  onSchoolsChange={setLoadedSchools}
/>
```

Stop. Confirm county scope returns schools correctly when at county level
(test with e.g. Lancashire -- should return schools via la_gss).

---

## SECTION 3 -- School Gates scope selector

### Problem
SchoolsLeftNav uses whatever scope Locations.jsx passes (deepest available).
Users cannot widen the view to see more schools without navigating back.
Add a manual scope radio strip at the top of the left nav.

### File: src/components/SchoolGates/SchoolsLeftNav.jsx

Step 3a -- Update props signature to accept availableScopes.

```js
export default function SchoolsLeftNav({
  selectedUrns, focusUrn, onFocusSchool, onToggleSchool, onBack,
  locationScope, availableScopes = [], onSchoolsChange
})
```

Step 3b -- Add selectedScope state. Initialise to the deepest available scope
(first item in availableScopes, which is ward if present, otherwise constituency,
otherwise county). Reset when availableScopes changes.

```js
const [selectedScope, setSelectedScope] = useState(null)

// When available scopes change (user navigated), reset to deepest.
useEffect(() => {
  if (availableScopes.length > 0) {
    setSelectedScope(availableScopes[0])
  } else {
    setSelectedScope(null)
  }
}, [availableScopes.map(s => s.gss).join(',')])
```

Step 3c -- Replace the locationScope usage in the fetch useEffect with selectedScope.

Current fetch useEffect uses `locationScope?.scope` and `locationScope?.gss`.
Replace those references with `selectedScope?.scope` and `selectedScope?.gss`.

```js
useEffect(() => {
  if (!selectedScope?.scope || !selectedScope?.gss) { setSchools([]); onSchoolsChange?.([]); return }
  let cancelled = false
  setLoading(true)
  const params = new URLSearchParams({ scope: selectedScope.scope, gss: selectedScope.gss })
  fetch(`${API_BASE}/api/schools?${params}`)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(data => {
      if (!cancelled) {
        setSchools(data)
        onSchoolsChange?.(data)
        setLoading(false)
      }
    })
    .catch(() => { if (!cancelled) { setSchools([]); onSchoolsChange?.([]); setLoading(false) } })
  return () => { cancelled = true }
}, [selectedScope?.scope, selectedScope?.gss])
```

Step 3d -- Add the scope radio strip to the rendered output.
Place it between the back button and the All/My toggle. Only render if
availableScopes.length > 1 (no point showing a radio with one option).

```jsx
{availableScopes.length > 1 && (
  <div style={scopeRow}>
    {availableScopes.map(s => (
      <label key={s.scope} style={scopeLabel}>
        <input
          type="radio"
          name="school-scope"
          checked={selectedScope?.scope === s.scope}
          onChange={() => setSelectedScope(s)}
          style={{ marginRight: 3 }}
        />
        <span style={{ fontSize: 11 }}>{s.label}</span>
      </label>
    ))}
  </div>
)}
```

Add to styles at the bottom of the file:

```js
const scopeRow   = { display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }
const scopeLabel = { display: 'flex', alignItems: 'center', cursor: 'pointer' }
```

No server changes. No other files changed.

Stop. Confirm:
- Scope radio only appears when 2+ scopes are available.
- Switching scope re-fetches schools correctly.
- Default is always the deepest scope on navigation change.
- County scope returns schools (depends on Section 2 being live).

---

## SECTION 4 -- Chapter lazy-create

### Problem
chapter-by-institution returns 404 if no chapter exists for a school.
SchoolGatesMid waits on chapterId before showing PostsTab -- 404 means it
shows "Loading community..." forever.
Fix: make chapter-by-institution a find-or-create so the chapter is provisioned
on first access.

### File: routes/communityNetworks.js

Find the chapter-by-institution GET handler (around line 103):

```js
router.get('/chapter-by-institution', async (req, res) => {
  const col = networkChaptersCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })
  const { type, id } = req.query
  if (!type || !id) return res.status(400).json({ error: 'type and id required' })
  try {
    const chapter = await col.findOne(
      { institution_type: type, institution_id: id },
      { projection: { _id: 1 } }
    )
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' })
    res.json({ chapter_id: chapter._id })
  } catch (err) {
    res.status(500).json({ error: 'Failed to find chapter' })
  }
})
```

Replace with a find-or-create (upsert):

```js
router.get('/chapter-by-institution', async (req, res) => {
  const col = networkChaptersCol()
  if (!col) return res.status(503).json({ error: 'Database unavailable' })
  const { type, id } = req.query
  if (!type || !id) return res.status(400).json({ error: 'type and id required' })
  try {
    // Find the parent national_groups record for this institution type.
    // For schools, the slug is 'at-the-school-gates'.
    const INSTITUTION_NETWORK_MAP = {
      school: 'at-the-school-gates',
    }
    const networkSlug = INSTITUTION_NETWORK_MAP[type]
    if (!networkSlug) return res.status(400).json({ error: 'Unknown institution type' })

    // findOneAndUpdate with upsert -- idempotent, safe under concurrent requests.
    const result = await col.findOneAndUpdate(
      { institution_type: type, institution_id: id },
      {
        $setOnInsert: {
          institution_type: type,
          institution_id:   id,
          network_slug:     networkSlug,
          status:           'active',
          created_at:       new Date(),
        },
      },
      { upsert: true, returnDocument: 'after', projection: { _id: 1 } }
    )
    res.json({ chapter_id: result._id })
  } catch (err) {
    console.error('chapter-by-institution error', err)
    res.status(500).json({ error: 'Failed to find or create chapter' })
  }
})
```

Note: findOneAndUpdate with upsert is safe under concurrent requests -- Mongo
handles the race condition via the unique index on { institution_type, institution_id }
if one exists. If no unique index, the worst case is two chapters created for the
same school -- check db/mongo.js ensureIndexes and add one if missing:

```js
await db.collection('network_chapters').createIndex(
  { institution_type: 1, institution_id: 1 },
  { unique: true, sparse: true }
)
```

Only add this index if it is not already present. Check existing indexes in
db/mongo.js before adding.

No client changes needed -- SchoolGatesMid already handles the chapterId correctly.

Stop. Confirm:
- Navigating to a school and opening the community tab provisions a chapter (chapter_id returned).
- Repeat requests return the same chapter_id (idempotent).
- PostsTab loads (empty) for the school community.

---

## Deploy

Standard flow: npm run build -> git add . -> git commit -m "Group A residual: crumb fix, county scope, scope selector, chapter lazy-create" -> git push
