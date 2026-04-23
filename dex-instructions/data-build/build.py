"""
UKCP Location Data Build Pipeline
==================================
Produces: output/newplace.csv — unified LOC + WD dataset

Sources:
  sources/IPN_GB_2024.csv  — ONS Index of Place Names GB 2024
  sources/GBPN.csv         — GB Place Names gazetteer (settlement type classifier)

Output schema (22 fields):
  id, name, type, place_type,
  country, country_gss,
  region, region_gss,
  ctyhistnm, county_gss,
  lad_name, lad_gss,
  constituency, con_gss,
  ward, ward_gss,
  lat, lng,
  summary (reserved — empty string, UI composes from fields)

Run: python build.py
"""

import csv
import math
import os
import time

# ── Config ────────────────────────────────────────────────────────────────────

IPN_PATH   = 'sources/IPN_GB_2024.csv'
GBPN_PATH  = 'sources/GBPN.csv'
OUT_DIR    = 'output'
OUT_PATH   = os.path.join(OUT_DIR, 'newplace.csv')

KEEP_ROW_TYPES = {'LOC', 'WD'}
KEEP_PLACE_TYPES = {'City', 'Town', 'Village', 'Hamlet'}

# GBPN→output place_type mapping
PLACE_TYPE_MAP = {
    'City':    'City',
    'Town':    'Town',
    'Village': 'Village',
    'Hamlet':  'Hamlet',
}

# English Unitary Authority lad_name → ONS statistical region.
# rgn23nm in IPN_GB_2024 is unreliable for UA rows (cty23nm empty).
# Shire rows (cty23nm populated) have correct rgn23nm and do not use this table.
UA_REGION = {
    # North East
    'County Durham':            'North East',
    'Darlington':               'North East',
    'Gateshead':                'North East',
    'Hartlepool':               'North East',
    'Middlesbrough':            'North East',
    'Newcastle upon Tyne':      'North East',
    'North Tyneside':           'North East',
    'Northumberland':           'North East',
    'Redcar and Cleveland':     'North East',
    'South Tyneside':           'North East',
    'Stockton-on-Tees':         'North East',
    'Sunderland':               'North East',
    # North West
    'Blackburn with Darwen':    'North West',
    'Blackpool':                'North West',
    'Cheshire East':            'North West',
    'Cheshire West and Chester':'North West',
    'Cumberland':               'North West',
    'Halton':                   'North West',
    'Warrington':               'North West',
    'Westmorland and Furness':  'North West',
    # Yorkshire and The Humber
    'East Riding of Yorkshire':             'Yorkshire and The Humber',
    'Kingston upon Hull, City of':          'Yorkshire and The Humber',
    'North East Lincolnshire':              'Yorkshire and The Humber',
    'North Lincolnshire':                   'Yorkshire and The Humber',
    'North Yorkshire':                      'Yorkshire and The Humber',
    'York':                                 'Yorkshire and The Humber',
    # East Midlands
    'Derby':                    'East Midlands',
    'Leicester':                'East Midlands',
    'North Northamptonshire':   'East Midlands',
    'Nottingham':               'East Midlands',
    'Rutland':                  'East Midlands',
    'West Northamptonshire':    'East Midlands',
    # West Midlands (region)
    'Herefordshire, County of': 'West Midlands',
    'Shropshire':               'West Midlands',
    'Stoke-on-Trent':           'West Midlands',
    'Telford and Wrekin':       'West Midlands',
    # East of England
    'Bedford':                  'East of England',
    'Central Bedfordshire':     'East of England',
    'Luton':                    'East of England',
    'Peterborough':             'East of England',
    'Southend-on-Sea':          'East of England',
    'Thurrock':                 'East of England',
    # South East
    'Bracknell Forest':         'South East',
    'Brighton and Hove':        'South East',
    'Buckinghamshire':          'South East',
    'Isle of Wight':            'South East',
    'Medway':                   'South East',
    'Milton Keynes':            'South East',
    'Portsmouth':               'South East',
    'Reading':                  'South East',
    'Slough':                   'South East',
    'Southampton':              'South East',
    'West Berkshire':           'South East',
    'Windsor and Maidenhead':   'South East',
    'Wokingham':                'South East',
    # South West
    'Bath and North East Somerset':             'South West',
    'Bournemouth, Christchurch and Poole':      'South West',
    'Bristol, City of':                         'South West',
    'Cornwall':                                 'South West',
    'Dorset':                                   'South West',
    'Isles of Scilly':                          'South West',
    'North Somerset':                           'South West',
    'Plymouth':                                 'South West',
    'Somerset':                                 'South West',
    'South Gloucestershire':                    'South West',
    'Swindon':                                  'South West',
    'Torbay':                                   'South West',
    'Wiltshire':                                'South West',
}

# Metropolitan county LAD override.
# Rows where lad23nm matches a value in this dict get the metro county name
# as their ctyhistnm output, overriding the IPN ctyhistnm field.
# Applied after the Greater London override. All lad23nm values verified against IPN.
METRO_LAD = {
    'Gateshead':              'Tyne and Wear',
    'Newcastle upon Tyne':    'Tyne and Wear',
    'North Tyneside':         'Tyne and Wear',
    'South Tyneside':         'Tyne and Wear',
    'Sunderland':             'Tyne and Wear',
    'Knowsley':               'Merseyside',
    'Liverpool':              'Merseyside',
    'Sefton':                 'Merseyside',
    'St. Helens':             'Merseyside',
    'Wirral':                 'Merseyside',
    'Bolton':                 'Greater Manchester',
    'Bury':                   'Greater Manchester',
    'Manchester':             'Greater Manchester',
    'Oldham':                 'Greater Manchester',
    'Rochdale':               'Greater Manchester',
    'Salford':                'Greater Manchester',
    'Stockport':              'Greater Manchester',
    'Tameside':               'Greater Manchester',
    'Trafford':               'Greater Manchester',
    'Wigan':                  'Greater Manchester',
    'Barnsley':               'South Yorkshire',
    'Doncaster':              'South Yorkshire',
    'Rotherham':              'South Yorkshire',
    'Sheffield':              'South Yorkshire',
    'Bradford':               'West Yorkshire',
    'Calderdale':             'West Yorkshire',
    'Kirklees':               'West Yorkshire',
    'Leeds':                  'West Yorkshire',
    'Wakefield':              'West Yorkshire',
    'Birmingham':             'West Midlands',
    'Coventry':               'West Midlands',
    'Dudley':                 'West Midlands',
    'Sandwell':               'West Midlands',
    'Solihull':               'West Midlands',
    'Walsall':                'West Midlands',
    'Wolverhampton':          'West Midlands',
}

# Scotland: ctyhistnm → curated region. Mirrors navConfig scotland.regions.
SCOTLAND_COUNTY_REGION = {
    'Caithness':          'Highlands and Islands',
    'Sutherland':         'Highlands and Islands',
    'Ross-shire':         'Highlands and Islands',
    'Cromartyshire':      'Highlands and Islands',
    'Inverness-shire':    'Highlands and Islands',
    'Nairnshire':         'Highlands and Islands',
    'Argyllshire':        'Highlands and Islands',
    'Buteshire':          'Highlands and Islands',
    'Orkney':             'Highlands and Islands',
    'Shetland':           'Highlands and Islands',
    'Aberdeenshire':      'North East Scotland',
    'Banffshire':         'North East Scotland',
    'Kincardineshire':    'North East Scotland',
    'Morayshire':         'North East Scotland',
    'Angus':              'North East Scotland',
    'Lanarkshire':        'Central Belt',
    'Renfrewshire':       'Central Belt',
    'Dunbartonshire':     'Central Belt',
    'Stirlingshire':      'Central Belt',
    'Clackmannanshire':   'Central Belt',
    'Kinross-shire':      'Central Belt',
    'Fife':               'Central Belt',
    'Perthshire':         'Central Belt',
    'Midlothian':         'Central Belt',
    'East Lothian':       'Central Belt',
    'West Lothian':       'Central Belt',
    'Ayrshire':           'South Scotland',
    'Dumfriesshire':      'South Scotland',
    'Kirkcudbrightshire': 'South Scotland',
    'Wigtownshire':       'South Scotland',
    'Berwickshire':       'South Scotland',
    'Roxburghshire':      'South Scotland',
    'Selkirkshire':       'South Scotland',
    'Peeblesshire':       'South Scotland',
}

# Wales: ctyhistnm → curated region. Mirrors navConfig wales.regions.
WALES_COUNTY_REGION = {
    'Anglesey':        'North Wales',
    'Caernarfonshire': 'North Wales',
    'Denbighshire':    'North Wales',
    'Flintshire':      'North Wales',
    'Merionethshire':  'North Wales',
    'Montgomeryshire': 'Mid Wales',
    'Radnorshire':     'Mid Wales',
    'Cardiganshire':   'Mid Wales',
    'Brecknockshire':  'Mid Wales',
    'Glamorgan':       'South Wales',
    'Carmarthenshire': 'South Wales',
    'Pembrokeshire':   'South Wales',
    'Monmouthshire':   'South Wales',
}

# country name → GSS code
COUNTRY_GSS = {
    'England':          'E92000001',
    'Wales':            'W92000004',
    'Scotland':         'S92000003',
    'Northern Ireland': 'N92000002',
}

# Output field order
OUT_FIELDS = [
    'id', 'name', 'type', 'place_type',
    'country', 'country_gss',
    'region', 'region_gss',
    'ctyhistnm', 'county_gss',
    'lad_name', 'lad_gss',
    'constituency', 'con_gss',
    'ward', 'ward_gss',
    'lat', 'lng',
    'summary',
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def haversine(lat1, lng1, lat2, lng2):
    """Straight-line distance in km between two WGS84 points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi  = math.radians(lat2 - lat1)
    dlng  = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def safe_float(val):
    try:
        return float(val.strip()) if val and val.strip() else None
    except ValueError:
        return None


def county_key(row):
    """
    Return the county navigation key for a row.
    Precedence:
      1. cty91nm == Greater London AND cty23nm non-empty -> cty23nm (Inner London / Outer London)
      2. lad23nm in METRO_LAD                            -> metro county name
      3. Otherwise                                       -> ctyhistnm (ONS historic county)
    Note: guard on cty23nm non-empty handles boundary anomalies where a ward has
    a historic Greater London assignment (cty91nm) but is now in a UA (cty23nm empty).
    """
    if row.get('cty91nm', '').strip() == 'Greater London':
        cty23 = row.get('cty23nm', '').strip()
        if cty23:
            return cty23
    metro = METRO_LAD.get(row.get('lad23nm', '').strip())
    if metro:
        return metro
    return row.get('ctyhistnm', '').strip()


def resolve_region(row):
    """
    Return the correct ONS statistical region for a row.

    IPN rgn23nm is reliable for shire-county rows (cty23nm populated) but
    unreliable for UA rows (cty23nm empty) — those default to 'North East'
    in IPN_GB_2024 regardless of actual geography.

    Scotland/Wales rows have no rgn23nm in IPN — region is derived from
    ctyhistnm via SCOTLAND_COUNTY_REGION / WALES_COUNTY_REGION, mirroring
    the curated groupings in navConfig.js.

    English UA rows are corrected via UA_REGION keyed on lad23nm.
    """
    cty = row.get('cty23nm', '').strip()
    if cty:
        # Shire row — rgn23nm is correct
        return row.get('rgn23nm', '').strip()

    country = row.get('ctry23nm', '').strip()
    if country == 'Scotland':
        return SCOTLAND_COUNTY_REGION.get(row.get('ctyhistnm', '').strip(), '')
    if country == 'Wales':
        return WALES_COUNTY_REGION.get(row.get('ctyhistnm', '').strip(), '')

    # English UA row — look up by LAD name, fall back to rgn23nm
    lad = row.get('lad23nm', '').strip()
    return UA_REGION.get(lad, row.get('rgn23nm', '').strip())


# ── Step 1: Load GBPN settlement rows ────────────────────────────────────────

def load_gbpn(path):
    """
    Build two lookup dicts from GBPN for place_type assignment.
    No geo matching — administrative field deduction only.

    lad_map: (name_lower, lad_lower) → place_type
        lad = UniAuth if populated, else District.
        Primary join — matches IPN lad23nm directly.
        When a (name, lad) pair appears more than once in GBPN, first occurrence wins
        (GBPN records only one primary entry per location).

    county_map: (name_lower, histcounty_lower) → place_type
        Fallback for GBPN entries with no UniAuth or District.
        Only populated when the (name, county) pair is unambiguous — exactly one
        place_type across all GBPN entries with that name+county. Ambiguous pairs
        are dropped (safer to leave blank than guess wrong).
        Matches IPN raw ctyhistnm field.

    Rationale: GBPN UniAuth/District = IPN lad23nm for the same administrative
    geography. This lets us join without coordinates — deducing identity from the
    full administrative address of each settlement rather than proximity.
    """
    print('Loading GBPN...')
    lad_map      = {}
    county_raw   = {}   # (name, histcounty) → set of types

    with open(path, encoding='latin-1', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pt = PLACE_TYPE_MAP.get(row.get('Type', '').strip())
            if not pt:
                continue
            name = row.get('PlaceName', '').strip().lower()
            hist = row.get('HistCounty', '').strip().lower()
            ua   = row.get('UniAuth',   '').strip().lower()
            dist = row.get('District',  '').strip().lower()
            lad  = ua or dist

            if name and lad:
                key = (name, lad)
                if key not in lad_map:
                    lad_map[key] = pt
                # Do NOT add to county_raw — this entry is LAD-identified.
                # Allowing it into county_raw would cause other same-name places
                # in the same historic county (but different LAD) to inherit this type.
            elif name and hist:
                # Only county-level identity — no UniAuth or District in GBPN.
                county_raw.setdefault((name, hist), set()).add(pt)

    # County fallback: only unambiguous (name, county) pairs.
    county_map = {k: next(iter(v)) for k, v in county_raw.items() if len(v) == 1}

    print(f'  GBPN lad_map entries:    {len(lad_map):,}')
    print(f'  GBPN county_map entries: {len(county_map):,}  (unambiguous name+county pairs)')
    return lad_map, county_map


# ── Step 2: Build a simple lat/lng grid index for GBPN ───────────────────────


# ── Step 3: Process IPN rows ──────────────────────────────────────────────────

def process_ipn(ipn_path, gbpn_lad_map, gbpn_county_map):
    """
    place_type resolution for LOC rows — no geo matching.

    Join order:
      1. (name, lad23nm)      vs gbpn_lad_map     — primary, most specific
      2. (name, raw_ctyhistnm) vs gbpn_county_map  — fallback, unambiguous pairs only
      3. Empty                                      — no match; included with place_type=''
    """
    print('Processing IPN...')
    loc_rows    = []
    wd_rows     = []
    skipped     = 0
    lad_hits    = 0
    county_hits = 0
    no_type     = 0

    with open(ipn_path, encoding='latin-1', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            desc = row.get('descnm', '').strip()
            if desc not in KEEP_ROW_TYPES:
                continue

            lat = safe_float(row.get('lat', ''))
            lng = safe_float(row.get('long', ''))
            if lat is None or lng is None:
                skipped += 1
                continue

            out = {
                'id':          row.get('place23cd', '').strip(),
                'name':        row.get('place23nm', '').strip(),
                'type':        desc,
                'place_type':  '',
                'country':     row.get('ctry23nm', '').strip(),
                'country_gss': COUNTRY_GSS.get(row.get('ctry23nm', '').strip(), ''),
                'region':      resolve_region(row),
                'region_gss':  row.get('rgn23cd', '').strip(),
                'ctyhistnm':   county_key(row),
                'county_gss':  row.get('cty23cd', '').strip(),
                'lad_name':    row.get('lad23nm', '').strip(),
                'lad_gss':     row.get('lad23cd', '').strip(),
                'constituency':row.get('pcon23nm', '').strip(),
                'con_gss':     row.get('pcon23cd', '').strip(),
                'ward':        row.get('place23nm', '').strip() if desc == 'WD' else '',
                'ward_gss':    row.get('wd23cd', '').strip(),
                'lat':         str(lat),
                'lng':         str(lng),
                'summary':     '',
            }

            if desc == 'LOC':
                name = out['name'].lower()
                lad  = row.get('lad23nm', '').strip().lower()
                hist = row.get('ctyhistnm', '').strip().lower()   # raw IPN field, pre-override

                pt = gbpn_lad_map.get((name, lad), '')
                if pt:
                    lad_hits += 1
                else:
                    pt = gbpn_county_map.get((name, hist), '')
                    if pt:
                        county_hits += 1
                    else:
                        no_type += 1

                out['place_type'] = pt
                loc_rows.append(out)
            else:
                wd_rows.append(out)

    print(f'  LOC rows: {len(loc_rows):,}')
    print(f'    place_type via name+lad:    {lad_hits:,}')
    print(f'    place_type via name+county: {county_hits:,}')
    print(f'    no place_type:              {no_type:,}')
    print(f'  WD rows:  {len(wd_rows):,}')
    print(f'  Skipped (no lat/lng): {skipped}')
    return loc_rows, wd_rows


# ── Step 3.5: Assign ward to LOC rows by proximity to nearest WD centroid ────

def build_wd_index(wd_rows, cell_deg=0.1):
    """
    Build a grid index of WD rows for fast nearest-ward lookup.
    Each cell entry: (lat, lng, ward_name, ward_gss)
    """
    index = {}
    for row in wd_rows:
        lat = safe_float(row.get('lat', ''))
        lng = safe_float(row.get('lng', ''))
        if lat is None or lng is None:
            continue
        key = (int(lat / cell_deg), int(lng / cell_deg))
        index.setdefault(key, []).append((lat, lng, row['name'], row['ward_gss']))
    return index, cell_deg


def find_nearest_ward(lat, lng, wd_index, cell_deg):
    """
    Find nearest ward centroid. No distance threshold — nearest always wins.
    Returns (ward_name, ward_gss) or ('', '') if index is empty.
    """
    best_dist = float('inf')
    best_ward = ''
    best_gss  = ''
    ci = int(lat / cell_deg)
    cj = int(lng / cell_deg)
    for di in (-1, 0, 1):
        for dj in (-1, 0, 1):
            cell = wd_index.get((ci + di, cj + dj), [])
            for (wlat, wlng, wname, wgss) in cell:
                d = haversine(lat, lng, wlat, wlng)
                if d < best_dist:
                    best_dist = d
                    best_ward = wname
                    best_gss  = wgss
    return best_ward, best_gss


def assign_wards(loc_rows, wd_index, cell_deg):
    """
    Assign ward and ward_gss to each LOC row by proximity to nearest WD centroid.
    Mutates loc_rows in place.
    """
    print('Assigning wards to LOC rows...')
    assigned = 0
    for row in loc_rows:
        lat = safe_float(row.get('lat', ''))
        lng = safe_float(row.get('lng', ''))
        if lat is None or lng is None:
            continue
        ward, gss = find_nearest_ward(lat, lng, wd_index, cell_deg)
        row['ward']     = ward
        row['ward_gss'] = gss
        if ward:
            assigned += 1
    print(f'  Ward assigned: {assigned:,} / {len(loc_rows):,} LOC rows')


# ── Step 4: Merge, sort, write ────────────────────────────────────────────────

def write_output(loc_rows, wd_rows, out_path):
    all_rows = loc_rows + wd_rows
    all_rows.sort(key=lambda r: r['name'].lower())

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=OUT_FIELDS, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(all_rows)

    print(f'  Written: {out_path}')
    print(f'  Total rows: {len(all_rows):,}')


# ── Step 5: Validate ──────────────────────────────────────────────────────────

def validate(out_path):
    print('Validating output...')
    errors = []
    with open(out_path, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total = len(rows)
    loc = [r for r in rows if r['type'] == 'LOC']
    wd  = [r for r in rows if r['type'] == 'WD']

    # Required fields on all rows
    for i, row in enumerate(rows):
        for field in ('id', 'name', 'type', 'country', 'lat', 'lng'):
            if not row.get(field, '').strip():
                errors.append(f'Row {i+2}: missing {field} (id={row.get("id","")})')

    # ctyhistnm populated on English rows
    eng_no_county = [r for r in rows if r['country'] == 'England' and not r.get('ctyhistnm','').strip()]
    if eng_no_county:
        errors.append(f'English rows missing ctyhistnm: {len(eng_no_county)}')

    # constituency on all rows
    no_con = [r for r in rows if not r.get('constituency','').strip()]
    if no_con:
        errors.append(f'Rows missing constituency: {len(no_con)}')

    # place_type coverage on LOC rows
    loc_with_type = [r for r in loc if r.get('place_type','').strip()]
    pct = int(len(loc_with_type) / len(loc) * 100) if loc else 0

    print(f'  Total rows:        {total:,}')
    print(f'  LOC:               {len(loc):,}')
    print(f'  WD:                {len(wd):,}')
    print(f'  place_type on LOC: {len(loc_with_type):,} / {len(loc):,} ({pct}%)')
    print(f'  Validation errors: {len(errors)}')
    for e in errors[:10]:
        print(f'    {e}')
    if len(errors) > 10:
        print(f'    ...and {len(errors)-10} more')


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    t0 = time.time()

    gbpn_lad_map, gbpn_county_map = load_gbpn(GBPN_PATH)
    loc_rows, wd_rows = process_ipn(IPN_PATH, gbpn_lad_map, gbpn_county_map)

    wd_index, wd_cdeg  = build_wd_index(wd_rows)
    assign_wards(loc_rows, wd_index, wd_cdeg)

    print('Writing output...')
    write_output(loc_rows, wd_rows, OUT_PATH)

    validate(OUT_PATH)

    print(f'\nDone in {time.time()-t0:.1f}s')
