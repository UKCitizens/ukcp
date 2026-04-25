# Dex Task — Data Export + Rebuild

## Objective
Regenerate `newplace.csv` from local MongoDB, rebuild the app, and restart the production server.

## Steps

**1. Export places from MongoDB**
```
cd C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP
node scripts/export-places.js
```
Expected output: reads 54,209 base rows, reports correction count (likely 0 on first run), writes `public/data/newplace.csv`. Confirm no errors.

**2. Build**
```
npm run build
```
Must complete with 0 errors, 0 warnings.

**3. Pipeline Close Protocol**
Follow standard protocol from CLAUDE.md — restart :3000, update DELIVERY.md, echo confirmation.

## Notes
- Local MongoDB must be running before step 1. If connection fails, report the error verbatim — do not proceed to build.
- `export-places.js` uses `mongodb://localhost:27017` by default. Do not point it at Atlas.
- No source file changes required for this task.
