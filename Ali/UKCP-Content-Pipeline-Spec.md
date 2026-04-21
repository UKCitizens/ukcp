# UKCP Content Pipeline — Wikipedia Geographic Content
> Written: 17 Apr 2026. Phase 1: Country / Region / County.

## Scope

Fetch Wikipedia summary content for the current geographic context (county > region > country).
Surface it in a Map | Info tab strip on the mid pane. Auto-swap the banner image to the
Wikipedia thumbnail when one is available.

Political content (constituencies, MPs) is a separate phase — not in scope here.

---

## Content context resolution

Derived from nav path — deepest geographic level wins:
```
county → region → country → null (no content)
```
Slug = location name with spaces replaced by underscores (e.g. "South East" → "South_East").

---

## Architecture

### L2 — Express proxy (server.js)
Endpoint: `GET /api/content/:type/:slug`
- Fetches `https://en.wikipedia.org/api/rest_v1/page/summary/{slug}`
- Returns: `{ extract, thumbnail, title, wikiUrl }`
- In-memory Map cache. TTL: country/region 90d, county 30d.
- LRU eviction at 5000 entries (evict oldest key on overflow).
- 404 from Wikipedia → 404 to client. Network error → 502.

### L1 — localStorage (client)
Key: `content:{type}:{slug}`. TTL: 7 days.
Checked before hitting proxy. Written on successful proxy response.

### Hook — useLocationContent(type, slug)
Returns `{ extract, thumbnail, loading, error }`.
Null type/slug → returns empty (no fetch).

---

## UI changes

### MidPaneTabs.jsx (new)
Mantine Tabs wrapping Map and Info panels.
Map tab: MidPaneMap (unchanged).
Info tab: LocationInfo component.
Tab strip at top; content fills remaining pane height.

### LocationInfo.jsx (new)
Renders: thumbnail image (if available), extract text, Wikipedia source link.
Loading: spinner. Error/no content: quiet fallback message.

### SiteHeaderRow2.jsx
Add `bannerImage` prop (URL string or null).
When set: override background-image via inline style.
When null: CSS module static UKBanner.png applies as normal.

### SiteHeader.jsx
Thread `bannerImage` prop through to SiteHeaderRow2.

### Locations.jsx
- Derive contentContext (type + slug) from path via useMemo.
- Call useLocationContent(contentContext?.type, contentContext?.slug).
- Pass thumbnail as bannerImage to SiteHeader.
- Pass MidPaneTabs as midPane prop.

---

## Files touched

- `server.js`
- `src/hooks/useLocationContent.js` (new)
- `src/components/LocationInfo.jsx` (new)
- `src/components/MidPaneTabs.jsx` (new)
- `src/components/Header/SiteHeaderRow2.jsx`
- `src/components/SiteHeader.jsx`
- `src/pages/Locations.jsx`
