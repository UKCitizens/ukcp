# Dex Instruction -- Apply asyncHandler to all route handlers
# Generated: 2026-05-03
# Author: Ali

---

## Context

A central Express error handler and process-level safety nets have been added
to the server (middleware/errorHandler.js, server.js). These only work if
errors actually reach the error handler via next(err).

Express 4 does not catch async errors automatically. Every async route handler
must be wrapped with asyncHandler so thrown errors are forwarded to next(err)
rather than becoming unhandled rejections.

middleware/asyncHandler.js has been created. It exports a single function.

---

## Task

Apply asyncHandler to every async route handler in every file in routes/.

Files to update:
  routes/admin.js
  routes/auth.js
  routes/communityNetworks.js
  routes/content.js
  routes/follows.js
  routes/forums.js
  routes/groups.js
  routes/people.js
  routes/places.js
  routes/posts.js
  routes/profile.js
  routes/schools.js
  routes/session.js

Also apply to middleware/auth.js -- the requireAuth function is async and
should have its outer body wrapped in try/catch forwarding to next(err) for
any error not already handled. The E11000 catch is already in place; add a
top-level try/catch around the entire function body so any unexpected throw
calls next(err) and returns rather than propagating.

---

## How to apply

### Step 1 -- Add import to each routes/ file

At the top of each file, add:

  import { asyncHandler } from '../middleware/asyncHandler.js'

### Step 2 -- Wrap each async handler

For every route defined as:

  router.get('/path', async (req, res) => { ... })
  router.post('/path', async (req, res) => { ... })
  router.patch('/path', async (req, res) => { ... })
  router.delete('/path', async (req, res) => { ... })

Change to:

  router.get('/path', asyncHandler(async (req, res) => { ... }))
  router.post('/path', asyncHandler(async (req, res) => { ... }))
  router.patch('/path', asyncHandler(async (req, res) => { ... }))
  router.delete('/path', asyncHandler(async (req, res) => { ... }))

Do not wrap sync handlers (those that do not use async/await). Do not wrap
handlers that are already wrapped.

If a route has multiple handlers (middleware chain), wrap each async one:

  router.post('/path', requireAuth, asyncHandler(async (req, res) => { ... }))

requireAuth itself is middleware -- it is handled separately (see below).

### Step 3 -- Patch middleware/auth.js requireAuth

Wrap the outer body of requireAuth in a top-level try/catch:

  export async function requireAuth(req, res, next) {
    try {
      // ... existing body unchanged ...
    } catch (err) {
      next(err)
    }
  }

The E11000 inner catch already in place handles the race condition and should
remain exactly as written inside the outer try.

---

## Verification

After applying:

1. Confirm server starts without error: node server.js
2. Confirm a deliberate throw in a test route returns a 500 JSON response
   with { error: 'INTERNAL', code: 500, message: '...' } rather than
   crashing the server.
3. Confirm the process stays alive after the error.

---

## Notes

- Do not change any route logic -- this is a mechanical wrapping exercise only.
- Do not add asyncHandler to non-async functions.
- The import path is ../middleware/asyncHandler.js from all files in routes/.
  From middleware/auth.js the pattern is different -- use the try/catch
  approach described in Step 3, not asyncHandler.
