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

[PRG:28] SPRINT-LOCATION | User Location Persistence + Post Composer Wiring. Status: complete. 30 Apr 2026.
                     routes/forums.js: confirmed_location written to user on forum join.
                     routes/posts.js: committee_forums added to collective_ref whitelist.
                     CommitteeTab.jsx: PostsTab replaces inline feed.
                     CommunityNetworksSection.jsx: local posts toggle per chapter.
                     Commit: a1a35fa.
                     Hotfix: ensureChaptersExist E11000 -- filter/query slug mismatch fixed.
                     Commit: 37da545.

[PRG:27] SPRINT-NETWORKS | Community Networks. Status: complete. 30 Apr 2026.
                     Seed: scripts/seed-national-groups.js -- 8 national_groups, local + Atlas.
                     DB: national_groups + network_chapters indexes in connectMongo().
                        nationalGroupsCol() + networkChaptersCol() accessors added.
                        posts.js extended to accept network_chapters as collective_ref.
                     Service: services/communityNetworks.js (getChaptersAtScope, ensureChaptersExist,
                              joinChapter, leaveChapter, getNationalFeed).
                     Routes: routes/communityNetworks.js -- 5 routes registered.
                     UI: CommunityNetworksSection.jsx, GroupsTab.jsx updated with filter strip.
                     Commit: 6415140.

[PRG:31] SPRINT-SCHOOLS-DATA | Schools Full Data. Status: complete. 01 May 2026.
                     Created: scripts/seed-schools.js (ESM, OSGB->WGS84, latin-1 CSV, batched 500).
                     Created: routes/schools.js (ward/constituency/county/proximity scope).
                     Modified: db/mongo.js -- schoolsCol() accessor + 5 schools indexes in connectMongo().
                     Modified: server.js -- /api/schools route mounted.
                     Modified: routes/communityNetworks.js -- chapter-by-institution endpoint added.
                     Modified: SchoolsLeftNav -- API fetch replaces MOCK_SCHOOLS, onSchoolsChange prop.
                     Modified: SchoolGatesMid -- chapter fetch + PostsTab replaces stub cards.
                     Modified: Locations.jsx -- schoolLocationScope (ward > constituency),
                       loadedSchools state, MOCK_SCHOOLS import removed, focusSchool from live data.
                     NOTE: county scope not wired (la_gss not in wards data). Ward + constituency only.
                     Seed: node --env-file=.env scripts/seed-schools.js (run once, ~2-3 min, ~27k records).
                     Build: clean.

[PRG:30] SPRINT-SCHOOL-GATES | At the School Gates POC. Status: complete. 01 May 2026.
                     Created: src/data/mock-schools.js (16 Camden/Greenwich schools).
                     Created: SchoolGates/ -- SchoolsLeftNav, SchoolGatesMid, SchoolsRightNav.
                     Modified: CommunityNetworksSection -- NETWORK_MODE_SLUGS, onNetworkSelect prop,
                       tile click routes to network mode for 'at-the-school-gates'.
                     Modified: GroupsRightNav -- onNetworkSelect prop passed through.
                     Modified: Locations.jsx -- useAuth/session, 3 new state vars, 4 handlers,
                       focusSchool derived, activeLeftPane/activeRightPane wrapped in network
                       mode condition, groupsPane swaps to SchoolGatesMid in network mode.
                     Build: clean. Awaiting restart and test.

[PRG:38] SPRINT-AUTH-S4 | Auth, Permissions and Profile -- Section 4 of 4. Status: complete -- sprint complete. 02 May 2026.
                     Scope: login redirect round-trip. AuthContext owns post-login routing.
                     main.jsx: BrowserRouter hoisted above AuthProvider so AuthContext can call
                       useNavigate(). Order is now MantineProvider > BrowserRouter > AuthProvider
                       > UserStateProvider > App.
                     app.jsx: BrowserRouter removed (now lives in main.jsx). App now renders
                       <DefaultLandingRedirect/> + <Routes> as siblings inside a fragment.
                     AuthContext.jsx: imports useNavigate. After mergeAnonData on SIGNED_IN,
                       reads sessionStorage.ukcp_login_redirect, falls back to /profile, clears
                       the key, and navigates with replace:true. INITIAL_SESSION /
                       TOKEN_REFRESHED never trigger redirect -- only genuine sign-in.
                     Home.jsx: removed the navigate('/locations') from the onAuthStateChange
                       handler. Listener now only handles INITIAL_SESSION (logged-in user landing
                       on /login -> /profile) and the no-session case (hide spinner).
                       getSession fast-path also routes to /profile (was /locations).
                     SiteHeaderRow1.jsx: profile icon click handler now gates on session.
                       Anon click -> sessionStorage.setItem('ukcp_login_redirect', '/profile')
                       + navigate('/login'). Logged-in click -> navigate('/profile').
                     Profile.jsx auth gate (added in Section 3) already stashes
                       'ukcp_login_redirect' before bouncing to /login -- now round-trips
                       correctly via the AuthContext SIGNED_IN handler.
                     Build: clean (0 errors, 0 warnings, 6964 modules).
                     Smoke tests post-restart: root 200, /login 200, /profile 200,
                       /api/profile 401 (Tier 1 still enforces).
                     Pipeline closed: :3443 restarted, Mongo connected.

                     POST-SPRINT FIX (02 May 2026, after PRG:38 ship):
                     Sprint-32 regression check found 4/10 fails -- all from Section 4's
                     post-login default of /profile. Phil ruled the brief default was wrong
                     ("should come back to home(locations)").
                     Reverted: AuthContext.jsx returnTo fallback /profile -> /locations.
                     Reverted: Home.jsx INITIAL_SESSION + getSession redirects /profile -> /locations.
                     Stash path (sessionStorage.ukcp_login_redirect) still wins when set, so
                     Profile.jsx auth gate + SiteHeaderRow1 profile-icon-anon-click both round-trip
                     to /profile correctly.
                     Re-ran sprint-32: 10/10 PASS in 1m07s.
                     No new tests written -- failures resolved by code change, not retrospective
                     coverage (per feedback_test_and_report_contract).

                     SPRINT COMPLETE: Sections 1-4 all delivered. PRG:35-38 cover the work.

[PRG:37] SPRINT-AUTH-S3 | Auth, Permissions and Profile -- Section 3 of 4. Status: complete. 02 May 2026.
                     Scope: Profile page + preferences endpoint + preferences feeding back into app.
                     routes/profile.js: rewritten.
                       GET /api/profile now returns the composite shape:
                         { user, follows, joined_groups, recent_posts, post_count,
                           anon_post_count, claims }.
                       follows pulled from user_follows. joined_groups from group_memberships
                         (status:'active'). recent_posts from posts where author_user_id matches
                         and status:'published' (corrected the brief's stale `author.user_id`
                         + status:'active' assumptions). post_count is the matching countDocuments.
                       anon_post_count returned as 0 -- anon posts store author_user_id:null and
                         are linked only by anon_token, so per-user attribution isn't possible
                         from the post record alone. Documented inline.
                       Sensitive fields stripped from user (currently device_cookie_id only).
                       PATCH /api/profile/preferences added: PREFERENCE_ENUMS allowlist
                         (default_load_page, default_tab, default_posting_mode), each value
                         enum-validated, written under preferences.* paths, only fields
                         present in body are touched.
                       PATCH /api/profile (existing) left intact for display_name/bio etc.
                     Profile.jsx: replaced. Five Paper panels:
                       1. Identity -- platform_role + affiliated + verified badges, display_name
                          edit, email, member-since, save via PATCH /api/profile.
                       2. Civic footprint -- confirmed_location, followed schools, joined
                          groups+forums, other follows.
                       3. Contributions -- post_count, recent_posts list, anon caveat.
                       4. Roles -- claims read-out with admin-write disclaimer.
                       5. Preferences -- three selects, save via PATCH /api/profile/preferences.
                       Auth gate: stash sessionStorage.ukcp_login_redirect = '/profile' before
                         routing to /login, so Section 4 redirect can land back here.
                     SiteHeaderRow1.jsx: profile.display_name -> profile.user.display_name
                       (only stale consumer of the old flat shape).
                     Locations.jsx: new snapHasData state in handleRestore. After snapshotReady,
                       if no snapshot data was restored AND profile.user.preferences.default_tab
                       is set, apply it to midTab once. Doesn't fight a real snapshot.
                     app.jsx: new DefaultLandingRedirect component mounted inside BrowserRouter.
                       On load, if user lands on '/' or '/locations' and
                       preferences.default_load_page === 'myhome', redirect via navigate(replace).
                       Fires once per mount.
                     Build: clean (0 errors, 0 warnings, 6964 modules).
                     Smoke tests post-restart: root HTTP 200, /api/profile HTTP 401 (Tier 1),
                       /api/admin/users HTTP 401 (Tier 2 -- 401 because no token reaches the
                       requireRole stage, expected).
                     Pipeline closed: :3443 restarted, Mongo connected.

[PRG:36] SPRINT-AUTH-S2 | Auth, Permissions and Profile -- Section 2 of 4. Status: complete. 02 May 2026.
                     Scope: AuthContext claims + useAuth() extension + profile fetch on login.
                     src/context/AuthContext.jsx:
                       New DEFAULT_CLAIMS constant + claimsFromSession(session) helper.
                       New claims state, defaulted to DEFAULT_CLAIMS for anon.
                       claims set on initial getSession() and on every onAuthStateChange.
                       claims reset to DEFAULT_CLAIMS on signOut.
                       Context value now: { session, user, claims, profile, loading, signOut }.
                     useAuth() unchanged (returns ctx) -- consumers automatically get claims.
                     Profile fetch on SIGNED_IN: already in place from earlier work; no edit needed
                       (fetchProfile already called inside both getSession and onAuthStateChange paths).
                     Shape mirrors middleware/auth.js req.claims (Section 1) so client + server
                       reason about the same object.
                     No consumer reads claims yet -- Section 3 (Profile.jsx) will be the first.
                     Build: clean (0 errors, 0 warnings, 6964 modules).
                     Pipeline closed: :3443 restarted, HTTP 200 on root, Mongo connected.

[PRG:35] SPRINT-AUTH-S1 | Auth, Permissions and Profile -- Section 1 of 4. Status: complete (build), pending bootstrap. 02 May 2026.
                     Scope: roles into Supabase app_metadata + middleware tiers.
                     middleware/auth.js: requireAuth now attaches req.claims (platform_role,
                       affiliated_roles, display_name, registration_complete) read from sbUser.app_metadata.
                       New requireRole(role) factory exported -- 403 on mismatch.
                     routes/admin.js: router.use(requireAuth, requireRole('admin')) -- entire router
                       is now Tier 2. New PUT /api/admin/users/:supabaseId/claims:
                       writes Supabase app_metadata via supabaseAdmin.auth.admin.updateUserById,
                       mirrors platform_role/affiliated_roles/registration_complete + (when supplied)
                       display_name to Mongo users record. Validates platform_role against
                       {citizen, affiliated, admin} and affiliated_roles as string[].
                     routes/places.js: admin block (/admin/places, /admin/places/corrections,
                       /admin/places/:id) gated by adminGuard = [requireAuth, requireRole('admin')].
                       Public /places/search remains Tier 0.
                     UserManager.jsx: new "Roles (Supabase claims)" section -- platform_role select,
                       affiliated_roles checkboxes (content_manager, proctor), registration_complete
                       checkbox, dedicated "Save claims" button -> PUT /admin/users/:supabaseId/claims.
                       All 4 admin fetches now send Authorization: Bearer ${session.access_token}.
                       List fetch waits for session before firing.
                     DataManager.jsx + PlaceCorrector.jsx: same Authorization header pattern applied
                       so existing admin tooling keeps working under the new tier guard.
                     Build: clean (0 errors, 0 warnings, 6964 modules).
                     Tier audit (no code change required):
                       Tier 0 (public): GET /api/content/:type/:slug, /api/places/search, /api/schools,
                         /api/forums (read), /api/posts (read), /api/community-networks (read).
                       Tier 1 (requireAuth, already in place): /api/follows, /api/session/snapshot,
                         /api/profile, POST /api/posts, /api/forums/:id/join,
                         /api/community-networks/chapters/:id/{join,leave},
                         PATCH /api/community-networks/feed/:postId/suppress.
                       Tier 3 deferred: feed suppress and committee post privileges left as Tier 1
                         per brief instruction.
                     Outstanding (Section 1e bootstrap): no admin user exists yet. Phil must seed
                       his Supabase app_metadata.platform_role = 'admin' via Supabase dashboard
                       before deploying -- otherwise the admin tooling locks out everyone including
                       the bootstrap path. Plan: set claim in Supabase dashboard, log out + log in
                       to refresh the JWT, then UserManager becomes self-serve.
                     Build entry appended to DELIVERY.md. Live restart pending Phil.

[PRG:34] BUGFIX-PRG32 | Bug 1 + Bug 2 from PRG:33 test outcomes. Status: complete. 02 May 2026.
                     Bug 1 (merge trigger path):
                       NEW: src/lib/mergeAnonData.js -- extracted from Home.jsx, no behaviour change.
                       AuthContext.jsx: now runs mergeAnonData() on SIGNED_IN, awaits before propagating
                         session downstream. Fires regardless of which page magic-link redirect lands on.
                       Home.jsx: removed local mergeAnonData + the merge call -- listener just routes.
                     Bug 2 (auth race):
                       useSessionSnapshot.js: returns { ready }, flips true after initial restore resolves
                         (whether from API, localStorage, or null). Anon: ~one tick. Logged-in: post-fetch.
                       Locations.jsx: renders "Restoring session…" overlay (role=status, blocks input)
                         until snapshotReady -- prevents fast clicks from dropping writes.
                     Test impact: test 6 switched from loginViaLogin to loginViaLocations -- now validates
                       the real production trigger path (magic link lands on /, merge still fires).
                       waitForLocationsReady now waits for the scrim to lift; explicit waitForAuthResolved
                       calls redundant in most tests (kept where strip-content assertion is the point).
                     Result: 10/10 PASS (36.5s -- faster than pre-fix 49.6s).
                     Build: clean.

[PRG:33] SPRINT-TEST-INFRA | Playwright sprint test scaffold. Status: complete. 02 May 2026.
                     Tooling: @playwright/test 1.59 + chromium binary.
                     Files: playwright.config.js, tests/helpers/auth.js (generateLink magic link bypass),
                       tests/helpers/db-cleanup.js (per-test user_session + user_follows reset),
                       tests/sprint-32.spec.js (10 tests). package.json: test:sprint, :ui, :head scripts.
                     Pre-req: HTTPS :3443 up, .env populated. Single-worker serial, ~50s/run.
                     Iteration: 3 runs to green (locator strict-mode, then auth race fix).
                     Findings (real bugs): Bug 1 + Bug 2 fixed in PRG:34. See above.

[PRG:32] SPRINT-USER-SESSION-STATE | User Session State, Follows, Identity Strip. Status: data layer proven, UI surface partial. 02 May 2026.
                     Phil manual test 01 May: T1 PASS, T2 partial (school list not populating), T3-6 not retested.
                     Phil reverted to Ali for replanning, then asked Dex to scaffold automated tests.
                     Playwright suite (PRG:33) shows 10/10 PASS but with documented coverage gaps:
                       - Save/Follow button click flows untested (API direct, button DOM not exercised)
                       - selectedSchoolUrns hydration on mount untested -- where T2 hurt
                       - SchoolsLeftNav Mine-default toggle untested
                       - Tab restoration untested
                       - SchoolGates UI flow not entered (sidesteps the T2 issue Phil hit)
                     Two real bugs surfaced during testing -- see PRG:33 and Ali/sprint-32-test-handoff.md.
                     Code shipped is in tree -- do NOT revert files. Awaiting Ali replan.
                     Section 1 -- Session Snapshot:
                       db/mongo.js: sessionCol() + user_session unique index on user_id.
                       routes/session.js: GET/PATCH /api/session/snapshot, requireAuth, allowlisted fields.
                       server.js: sessionRouter mounted on /api.
                       src/hooks/useSessionSnapshot.js: Bearer auth, 500ms debounce write, single restore on mount,
                         anon falls back to localStorage 'ukcp_session_snapshot'.
                       src/pages/Locations.jsx: snapshot memo + handleRestore + hook wired.
                     Section 2 -- user_follows:
                       db/mongo.js: followsCol() + 3 indexes (lookup, reverse, unique compound).
                       routes/follows.js: GET (by entity_type), POST (upsert with $setOnInsert), DELETE.
                       server.js: followsRouter mounted on /api/follows.
                       Locations.jsx: hydration on auth resolve, handleToggleSchool persists to API or localStorage.
                       SchoolsRightNav.jsx: single toggle button, label per auth+state matrix.
                       SchoolsLeftNav.jsx: 'my' default toggle on first non-empty hydration (ref-guarded).
                     Section 3 -- UserStateContext + identity strip:
                       src/context/UserStateContext.jsx: { scopeLabel, activeNetworkLabel, updateUserState }.
                       main.jsx: UserStateProvider wraps App inside AuthProvider.
                       Locations.jsx: NETWORK_LABELS map; effect writes scope + network on path/network change.
                       SiteHeaderRow1.jsx: identity strip between logo and icon cluster (visibleFrom='sm').
                       SiteHeaderRow1.module.css: .identityStrip + .who/.where/.network rules.
                     Section 4 -- anon merge on login:
                       Home.jsx: mergeAnonData() runs on SIGNED_IN, PATCHes snapshot + POSTs each save in parallel,
                         clears LS keys after success.
                       routes/follows.js: POST honours optional followed_at to preserve original save timestamps.
                     Notes: codebase uses Bearer auth (req.user._id) -- brief's req.userId pattern doesn't exist here,
                       hook adapted accordingly. selected_school_urn maps to focusSchoolUrn (single focused school);
                       selectedSchoolUrns array now sourced from user_follows. geo_path stored as full path objects
                       so restore is one selectMany call. NETWORK_LABELS extended per new network.
                     Build: clean.

[PRG:29] SPRINT-TAB-NAV | Tab Nav Panes. Status: complete. 01 May 2026.
                     Created src/components/TabNavs/ with 8 components:
                     GroupsLeftNav, GroupsRightNav, NewsLeftNav, NewsRightNav,
                     TradersLeftNav, TradersRightNav, CivicLeftNav, CivicRightNav.
                     GroupsTab: filter state + strip removed, filter received as prop.
                     Locations.jsx: groupsFilter state, NavNudge, activeLeftPane/activeRightPane
                     computed values, leftPane/rightPane props replaced, groupsFilter passed to GroupsTab.
                     Build: clean. :3000 restarted.

[PRG:22] TEMPLATE  | Format for new entries:
                     [PRG:XX] TASK | Brief description. Status: in progress / complete / blocked.
                     Blocked entries must name the blocker explicitly.
