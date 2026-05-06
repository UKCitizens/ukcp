# UKCP Delivery Log
# Full sprint detail in Ali/delivery-archive.md

---

## Sprint history (one line per sprint)

| Date | Sprint | Build |
|------|--------|-------|
| 2026-03-31 | Sprint 2 T1-T4 — Layout, three-column, responsive, places browser | PASS 6863 |
| 2026-04-02 | Sprint 3 T1-T4 — Header scaffold, rows 1-4 | PASS 6874 |
| 2026-04-03 | Sprint 4 T1-T2 — Visual polish, mid-pane nav | PASS 6876 |
| 2026-04-04 | Sprint 5 T1-T2 — Hierarchy fix, two-row header nav | PASS 6873 |
| 2026-04-08 | Sprint 6 — Data build, navConfig, containment, 632 constituencies | PASS 6876 |
| 2026-04-30 | Sprint B+C — Groups + Posts POC, seed, routes | PASS 6947 |
| 2026-04-30 | PRG:21-28 — Community Networks, location persistence, post wiring, forum join, committees | PASS |
| 2026-05-01 | PRG:29 — Tab Nav Panes (8 components) | PASS |
| 2026-05-01 | PRG:30 — At the School Gates POC | PASS |
| 2026-05-01 | PRG:31 — Schools Full Data (~27k records seeded) | PASS |
| 2026-05-02 | PRG:32-34 — User Session State, Playwright tests, auth bugfixes | PASS |
| 2026-05-02 | PRG:35-38 — Auth, Permissions and Profile (Sections 1-4) | PASS 6964 |
| 2026-05-02 | PRG:39 — Post Object + API + Composer; admin router regression fixed | PASS 6969 |
| 2026-05-02 | PRG:40-45 — Group A residual, News, Traders, Civic, People, Banner | PASS 6970 |
| 2026-05-03 | PRG:47 — asyncHandler on all 13 route handlers | PASS 6971 |
| 2026-05-04 | PRG:48 — Auth diagnosis (no code changes; SMTP config required from Phil) | PASS 6969 |
| 2026-05-05 | Mobile Drawer Nav — PageLayout.jsx + PageLayout.module.css; IconLayers → IconAdjustments | PASS 6969 |
| 2026-05-05 | Mobile buttons — ActionIcon+Tooltip → Button with icon+label (IconMapPin / IconFilter) | PASS |
| 2026-05-05 | Mobile Nav Panel — MobileNavPanel.jsx replaces two-drawer approach; green/blue collapsible bars per pane | PASS 6971 |

---

## ARCHITECTURE — Dual deployment (permanent)
- **Railway** (ukcp-production.up.railway.app) — full Express stack: static dist/ + all /api/* routes. Auto-deploys on push.
- **Vercel** (ukcportal.co.uk) — static React shell only. No Express process. /api/* proxied to Railway via vercel.json rewrites. Auto-deploys on push.
- The catch-all `/(.*) → index.html` in vercel.json is required for SPA routing. The /api proxy must always sit above it. If adding new /api route prefixes, no vercel.json change needed — the wildcard covers all /api/* paths.
- Every push deploys both. If Vercel shows stale data, check vercel.json proxy is intact.

## FLAGS (pre-existing, non-imperative)
- ROW4_HEIGHT missing from HEADER_ROWS.js — SiteHeaderRow4.jsx crashes on import in dev, cascades to MidPaneMap/SchoolsRightNav. Does not block build.
- Chunk size advisory — index-*.js bundle is ~954kB minified (284kB gzip), exceeds Rollup's 500kB warning threshold. Pre-existing; not introduced by mobile drawer sprint. Consider code-splitting via dynamic import() if bundle growth becomes a concern.

## Outstanding actions
- SMTP: Supabase → Settings → Auth → SMTP: host smtp.resend.com, port 465, username resend, password = RESEND_TOKEN.

---

DEPLOYED -- commit acce018 pushed to GitHub (master). Railway auto-deploy triggered. PRG:39->PRG:45. 2026-05-03 00:58
LIVE INSTANCE RESTARTED -- :3443 serving build completed 2026-05-03 (asyncHandler sprint)
LIVE INSTANCE RESTARTED -- :3443 serving build completed 2026-05-04 (auth diagnosis sprint)
LIVE INSTANCE RESTARTED -- :3443 serving build completed 2026-05-05 (mobile drawer nav)
LIVE INSTANCE RESTARTED -- :3443 serving build completed 2026-05-05 (mobile button labels)
LIVE INSTANCE RESTARTED -- :3443 serving build completed 2026-05-05 (mobile nav panel sprint PRG:49)
| 2026-05-05 | PRG:50 — MyHome POC shell: MyIncludes left pane, MyMeta right pane, ContentActions, /api/follows/all | PASS 6974 |
LIVE INSTANCE RESTARTED -- :3443 serving build completed 2026-05-05 (MyHome POC shell PRG:50)
| 2026-05-06 | PRG:52 — box-bot agent loop (Ali-Projects/agent/agent-loop.ps1); smoke test passed; no UKCP files changed |
| 2026-05-06 | PRG:53 — MyHome Full Build: FeedZone, FeedControls, PostFeedCard, MyMeta live data, myhome router, notifications model, reply notifications, ContentActions on School/CommitteeTab/CommunityNetworkCard | PASS 6977 |
LIVE INSTANCE RESTARTED -- :3443 serving build completed 2026-05-06 (MyHome full build PRG:53)
| 2026-05-06 | PRG:54 — pipeline promote: routes/pipeline.js + agent/promote.py; 91/91 manifests promoted to geo-content.json | PASS |
LIVE INSTANCE RESTARTED -- :3443 serving build completed 2026-05-06 (pipeline promote PRG:54)
| 2026-05-06 | PRG:55 — nearby places: GeoJSON migration (54,209 docs), 2dsphere index, /api/places/:id/nearby, /api/nearby/ward/:gss, /api/nearby/constituency/:gss, useNearby hook, LocationInfo wired | PASS |
LIVE INSTANCE RESTARTED -- :3443 serving build completed 2026-05-06 (nearby places PRG:55)
| 2026-05-06 | Mobile Side Drawer — MobileDrawerWrapper replaces MobileNavPanel; side-edge handles in mid pane, left green/right blue, slide-in drawers | PASS 6978 |
LIVE INSTANCE RESTARTED -- :3443 serving build completed 2026-05-06 (mobile side drawer sprint)
| 2026-05-06 | Bugfix: drawer z-index raised (1100/1200/1300) to beat Leaflet map layers on map tab | PASS |
LIVE INSTANCE RESTARTED -- :3443 serving build completed 2026-05-06 (drawer z-index fix)
| 2026-05-06 | PRG:57 — Map overlay controls + pane search bars: MapOverlayControls on map surface, place search in left pane, constituency filter in right pane, LocationSearch removed from tab strip | PASS 6979 |
LIVE INSTANCE RESTARTED -- :3443 serving build completed 2026-05-06 (map overlay controls + pane search bars PRG:57)
| 2026-05-06 | Redesign: MapOverlayControls — vertical collapsible toolbars, single icon + toggle, collapsed by default |
| 2026-05-06 | Fix: crumb row mobile font (10px) + map overlay control left/right offsets (PRG:57 residuals) | PASS |
LIVE INSTANCE RESTARTED -- :3443 serving build completed 2026-05-06 (PRG:57 residuals + local server restart)
LIVE INSTANCE RESTARTED -- :3443 serving build completed 2026-05-06 (vertical collapsible map overlay controls)
