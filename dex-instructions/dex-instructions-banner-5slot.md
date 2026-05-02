# Dex Instruction File -- Banner Image Wiring (right slot)
# Rewritten 2 May 2026 -- original 5-slot design scrapped post-restructure.
# Run after dex-instructions-people-page.md is complete.
#
# SiteHeaderRow2 has a single right-slot image (bannerImage prop, string URL).
# This sprint wires one image per location from geo-content into that slot.
#
# Scope:
# (1) Add b1 field to Mongo geo-content PATCH allowlist (routes/admin.js).
# (2) Add b1 editor field to DataManager Geo Content tab.
# (3) Read b1 in useLocationContent and return as bannerImage string.
# (4) Pass bannerImage from Locations.jsx through SiteHeader to SiteHeaderRow2.
#
# Four sections. Stop after each and confirm.
#
# 1. routes/admin.js -- Mongo allowlist
# 2. DataManager.jsx -- editor field
# 3. useLocationContent.js -- return bannerImage
# 4. Locations.jsx + SiteHeader.jsx -- pass bannerImage through

---

## SECTION 1 -- Mongo allowlist

### File: routes/admin.js

Find GEO_CONTENT_MONGO_EDITABLE (around line 42):

```js
const GEO_CONTENT_MONGO_EDITABLE = new Set([
  'summary', 'extract', 'thumbnail', 'wikiUrl', 'geoData',
  'notable_facts', 'category_tags', 'gather_status',
])
```

Add 'b1':

```js
const GEO_CONTENT_MONGO_EDITABLE = new Set([
  'summary', 'extract', 'thumbnail', 'wikiUrl', 'geoData',
  'notable_facts', 'category_tags', 'gather_status',
  'b1',
])
```

The JSON flat-file PATCH handler (/api/admin/geo-content/:key) has no allowlist --
b1 will persist to geo-content.json automatically.

Stop. Confirm server restarts cleanly.

---

## SECTION 2 -- DataManager editor field

### File: src/components/DataManager/DataManager.jsx

In the Geo Content field editor, find where f1 is rendered.
Add a new field entry for b1 after the existing fields:

```jsx
{ key: 'b1', label: 'Banner Image URL', type: 'text',
  placeholder: 'https://...' }
```

Use the same pattern as the existing field inputs.

Stop. Confirm field appears in the editor and saves correctly via PATCH.

---

## SECTION 3 -- useLocationContent

### File: src/hooks/useLocationContent.js

In the returned object, add bannerImage derived from the fetched content.
The field name in geo-content.json / Mongo is 'b1'.

In the L0 (geo-content.json) resolution path, map b1 -> bannerImage.
In the L2 (API) resolution path, map b1 -> bannerImage.
Return null if b1 is absent or empty string.

Return shape addition:
```js
bannerImage: data.b1 || null,
```

Stop. Confirm hook returns bannerImage for a location that has b1 set.

---

## SECTION 4 -- Locations.jsx + SiteHeader.jsx wiring

### File: src/pages/Locations.jsx

useLocationContent already provides bannerImage.
Find where SiteHeader is rendered and pass bannerImage:

```jsx
<SiteHeader
  ...existing props...
  bannerImage={bannerImage}
/>
```

### File: src/components/SiteHeader.jsx

bannerImage prop is already declared and passed through to SiteHeaderRow2.
Confirm it is in the prop list -- no change needed if already present.

Stop. Confirm right slot shows the image when b1 is set for the current location,
and shows the empty slot style when b1 is absent.

