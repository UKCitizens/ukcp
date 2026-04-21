/**
 * @file ConstituencyPane.jsx
 * @description Right-pane constituency browser — Option A two-panel layout.
 *
 * Panel 1 — A-Z strip + constituency list (scoped to nav depth).
 *   Click constituency → select('constituency', name) [explore mode in Locations.jsx]
 *
 * Panel 2 — Ward list for the currently selected constituency (from path).
 *   Shown only when a constituency is in path.
 *   Click ward → selectMany([constituency, ward])
 *
 * No partial badges. No tree. No expand/collapse.
 *
 * Scope behaviour (constituency list):
 *   county  → constituencies containing that county (containment filter)
 *   region  → all constituencies in hierarchy region
 *   country → all constituencies in hierarchy country
 *   none    → all UK (~633)
 */

import { useMemo, useState, useEffect } from 'react'
import classes from './ConstituencyPane.module.css'

const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// ── Scope helpers ─────────────────────────────────────────────────────────

function getConstituenciesForScope(containment, hierarchy, country, region, county) {
  if (!containment) return []

  if (county) {
    const needle = county.trim().toLowerCase()
    const results = []
    for (const [id, entry] of Object.entries(containment)) {
      const match = entry.counties?.find(c => c.ctyhistnm?.trim().toLowerCase() === needle)
      if (match) results.push({ id, name: entry.name })
    }
    return results.sort((a, b) => a.name.localeCompare(b.name))
  }

  let allowedNames = null
  if (region && country && hierarchy) {
    allowedNames = new Set()
    const counties = hierarchy?.[country]?.regions?.[region]?.counties ?? {}
    for (const countyData of Object.values(counties)) {
      for (const name of Object.keys(countyData.constituencies ?? {})) allowedNames.add(name)
    }
  } else if (country && hierarchy) {
    allowedNames = new Set()
    const regions = hierarchy?.[country]?.regions ?? {}
    for (const regionData of Object.values(regions)) {
      for (const countyData of Object.values(regionData.counties ?? {})) {
        for (const name of Object.keys(countyData.constituencies ?? {})) allowedNames.add(name)
      }
    }
  }

  return Object.entries(containment)
    .filter(([, entry]) => !allowedNames || allowedNames.has(entry.name))
    .map(([id, entry]) => ({ id, name: entry.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function getWardsFromFlat(wards, constituencyName) {
  if (!wards?.length || !constituencyName) return []
  const norm = constituencyName.trim().toLowerCase()
  const names = new Set()
  for (const w of wards) {
    if (w.constituency?.trim().toLowerCase() === norm && w.name) names.add(w.name)
  }
  return [...names].sort()
}

// ── Component ─────────────────────────────────────────────────────────────

export default function ConstituencyPane({ containment, path, hierarchy, wards, select, selectMany, paneTitle }) {
  const [activeLetter, setActiveLetter] = useState(null)

  const country      = path?.find(p => p.level === 'country')?.value      ?? null
  const region       = path?.find(p => p.level === 'region')?.value       ?? null
  const county       = path?.find(p => p.level === 'county')?.value       ?? null
  const constituency = path?.find(p => p.level === 'constituency')?.value ?? null
  const ward         = path?.find(p => p.level === 'ward')?.value         ?? null

  const constituencies = useMemo(() => {
    const all = getConstituenciesForScope(containment, hierarchy, country, region, county)
    // If a constituency is already in path (walker nav), scope list to just that entry.
    if (constituency) return all.filter(c => c.name === constituency)
    return all
  }, [containment, hierarchy, country, region, county, constituency])

  const availableLetters = useMemo(() => {
    const s = new Set()
    for (const c of constituencies) {
      const l = c.name?.[0]?.toUpperCase()
      if (l) s.add(l)
    }
    return s
  }, [constituencies])

  // Reset to first populated letter when scope changes (new constituency list).
  useEffect(() => {
    const first = ALL_LETTERS.find(l => availableLetters.has(l)) ?? null
    setActiveLetter(first)
  }, [constituencies]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!activeLetter) return constituencies
    return constituencies.filter(c => c.name?.[0]?.toUpperCase() === activeLetter)
  }, [constituencies, activeLetter])

  // Display constituency for ward panel — nav-selected takes priority,
  // otherwise preview the first item in the current filtered list.
  const displayConstituency = constituency ?? filtered[0]?.name ?? null

  const allWards = useMemo(
    () => getWardsFromFlat(wards, displayConstituency),
    [wards, displayConstituency]
  )

  // When a ward is in path, collapse the list to just that entry.
  const selectedWards = useMemo(
    () => ward ? allWards.filter(w => w === ward) : allWards,
    [allWards, ward]
  )

  if (!constituencies.length) {
    return (
      <div className={classes.root}>
        {paneTitle && <div className={classes.paneTitle}>{paneTitle}</div>}
        <p className={classes.empty}>No constituency data available.</p>
      </div>
    )
  }

  return (
    <div className={classes.root}>

      {paneTitle && <div className={classes.paneTitle}>{paneTitle}</div>}

      {/* A-Z strip */}
      <div className={classes.alphaRow}>
        {ALL_LETTERS.filter(l => availableLetters.has(l)).map(l => (
          <button
            key={l}
            className={[classes.alphaBtn, l === activeLetter ? classes.alphaBtnActive : ''].join(' ')}
            onClick={() => setActiveLetter(l)}
          >
            {l}
          </button>
        ))}
      </div>

      {/* List area — constituency list and ward section coupled together */}
      <div className={classes.listArea}>

        <div className={[classes.constList, classes.constListSplit].join(' ')}>
          {filtered.length === 0
            ? <p className={classes.empty}>No constituencies for this letter.</p>
            : filtered.map(c => (
                <button
                  key={c.id}
                  className={[classes.constBtn, c.name === constituency ? classes.constBtnActive : ''].join(' ')}
                  onClick={() => select('constituency', c.name)}
                >
                  {c.name}
                </button>
              ))
          }
        </div>

        {/* Ward panel — always visible, previews first list item until user selects */}
        {displayConstituency && (
          <div className={classes.wardSection}>
            <div className={classes.wardHeader}>Wards — {displayConstituency}</div>
            <div className={classes.wardList}>
              {selectedWards.length === 0
                ? <p className={classes.empty}>No wards found.</p>
                : selectedWards.map(w => (
                    <button
                      key={w}
                      className={[classes.wardBtn, w === ward ? classes.wardBtnActive : ''].join(' ')}
                      onClick={() => selectMany([
                        { level: 'constituency', value: displayConstituency },
                        { level: 'ward',         value: w },
                      ])}
                    >
                      {w}
                    </button>
                  ))
              }
            </div>
          </div>
        )}

      </div>

    </div>
  )
}
