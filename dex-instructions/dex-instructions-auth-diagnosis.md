# Dex Instructions -- Auth Diagnosis + Fix
> Session: next session after 3 May 2026
> Owner: Dex (Claude Code)
> Read CLAUDE.md before starting. Work in C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\

---

## Context

Ali overhauled auth from magic link to email/password (signInWithPassword + signUp).
Two things are broken and need server-side diagnosis with evidence before any code changes.
Do not guess. Run each diagnostic step, read the output, then fix.

---

## Issue 1 -- Registration confirmation email not sending

### What should happen
New user registers via LoginModal (Register tab) -> signUp called with email + password
-> Supabase sends confirmation email -> user clicks link -> SIGNED_IN fires -> logged in.

### What is happening
Confirmation email never arrives.

### Diagnostic steps

**Step 1 -- Check Supabase email confirmation setting**
Run this Node script from the project root to read the Supabase auth config:

```js
// save as /tmp/check-supabase.mjs and run: node /tmp/check-supabase.mjs
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// List recent users to confirm admin client is working
const { data, error } = await admin.auth.admin.listUsers({ perPage: 3 })
if (error) { console.error('Admin client error:', error.message); process.exit(1) }
console.log('Admin client OK. Recent users:')
data.users.forEach(u => console.log(' ', u.id, u.email, u.email_confirmed_at ? 'confirmed' : 'UNCONFIRMED'))
```

If the admin client errors -- stop and report. The service role key or URL is wrong.

**Step 2 -- Attempt a test signUp via the running server**
With the server running (node server.js), call the Supabase client signUp directly
via a test script. This bypasses the browser and confirms whether Supabase is sending
the email or silently failing:

```js
// save as /tmp/test-signup.mjs
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

const { data, error } = await client.auth.signUp({
  email:    'dex-test-001@example.com',
  password: 'TestPass123!',
  options: {
    data:            { display_name: 'Dex Test' },
    emailRedirectTo: 'https://localhost:3443',
  }
})
console.log('data:', JSON.stringify(data, null, 2))
console.log('error:', error)
```

Read the response carefully:
- If `data.user` exists and `data.user.email_confirmed_at` is null -> signUp worked,
  email should have been sent. Check Resend dashboard for delivery.
- If `data.user` exists and `data.user.email_confirmed_at` is set -> email confirmation
  is DISABLED in Supabase. User is auto-confirmed. This is why there is no email.
  This may actually be the desired behaviour for dev -- see Fix A below.
- If `error` is set -> report the error message exactly.

**Step 3 -- Check Resend delivery logs**
If Step 2 confirms an email was sent (confirmation not disabled), check Resend:
Go to https://resend.com/emails and look for emails to dex-test-001@example.com.
If not there, the Supabase -> Resend SMTP relay is broken.
Check: Supabase dashboard -> Project Settings -> Auth -> SMTP Settings.
The host should be smtp.resend.com, port 465, username = resend,
password = Resend API key. Report what is actually configured.

### Fix A -- Email confirmation disabled (simplest working state)
If Step 2 shows `email_confirmed_at` is set immediately, confirmation is off.
signUp auto-signs-in. The modal "Check your email" state is shown but the user is
already signed in -- SIGNED_IN fires, modal closes. This actually works.
No fix needed. Update the "Check your email" copy to say the account is ready
and they can close the tab, or remove the sent state entirely for this case.
Check: does the signUp response include a session? If `data.session` is non-null,
the user is immediately signed in and the modal should close on its own.

### Fix B -- SMTP relay broken
If confirmation is enabled but email never arrives at Resend, reconfigure SMTP
in Supabase dashboard. Report the current config and what needs changing.
Do not change Supabase dashboard settings -- report to Phil for manual change.

---

## Issue 2 -- Delete account does not remove Supabase record

### What should happen
Admin clicks "Delete account" in UserManager -> DELETE /api/admin/users/:supabaseId/auth
-> removes user from Supabase auth AND MongoDB -> user gone from both.

### What is happening
Server logs: "[admin/users] supabase delete error: User not found"
Mongo record remains. User still appears in DataManager list.

### Diagnostic steps

**Step 1 -- Verify a real supabase_id in Mongo**
Run:
```js
// save as /tmp/check-users.mjs
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()

const client = new MongoClient(process.env.MONGODB_URI)
await client.connect()
const db = client.db()
const users = await db.collection('users').find({}).limit(5).toArray()
users.forEach(u => console.log(u.supabase_id, '|', u.email, '|', u.display_name))
await client.close()
```

Look at the supabase_id values. They should be UUIDs like:
  a1b2c3d4-e5f6-7890-abcd-ef1234567890

If they are null, empty, or not UUID format -- that is the bug. Report it.

**Step 2 -- Verify the same UUID exists in Supabase**
Take one supabase_id from Step 1 and run:
```js
// save as /tmp/check-supabase-user.mjs
// Replace TARGET_ID with a real supabase_id from Step 1
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TARGET_ID = 'REPLACE_WITH_REAL_ID'
const { data, error } = await admin.auth.admin.getUserById(TARGET_ID)
console.log('user:', data?.user?.id, data?.user?.email)
console.log('error:', error?.message)
```

If this returns "User not found" for a UUID that exists in Mongo -- the Mongo record
is an orphan (Supabase record was previously deleted manually). The fix is already in
admin.js (graceful "not found" handling). Just clean up the orphan via Mongo directly:

```js
await db.collection('users').deleteOne({ supabase_id: TARGET_ID })
```

If this returns the user correctly -- the delete endpoint has a different problem.
Proceed to Step 3.

**Step 3 -- Test the delete endpoint directly**
With the server running, obtain a valid admin Bearer token (sign in as Phil/admin),
then call the delete endpoint via curl:

```bash
curl -X DELETE \
  https://localhost:3443/api/admin/users/TARGET_SUPABASE_ID/auth \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -k \
  -v
```

Read the full response. If 502 -- Supabase error. If 200 -- should have deleted.
Check server console output alongside the curl response.

### Fix
If orphan records are the issue (Supabase already deleted, Mongo remains):
The graceful "not found" handling in admin.js should cover this already (added 3 May).
Confirm the latest admin.js is deployed (server restarted after that change).

If the supabase_id in Mongo genuinely doesn't match any Supabase user for multiple
records -- there may be a systematic mismatch introduced during a data migration.
Report the pattern before fixing.

---

## Cleanup after diagnosis

After both issues are diagnosed and fixed:
1. Delete the test user dex-test-001@example.com from both Supabase and Mongo.
2. Run a full rebuild: npm run build
3. Restart server: node server.js
4. Smoke test: register a new account, confirm it works end to end, report result.

---

## Report back to Ali

Summarise:
- Issue 1: root cause + what was done
- Issue 2: root cause + what was done
- Any orphaned records found and cleaned up
- Smoke test result
