# UKCP Session Notes — 17 Apr 2026 (Continuation)

## Features Delivered This Session

### Content Pipeline — Wikipedia + Parliament MP API
- `/api/content/:type/:slug` Express proxy endpoint (server.js)
- Supports: country, region, county, city, town, village, hamlet, constituency, ward
- Wikipedia REST Summary API for geographic types → `{ extract, thumbnail, title, wikiUrl }`
- Parliament `Location/Constituency/Search` API for constituency → current MP `{ mpName, party, partyColour, thumbnail }`
- In-memory L2 cache on server: TTL by type (country/region 90d, county 30d, city/town/hamlet 14d, constituency 7d), LRU eviction at 5000 entries
- L1 localStorage cache on client: 7-day TTL, keyed `content:v2:{type}:{slug}` — v2 to bust any pre-fix data

### useLocationContent Hook
- Two-layer abstraction over L1/L2 cache
- Returns: `contentType, extract, thumbnail, title, wikiUrl, mpName, party, partyColour, loading, error`
- Clears stale state on every slug change before L1/L2 check
- Only writes to L1 if data is substantive (no null-mpName MP stubs)

### LocationInfo Component
- Three render modes: wiki (extract + source link), mp (Avatar + party Badge), ward (local path data, no API)
- Ward mode renders constituency/county/region/country from path — no external call

### MidPaneTabs Component
- Info/Map tab strip — controlled from Locations.jsx
- Both panels always rendered, stacked via absolute positioning + z-index
- `isolation: isolate` on content area contains Leaflet's internal z-index
- Leaflet never loses container dimensions — no invalidateSize needed
- Tab auto-switches to Info on content context slug change; back to Map on crumb/reset navigation

### Banner Auto-Swap
- SiteHeaderRow2 `bannerImage` prop — Wikipedia thumbnail overlaid on static UK banner
- Content context priority: pendingPlace (any type) > constituency > county > region > country

## Known Issues / Deferred
- Right pane (ConstituencyPane) constituency refresh still intermittent — stale display on rapid re-selection, under investigation
- T5 crumb/walker edge cases — deferred pending UI rationalisation
- Ward content: no viable external API, local path data only
- NI counties: deferred (hand-source required)
- Constituency count discrepancy (containment 32 vs map 20 for some counties): deferred

## Next Session — Baselining & Documentation Event
- Document current MVP state properly
- Define and complete bug resolution against documented baseline
- Constituency refresh bug to be root-caused and fixed
