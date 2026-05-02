# ALI MASTER MEMORY -- PRG ZONE
> Paste this file at session start when current progress context is needed.
> BIO and STA zones are permanent in .claude/CLAUDE.md -- do not paste those.
> Format: [ZONE:INDEX] TAG | content
> PRG zone: purge and rewrite freely each cycle. Phil owns all changes.
> Archive: PRG:21-44 moved to ali-master-memory-archive.md (sessions 30 Mar - 9 Apr 2026).
> Archive: PRG:55-92 (sessions 20-27 Apr) summarised in PRG:123 below.

---

## ZONE: PRG -- Dynamic progress (purge and re-establish as needed)

[PRG:128] PROGRESS  | Session 3 May 2026 -- Bug fixes, Dex stack review, MyHome build.
                     FIXES: MidPaneMap.jsx + Locations.jsx -- NaN guard added to flyTo call site and
                       setFlyTo upstream guard (was falsy check only, missed truthy non-numeric strings).
                       LocationSearch.jsx -- DROPDOWN_Z raised 100->1000 (was hidden behind Leaflet tile
                       layer z-index 200). Classic Leaflet tax, comment added in code.
                     DEX STACK REVIEW: 6 stacked instruction files reviewed against post-restructure
                       codebase. news-tab/traders-shell/people-page/phone-auth clean. civic-restructure
                       has CommitteeTab fix already done in PRG:39 -- note added to file. banner-5slot
                       STALE (assumed 5-slot Row2, restructure made it single right-slot) -- rewritten to
                       wire single b1 field from geo-content. Review doc: Ali/dex-stack-review-02may.md.
                     MYHOME: src/pages/MyHome.jsx built from stub. Three zones: (A) identity strip --
                       avatar, name, role badge, home location, follow/join counts. (B) control bar --
                       reach SegmentedControl (ward/constituency/county/region/national) + watching pills
                       (scrollable, click to switch feed context, civic first then social). (C) feed --
                       PostsTab with selected context + reach, left-border accent by entity type.
                       Auth-gated, bounces to /login. Contexts from profile.follows + joined_groups.
                     OUTSTANDING: Dex queue (news-tab etc) running -- results not yet confirmed.
                       Rebuild + smoke test needed to confirm NaN fix, crumb behaviour, MyHome renders.
                       Sprint 3 (emblem/flag geo-content wiring, right slot b1, crumb refinement) not started.

[PRG:129] PROGRESS  | Session 3 May 2026 (session 2) -- Dex review, two quick fixes, context discussion.
                     DEX REVIEW: delivery.md + CLAUDE.md read in full via Read tool (bash truncation issue
                       identified and noted -- bash cat silently caps large file output; Read tool
                       paginates cleanly. Ali to use Read tool for all large file reads going forward).
                     DEX STATUS: All queued sprints complete. PRG:40-46 in Dex CLAUDE.md:
                       PRG:40 Group A Residual (crumb, county scope, school selector, chapter lazy-create)
                       PRG:41 News Tab Shell
                       PRG:42 Local Traders Shell
                       PRG:43 Civic Tab Restructure
                       PRG:44 People Page
                       PRG:45 Banner Image Wiring
                       PRG:46 Phone Auth -- DEFERRED (needs Twilio/SMS provider in Supabase first)
                     FIXES THIS SESSION:
                       HEADER_ROWS.js -- ROW4_HEIGHT = 40 added (was missing, SiteHeaderRow4 crashed on import)
                       People.jsx -- localGss now derived from profile.user.confirmed_location via useAuth()
                         (ward_gss first, con_gss fallback). No changes to useSessionSnapshot.
                     APP STATUS: Confirmed visually live and rendering correctly (Phil screenshots).
                       Groups tab, Local Traders tab (category filter, CTA, placeholder cards) all present.

[PRG:127] NEXT     | Next session start:
                     (1) UI/UX sprint series -- fast and furious. Phil drives from screenshots/text files.
                       Work order: earliest components forward (Row1 -> Row2 -> Row3 -> walker -> mid pane
                       -> left/right panes -> tabs in order). Do not move on until each component is tight.
                     (2) Rebuild needed before starting: confirm ROW4_HEIGHT fix + People.jsx localGss compile.
                     (3) Outstanding from PRG:128: NaN flyTo, LocationSearch z-index, MyHome smoke test --
                       confirm these resolved before UI sprint begins (quick rebuild + check).
                     (4) Phone auth (PRG:46) deferred until Phil sets up Twilio/SMS in Supabase.
                     (5) useSessionSnapshot not wired in Locations.jsx post-restructure -- assess whether
                       session restore (geo_path, midTab) is still needed or has been superseded.

[PRG:123] ARCHIVE-SUM | Sessions 20-27 Apr 2026 summary. MiniMap, viewMode/midTab separation, UI polish, walker scroll fix, data quality (GBPN dedup 54,209 rows), DataManager built, MongoDB wired (geo_content + places), cloud infra established (Vercel + Railway + Atlas), GitHub repo (UKCitizens/ukcp), content pipeline design, LocationSearch built, cloud fully seeded (geo_content 115 docs, places 54,209), nav code review + dead code removal, server.js modularised (88 line entry + 9 modules + services/), C4 diagram updated. Auth: magic link OTP via Resend/ukcportal.co.uk, local SSL (cert.pem/key.pem), Supabase site URL = https://www.ukcportal.co.uk. Domain: www.ukcportal.co.uk (123-reg DNS, Vercel). Architecture decisions: dual-persona (citizen/affiliated), scoped roles (1:1 exact scope, citocracy), JWT hybrid (platform_role + persona in app_metadata, scoped roles DB-only).

[PRG:94] PROGRESS  | Session 27 Apr 2026 -- Architecture + user model. Artefacts: ukcp-entity-manifests-v0.1.txt, review-tab-functional-capture-v0.1.md, scoped-roles-design-note.md, tech-note-dual-persona-auth.md, UKCP-Roles-Matrix-v2.xlsx, UKCP-Technical-Specification-v2.3.docx, UKCP-Functional-Definition-v3.2.docx, ukcp-citizen-user-data-definition.docx. BMC artefacts produced separately.

[PRG:95] DECISIONS | Session 27 Apr 2026 -- Key arch decisions. Dual-persona: mutually exclusive sessions, one user record, two modes, MFA mandatory for affiliated. Scoped roles: civic roles 1:1 exact scope, no inheritance. Citizen: anon (cookie only) or registered. Default posting anonymous-traceable. Supabase Auth now, Azure Entra External ID migration target. Proctor and Advocate are both personas.

[PRG:96] PROGRESS  | Session 27 Apr 2026 (auth tidy-up) -- Sprint A tidy-up. Home.jsx (login page), Register.jsx (magic link), SiteHeaderRow1 (auth-aware), UserManager.jsx (new), DataManager Users tab. server.js: /api/auth/check, /api/admin/users, DELETE supabase auth. Selective Dex deploy confusion resolved -- all committed.

[PRG:97] INFRASTRUCTURE | Domain + email infra. Resend.com SMTP relay. ukcportal.co.uk registered 123-reg. DNS: DKIM, MX, SPF. Supabase custom SMTP confirmed. Custom domain on Vercel: www.ukcportal.co.uk live. OUTSTANDING RESOLVED: Supabase Site URL = https://www.ukcportal.co.uk, redirect URLs updated, CLIENT_ORIGIN on Railway = https://www.ukcportal.co.uk.

[PRG:98] PROGRESS  | Session 27 Apr 2026 (auth completion) -- Magic link auth fully working local + cloud. Root cause of local failure: Supabase strips tokens from HTTP redirects. Fix: local SSL (self-signed cert, port 3443). server.js auto-detects cert.pem + key.pem, HTTPS:3443 locally, HTTP:3000 production fallback. emailRedirectTo: window.location.origin in signInWithOtp. flowType: implicit on Supabase client. cert.pem + key.pem in .gitignore.

[PRG:99] DECISIONS | Auth strategy settled: single factor magic link (OTP). Phone as second recovery factor -- next sprint (Supabase phone OTP, same user record). Losing email = losing account without phone secondary.

[PRG:100] PROGRESS | Session 28 Apr 2026 -- Timeout hardening, Railway CLIENT_ORIGIN fix, right-pane walker fixes, dead code removal, server.js modularised (885 lines -> 88 line entry + 9 modules), services/ layer extracted (wikipedia, wikidata, parliament, nomis). C4 Component Diagram updated.

[PRG:101] PROGRESS | Session 30 Apr 2026 -- Collective entity design + Sprint B+C POC confirmed live. Three collections (committees, associations, spaces). Committee_forum child entity. Post entity: location_scope + collective_ref. User labels: Committees, Groups, Local Spaces. "Collective" = internal arch term. POC: groups visible at Merseyside county, join + posts working.

[PRG:102] PROGRESS | Session 30 Apr 2026 -- Functional discovery. sage-functional-pattern-map-v0.1.txt. Eight pillars: Find Your Ground, Find Your People, Be Heard on the Record, Reach Your Representative, Organise With Others, Make It Official, Close the Loop, Beyond Your Ward. Pillars 1-3 largely built. Critical gap: petition-to-committee pipeline. Hard prerequisite: constituency committee must exist first -- 650 committees derivable from geo data, MP wired via Parliament API.

[PRG:103] PROGRESS | Session 30 Apr 2026 -- Committee sprint x3. 632 committees seeded (local + Atlas), 632 forums seeded, JoinForumModal built. Join flow tested live -- gate working. con_gss mismatch bug found (IPN pre-2024 vs postcodes.io post-2024) -- name-based fallback fix pending/applied. Dex sprint execution directive added to UKCP/CLAUDE.md. Entity manifests v0.3: fourth collective type (Community Networks), five first-class civic act types.

[PRG:104] DECISIONS | Community Networks: fourth collective type. Platform-seeded nationally-branded topic collectives. National parent (national_groups) + local chapters (network_chapters) lazy-instantiated. Eight launch groups confirmed. Civic acts (civic_acts collection): share_outward, petition_address, call_to_arms, representative_invitation, evidence_submission. Geo proximity is discovery only -- writes nothing to schema.

[PRG:105] PROGRESS | Session 30 Apr 2026 -- Community Networks sprint complete. national_groups seeded (8 records), network_chapters lazy instantiation, services/communityNetworks.js, GroupsTab filter strip, CommunityNetworksSection.jsx, NetworkCard. Hotfix: E11000 duplicate key on ensureChaptersExist. User location + post wiring: posts.js committee_forums whitelist, CommitteeTab + CommunityNetworksSection PostsTab wired.

[PRG:106] BUG-HUNT  | Bug hunt session protocol: spot tests not full regression. Test plan: UKCP/Ali/bug-hunt-test-plan-v1.md. Ali fixes inline where possible. Only defer to Dex if multi-file or needs local process. Single-line fixes: apply directly, tell Phil to rebuild + retest.

[PRG:107] PROGRESS | Session 1 May 2026 -- Nav simplification. Top nav capped at county. Right pane defaults All on scope change. Tab switching removed from nav handlers. Right pane selection no longer mutates crumb. Walker mode: All = browse/preview; letter = full commit. handleSelect unified. SiteHeaderRow1: Log in / Log out buttons. Community Networks VALID_TIERS expanded (city/town/village/hamlet).

[PRG:110] PROGRESS | Session 1 May 2026 -- Functional adjustment sprint. Site nav restructured (People added, MyVote removed). "/" = Locations, "/login" = Home.jsx. Mid pane tabs renamed/reordered: Groups/News/Local Traders/Civic/Map/Info. CommitteeTab absorbed into civicPane. SiteHeaderRow2 rebuilt as 5-slot image strip. PlacesCard + ConstituencyPane: Select buttons added (later removed in PRG:114). TabStubs.jsx: CivicStub + LocalTradersStub added.

[PRG:111] DECISIONS | Session 1 May 2026 -- Local Traders: self-registration model, trader role + business profile, UKCP Local Traders Agreement. Government tab renamed Civic. Committee tab absorbed into Civic. People tab -> site nav (/people). Content Manager role added (5-slot banner curation). Feed aggregation (include-checkbox model) is cross-tab architectural layer -- design before building.

[PRG:112] DEX-NEXT  | Instruction file: dex-instructions-tab-nav-panes.md. 8 TabNav components (GroupsLeftNav/RightNav, NewsLeftNav/RightNav, TradersLeftNav/RightNav, CivicLeftNav/RightNav). GroupsTab refactored (filter prop). Locations.jsx: groupsFilter state, activeLeftPane/activeRightPane. DONE -- see PRG:114.

[PRG:113] ARCH     | Community network generic model. Institution-scoped chapters. School Gates first instance (GIAS seed). GP surgeries, supermarkets etc. follow same pattern. Sage brief: UKCP/Sage/sage-brief-school-gates-network.md.

[PRG:114] PROGRESS | Session 1 May 2026 -- tabNavMode toggle, CommunityNetworkCard icon grid (90px tiles, 3x3 grid), At the School Gates POC complete and live. 27,109 England open schools seeded to Atlas (schools.csv, OSGB36->WGS84). Schools API: ward + constituency scope live. County scope blocked (la_gss). chapter-by-institution endpoint added (lookup only -- lazy-create not yet done). SchoolGatesMid PostsTab wired. dex-instructions-school-gates-poc.md + dex-instructions-schools-full-data.md written (the latter largely superseded by what was built).

[PRG:115] PROGRESS | Session 1 May 2026 -- User/session/state conditioning. Design note: UKCP/Ali/user-session-state-design-note.md. Dex instruction file executed: user_session collection, ukcp_session_snapshot localStorage, useSessionSnapshot hook, user_follows collection, UserStateContext. Profile page + phase 2 auth/permissions confirmed live.

[PRG:116] BUGS     | Two School Gates UI bugs identified -- carry to next session. (1) CRUMB: constituency + ward drop from crumb when activeNetwork is set. (2) SCHOOL SCOPE SELECTOR: SchoolsLeftNav needs manual Ward/Constituency/County/Region radio. Default = deepest available scope. County scope needs la_gss fix.

[PRG:117] PROGRESS | Session 1 May 2026 -- Auth/permission model, post design, profile design all designed. Design notes: auth-permission-design-note.md, post-design-note.md, profile-design-note.md. Phase 2 auth (roles in app_metadata, middleware audit, AuthContext claims) complete. Login redirect bug fixed. Session end.

[PRG:118] DECISIONS | Auth/permission model. Hybrid JWT: platform_role, persona, affiliated_roles, display_name, registration_complete in app_metadata. T0 public, T1 verifyJwt, T2 requireRole, T3 scope-gated. useAuth() returns { user, session, claims, profile }. Three-part feature standard: user data + user state + user permission = definition of done.

[PRG:119] PROGRESS | Post design: post-design-note.md. Base post object, reach hierarchy (origin->ward->constituency->county->region->national), reach_effective surfacing field. Post types with defaults/floors/ceilings. Variant component model: PostComposer base + thin wrappers. post_type_config collection holds rules. API: POST/GET /api/posts, PATCH react, DELETE soft, POST flag.

[PRG:120] PROGRESS | Profile design: profile-design-note.md. Civic dashboard: identity panel, civic footprint, contributions, roles, preferences. GET /api/profile assembles from users + user_follows + posts. PATCH /api/profile/preferences. Login redirect: sessionStorage stash + restore on SIGNED_IN.

[PRG:121] PROGRESS | Session 1 May 2026 (close) -- Phase 2 auth/permissions/profile confirmed live. Profile rendering civic footprint, contributions, roles, preferences. Login redirect bug found + fixed. Post instruction file written and queued. Next session: Dex runs dex-instructions-post.md.

[PRG:125] PROGRESS | Session 2 May 2026 (long session) -- Two-map restructure + nav/UX sprint.
  SPRINT 1 (nav map -> header): COMPLETE. MidPaneTabs: mapPane prop, MapPlaceholder removed. Locations.jsx: paneMode ('nav'|'tab') replaces tabNavMode, handleMapHeaderClick, navMapProps useMemo, MidPaneMap import removed then re-added. SiteHeader: navMapProps + onMapClick props. SiteHeaderRow2: three-zone layout (emblem 20% / nav map 60% / content image 20%), MidPaneMap headerMode. HEADER_ROWS.js: ROW4 removed, ROW3 tightened. SchoolGates: proximity-only (SCHOOL_RADIUS_M), routes/schools.js proximity-only. Community networks: VALID_TIERS expanded to all geo levels. Auth: persistSession:false, login-first routing, RequireAuth wrapper in App.jsx.
  SPRINT 2 (content map): COMPLETE. useMapLayers.js (content layer toggles: schools/committees/groups/traders/news). useNavFilters.js (shared C/T/V/H/Con/Ward state, replaces internal MidPaneMap state). MapTypeToggle.jsx (shared component, extracted from MidPaneMap). MidPaneMap: contentMode prop, schools layer, centerOn prop (content map pins to contextCoords at type zoom), headerMode cleaned (no overlay pills), scrollWheelZoom disabled in contentMode. Locations.jsx: filter strips in locationNav.left (C/T/V/H) and locationNav.right (Con/Ward + content layer includes). Content map: centerOn guard (NaN check). Schools layer NaN guard applied.
  SCHOOL GATES UX: SchoolsRightNav rewritten -- two-level (list -> detail), both levels in right nav, left nav empty when network active. Back buttons: detail->list and list->networks. SchoolsLeftNav no longer rendered in network mode. handleGoTo: setPaneMode removed (crumb preserves current pane state). handleTabChange: activateForTab + map invalidate on tab='map'.

[PRG:126] BUGS-OPEN | After session 2 May 2026 (long):
  (1) localStorage quota exceeded (UKCP_HIERARCHY_v7, UKCP_PLACES_v7) -- caches too large for storage. Non-critical warning. Fix: reduce cache scope or remove localStorage caching for large datasets.
  (2) centerOn NaN guard applied -- rebuild needed to confirm resolved.
  (3) Crumb click paneMode fix in place -- Phil to confirm on News/Groups tabs (Map tab always shows nav panes by design).
  (4) MyHome + posts architecture -- design conversation deferred (next session).

[PRG:127] NEXT     | Next session start:
  (1) Confirm bugs from PRG:126 resolved after rebuild.
  (2) MyHome + posts architecture design conversation (how posts flow through the site).
  (3) Sprint 3: emblem/flag wiring from geo_content, right slot content image polish, crumb refinement.
  (4) useNavFilters: nav map filter sync to header nav map (currently only content map gets visibleTypes -- check header map also receives it via navMapProps spread).
  (5) Carry-forward from PRG:59 pipeline still outstanding: group-a-residual, news-tab, traders-shell, civic-restructure, people-page, banner-5slot, phone-auth.
