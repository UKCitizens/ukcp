# Dex Instruction File — Commit All Local Changes & Deploy
> Session: 25 Apr 2026 | Ali

---

## Context

The deployed Vercel app is running old code from the initial cloud setup commit (22 Apr). All work since then — Mongo migration, walker mode, new tabs, LocationSearch, TabStubs, population scripts — is local only. The cloud is broken because a geo-content.json push triggered a Vercel redeploy using old src/ code that is incompatible with the current data structure.

This instruction commits everything and pushes to GitHub. Vercel auto-deploys on push. Railway does not auto-deploy — a manual redeploy may be needed.

---

## Steps

### 1. Stage all changes

```
cd C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP
git add -A
```

This picks up all modified files and all untracked src/scripts/data files. Verify the staging list includes at minimum:
- `src/components/TabStubs.jsx` (untracked — critical, Locations.jsx imports it)
- `src/pages/Locations.jsx`
- `src/components/MidPaneTabs.jsx`
- `src/components/LocationSearch.jsx`
- `src/components/ConstituencyPane.jsx`
- `src/components/PlacesCard.jsx`
- `src/components/MidPaneMap.jsx`
- `src/components/LocationInfo.jsx`
- `src/hooks/useLocationContent.js`
- `server.js`
- `scripts/seed-places.js`
- `scripts/export-places.js`
- `scripts/seed-geo-content.js`

If any of these are missing from `git status --staged`, add them explicitly with `git add <path>`.

---

### 2. Commit

```
git commit -m "feat: Mongo migration, walker mode, tabs, LocationSearch, population pipeline"
```

---

### 3. Push

```
git push
```

Vercel will detect the push and auto-deploy. This typically takes 1–2 minutes.

---

### 4. Verify Vercel build

Check the Vercel dashboard (vercel.com) for build status. The build must complete without errors. A successful build will show the deployment as "Ready".

Common failure: missing import. If the build log shows a module not found error, check that TabStubs.jsx was included in the commit (`git show HEAD --name-only | grep TabStubs`).

---

### 5. Redeploy Railway (manual)

Railway does not auto-deploy on git push by default. Log in to railway.app, navigate to the UKCP project, and trigger a manual redeploy of the Express server. This picks up the updated server.js (Mongo integration, new API endpoints).

Verify Railway env vars are still set:
- `MONGODB_URI` — Atlas connection string
- `PORT` — (Railway sets this automatically)
- `CLIENT_ORIGIN` — Vercel app URL

---

### 6. Smoke test

After both deployments are live:

1. Open ukcp.vercel.app
2. Navigate: UK → England → North West → Lancashire
3. Confirm: left pane shows places (City/Town/Village/Hamlet counts > 0)
4. Confirm: right pane walker shows constituency options
5. Confirm: wards appear for a selected constituency
6. Confirm: Info tab loads content (Wikipedia extract or summary)
7. Navigate to Settings → Data Manager — confirm it loads

Report any failures back with the specific step that broke.
