# DEX — Railway Debug Task

## The Error

Railway returns "Application failed to respond" when visiting `ukcp-production.up.railway.app`.

The second deployment (after adding `buildCommand` to `railway.toml`) shows **Deployment successful** and **Online** in the dashboard — meaning the build completed and the process started. But the app is still not responding to HTTP requests.

This means the failure is **not a build problem** — it is a **runtime problem**. The server starts, Railway marks it online, but requests return an error. Possible causes:

1. **PORT binding** — Railway injects `PORT` as an env var. If the server isn't listening on `0.0.0.0:$PORT`, Railway's load balancer can't reach it. Our server.js does `app.listen(PORT, '0.0.0.0')` and `PORT = process.env.PORT || 3000` — this looks correct, but needs confirming against the actual Railway `PORT` value.

2. **Server crash after startup** — The process starts, Railway sees it alive briefly, marks it Online, then it crashes (e.g. missing file, unhandled promise rejection at runtime). The deploy logs will show this.

3. **Static file path** — `server.js` serves `dist/` via `express.static(join(__dirname, 'dist'))`. If the build output lands in a different path on Railway, static serving fails. The catch-all then returns `dist/index.html` which also won't exist — 500 or silent hang.

4. **`cors` package not installed on Railway** — Though it's in `package.json` and `npm install` runs during build, worth confirming in logs.

5. **`places.csv` / `newplace.csv` missing** — The places search endpoint reads from `public/data/newplace.csv` on first request. This file is gitignored. If a request hits that endpoint before the file exists, the server will throw. However this wouldn't cause a total failure on the root path.

Most likely cause: **static file path issue or server crash** — the deploy logs will tell us exactly.

---

## Actions

### Step 1 — Log into Railway via Playwright (Firefox)

Navigate to `https://railway.com` and authenticate. Phil's account is `spraglack@googlemail.com`. Use GitHub login if magic link OTP is unreliable.

### Step 2 — Open deployment logs

Navigate to the ukcp service → Deployments tab → click **View logs** on the active (successful) deployment. Read the full startup log output.

### Step 3 — Diagnose from logs

Look for:
- What port Railway assigned (look for `$PORT` value in env)
- Whether `MongoDB connected` appears (confirms server started fully)
- Whether `UKCP running on http://localhost:XXXX` appears
- Any error or exception after startup
- Whether the build output (`dist/`) was found

### Step 4 — Fix and redeploy

Based on findings, edit the relevant file (`server.js`, `railway.toml`, `.env` vars in Railway dashboard), commit, push, and verify the next deployment.

---

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | Express server — listens on `process.env.PORT \|\| 3000`, serves `dist/` |
| `railway.toml` | Build + deploy config — `buildCommand = "npm install && npm run build"`, `startCommand = "node server.js"` |
| Railway dashboard → Variables | Must have `MONGODB_URI`, `PORT=3000`, `CLIENT_ORIGIN=https://ukcp.vercel.app` |
