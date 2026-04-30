# TECH NOTE + FIX -- CON_GSS BOUNDARY MISMATCH IN FORUM JOIN ROUTE
Date: 30 Apr 2026
Author: Ali
Status: Ready to execute -- small patch, no schema changes

---

## PROBLEM

The POST /api/forums/:id/join route gates on con_gss match between:
  - resolved.con_gss  -- returned by postcodes.io (2024 post-boundary-review codes)
  - committee.con_gss -- seeded from newplace.csv (pre-2024 IPN vintage, frozen)

The 2024 parliamentary boundary review changed GSS codes for many constituencies
while retaining the same constituency names. postcodes.io returns the new codes.
Our seeded data carries the old codes. Result: a valid postcode in the correct
constituency is rejected because the GSS codes differ even though the name matches.

Observed in testing: FY83NF in Fylde forum -- error read "This forum is for
residents of Fylde. Your postcode is registered to Fylde." Both sides correctly
identified as Fylde; gate rejected on GSS mismatch alone.

---

## FIX

One file: routes/forums.js
One change: Step 5 of the POST /:id/join handler.

Replace:

  if (resolved.con_gss !== committee.con_gss) {
    return res.status(403).json({
      error: `This forum is for residents of ${committee.name}. Your postcode is registered to ${resolved.constituency}.`,
    })
  }

With:

  const gssMatch  = resolved.con_gss && resolved.con_gss === committee.con_gss
  const nameMatch = resolved.constituency?.toLowerCase().trim() ===
                    committee.name?.toLowerCase().trim()

  if (!gssMatch && !nameMatch) {
    return res.status(403).json({
      error: `This forum is for residents of ${committee.name}. Your postcode is registered to ${resolved.constituency}.`,
    })
  }

Logic: pass if either GSS codes match OR constituency names match (case-insensitive,
trimmed). Reject only when both checks fail -- genuine wrong constituency.

---

## WHY NAME MATCH IS SAFE HERE

Constituency names are stable across the boundary review. The review changed
boundaries and GSS codes but did not rename existing constituencies in the
overwhelming majority of cases. Name collision between two different
constituencies is not a realistic risk at this scope. The name check is a
correct fallback for the data vintage gap, not a security compromise.

The proper long-term fix is to re-seed con_gss values from postcodes.io or
updated ONS data. That is a data pipeline task, not urgent. This patch bridges
the gap cleanly until then.

---

## DEPLOY

  git add routes/forums.js
  git commit -m "Fix: con_gss boundary mismatch -- name fallback in forum join gate"
  git push

Verify Railway deploy. Test: use a postcode known to be in a constituency where
GSS codes changed post-2024 (e.g. FY8 3NF for Fylde) -- join should now succeed.

---

END OF TECH NOTE
