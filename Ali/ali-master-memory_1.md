# ALI MASTER MEMORY -- PRG ZONE
> Paste this file at session start when current progress context is needed.
> BIO and STA zones are permanent in .claude/CLAUDE.md -- do not paste those.
> Format: [ZONE:INDEX] TAG | content
> PRG zone: purge and rewrite freely each cycle. Phil owns all changes.
> Archive: PRG:21-44 moved to ali-master-memory-archive.md (sessions 30 Mar - 9 Apr 2026).
> Archive: PRG:55-92 (sessions 20-27 Apr) summarised in PRG:123 below.

---

## ZONE: PRG -- Dynamic progress (purge and re-establish as needed)

[PRG:132] PROGRESS  | Session 4 May 2026 -- Auth stabilisation + admin delete confirmed.
                     AUTH: Password set on phild@btltd.net admin account via supabaseAdmin
                       updateUserById (Dex script). No email reset loop needed.
                     REGISTRATION GATE: Profile.jsx fix -- isNewUser path now always calls
                       refreshSession() + navigate('/locations') after successful save,
                       regardless of server registration_completed flag. Gate clears correctly.
                     DELETE ACCOUNT: Confirmed working after full rebuild + server restart.
                       Was client cache / multi-client confusion. Both Supabase + Mongo now
                       deleted in single call. Graceful "User not found" from Supabase
                       (orphaned records) proceeds to Mongo delete.
                     TESTING DISCOVERY: email + addressing works (RFC-valid). phild+x@btltd.net
                       delivers to phild@btltd.net inbox. Supabase treats as distinct accounts.
                       Solves multi-account testing without multiple inboxes.
                     NEXT SESSION: UI/UX sprint. Rebuild + smoke test first. Work order:
                       Row1 -> Row2 -> Row3 -> walker -> mid pane -> panes -> tabs.
                       Confirm auth flow end-to-end with + address test accounts before sprint.

[PRG:131] PROGRESS  | Session 3 May 2026 (session 4) -- Auth overhaul + admin fixes.
                     AUTH OVERHAUL: Magic link replaced with standard email/password flow.
                       LoginModal.jsx -- rebuilt as two-tab modal (Sign in / Register).
                         Sign in: signInWithPassword. Register: signUp with display_name in
                         user_metadata, confirmation email sent, "check your email" state.
                       supabase.js -- persistSession: true, flowType: implicit retained.
                       AuthContext.jsx -- navigate-on-SIGNED_IN removed. mergeAnonData kept.
                       Register.jsx -- retired, now redirects to /.
                       App.jsx -- RequireAuth: no redirect to /login, returns null when
                         no session. RegistrationGate added: claims.registration_complete===false
                         redirects to /profile. /login route -> Navigate to /.
                       middleware/auth.js -- user creation now uses user_metadata.display_name
                         (from signUp options.data). If display_name present, auto-sets
                         registration_complete=true in Supabase + Mongo (fire-and-forget).
                     ADMIN FIXES:
                       DataManager "Delete account" -- admin.js DELETE endpoint now deletes
                         from both Supabase and Mongo. Handles "User not found" from Supabase
                         gracefully (already-deleted, proceeds to Mongo cleanup).
                       UserManager.jsx -- "Delete from Supabase auth" + "Set status: deleted"
                         collapsed to "Delete account" (hard delete both) + "Suspend" (soft).
                     SETTINGS ICON: renamed hint to "Data Manager", hidden unless admin role.
                       SiteHeaderRow1.jsx -- claims destructured, admin gate added.
                     PROFILE GATE: Profile.jsx -- 8s timeout on Loading... state, shows
                       error message rather than spinning forever.
                     OUTSTANDING / UNRESOLVED:
                       (1) Registration confirmation email not arriving for new signUp flow.
                           Root cause unknown -- Supabase email provider config suspected.
                           Check Supabase dashboard: Auth -> Email templates -> Confirm signup.
                           Also check: Auth -> Providers -> Email -> "Enable email confirmations".
                           If confirmations disabled, signUp auto-signs-in (no email needed).
                       (2) Delete account -- Supabase record not being deleted. Possibly
                           supabase_id mismatch or Supabase admin client issue. Needs server
                           console diagnosis with a known-good account.
                       (3) Auth flow generally fragile in test -- multiple accounts, cache
                           conflicts. Phil worn out. Resume fresh next session.

[PRG:127] NEXT      | Next session start:
                     (1) Diagnose registration email not sending -- Supabase dashboard first.
                     (2) Diagnose delete account -- check server console with known account.
                     (3) Once auth is stable: UI/UX sprint (Row1 -> Row2 -> Row3 -> walker
                         -> mid pane -> panes -> tabs). Work order: earliest components forward.
                     (4) useSessionSnapshot wiring in Locations.jsx -- still deferred.
                     (5) Phone auth (PRG:46) deferred until Twilio/SMS in Supabase.

[PRG:123] ARCHIVE-SUM | Sessions 20-27 Apr 2026 summary. MiniMap, viewMode/midTab separation, UI polish, walker scroll fix, data quality (GBPN dedup 54,209 rows), DataManager built, MongoDB wired (geo_content + places), cloud infra established (Vercel + Railway + Atlas), GitHub repo (UKCitizens/ukcp), content pipeline design, LocationSearch built, cloud fully seeded (geo_content 115 docs, places 54,209), nav code review + dead code removal, server.js modularised (88 line entry + 9 modules + services/), C4 diagram updated. Auth: magic link OTP via Resend/ukcportal.co.uk, local SSL (cert.pem/key.pem), Supabase site URL = https://www.ukcportal.co.uk. Domain: www.ukcportal.co.uk (123-reg DNS, Vercel). Architecture decisions: dual-persona (citizen/affiliated), scoped roles (1:1 exact scope, citocracy), JWT hybrid (platform_role + persona in app_metadata, scoped roles DB-only).

[PRG:94] PROGRESS  | Session 27 Apr 2026 -- Architecture + user model. Artefacts: ukcp-entity-manifests-v0.1.txt, review-tab-functional-capture-v0.1.md, scoped-roles-design-note.md, tech-note-dual-persona-auth.md, UKCP-Roles-Matrix-v2.xlsx, UKCP-Technical-Specification-v2.3.docx, UKCP-Functional-Definition-v3.2.docx, ukcp-citizen-user-data-definition.docx. BMC artefacts produced separately.

[PRG:95] DECISIONS | Session 27 Apr 2026 -- Key arch decisions. Dual-persona: mutually exclusive sessions, one user record, two modes, MFA mandatory for affiliated. Scoped roles: civic roles 1:1 exact scope, no inheritance. Citizen: anon (cookie only) or registered. Default posting anonymous-traceable. Supabase Auth now, Azure Entra External ID migration target. Proctor and Advocate are both personas.

[PRG:96] PROGRESS  | Session 27 Apr 2026 (auth tidy-up) -- Sprint A tidy-up. Home.jsx (login page), Register.jsx (magic link), SiteHeaderRow1 (auth-aware), UserManager.jsx (new), DataManager Users tab. server.js: /api/auth/check, /api/admin/users, DELETE supabase auth. Selective Dex deploy confusion resolved -- all committed.

[PRG:97] INFRASTRUCTURE | Domain + email infra. Resend.com SMTP relay. ukcportal.co.uk registered 123-reg. DNS: DKIM, MX, SPF. Supabase custom SMTP confirmed. Custom domain on Vercel: www.ukcportal.co.uk live. OUTSTANDING RESOLVED: Supabase Site URL = https://www.ukcportal.co.uk, redirect URLs updated, CLIENT_ORIGIN on Railway = https://www.ukcportal.co.uk.

[PRG:98] PROGRESS  | Session 27 Apr 2026 (auth completion) -- Magic link auth fully working local + cloud. Root cause of local failure: Supabase strips tokens from HTTP redirects. Fix: local SSL (self-signed cert, port 3443). server.js auto-detects cert.pem + key.pem, HTTPS:3443 locally, HTTP:3000 production fallback. emailRedirectTo: window.location.origin in signInWithOtp. flowType: implicit on Supabase client. cert.pem + key.pem in .gitignore.

[PRG:101] PROGRESS | Session 30 Apr 2026 -- Collective entity design + Sprint B+C POC confirmed live. Three collections (committees, associations, spaces). Committee_forum child entity. Post entity: location_scope + collective_ref. User labels: Committees, Groups, Local Spaces. "Collective" = internal arch term. POC: groups visible at Merseyside county, join + posts working.

[PRG:103] PROGRESS | Session 30 Apr 2026 -- Committee sprint x3. 632 committees seeded (local + Atlas), 632 forums seeded, JoinForumModal built. Join flow tested live -- gate working. con_gss mismatch bug found (IPN pre-2024 vs postcodes.io post-2024) -- name-based fallback fix pending/applied.

[PRG:105] PROGRESS | Session 30 Apr 2026 -- Community Networks sprint complete. national_groups seeded (8 records), network_chapters lazy instantiation, services/communityNetworks.js, GroupsTab filter strip, CommunityNetworksSection.jsx, NetworkCard. Hotfix: E11000 duplicate key on ensureChaptersExist.

[PRG:107] PROGRESS | Session 1 May 2026 -- Nav simplification. Top nav capped at county. Right pane defaults All on scope change. Tab switching removed from nav handlers. Right pane selection no longer mutates crumb. Walker mode unified. SiteHeaderRow1: Log in / Log out buttons.

[PRG:110] PROGRESS | Session 1 May 2026 -- Functional adjustment sprint. Site nav restructured (People added, MyVote removed). "/" = Locations, "/login" = Home.jsx. Mid pane tabs renamed/reordered. CommitteeTab absorbed into civicPane. SiteHeaderRow2 rebuilt as 5-slot image strip.

[PRG:114] PROGRESS | Session 1 May 2026 -- tabNavMode toggle, CommunityNetworkCard icon grid, At the School Gates POC complete and live. 27,109 England open schools seeded. Schools API ward + constituency scope live.

[PRG:115] PROGRESS | Session 1 May 2026 -- User/session/state conditioning. user_session collection, ukcp_session_snapshot localStorage, useSessionSnapshot hook, user_follows collection, UserStateContext.

[PRG:117] PROGRESS | Session 1 May 2026 -- Auth/permission model, post design, profile design all designed. Phase 2 auth complete. Login redirect bug fixed.

[PRG:125] PROGRESS | Session 2 May 2026 -- Two-map restructure + nav/UX sprint. Header nav map (60% zone in Row2), content map (centerOn, layer toggles), useMapLayers.js, useNavFilters.js, MapTypeToggle.jsx. School Gates UX rewritten (two-level right nav). persistSession:false set (SUPERSEDED -- now true, see PRG:131).

[PRG:128] PROGRESS  | Session 3 May 2026 -- Bug fixes, Dex stack review, MyHome build.
                     FIXES: MidPaneMap NaN guard, LocationSearch z-index (portal fix),
                       HEADER_ROWS ROW4_HEIGHT added, People.jsx localGss fix.
                     MYHOME: src/pages/MyHome.jsx built from stub. Auth-gated, three zones.
                     DEX STATUS: All queued sprints complete (PRG:40-46 done except phone auth).

[PRG:129] PROGRESS  | Session 3 May 2026 (session 2) -- Dex review, two quick fixes.
                     App confirmed live and rendering. Groups tab, Local Traders tab present.

[PRG:130] PROGRESS  | Session 3 May 2026 (session 3) -- Bug fixes cont.
                     MidPaneMap flyTo: header caps zoom at Math.min(zoom,7). centerOn NaN guard.
                     LocationSearch: createPortal to document.body, position:fixed.
                     Login.jsx: plain HTML inputs (autofill attempt, superseded by modal approach).
