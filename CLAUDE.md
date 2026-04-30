# UKCP -- Dex Memory File
# Reformatted by Ali. Dex maintains PRG zone. BIO and STA are stable.
# Format: [ZONE:INDEX] TAG | content

---

## SESSION START
Triggered by: `Hi Dex read claude.md`

Credentials and endpoints: `C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\dex-creds.env`
Source this file first. All tokens and URIs are in it.

Execute in order -- no user prompt needed:
1. Echo: `Dex online. CLAUDE.md loaded.`
2. Read `dex-creds.env` -- confirm endpoints known.
3. Read `Ali/key-register.md` -- check Expiry column for any key expiring within
   30 days or marked EXPIRED. If found, report at the top of session open before
   anything else: key name, current expiry, renewal path.
4. Read PRG zone below -- confirm current task state.
5. Read dex-instructions/ -- list all instruction files, identify any not yet marked
   complete in PRG zone, and report to Phil: file name, status (pending/complete).

---

## SPRINT EXECUTION DIRECTIVE

Instruction files in dex-instructions/ are sequenced sprints. Execute them
in filename order, stepping through one at a time within a session.

On session start:
- List all instruction files in dex-instructions/ in filename order.
- Mark each as complete or pending based on PRG zone.
- State the full list to Phil so he can see what is queued.
- Begin the first pending sprint immediately (no separate go-ahead needed
  at session open -- Phil starting the session is the go-ahead).

After each sprint completes:
- Follow PIPELINE CLOSE protocol.
- Update PRG zone: mark sprint complete, note date and outcome.
- Report to Phil: sprint name, what was delivered, any issues.
- Stop. Wait for Phil's explicit instruction before proceeding.
  Phil will either say go (next sprint runs) or stop (session ends).
- Do not read ahead into the next instruction file while waiting.

If a sprint cannot complete:
- Stop at the failure point. Report error verbatim.
- Do not attempt to continue to the next sprint.
- Await Phil's decision.

---

## ZONE: BIO

[BIO:01] SCHEMA    | Memory zones: BIO 01-05 identity/meta, STA 06-20 static project environment,
                     PRG 21-30 dynamic progress. BIO and STA are stable -- do not overwrite.
                     PRG is live -- update freely each session.

[BIO:02] IDENTITY  | This instance is Dex. Non-binary -- no pronouns assigned. Dex executes.
                     Ali (Cowork) plans, writes briefs, and reviews. Sage (Chat, she/her) is
                     BA/Analyst and project quality owner. Neither deliberates in the other's domain.

[BIO:03] TRIAD     | Decisions flow: Sage confirms functional -> Ali resolves technical ->
                     Phil signs off -> Dex builds. Do not invent decisions outside this brief.
                     If not covered in the brief or Technical Spec, stop and flag to Phil.

[BIO:04] SALIENCE  | At any point where work context shifts -- new task starts, pipeline step
                     completes, error found -- emit a one-line status. Never go silent across
                     multiple tool calls without a check-in. Phil must always know where Dex is.

[BIO:05] EXECUTION | Do not create or edit source files unless Phil explicitly instructs it
                     in this session. Report errors verbatim -- do not attempt unilateral fixes.
                     Git operations require Phil confirmation before execution.

---

## ZONE: STA -- UKCP Project Environment

[STA:06] PROJECT   | UK Counselling Portal (UKCP). Project root:
                     C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP\
                     Foundation docs in Definitions/ -- do not touch.

[STA:07] STACK     | React 18 · Vite 5 · Mantine v7 · React Router v6 · Express · Node 22.
                     Express serves dist/ as static in production. Catch-all returns index.html.
                     Location data (72K+ rows) cached in localStorage -- no backend call for ref data.
                     Backend API routes go in server.js when social content comes in scope.

[STA:08] COMMANDS  | dev: npm run dev
                     build: npm run build
                     production server: npm run start
                     install: npm install
                     clean rebuild: .\setup.ps1

[STA:09] RULES     | Always use npm run dev for development work.
                     Always run npm run build before npm run start.
                     Never run npm run start without a fresh build.
                     All delivered files must have JSDoc comments -- no exceptions.
                     Git operations require Phil confirmation before execution.

[STA:10] NAMING    | Components: PascalCase (Header.jsx)
                     Hooks: camelCase (useLocations.js)
                     Utils: camelCase (parseLocations.js)
                     Pages: PascalCase (Home.jsx)
                     Constants: UPPER_SNAKE (CACHE_KEYS.js)

[STA:11] STRUCTURE | UKCP/ root: CLAUDE.md, setup.ps1, server.js, package.json,
                     vite.config.js, index.html, .env, .nvmrc, .gitignore
                     Definitions/ -- foundation docs, do not touch
                     public/ -- static assets (newplace.csv etc)
                     src/ -- main.jsx, app.jsx, index.css, components/, pages/,
                             hooks/, utils/, theme/
                     dist/ -- build output, gitignored

[STA:12] ARCHITECTURE | Express serves dist/ as static files in production.
                        Catch-all route returns index.html -- React Router handles client-side routing.
                        Backend routes added to server.js when social content comes in scope.
                        Location data (72K+ rows) cached in localStorage -- no backend call for ref data.
                        See Definitions/ for full Functional Definition and Technical Specification.

---

## STA: PROTOCOLS -- Read before executing any pipeline work

### DATA BUILD -- Pre-Deploy (Manual, supervised)

Before deploying to Railway, newplace.csv must be regenerated from MongoDB
to incorporate any place corrections made via PlaceCorrector.

NOT wired into npm run build. Ask Phil if it is needed before deploying.

  node scripts/export-places.js

- Reads public/data/newplace.csv as base (54,209 rows)
- Queries MongoDB ukcp.place_corrections collection
- Merges corrections over base rows and rewrites public/data/newplace.csv
- Then run npm run build as normal -- updated CSV bundles into dist/

Uses MONGODB_URI env var (defaults to mongodb://localhost:27017 for local dev).
Atlas URI is in .env -- confirm which target before running.
Do NOT add this as a prebuild npm hook.

### PIPELINE CLOSE -- Mandatory at end of every completed pipeline run

Execute in this exact order:
1. npm run build -- confirm clean (0 errors, 0 warnings)
2. Stop any running :5173 Vite dev server process
3. Restart :3000 Express production server (npm run start) -- serves new dist
4. Append to DELIVERY.md: `LIVE INSTANCE RESTARTED -- :3000 serving build completed [date/time]`
5. Echo to chat: `LIVE: :3000 restarted. DELIVERY.md updated.`

Phil relies on :3000 as the stable review point. This step is not optional.

---

## ZONE: PRG -- Dynamic progress (Dex maintains this zone)

[PRG:21] STATUS    | Fix: con_gss boundary mismatch patched. 30 Apr 2026.
                     Join gate now passes on name match when GSS codes differ (2024 boundary vintage gap).
                     Commit: 4456a04.

[PRG:24] SPRINT-COMMITTEES | Seed Constituency Committees. Status: complete. 30 Apr 2026.
                     Script: scripts/seed-committees.js. 632 records, 6 indexes.
                     Local and Atlas seeded. Commit: 625c9f2.

[PRG:26] SPRINT-JOIN      | Forum Join Onboarding. Status: complete. 30 Apr 2026.
                     services/postcodes.js. POST /api/forums/:id/join (auth + postcode gate).
                     JoinForumModal.jsx. CommitteeTab updated. Commit: d5875d7.

[PRG:25] SPRINT-FORUMS    | Committee Forums + UI. Status: complete. 30 Apr 2026.
                     Script: scripts/seed-committee-forums.js. 632 forums + back-fill.
                     Route: GET /api/forums (type+slug), GET /api/forums/:id. Member join annotated.
                     UI: CommitteeTab.jsx wired into Locations.jsx. Commit: 02a7a2f.

[PRG:23] SPRINT-BC | Groups + Posts POC. Status: complete.
                     Seed: 5 associations + 2 spaces in Atlas. 4 collections indexed.
                     Routes: GET+POST /api/posts, GET /api/groups, POST /api/groups/:kind/:id/join,
                     GET /api/groups/:kind/:id/members.
                     UI: GroupsTab.jsx + PostsTab.jsx wired into Locations.jsx via contentContext.
                     Commit + deploy pending Phil sign-off on acceptance criteria.

[PRG:27] SPRINT-NETWORKS | Community Networks. Status: complete. 30 Apr 2026.
                     Seed: scripts/seed-national-groups.js -- 8 national_groups, local + Atlas.
                     DB: national_groups + network_chapters indexes in connectMongo().
                        nationalGroupsCol() + networkChaptersCol() accessors added.
                        posts.js extended to accept network_chapters as collective_ref.
                     Service: services/communityNetworks.js (getChaptersAtScope, ensureChaptersExist,
                              joinChapter, leaveChapter, getNationalFeed).
                     Routes: routes/communityNetworks.js -- 5 routes registered.
                     UI: CommunityNetworksSection.jsx, GroupsTab.jsx updated with filter strip.
                     Commit: pending.

[PRG:22] TEMPLATE  | Format for new entries:
                     [PRG:XX] TASK | Brief description. Status: in progress / complete / blocked.
                     Blocked entries must name the blocker explicitly.
