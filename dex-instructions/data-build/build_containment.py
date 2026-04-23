"""
build_containment.py -- UKCP containment map builder.
Reads newplace.csv from public/data/ (must be the Sprint 6 rebuild with ctyhistnm).
Walks WD rows only. Groups wards by constituency (con_gss).
For each constituency, collects all distinct ctyhistnm values across its wards.
A constituency is partial in a county if its wards span more than one ctyhistnm.
Output: public/data/containment.json
Schema:
{
  "E14001234": {
    "name": "Constituency Name",
    "counties": [
      { "ctyhistnm": "Kent", "partial": false },
      { "ctyhistnm": "Surrey", "partial": true }
    ]
  },
  ...
}
Run: python build_containment.py  (from data-build/ directory)
"""
import csv
import json
import os
from collections import defaultdict

CSV_PATH = '../public/data/newplace.csv'
OUT_PATH = '../public/data/containment.json'


def build_containment(csv_path):
    # con_gss -> { name, counties: set of ctyhistnm values }
    cons = defaultdict(lambda: { "name": "", "counties": set() })

    with open(csv_path, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('type', '').strip() != 'WD':
                continue
            con_gss    = row.get('con_gss', '').strip()
            con_name   = row.get('constituency', '').strip()
            ctyhistnm  = row.get('ctyhistnm', '').strip()
            if not con_gss or not ctyhistnm:
                continue
            cons[con_gss]["name"] = con_name
            cons[con_gss]["counties"].add(ctyhistnm)

    result = {}
    for con_gss, data in cons.items():
        counties = data["counties"]
        is_multi = len(counties) > 1
        result[con_gss] = {
            "name": data["name"],
            "counties": [
                { "ctyhistnm": c, "partial": is_multi }
                for c in sorted(counties)
            ]
        }
    return result


if __name__ == "__main__":
    print("Building containment map...")
    containment = build_containment(CSV_PATH)
    print(f"  Constituencies: {len(containment)}")
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(containment, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  Written: {OUT_PATH}")
    print("Done.")
