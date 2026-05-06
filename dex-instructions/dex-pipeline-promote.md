# Dex instruction -- pipeline promote endpoint + promote.py
> Ali, 06 May 2026.

---

## What this delivers

1. A new Express route `/api/pipeline/geo-content/:key` -- localhost-only, no auth.
2. `agent/promote.py` -- reads processed/ manifests, PATCHes the pipeline endpoint.

---

## Part 1 -- UKCP: new pipeline route

### New file: `routes/pipeline.js`

```js
/**
 * @file routes/pipeline.js
 * @description Localhost-only pipeline endpoints. No auth -- localhost access only.
 *
 * PATCH /api/pipeline/geo-content/:key -- updates geo-content.json from manifest record.
 *   Body: { field: string, value: string }
 */

import { Router }                                  from 'express'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath }                           from 'url'
import { dirname, join }                           from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const ROOT_DIR   = join(__dirname, '..')

const GEO_CONTENT_SRC  = join(ROOT_DIR, 'public', 'data', 'geo-content.json')
const GEO_CONTENT_DIST = join(ROOT_DIR, 'dist',   'data', 'geo-content.json')

const router = Router()

/** Localhost-only guard. */
const requireLocalhost = (req, res, next) => {
  const ip = req.ip ?? req.connection?.remoteAddress ?? ''
  const clean = ip.replace('::ffff:', '')
  if (clean === '127.0.0.1' || clean === '::1') return next()
  return res.status(403).json({ error: 'Local access only' })
}

router.use(requireLocalhost)

// PATCH /api/pipeline/geo-content/:key
router.patch('/geo-content/:key', (req, res) => {
  const { key } = req.params
  const { field, value } = req.body ?? {}

  if (!field || value === undefined) {
    return res.status(400).json({ error: 'field and value required' })
  }
  try {
    if (!existsSync(GEO_CONTENT_SRC)) {
      return res.status(500).json({ error: 'geo-content.json not found' })
    }
    const content = JSON.parse(readFileSync(GEO_CONTENT_SRC, 'utf8'))
    if (!content[key]) {
      return res.status(404).json({ error: `Key not found: ${key}` })
    }
    content[key][field] = value
    const json = JSON.stringify(content, null, 2)
    writeFileSync(GEO_CONTENT_SRC, json, 'utf8')
    if (existsSync(GEO_CONTENT_DIST)) writeFileSync(GEO_CONTENT_DIST, json, 'utf8')
    console.log(`[pipeline] geo-content updated: ${key} -> ${field}`)
    return res.json({ ok: true, key, field })
  } catch (e) {
    console.error('[pipeline] patch error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

export default router
```

### Edit: `server.js`

Add import after the adminRouter import line:
```js
import pipelineRouter from './routes/pipeline.js'
```

Add mount after the admin mount line:
```js
app.use('/api/pipeline', pipelineRouter)
```

### Build + restart after changes
Run pipeline close protocol. Confirm `[pipeline]` log entries are visible on test PATCH.

---

## Part 2 -- agent/promote.py

Create `C:/Users/phild/Desktop/Projects/Ali-Projects/agent/promote.py`

```python
"""
promote.py -- batch promote processed manifests to UKCP geo-content.json via pipeline endpoint.

Usage:
    python promote.py                     # promote all approved manifests in processed/
    python promote.py --dry-run           # print what would be sent, no PATCHes
    python promote.py --file county-Aberdeenshire-f10.json   # single file

Reads:  agent/processed/*-f10.json (and other field variants when added)
Target: http://localhost:3000/api/pipeline/geo-content/:key
Writes: promote-log.json in agent/logs/
"""

import os
import json
import argparse
import urllib.request
import urllib.error
from datetime import datetime, timezone

PROCESSED_DIR  = os.path.join(os.path.dirname(__file__), 'processed')
LOGS_DIR       = os.path.join(os.path.dirname(__file__), 'logs')
ENDPOINT       = 'http://localhost:3000/api/pipeline/geo-content'
LOG_FILE       = os.path.join(LOGS_DIR, 'promote-log.json')


def load_manifests(single_file=None):
    if single_file:
        path = os.path.join(PROCESSED_DIR, single_file)
        if not os.path.exists(path):
            raise FileNotFoundError(f'File not found: {path}')
        return [path]
    return sorted(
        os.path.join(PROCESSED_DIR, f)
        for f in os.listdir(PROCESSED_DIR)
        if f.endswith('.json') and '-f' in f
    )


def patch(key, field, value):
    url     = f'{ENDPOINT}/{urllib.parse.quote(key, safe="")}'
    payload = json.dumps({'field': field, 'value': value}).encode('utf-8')
    req     = urllib.request.Request(url, data=payload, method='PATCH')
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def run(dry_run=False, single_file=None):
    import urllib.parse

    paths   = load_manifests(single_file)
    results = []
    ok = skipped = failed = 0

    for path in paths:
        fname = os.path.basename(path)
        try:
            with open(path, encoding='utf-8') as f:
                manifest = json.load(f)
        except Exception as e:
            print(f'  SKIP {fname} -- parse error: {e}')
            skipped += 1
            continue

        records = manifest.get('records', [])
        if not records:
            print(f'  SKIP {fname} -- no records')
            skipped += 1
            continue

        for record in records:
            status = record.get('status', '')
            if status not in ('approved', 'ok'):
                print(f'  SKIP {fname} -- status: {status}')
                skipped += 1
                continue

            key   = record.get('entry_key', '')
            field = record.get('field', manifest.get('target_field', ''))
            value = record.get('value', '')

            if not key or not field or not value:
                print(f'  SKIP {fname} -- missing key/field/value')
                skipped += 1
                continue

            if dry_run:
                print(f'  DRY  {key} -> {field} ({len(value)} chars)')
                ok += 1
                continue

            try:
                resp = patch(key, field, value)
                print(f'  OK   {key} -> {field}')
                results.append({'file': fname, 'key': key, 'field': field, 'status': 'ok'})
                ok += 1
            except urllib.error.HTTPError as e:
                msg = e.read().decode()
                print(f'  FAIL {key} -> {field} -- HTTP {e.code}: {msg}')
                results.append({'file': fname, 'key': key, 'field': field, 'status': 'fail', 'error': msg})
                failed += 1
            except Exception as e:
                print(f'  FAIL {key} -> {field} -- {e}')
                results.append({'file': fname, 'key': key, 'field': field, 'status': 'fail', 'error': str(e)})
                failed += 1

    print(f'\nDone -- ok: {ok}  skipped: {skipped}  failed: {failed}')

    if not dry_run and results:
        os.makedirs(LOGS_DIR, exist_ok=True)
        log = {
            'run_at': datetime.now(timezone.utc).isoformat(),
            'ok': ok, 'skipped': skipped, 'failed': failed,
            'results': results,
        }
        with open(LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(log, f, indent=2)
        print(f'Log written: {LOG_FILE}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--file', default=None)
    args = parser.parse_args()
    run(dry_run=args.dry_run, single_file=args.file)
```

---

## Smoke test sequence

1. Build + restart UKCP server (pipeline route must be live)
2. Run: `python promote.py --dry-run` -- confirm all 91 manifests listed, no parse errors
3. Run: `python promote.py --file county-Aberdeenshire-f10.json` -- single entry, confirm OK + log written
4. Open geo-content.json, confirm county:Aberdeenshire f10 field is populated
5. Run: `python promote.py` -- full batch
6. Confirm promote-log.json: ok count = 91, failed = 0
7. Report back to Ali with log summary
