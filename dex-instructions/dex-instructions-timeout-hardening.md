# Dex Instruction File -- Timeout Hardening (server.js)

## Context

Railway crashed and was restarted. Root cause analysis identified two structural gaps:

1. MongoClient has no socket or server-selection timeout. If the Atlas connection stalls,
   any `await col.findOne()` or similar waits indefinitely. The Express handler never
   responds. The client fetch never resolves or rejects -- browser spins forever.

2. All external fetch calls (Wikipedia, Wikidata, Parliament, Nomis) have no AbortSignal
   timeout. A slow or unresponsive upstream holds the request open indefinitely.

This file covers both fixes. One file changed: server.js.

---

## Change 1 -- MongoClient timeout options

File: server.js
Location: line 35 (the `new MongoClient(MONGO_URI)` call)

Replace:
```js
const mongoClient = new MongoClient(MONGO_URI)
```

With:
```js
const mongoClient = new MongoClient(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:          10000,
  connectTimeoutMS:         5000,
})
```

These values mean:
- serverSelectionTimeoutMS: give up selecting a server after 5s (triggers on Atlas unreachable)
- socketTimeoutMS: abandon a socket operation after 10s (triggers on stalled query)
- connectTimeoutMS: abandon initial TCP connect after 5s

---

## Change 2 -- AbortSignal.timeout() on all external fetch calls

AbortSignal.timeout(ms) is available in Node 17+. It creates a signal that auto-aborts
after the given milliseconds, causing the fetch to throw an AbortError. The existing
try/catch blocks in each handler will catch it and return a 502 or error response.

Apply a signal to every external fetch in server.js. Use 8000ms (8 seconds) for all.

### 2a -- Parliament Constituency Search (approx line 304)

Replace:
```js
const conResp = await fetch(conUrl, {
  headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' }
})
```

With:
```js
const conResp = await fetch(conUrl, {
  headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
  signal: AbortSignal.timeout(8000),
})
```

### 2b -- Wikidata fetch inside constituency block (approx line 331)

Replace:
```js
const wdResp = await fetch(wdUrl, { headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' } })
```

With:
```js
const wdResp = await fetch(wdUrl, {
  headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
  signal: AbortSignal.timeout(8000),
})
```

### 2c -- Wikipedia REST Summary fetch (approx line 360)

Replace:
```js
const response = await fetch(wikiUrl, {
  headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' }
})
```

With:
```js
const response = await fetch(wikiUrl, {
  headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
  signal: AbortSignal.timeout(8000),
})
```

### 2d -- Wikidata fetch inside wiki block (approx line 373)

Replace:
```js
const wdResp = await fetch(wdUrl, { headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' } })
```

With:
```js
const wdResp = await fetch(wdUrl, {
  headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
  signal: AbortSignal.timeout(8000),
})
```

### 2e -- Nomis population fetch (approx line 445)

Replace:
```js
const resp = await fetch(nomisUrl, { headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' } })
```

With:
```js
const resp = await fetch(nomisUrl, {
  headers: { 'User-Agent': 'UKCP/1.0 (phil@ukcp.dev)' },
  signal: AbortSignal.timeout(8000),
})
```

---

## Verification

After making changes:

1. Run locally: `node server.js` -- confirm server starts and logs "MongoDB connected".
2. Test a content request locally: GET http://localhost:3000/api/content/county/Aberdeenshire
   -- should return JSON within a couple of seconds.
3. Check no syntax errors: `node --check server.js`

---

## Deployment

After local verification:

```
cd C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP
git add server.js
git commit -m "Add MongoDB and fetch timeouts to prevent indefinite hangs"
git push
```

Railway auto-deploys on push. Confirm Railway shows "Active" status after deploy.

---

## Reminder (not in scope for this file)

Phil is separately updating Railway env var CLIENT_ORIGIN to https://www.ukcportal.co.uk.
That change takes effect immediately in Railway dashboard -- no redeploy needed.
