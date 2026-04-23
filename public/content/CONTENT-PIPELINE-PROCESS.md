# UKCP Location Content Pipeline — Process Documentation

## Purpose
This document records the exact process used to research, gather, and structure
content for the Preston proof-of-concept run. It includes every gotcha encountered
and the fix applied. Ali and Phil will use this to spec the production pipeline.

---

## Tools Used
- **Playwright MCP** — browser navigation, DOM snapshots, JavaScript evaluation, screenshots
- **WebSearch** — parallel research queries via Anthropic web search tool
- **WebFetch** — structured extraction from specific URLs (Wikipedia, Wikimedia Commons)
- **Bash** — directory creation, curl image downloads, file verification
- **Write** — saving structured JSON output

---

## Phase 1: Browser Navigation to UKCP

### Goal
Confirm the live UKCP instance at :3000 was running and navigate to Preston's info tab.

### Steps
1. `browser_navigate` → `http://localhost:3000`
2. `browser_snapshot` (depth 3) → identified button refs
3. `browser_click` → "Location Selector" button
4. `browser_snapshot` → page re-rendered with new refs — **old refs invalidated**
5. `browser_click` → "England"
6. `browser_snapshot` again (refs changed after England click)
7. `browser_click` → "City (54)" filter
8. `browser_click` → "P" letter filter
9. `browser_snapshot` → Preston now visible in list
10. `browser_click` → "Preston"
11. `browser_click` → "Info" tab
12. `browser_take_screenshot` → confirmed minimap visible

### Gotcha 1: Stale refs after navigation/click
**Problem:** After clicking a nav button (England, City filter), the page re-renders
and all `ref=eXXX` values from the previous snapshot are invalidated. Calling
`browser_click` with a stale ref throws: `Error: Ref eXX not found in the current
page snapshot.`

**Fix:** Always call `browser_snapshot` after any action that causes a re-render
before attempting another `browser_click`. Never reuse refs across renders.

### Gotcha 2: Deep vs shallow snapshots
**Problem:** `browser_snapshot` with default depth often collapses subtrees, hiding
button refs needed for interaction.

**Fix:** Use `depth: 4` or `depth: 5` to expose nested interactive elements.
Use `depth: 3` only for orientation/structure checks.

### Gotcha 3: Wikimedia Commons language dropdown noise
**Problem:** Two snapshot calls on Wikimedia Commons pages returned enormous YAML
output due to a `<select>` element containing every language option (~300+ entries).
This consumed 3-4K tokens per snapshot unnecessarily.

**Fix:** Use `browser_evaluate` with a targeted JS selector instead of
`browser_snapshot` when the goal is to extract a single value (e.g. image URL).
Example:
```js
() => {
  const img = document.querySelector('#file a img');
  return img ? img.src : document.querySelector('.fullMedia a')?.href;
}
```
This retrieved the exact image URL in one call with minimal token cost.

---

## Phase 2: Research

### Approach
Run three parallel `WebSearch` calls simultaneously:
1. `[city] history overview facts`
2. `[city] population demographics economy [year]`
3. `[city] landmarks notable places points of interest`

Then run in parallel:
- `WebFetch` → Wikipedia article (structured extraction prompt)
- `WebSearch` → Wikimedia Commons image categories for the city
- `WebSearch` → notable people born in the city

### WebFetch prompt (Wikipedia)
```
Extract: history summary, key dates/milestones, economy, culture,
notable people born in [city], geography, transport links.
Give me rich structured content.
```

### Gotcha 4: WebSearch mandatory Sources reminder
**Problem:** Every WebSearch result appends a "REMINDER: You MUST include sources"
block. These add token weight but must be respected for attribution.

**Fix:** Capture source URLs from these blocks into the `sources` array in the
output JSON. Satisfies the requirement without cluttering the content.

---

## Phase 3: Image Acquisition

### Strategy
1. Search Wikimedia Commons category pages for the city
2. Get specific `File:` page URLs for target landmarks
3. Extract direct image URLs using one of two methods (see below)
4. Download with curl

### Target images for a city
- City centre / skyline overview
- Most iconic landmark (e.g. tallest building, famous church, distinctive feature)
- A park or green space
- A cultural institution (museum, gallery)
- Transport / docks / historic infrastructure

### Method A: browser_evaluate on File: page
Navigate to the Commons `File:` page and run:
```js
() => {
  const img = document.querySelector('#file a img');
  return img ? img.src : document.querySelector('.fullMedia a')?.href;
}
```
Returns the full `https://upload.wikimedia.org/...` URL including cache-buster param.

### Method B: Special:FilePath redirect (preferred for batch)
```
https://commons.wikimedia.org/wiki/Special:FilePath/[Filename.jpg]
```
Wikimedia redirects this to the actual upload URL. Works with curl `-L` flag.
No need to visit the File: page at all. **This is the faster method.**

### Gotcha 5: Direct upload.wikimedia.org URLs without User-Agent return HTML errors
**Problem:** Curl to `https://upload.wikimedia.org/wikipedia/commons/...` without
a User-Agent header returns a Wikimedia error HTML page (2KB) instead of the image.
The file appears to download successfully (exit code 0) but is actually HTML.

**Fix:** Always use `-A "Mozilla/5.0"` with curl:
```bash
curl -L -A "Mozilla/5.0" -o "filename.jpg" "https://..."
```

### Gotcha 6: URL-encoded commas in filenames cause 404
**Problem:** Some Wikimedia filenames contain commas (e.g. `Harris_Gallery,_Preston.jpg`).
When URL-encoded as `%2C` in the upload.wikimedia.org path, Wikimedia returns a 404 error page.

**Fix:** Use `Special:FilePath` method instead — Wikimedia handles the encoding
internally on redirect. Avoids having to manually construct the correct encoded URL.

### Gotcha 7: Silent download failures
**Problem:** Curl with `--silent` suppresses all output including errors. A failed
download (HTML page saved as .jpg) exits with code 0 — you won't know it failed
unless you check the file.

**Fix:** Always verify downloads with:
```bash
file filename.jpg
ls -lh filename.jpg
```
A valid JPEG starts with "JPEG image data". An HTML error page shows "HTML document,
ASCII text". Files under ~10KB are almost always failures.

### Gotcha 8: Very large image files
**Problem:** Some Wikimedia images are extremely high resolution (e.g. 19MB Canon EOS
raw-quality JPEGs). These are valid but impractical for web use.

**Fix:** For production pipeline, use the Wikimedia thumbnail URL pattern to
request a width-constrained version:
```
https://upload.wikimedia.org/wikipedia/commons/thumb/[a]/[ab]/[Filename.jpg]/1200px-[Filename.jpg]
```
This serves a server-resized version without downloading the full file.
Note: Only use on files confirmed to exist (method A or B first).

---

## Phase 4: Content JSON Structure

### Schema (v1 — Preston proof of concept)
```json
{
  "id": "string",
  "name": "string",
  "type": "City | Town | Village | Hamlet",
  "region": "string",
  "county": "string",
  "country": "string",
  "cityStatusYear": "number | null",
  "coordinates": { "lat": "number", "lng": "number" },
  "population": {
    "figure": "number",
    "year": "number",
    "note": "string"
  },
  "summary": "2-3 sentence plain English description for citizens",
  "history": {
    "origins": "string",
    "charter": "string (if applicable)",
    "industrialRevolution": "string (if applicable)",
    "modernEra": "string"
  },
  "keyFacts": ["array of punchy one-liner facts"],
  "geography": {
    "position": "string",
    "distanceFrom[City]": "string",
    "note": "string"
  },
  "economy": {
    "overview": "string",
    "averageSalary": "number",
    "employmentRate": "string",
    "majorEmployers": ["array"]
  },
  "demographics": {
    "whitebritish": "string",
    "religion": {}
  },
  "landmarks": [
    {
      "name": "string",
      "description": "string",
      "image": "filename.jpg | null"
    }
  ],
  "notablePeople": [
    {
      "name": "string",
      "dates": "string",
      "note": "string"
    }
  ],
  "transport": {
    "rail": "string",
    "motorways": ["array"],
    "heritage": "string (if applicable)"
  },
  "images": [
    {
      "file": "filename.jpg",
      "caption": "string",
      "credit": "licence and attribution string"
    }
  ],
  "sources": ["array of URLs"]
}
```

### Notes on the schema
- `image: null` on a landmark is valid — not all landmarks will have images
- `summary` should be written for citizens, not Wikipedia readers
- `keyFacts` should prioritise surprising/distinctive facts over generic ones
- Image credits are mandatory — Wikimedia licenses require attribution

---

## Phase 5: File Output

### Directory structure
```
public/content/
└── [city-slug]/
    ├── [city-slug].json
    ├── [image-1].jpg
    ├── [image-2].jpg
    └── ...
```

### City slug convention
Lowercase, hyphenated. Examples: `preston`, `chester`, `bath`, `newcastle-upon-tyne`

---

## Recommended Pipeline Architecture

### Three-stage CLI batch process

**Stage 1 — Gather**
Input: city name + slug
Output: raw JSON dump + downloaded images in `/content/[slug]/`
Model: Haiku (mechanical, pattern-following)
Context: Fresh session per location. Pass schema template in system prompt.

**Stage 2 — Curate**
Input: raw JSON from Stage 1
Output: validated, cleaned JSON with confidence flags on uncertain fields
Model: Haiku or Sonnet for edge cases
Checks: required fields present, image files valid (not HTML), source URLs recorded

**Stage 3 — Implement**
Input: curated JSON
Output: Mongo record updated for the location
Model: No LLM needed — Node.js script reads JSON and upserts to location collection

### Key design principles
- Idempotent: check if `/content/[slug]/` exists before running gather
- Resumable: CLI can accept a list of slugs and skip completed ones
- Schema-first: lock the JSON schema before running any batch
- Verify images: always run `file` check after curl, fail fast on HTML
- Token economy: use `browser_evaluate` over `browser_snapshot` where possible
- Batch size: clear session context between locations to prevent accumulation

---

## Context Contamination Warning (for Haiku testing)

The Chester Haiku test ran in the same session as the Preston Sonnet run. Haiku
inherited all demonstrated patterns: the `Special:FilePath` trick, the curl
User-Agent fix, the `browser_evaluate` approach. This made Haiku look more capable
cold-start than it may actually be.

**Real cold-start Haiku test:** Fresh CLI session, Haiku model, schema template
passed as context, single location name. No prior demonstration in session.
This is the test that validates the pipeline before committing.

---

*Document written by Dex (Claude Code) — April 2026*
*Based on live session execution, not reconstruction from notes*
