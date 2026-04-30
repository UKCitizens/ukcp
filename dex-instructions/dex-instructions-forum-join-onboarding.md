# DEX INSTRUCTIONS -- SPRINT N+2: FORUM JOIN ONBOARDING FLOW
Date: 30 Apr 2026
Author: Ali
Status: Ready to execute after dex-instructions-seed-committee-forums-and-ui.md is complete

Read this file in full before starting.
Prerequisite: committee_forums seeded, CommitteeTab rendering, routes/forums.js live.
Read UKCP/Ali/forum-join-onboarding-baseline.md for design decisions.

---

## CONTEXT

This sprint implements the citizen onboarding flow for committee forum
membership. A user clicks "Join Forum" in CommitteeTab, enters their
postcode, the server verifies they live in the right constituency via
postcodes.io, and provisions a group_membership record.

Two new items of infrastructure: services/postcodes.js and the join
route in routes/forums.js. One new client component: JoinForumModal.jsx.

---

## SECTION 1 -- POSTCODES SERVICE

Create: services/postcodes.js

  /**
   * Looks up a UK postcode via postcodes.io.
   * Returns constituency name, con_gss, ward, ward_gss.
   * Throws on invalid postcode or network failure.
   */
  export async function lookupPostcode(postcode) {
    const normalised = postcode.replace(/\s+/g, '').toUpperCase()
    const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(normalised)}`
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) })

    if (resp.status === 404) {
      const err = new Error('Postcode not found')
      err.status = 400
      throw err
    }
    if (!resp.ok) {
      const err = new Error('Postcodes.io unavailable')
      err.status = 502
      throw err
    }

    const data = await resp.json()
    const r = data.result
    return {
      postcode:     r.postcode,
      constituency: r.parliamentary_constituency,
      con_gss:      r.codes?.parliamentary_constituency ?? null,
      ward:         r.ward,
      ward_gss:     r.codes?.ward ?? null,
    }
  }

Import lookupPostcode in routes/forums.js (see Section 2).

---

## SECTION 2 -- JOIN ROUTE

Add to routes/forums.js:

### POST /api/forums/:id/join

Auth: required. Reject 401 if no valid JWT. Use middleware/auth.js
(existing pattern).

Body: { postcode: String (required), reason: String (optional, max 500 chars) }

Logic:

  1. Load forum by _id. Return 404 if not found.

  2. Load parent committee via forum.committee_ref. Return 500 if missing.

  3. Normalise postcode: strip whitespace, uppercase.

  4. Call lookupPostcode(postcode).
     On 400 (invalid postcode): return 400 to client.
       { error: 'Postcode not recognised. Please check and try again.' }
     On 502 (postcodes.io down): return 503 to client.
       { error: 'Postcode lookup unavailable. Please try again shortly.' }

  5. Compare con_gss:
     If resolved con_gss !== committee.con_gss: return 403.
       {
         error: 'This forum is for residents of ' + committee.name +
                '. Your postcode is registered to ' +
                resolved.constituency + '.'
       }

  6. Check for existing membership:
     Query group_memberships where:
       collection_type: 'committee_forums'
       collective_id: forum._id
       user_id: userId from JWT
       status: 'active'
     If found: return 200 { message: 'Already a member.' }

  7. Insert group_membership:
     {
       collection_type:  'committee_forums',
       collective_id:    forum._id,
       user_id:          userId from JWT,
       membership_role:  'member',
       status:           'active',
       joined_at:        new Date(),
       postcode:         resolved.postcode,
       con_gss:          resolved.con_gss,
       reason:           body.reason?.trim() || null
     }

  8. Increment member_count on forum record:
     { $inc: { member_count: 1 } }

  9. Return 201 { message: 'Membership confirmed.', forumName: forum.name }

### GET /api/forums -- update for is_member

Update the existing GET /api/forums handler (from previous sprint):
  If Authorization header present and valid JWT:
    Look up group_membership as above.
    Add is_member: true/false to response.
  If no auth header: is_member: false (unauthenticated).

---

## SECTION 3 -- CLIENT: JOIN FORUM MODAL

Create: src/components/Committee/JoinForumModal.jsx

### Props

  forum       -- forum object (from CommitteeTab state)
  onClose     -- callback to close modal
  onSuccess   -- callback called with forum object on successful join

### States

  idle | submitting | success | error

### Render: idle state

  Modal/overlay (use Mantine Modal component).
  Title: 'Join ' + forum.name

  If user is not logged in (no session from useAuth()):
    Show message: 'You need to be signed in to join this forum.'
    Button: 'Sign in' -> navigate to / (Home/login page).
    Store intended join target in sessionStorage:
      key: 'pendingForumJoin', value: forum._id
    Do not show the postcode form.

  If user is logged in:
    Postcode input (required, label: 'Your postcode')
    Reason textarea (optional, label: 'Why do you want to join? (optional)',
      maxLength: 500, rows: 3)
    Submit button: 'Join Forum'
    Cancel button: closes modal.

### Render: submitting state

  Disable form. Show spinner / 'Verifying...' message.

### Render: success state

  Message: 'You are now a member of ' + forum.name + '.'
  Sub-text: 'You can now read and post in this forum.'
  Close button. On close: call onSuccess(forum).

### Render: error state

  Show error message from server response.
  Allow user to correct postcode and resubmit.
  Keep form inputs populated with previous values.

### Submit handler

  POST /api/forums/{forum._id}/join
  Headers: { Authorization: 'Bearer ' + session.access_token,
             Content-Type: 'application/json' }
  Body: { postcode, reason }
  On 201: transition to success state.
  On 400/403/503: transition to error state with server error message.
  On 401: show 'Session expired. Please sign in again.'

### Pending join on return from auth

  On CommitteeTab mount: check sessionStorage for 'pendingForumJoin'.
  If present and matches current forum._id and user is now logged in:
    Automatically open JoinForumModal.
    Clear sessionStorage key.

---

## SECTION 4 -- UPDATE COMMITTEETAB

In CommitteeTab.jsx:

  Import JoinForumModal.
  Add state: showJoinModal (boolean, default false).

  Join Forum button (currently a placeholder):
    onClick: setShowJoinModal(true)
    Disabled if is_member is true.
    Label: is_member ? 'Joined' : 'Join Forum'

  Render JoinForumModal when showJoinModal is true:
    onClose: setShowJoinModal(false)
    onSuccess: (forum) => {
      setShowJoinModal(false)
      setIsMember(true)
      setForum({ ...forum, member_count: forum.member_count + 1 })
    }

  Add isMember state (initialised from forum.is_member on fetch).
  Update Join button based on isMember state.

---

## SECTION 5 -- COMMIT AND DEPLOY

  git add services/postcodes.js \
          routes/forums.js \
          src/components/Committee/JoinForumModal.jsx \
          src/components/Committee/CommitteeTab.jsx
  git commit -m "Sprint N+2: forum join onboarding -- postcode verification, membership provisioning"
  git push

Verify Railway deploy. Verify Vercel deploy.

---

## ACCEPTANCE CRITERIA

  [ ] POST /api/forums/:id/join returns 201 for valid postcode in correct constituency
  [ ] POST /api/forums/:id/join returns 403 for valid postcode in wrong constituency
    with correct constituency names in error message
  [ ] POST /api/forums/:id/join returns 400 for invalid postcode
  [ ] POST /api/forums/:id/join returns 401 with no JWT
  [ ] group_memberships record created correctly (postcode, con_gss, reason stored)
  [ ] member_count increments on forum record
  [ ] JoinForumModal opens from CommitteeTab Join Forum button
  [ ] Logged-out user sees sign-in prompt in modal, not postcode form
  [ ] After sign-in return: pending join modal reopens automatically
  [ ] Success state renders correctly
  [ ] Error state renders with server message and allows resubmit
  [ ] Join button changes to 'Joined' after successful join (no page reload)
  [ ] Deployed and confirmed live on www.ukcportal.co.uk

---

END OF INSTRUCTIONS
