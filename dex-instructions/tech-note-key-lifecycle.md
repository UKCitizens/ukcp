# TECH NOTE -- CREDENTIAL LIFECYCLE AND KEY CONTROL
Date: 30 Apr 2026
Author: Dex
For: Ali
Status: Needs design decision and artefact creation

---

## PROBLEM

During today's deploy session, the Railway API token in dex-creds.env had expired.
Dex could not trigger or verify a Railway deploy programmatically. The deploy
succeeded because Railway auto-deploys on git push -- but that was luck of
architecture, not process. Had manual triggering been required, the session
would have stalled waiting for Phil to intervene.

Phil confirms tokens are set to expire intentionally (security posture is correct).
The gap is: no process exists for the expiry event. No one knows when a key is
due to expire, and there is no documented renewal path.

---

## THE ASK

Design two things:

1. A key control document -- a living register of every credential this project
   holds, with: what it is, what it gates, who issues it, current expiry, and
   renewal instructions.

2. A renewal process -- what happens when a key expires or is about to. Who
   rotates it, where the new value goes, who gets notified. Specifically:
   does Dex get an updated dex-creds.env, or does Phil source it another way?

---

## SUGGESTED RESOLUTION

### Key control doc

A single file: UKCP/dex-instructions/key-register.md (or UKCP/Ali/key-register.md
if Ali prefers it outside Dex's view).

One row per credential. Suggested columns:

  | Key | Service | Gates | Issued by | Expiry | Renewal path |

Phil sets expiry policy per key (short for CI tokens, longer for DB credentials,
never for read-only public keys). Ali owns the doc. Phil fills in expiry dates
when he rotates.

### Renewal event process

When a key expires:
  1. Phil rotates in the issuing service dashboard.
  2. Phil updates dex-creds.env with the new value.
  3. Phil updates expiry date in key-register.md.
  4. If Railway/Vercel env vars are involved, Phil updates them in the platform
     dashboard too (they are separate from dex-creds.env).
  5. Dex sources dex-creds.env at next session start (already in CLAUDE.md protocol).

No automation needed at this stage. The register is the early-warning system --
Phil can see what is due before it breaks a session.

---

## CURRENT CREDENTIALS -- UKCP (as of 30 Apr 2026)

Sourced from dex-creds.env. Expiry and renewal path unknown / not yet documented.

| Key                    | Service       | Gates                                      | Expiry |
|------------------------|---------------|--------------------------------------------|--------|
| GITHUB_TOKEN           | GitHub        | git push / repo access for UKCitizens/ukcp | ?      |
| RAILWAY_TOKEN          | Railway       | deploy trigger / dashboard API             | ?      |
| MONGODB_URI            | MongoDB Atlas | all database reads and writes              | never* |
| SUPABASE_ANON_KEY      | Supabase      | client-side auth (public key)              | never* |
| SUPABASE_SERVICE_ROLE_KEY | Supabase   | server-side auth verification (admin key)  | never* |
| RESEND_TOKEN           | Resend        | transactional email sending                | ?      |

* Supabase and MongoDB keys do not expire by default but can be rotated manually.
  SUPABASE_SERVICE_ROLE_KEY is sensitive -- admin-level access to auth system.
  Should be treated as high-risk and rotation policy agreed.

RAILWAY_TOKEN confirmed expired today. GITHUB_TOKEN and RESEND_TOKEN expiry unknown.

---

## RECOMMENDED NEXT STEPS FOR ALI

1. Create UKCP/Ali/key-register.md using the table above as the starting skeleton.
2. Add expiry and renewal columns. Phil fills in current expiry dates.
3. Agree where the doc lives and who owns it (suggest Ali owns, Phil updates dates).
4. Add a note to session start protocol: Dex checks key-register.md for any
   keys flagged as expiring within 30 days and reports to Phil at session open.

---

END OF TECH NOTE
