#!/usr/bin/env python3
"""
geo_content_politics.py
-----------------------
Populates f6 (political composition) in geo-content.json.

Run from Ali-Projects/UKCP/ (or anywhere — edit paths below).

  python Ali/geo_content_politics.py

Strategy:
  1. Fetch all current Commons MPs via Parliament Members API (~2 paginated calls).
  2. Build constituency_name → party lookup from the response.
  3. Load containment.json — maps constituency_id → { name, counties: [{ ctyhistnm }] }.
  4. For each county in geo-content.json, aggregate party counts across its constituencies.
  5. Roll up to region and country level from county results.
  6. Write f6 as a compact sorted string: "Lab: 12 · Con: 8 · LD: 3 · Green: 1"

f6 format: parties sorted by seat count descending, separated by ·
           Empty string written if no constituencies found (NI, sparse Scotland/Wales).

Expected runtime: ~10 seconds (2-3 API calls total).
"""

import json
import time
import urllib.request
import urllib.parse
import urllib.error
import sys
from collections import defaultdict
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────

GEO_CONTENT_PATH  = Path(__file__).parent.parent / 'public' / 'data' / 'geo-content.json'
CONTAINMENT_PATH  = Path(__file__).parent.parent / 'public' / 'data' / 'containment.json'

MEMBERS_API = 'https://members-api.parliament.uk/api/Members/Search'

HEADERS = {
    'User-Agent': 'UKCP/1.0 (phil@ukcp.dev) geo-content politics seeder',
    'Accept':     'application/json',
}

# Party name → short label (add rows as needed)
PARTY_SHORT = {
    'Labour':                            'Lab',
    'Labour (Co-op)':                    'Lab',
    'Conservative':                      'Con',
    'Liberal Democrats':                 'LD',
    'Liberal Democrat':                  'LD',
    'Scottish National Party':           'SNP',
    'Plaid Cymru':                       'PC',
    'Green Party':                       'Green',
    'Reform UK':                         'Reform',
    'Democratic Unionist Party':         'DUP',
    'Sinn Féin':                         'SF',
    'Social Democratic & Labour Party':  'SDLP',
    'Alliance':                          'Alliance',
    'Ulster Unionist Party':             'UUP',
    'Traditional Unionist Voice':        'TUV',
    'Independent':                       'Ind',
    'Speaker':                           'Speaker',
}

def short(party_name):
    return PARTY_SHORT.get(party_name, party_name[:6])


def norm(s):
    """Normalise a constituency name for fuzzy matching.
    Removes commas, collapses hyphens/apostrophes to spaces, lowercases.
    Handles: "Birmingham, Edgbaston" → "birmingham edgbaston"
    """
    s = s.lower()
    s = s.replace(',', '').replace("'", '').replace('\u2019', '')
    s = s.replace('-', ' ')
    return ' '.join(s.split())


# ── Helpers ───────────────────────────────────────────────────────────────

CONSTITUENCY_SEARCH = 'https://members-api.parliament.uk/api/Location/Constituency/Search'

def fetch_json(url, label=''):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f'  HTTP {e.code} — {label}')
        return None
    except Exception as e:
        print(f'  Error — {label}: {e}')
        return None


def fetch_party_for_constituency(name):
    """
    Fallback: query Constituency/Search for a single name.
    Returns short party label or None.
    Used for constituencies unmatched after normalisation (boundary rename cases).
    """
    params = urllib.parse.urlencode({'searchText': name, 'skip': 0, 'take': 5})
    data   = fetch_json(f'{CONSTITUENCY_SEARCH}?{params}', label=name)
    if not data:
        return None
    items = data.get('items', [])
    if not items:
        return None
    # Take first result — Search endpoint returns closest name match first.
    member = items[0].get('value', {}).get('currentRepresentation', {}).get('member', {}).get('value', {})
    party  = member.get('latestParty', {}).get('name', '')
    return short(party) if party else None


def fetch_all_mps():
    """
    Fetch all current Commons members from Parliament Members API.
    Returns a dict: normalised_constituency_name → short_party_label
    Parliament API caps take at 20 — paginate until totalResults exhausted.
    """
    page_size = 20
    skip      = 0
    all_items = []

    print('Fetching current Commons members ...')
    while True:
        params = urllib.parse.urlencode({
            'House':           1,
            'IsCurrentMember': 'true',
            'skip':            skip,
            'take':            page_size,
        })
        url  = f'{MEMBERS_API}?{params}'
        data = fetch_json(url, label=f'Members skip={skip}')
        if not data:
            break

        items = data.get('items', [])
        all_items.extend(items)
        print(f'  Fetched {len(all_items)} members so far ...')

        total = data.get('totalResults', 0)
        skip += page_size
        if skip >= total or not items:
            break
        time.sleep(0.5)

    print(f'Total MPs fetched: {len(all_items)}\n')

    # Build constituency → party map keyed by normalised name
    con_party = {}
    for item in all_items:
        member = item.get('value', {})
        party  = member.get('latestParty', {}).get('name', '')
        membership = member.get('latestHouseMembership', {})
        constituency = membership.get('membershipFrom', '').strip()
        if constituency and party:
            con_party[norm(constituency)] = short(party)

    return con_party


def format_f6(party_counts):
    """
    Format party counts as a compact string sorted by count descending.
    Returns empty string if no data.
    """
    if not party_counts:
        return ''
    sorted_parties = sorted(party_counts.items(), key=lambda x: -x[1])
    return ' · '.join(f'{p}: {n}' for p, n in sorted_parties)


# ── Main ──────────────────────────────────────────────────────────────────

def main():
    for path in (GEO_CONTENT_PATH, CONTAINMENT_PATH):
        if not path.exists():
            print(f'ERROR: not found — {path}')
            sys.exit(1)

    with open(GEO_CONTENT_PATH,  encoding='utf-8') as f:
        geo = json.load(f)
    with open(CONTAINMENT_PATH,  encoding='utf-8') as f:
        containment = json.load(f)

    print(f'Loaded {len(geo)} geo entries, {len(containment)} containment entries.\n')

    # ── Step 1: fetch MPs ────────────────────────────────────────────────
    con_party = fetch_all_mps()
    print(f'Constituency→party map: {len(con_party)} entries.\n')

    # ── Step 2: build county → party counts from containment ─────────────
    county_counts  = defaultdict(lambda: defaultdict(float))
    unmatched_cons = []   # names not resolved by normalised bulk map
    fallback_cache = {}   # name → party, populated by Constituency/Search fallback

    for con_id, con_entry in containment.items():
        con_name = con_entry.get('name', '').strip()
        party    = con_party.get(norm(con_name))

        if not party:
            unmatched_cons.append((con_id, con_name, con_entry))
        else:
            for county_ref in con_entry.get('counties', []):
                county_name = county_ref.get('ctyhistnm', '').strip()
                if not county_name:
                    continue
                weight = 0.5 if county_ref.get('partial') else 1.0
                county_counts[county_name][party] += weight

    # ── Step 2b: fallback — constituency search for unmatched ─────────────
    # Handles boundary-renamed constituencies (2024 review).
    # Rate-limited at 0.4s per call — expect ~90 seconds for 232 unmatched.
    if unmatched_cons:
        print(f'\nFallback search for {len(unmatched_cons)} unmatched constituencies ...')
        resolved = 0
        for i, (con_id, con_name, con_entry) in enumerate(unmatched_cons, 1):
            if con_name in fallback_cache:
                party = fallback_cache[con_name]
            else:
                party = fetch_party_for_constituency(con_name)
                fallback_cache[con_name] = party
                time.sleep(0.4)
            if not party:
                continue
            resolved += 1
            for county_ref in con_entry.get('counties', []):
                county_name = county_ref.get('ctyhistnm', '').strip()
                if not county_name:
                    continue
                weight = 0.5 if county_ref.get('partial') else 1.0
                county_counts[county_name][party] += weight
            if i % 20 == 0:
                print(f'  {i}/{len(unmatched_cons)} fallback lookups done, {resolved} resolved ...')
        print(f'  Fallback complete: {resolved}/{len(unmatched_cons)} resolved.\n')

    if unmatched_cons:
        print(f'Unmatched constituencies ({len(unmatched_cons)}) — no MP found in API:')
        for c in sorted(unmatched_cons)[:20]:
            print(f'  {c}')
        if len(unmatched_cons) > 20:
            print(f'  ... and {len(unmatched_cons) - 20} more')
        print()

    # ── Step 3: round counts and write county f6 ─────────────────────────
    # Round weighted counts to nearest integer for display.
    county_int_counts = {}
    for county, parties in county_counts.items():
        county_int_counts[county] = {p: round(n) for p, n in parties.items() if round(n) > 0}

    print('=== Writing county f6 ===')
    county_key_map = {}   # normalised county name → geo key
    for key in geo:
        if not key.startswith('county:'):
            continue
        name = geo[key]['name']
        county_key_map[name.lower()] = key

    written_counties = 0
    for county_name, parties in county_int_counts.items():
        geo_key = county_key_map.get(county_name.lower())
        if not geo_key:
            continue
        geo[geo_key]['f6'] = format_f6(parties)
        written_counties += 1

    print(f'  Counties written: {written_counties}\n')

    # ── Step 4: roll up region f6 ─────────────────────────────────────────
    # navConfig structure mirrored here for region → county mapping.
    # We derive region counties from geo-content.json itself.
    print('=== Rolling up region f6 ===')

    # Build region → list of county names from navConfig (embedded here for independence).
    region_counties = {
        'North East':                  ['Durham', 'Northumberland', 'Tyne and Wear'],
        'North West':                  ['Cheshire', 'Cumberland', 'Greater Manchester', 'Lancashire', 'Merseyside', 'Westmorland'],
        'Yorkshire and The Humber':    ['South Yorkshire', 'West Yorkshire', 'Yorkshire'],
        'East Midlands':               ['Derbyshire', 'Huntingdonshire', 'Leicestershire', 'Lincolnshire', 'Northamptonshire', 'Nottinghamshire', 'Rutland'],
        'West Midlands':               ['Herefordshire', 'Shropshire', 'Staffordshire', 'Warwickshire', 'West Midlands', 'Worcestershire'],
        'East of England':             ['Bedfordshire', 'Cambridgeshire', 'Essex', 'Hertfordshire', 'Norfolk', 'Suffolk'],
        'London':                      ['Inner London', 'Outer London'],
        'South East':                  ['Berkshire', 'Buckinghamshire', 'Hampshire', 'Kent', 'Oxfordshire', 'Surrey', 'Sussex'],
        'South West':                  ['Cornwall', 'Devon', 'Dorset', 'Gloucestershire', 'Somerset', 'Wiltshire'],
        'Highlands and Islands':       ['Caithness', 'Sutherland', 'Ross-shire', 'Cromartyshire', 'Inverness-shire', 'Nairnshire', 'Argyllshire', 'Buteshire', 'Orkney', 'Shetland'],
        'North East Scotland':         ['Aberdeenshire', 'Banffshire', 'Kincardineshire', 'Morayshire', 'Angus'],
        'Central Belt':                ['Lanarkshire', 'Renfrewshire', 'Dunbartonshire', 'Stirlingshire', 'Clackmannanshire', 'Kinross-shire', 'Fife', 'Perthshire', 'Midlothian', 'East Lothian', 'West Lothian'],
        'South Scotland':              ['Ayrshire', 'Dumfriesshire', 'Kirkcudbrightshire', 'Wigtownshire', 'Berwickshire', 'Roxburghshire', 'Selkirkshire', 'Peeblesshire'],
        'North Wales':                 ['Anglesey', 'Caernarfonshire', 'Denbighshire', 'Flintshire', 'Merionethshire'],
        'Mid Wales':                   ['Montgomeryshire', 'Radnorshire', 'Cardiganshire', 'Brecknockshire'],
        'South Wales':                 ['Glamorgan', 'Carmarthenshire', 'Pembrokeshire', 'Monmouthshire'],
    }

    written_regions = 0
    for region_name, counties in region_counties.items():
        region_parties = defaultdict(int)
        for county in counties:
            for party, n in county_int_counts.get(county, {}).items():
                region_parties[party] += n
        if not region_parties:
            continue
        slug    = region_name.replace(' ', '_')
        geo_key = f'region:{slug}'
        if geo_key in geo:
            geo[geo_key]['f6'] = format_f6(dict(region_parties))
            written_regions += 1

    print(f'  Regions written: {written_regions}\n')

    # ── Step 5: roll up country f6 ────────────────────────────────────────
    print('=== Rolling up country f6 ===')

    country_region_map = {
        'England':          ['North East', 'North West', 'Yorkshire and The Humber',
                             'East Midlands', 'West Midlands', 'East of England',
                             'London', 'South East', 'South West'],
        'Scotland':         ['Highlands and Islands', 'North East Scotland', 'Central Belt', 'South Scotland'],
        'Wales':            ['North Wales', 'Mid Wales', 'South Wales'],
        'Northern Ireland': [],   # NI data is sparse — leave empty for now
    }

    uk_parties = defaultdict(int)

    for country_name, regions in country_region_map.items():
        country_parties = defaultdict(int)
        for region_name in regions:
            for county in region_counties.get(region_name, []):
                for party, n in county_int_counts.get(county, {}).items():
                    country_parties[party] += n
                    uk_parties[party]      += n
        if not country_parties:
            continue
        slug    = country_name.replace(' ', '_')
        geo_key = f'country:{slug}'
        if geo_key in geo:
            geo[geo_key]['f6'] = format_f6(dict(country_parties))
            print(f'  {country_name}: {geo[geo_key]["f6"]}')

    # United Kingdom
    if uk_parties and 'country:United_Kingdom' in geo:
        geo['country:United_Kingdom']['f6'] = format_f6(dict(uk_parties))
        print(f'  United Kingdom: {geo["country:United_Kingdom"]["f6"]}')

    # ── Write output (atomic via temp file to prevent truncation on interrupt) ──
    tmp = GEO_CONTENT_PATH.with_suffix('.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(geo, f, indent=2, ensure_ascii=False)
    tmp.replace(GEO_CONTENT_PATH)

    f6_count = sum(1 for e in geo.values() if e.get('f6'))
    print(f'\nWritten to {GEO_CONTENT_PATH}')
    print(f'f6 entries written: {f6_count}/{len(geo)}')
    print('\nNext: review and curate geo-content.json, then author f7/f8/f10 from seed_text.')


if __name__ == '__main__':
    main()
