# Wales Place Name Deduplication — Spot Review
**Date: 21 Apr 2026**

---

## Source

GBPN.csv, Wales settlements only (City/Town/Village/Hamlet), grouped by GBPNID.

- 6,727 Wales settlement rows in GBPN
- 4,806 unique GBPNIDs (actual physical places)
- **1,921 excess rows to collapse**
- 1,584 GBPNIDs have more than one name row

WD rows (wards) come from IPN — they do not have this duplication. Problem is LOC rows only, confirmed.

---

## NameType values

| Type | Meaning | Count |
|------|---------|-------|
| P | Primary name — canonical | 4,799 |
| C | Common/alternative name | 1,683 |
| K | Article-inverted indexing form (e.g. "Fenni, Y" = "Y Fenni", "Bank, West" = "West Bank") | 239 |
| p / c | Lowercase variants (5 rows) | 6 |

**K-type rows are pure indexing artifacts** — always paired with a P or C row that has the correct form. Always discard.

---

## 2-name groups: 1,290

| Category | Count | Treatment |
|----------|-------|-----------|
| Notes-confirmed bilingual | 151 | Merge to `Welsh (English)` |
| Punct/hyphen/space only | 465 | Deduplicate → keep P-row name |
| Suspect — substantially different, no Notes annotation | 531 | Needs classification (see below) |

**Notes-confirmed bilingual** = GBPN Notes field contains `"Welsh (English) is a..."` parenthetical pattern. These are the safe set. Examples:
- Cardiff / Caerdydd
- Bridgend / Pen-y-bont ar Ogwr
- Fishguard / Abergwaun
- Brecon / Aberhonddu
- Mountain Ash / Aberpennar
- Aberavon / Aberafan
- Colwyn Bay / Bae Colwyn
- Buckley / Bwcle

**Punct/hyphen/space only** — tokens identical after normalisation. Most are hyphen vs no-hyphen or space variants (Abercarn / Aber-carn). However some in this bucket may be bilingual (Aberbargoed/Aberbargod) — GBPN just didn't annotate them with a parenthetical. Safe to deduplicate to P-row name.

**531 suspect** — substantially different names, no Notes annotation. Subset are clearly bilingual:
- Aberdovey / Aberdyfi
- Cardigan / Aberteifi
- Three Cocks / Aberllynfi
- Beaumaris / Biwmaris
- Penrhyn Bay / Bae Penrhyn

Subset appear to be Welsh spelling variants:
- Aber / Aber Clydach (parent/child)
- Aberffraw / Aberffro
- Aberyscir / Aberysgir

This bucket needs a classification decision before build.

---

## 3+ name groups: 294

| Category | Count |
|----------|-------|
| Have at least one confirmed bilingual C-row | 52 |
| Punct/K-form only | 242 |

Examples of 3+ bilingual:
- Abergavenny + Y Fenni (K) + Y Fenni (C)
- Milford Haven + Aberdaugleddau (C) + Aberdaugleddyf (C)
- Bala + Y Bala (K) + Y Bala (C)

---

## Proposed treatment

### Phase 1 — safe, unambiguous

1. **Discard all K-type rows** (239 rows) — article inversions, never needed
2. **Collapse punct-only groups** (465 groups, ~465 excess rows) — keep P-row name
3. **Merge Notes-confirmed bilingual pairs** (151 × 2-name + 52 × 3+name) — emit one record per GBPNID with name = `Welsh (English)` where Welsh is the C-row name and English is the P-row name (GBPN Primary = English in all confirmed cases)

Phase 1 eliminates ~800 excess rows cleanly.

### Phase 2 — 531 suspect pairs

Decision needed: classify as bilingual or spelling variant.

Options:
- Accept the GBPN Notes annotation as the only ground truth → treat suspects as spelling variants → keep P-row only (simpler, some bilingual pairs lost)
- Apply additional heuristics (Levenshtein distance, token overlap ratio, known Welsh word list) to classify the remaining ~531
- Manual review of the 531 (table provided on request)

Recommendation: start with option A (trust Notes only), and add an override table for known mis-classified pairs (Aberdovey/Aberdyfi is a well-known pair, easy to hand-add).

---

## Row counts after Phase 1

| Before | After | Removed |
|--------|-------|---------|
| 6,727 Wales LOC rows | ~5,700 est. | ~1,030 |

Remaining duplicates (suspect 531 + 3+ name non-bilingual) to be resolved in Phase 2.
