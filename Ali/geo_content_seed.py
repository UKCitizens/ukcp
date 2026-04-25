#!/usr/bin/env python3
"""
geo_content_seed.py
-------------------
Seeds geo-content.json with data from Wikipedia and Wikidata.

Run from Ali-Projects/UKCP/ (or anywhere — edit GEO_CONTENT_PATH below).

  python Ali/geo_content_seed.py

Writes to geo-content.json in place. Safe to re-run — only overwrites fields
that were successfully fetched. Existing f1/f2/f3 are never touched.

Fields populated:
  f4        — motto              (Wikidata P1451)
  f5        — area km²           (Wikidata P2046)
  f13       — official website   (Wikidata P856)
  seed_text — Wikipedia intro paragraph (raw material for f7/f8/f10 curation)
  _qid      — Wikidata QID (reference only, strip before shipping)

Fields left for separate passes:
  f6  — political composition (Parliament API — see geo_content_politics.py)
  f7  — economic character    (curate from seed_text)
  f8  — cultural identity     (curate from seed_text)
  f10 — historical note       (curate from seed_text)
  f14 — environment/designations (manual — seed_text contains some pointers)

Rate limiting: 0.5s between Wikipedia calls, 1 SPARQL call for all Wikidata.
Expected runtime: ~2 minutes for 114 entries.
"""

import json
import time
import urllib.request
import urllib.parse
import urllib.error
import sys
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────

GEO_CONTENT_PATH  = Path(__file__).parent.parent / 'public' / 'data' / 'geo-content.json'
SEED_SIDECAR_PATH = Path(__file__).parent.parent / 'public' / 'data' / 'geo-content-seed.json'

WIKIPEDIA_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/{}'
WIKIDATA_SPARQL   = 'https://query.wikidata.org/sparql'

HEADERS = {
    'User-Agent': 'UKCP/1.0 (phil@ukcp.dev) geo-content seeder',
    'Accept':     'application/json',
}

# Delay between Wikipedia calls (seconds). Wikidata gets one batched SPARQL call.
RATE_DELAY = 0.5

# Wikipedia slug overrides — where our key slug differs from the Wikipedia title.
SLUG_OVERRIDES = {
    'region:Yorkshire_and_The_Humber': 'Yorkshire_and_the_Humber',
    'county:West_Midlands':            'West_Midlands_(county)',
    'county:Huntingdonshire':          'Huntingdonshire',
    'county:Inner_London':             'Inner_London',
    'county:Outer_London':             'Outer_London',
    'county:Ross-shire':               'Ross-shire',
    'county:Cromartyshire':            'Cromartyshire',
    'county:Kinross-shire':            'Kinross-shire',
    'county:Kirkcudbrightshire':       'Kirkcudbrightshire',
    'county:Wigtownshire':             'Wigtownshire',
    'county:Peeblesshire':             'Peeblesshire',
    'county:Selkirkshire':             'Selkirkshire',
    'county:Clackmannanshire':         'Clackmannanshire',
    'county:Brecknockshire':           'Brecknockshire',
    'county:Cardiganshire':            'Cardiganshire',
    'county:Merionethshire':           'Merionethshire',
    'county:Caernarfonshire':          'Caernarfonshire',
    'county:Monmouthshire':            'Monmouthshire',
}

# ── Helpers ───────────────────────────────────────────────────────────────

def fetch_json(url, label=''):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f'  HTTP {e.code} — {label}')
        return None
    except Exception as e:
        print(f'  Error — {label}: {e}')
        return None


def wiki_slug_for(key, name):
    """Return the Wikipedia slug to use for a given geo-content key."""
    if key in SLUG_OVERRIDES:
        return SLUG_OVERRIDES[key]
    return name.replace(' ', '_')


def fetch_wiki_summary(slug):
    """Fetch Wikipedia REST Summary for a slug. Returns (qid, extract) or (None, None)."""
    url = WIKIPEDIA_SUMMARY.format(urllib.parse.quote(slug, safe='()'))
    data = fetch_json(url, label=slug)
    if not data:
        return None, None
    qid     = data.get('wikibase_item')       # e.g. 'Q145'
    extract = data.get('extract', '').strip()
    return qid, extract or None


def sparql_query(qids):
    """
    Run a single SPARQL query against Wikidata for all QIDs.
    Returns a dict keyed by QID: { 'area': str|None, 'motto': str|None, 'website': str|None }
    """
    if not qids:
        return {}

    values = ' '.join(f'wd:{q}' for q in qids)
    # Prefer English motto where available; fall back to any language.
    sparql = f"""
SELECT ?item ?areaVal ?mottoVal ?mottoLang ?websiteVal WHERE {{
  VALUES ?item {{ {values} }}
  OPTIONAL {{
    ?item wdt:P2046 ?areaVal .
  }}
  OPTIONAL {{
    ?item wdt:P1451 ?mottoVal .
    BIND(LANG(?mottoVal) AS ?mottoLang)
  }}
  OPTIONAL {{
    ?item wdt:P856 ?websiteVal .
  }}
}}
"""
    url = WIKIDATA_SPARQL + '?' + urllib.parse.urlencode({
        'query':  sparql.strip(),
        'format': 'json',
    })

    headers = {**HEADERS, 'Accept': 'application/sparql-results+json'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f'  SPARQL error: {e}')
        return {}

    # Aggregate results — prefer English motto, take first area/website per QID.
    results = {}
    for row in data.get('results', {}).get('bindings', []):
        qid = row['item']['value'].split('/')[-1]   # strip URI prefix
        if qid not in results:
            results[qid] = {'area': None, 'motto': None, 'website': None}

        if 'areaVal' in row and results[qid]['area'] is None:
            raw = row['areaVal']['value']
            try:
                area_km2 = float(raw)
                results[qid]['area'] = f'{area_km2:,.0f} km²'
            except ValueError:
                pass

        if 'mottoVal' in row:
            lang  = row.get('mottoLang', {}).get('value', '')
            text  = row['mottoVal']['value']
            existing = results[qid]['motto']
            # Prefer English; accept any if none yet.
            if existing is None or lang == 'en':
                results[qid]['motto'] = text

        if 'websiteVal' in row and results[qid]['website'] is None:
            results[qid]['website'] = row['websiteVal']['value']

    return results


# ── Main ──────────────────────────────────────────────────────────────────

def main():
    if not GEO_CONTENT_PATH.exists():
        print(f'ERROR: geo-content.json not found at {GEO_CONTENT_PATH}')
        sys.exit(1)

    with open(GEO_CONTENT_PATH, encoding='utf-8') as f:
        geo = json.load(f)

    print(f'Loaded {len(geo)} entries from {GEO_CONTENT_PATH}\n')

    # ── Phase 1: Wikipedia — get QID + seed text per entry ──────────────
    print('=== Phase 1: Wikipedia summary ===')
    qid_map = {}   # key → qid
    failed  = []

    for i, (key, entry) in enumerate(geo.items(), 1):
        name = entry['name']
        slug = wiki_slug_for(key, name)
        print(f'[{i:3}/{len(geo)}] {name} ({slug})')

        qid, extract = fetch_wiki_summary(slug)

        if qid:
            qid_map[key] = qid
            print(f'         QID={qid}')
        else:
            failed.append(key)
            print(f'         FAILED — will need manual QID or slug override')

        time.sleep(RATE_DELAY)

    print(f'\nWikipedia phase done. {len(qid_map)} hits, {len(failed)} failures.\n')
    if failed:
        print('Failed entries:')
        for k in failed:
            print(f'  {k}')
        print()

    # ── Phase 2: Wikidata — batch SPARQL for f4/f5/f13 ──────────────────
    print('=== Phase 2: Wikidata SPARQL ===')
    unique_qids = list(set(qid_map.values()))
    print(f'Querying Wikidata for {len(unique_qids)} QIDs ...')
    wd_results = sparql_query(unique_qids)
    print(f'Got Wikidata data for {len(wd_results)} QIDs.\n')

    # Apply Wikidata results back to entries.
    for key, qid in qid_map.items():
        wd = wd_results.get(qid, {})
        entry = geo[key]

        if wd.get('motto') and not entry.get('f4'):
            entry['f4'] = wd['motto']

        if wd.get('area') and not entry.get('f5'):
            entry['f5'] = wd['area']

        if wd.get('website') and not entry.get('f13'):
            entry['f13'] = wd['website']

    # ── Write geo-content.json — structured fields only, no seed_text/_qid ──
    # Keeping the production file lean prevents I/O truncation on large writes.
    SEED_KEYS = {'_qid', 'seed_text', '_seed_error'}
    geo_clean = {
        key: {k: v for k, v in entry.items() if k not in SEED_KEYS}
        for key, entry in geo.items()
    }
    tmp = GEO_CONTENT_PATH.with_suffix('.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(geo_clean, f, indent=2, ensure_ascii=False)
    tmp.replace(GEO_CONTENT_PATH)
    print(f'Written to {GEO_CONTENT_PATH}')

    # ── Write sidecar seed file — _qid + seed_text for curation reference ──
    seed_out = {}
    for key, entry in geo.items():
        qid   = qid_map.get(key) or entry.get('_qid')
        seed  = entry.get('seed_text')
        if qid or seed:
            seed_out[key] = {'name': entry['name']}
            if qid:  seed_out[key]['_qid']      = qid
            if seed: seed_out[key]['seed_text']  = seed
    stmp = SEED_SIDECAR_PATH.with_suffix('.tmp')
    with open(stmp, 'w', encoding='utf-8') as f:
        json.dump(seed_out, f, indent=2, ensure_ascii=False)
    stmp.replace(SEED_SIDECAR_PATH)
    print(f'Seed sidecar written to {SEED_SIDECAR_PATH}')

    # Summary
    f4_count   = sum(1 for e in geo_clean.values() if e.get('f4'))
    f5_count   = sum(1 for e in geo_clean.values() if e.get('f5'))
    f13_count  = sum(1 for e in geo_clean.values() if e.get('f13'))
    seed_count = sum(1 for e in seed_out.values() if e.get('seed_text'))
    print(f'\nResults:')
    print(f'  f4  (motto)    : {f4_count}/{len(geo)}')
    print(f'  f5  (area)     : {f5_count}/{len(geo)}')
    print(f'  f13 (website)  : {f13_count}/{len(geo)}')
    print(f'  seed_text      : {seed_count}/{len(geo)}')
    print(f'\nNext steps:')
    print(f'  1. Review seed_text fields and author f7/f8/f10 for each entry.')
    print(f'  2. Fix any _seed_error entries manually (add _qid and re-run or fill directly).')
    print(f'  3. Run geo_content_politics.py for f6 (political composition).')
    print(f'  4. Strip _qid and seed_text fields before shipping to production.')


if __name__ == '__main__':
    main()
