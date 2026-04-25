/**
 * @file PlacesCard.jsx
 * @description Left-pane places browser — type selector, alpha strip, filtered list.
 *
 * Three-row layout:
 *   Row 1 — City / Town / Village / Hamlet selector. One active at a time.
 *            Empty types are shown greyed and non-clickable.
 *   Row 2 — A–Z alpha strip. Only letters with results for the active type
 *            are rendered. Auto-selects first populated letter on type change.
 *   Body  — Scrollable list of places matching active type + active letter.
 *
 * Always renders — populated at any nav depth (all UK when no path).
 * Defaults to City type on first populated data load.
 *
 * Props:
 *   grouped       — { City, Town, Village, Hamlet } arrays from usePlacesFilter
 *   onPlaceSelect — called with the place object on click
 */

import { useState, useEffect, useMemo } from 'react'
import classes from './PlacesCard.module.css'

const TYPE_ORDER  = ['City', 'Town', 'Village', 'Hamlet']
const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/**
 * Returns the first letter (uppercased) of a place name, or '' if unusable.
 * @param {object} place
 * @returns {string}
 */
function firstLetter(place) {
  return place?.name?.trim()?.[0]?.toUpperCase() ?? ''
}

/**
 * Returns the set of letters present in an array of place objects.
 * @param {object[]} places
 * @returns {Set<string>}
 */
function lettersIn(places) {
  const s = new Set()
  for (const p of places) {
    const l = firstLetter(p)
    if (l) s.add(l)
  }
  return s
}

/**
 * Returns the first type that has at least one entry, or null if all empty.
 * @param {{ City: object[], Town: object[], Village: object[], Hamlet: object[] }} grouped
 * @returns {string|null}
 */
function firstNonEmptyType(grouped) {
  return TYPE_ORDER.find(t => grouped[t]?.length > 0) ?? null
}

/**
 * Returns the alphabetically first letter present in a places array, or null.
 * @param {object[]} places
 * @returns {string|null}
 */
function firstPopulatedLetter(places) {
  const letters = lettersIn(places)
  return ALL_LETTERS.find(l => letters.has(l)) ?? null
}

export default function PlacesCard({ grouped, scopeKey, onPlaceSelect, paneTitle, focusPlace, onWalkerModeChange }) {
  const [activeType,   setActiveType]   = useState(null)
  const [activeLetter, setActiveLetter] = useState(null)  // null = All (walker mode)

  // Notify parent when walker mode changes.
  useEffect(() => {
    onWalkerModeChange?.(activeLetter === null)
  }, [activeLetter, onWalkerModeChange])

  // Reset type + letter only when the geographic scope changes (scopeKey).
  // Using grouped as dep would reset on every nav action (new object ref each time).
  // In walker mode (activeLetter === null) preserve All — do not revert to a letter.
  useEffect(() => {
    if (!grouped) {
      setActiveType(null)
      setActiveLetter(null)
      return
    }
    const type = firstNonEmptyType(grouped)
    setActiveType(type)
    setActiveLetter(prev => {
      if (prev === null) return null  // walker mode — stay in All
      return type ? firstPopulatedLetter(grouped[type]) : null
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey])

  // Jump to the type and letter of a cross-referenced or externally selected place.
  // In walker mode (activeLetter === null) only update type — preserve All.
  useEffect(() => {
    if (!focusPlace || !grouped) return
    const type   = focusPlace.place_type
    const letter = firstLetter(focusPlace)
    if (grouped[type]?.some(p => firstLetter(p) === letter)) {
      setActiveType(type)
      setActiveLetter(prev => prev === null ? null : letter)
    }
  }, [focusPlace]) // eslint-disable-line react-hooks/exhaustive-deps

  // When type changes manually, reset letter to first populated for new type.
  // In walker mode preserve All.
  function handleTypeSelect(type) {
    if (grouped[type]?.length === 0) return
    setActiveType(type)
    setActiveLetter(prev => prev === null ? null : firstPopulatedLetter(grouped[type]))
  }

  // Letters available for the active type.
  const availableLetters = useMemo(() => {
    if (!activeType || !grouped[activeType]) return new Set()
    return lettersIn(grouped[activeType])
  }, [activeType, grouped])

  // Filtered place list — all places when activeLetter is null (walker mode),
  // otherwise intersect active type with active letter (drill mode).
  const filteredPlaces = useMemo(() => {
    if (!activeType || !grouped[activeType]) return []
    if (activeLetter === null) return grouped[activeType]
    return grouped[activeType].filter(p => firstLetter(p) === activeLetter)
  }, [activeType, activeLetter, grouped])

  return (
    <div className={classes.root}>

      {/* Pane title */}
      {paneTitle && <div className={classes.paneTitle}>{paneTitle}</div>}

      {/* Row 1 — type selector */}
      <div className={classes.typeRow}>
        {TYPE_ORDER.map(type => {
          const count    = grouped[type]?.length ?? 0
          const isEmpty  = count === 0
          const isActive = type === activeType
          return (
            <button
              key={type}
              className={[
                classes.typeBtn,
                isActive  ? classes.typeBtnActive   : '',
                isEmpty   ? classes.typeBtnDisabled : '',
              ].join(' ')}
              onClick={() => handleTypeSelect(type)}
              disabled={isEmpty}
            >
              {type === 'Village' ? 'Vil' : type} ({count >= 1000 ? `${Math.floor(count / 1000)}K+` : count})
            </button>
          )
        })}
      </div>

      {/* Row 2 — alpha strip. "All" clears letter filter (walker mode). */}
      <div className={classes.alphaRow}>
        <button
          className={[classes.alphaBtn, activeLetter === null ? classes.alphaBtnActive : ''].join(' ')}
          onClick={() => setActiveLetter(null)}
          title="Show all — walker mode"
        >
          All
        </button>
        {ALL_LETTERS.filter(l => availableLetters.has(l)).map(l => (
          <button
            key={l}
            className={[
              classes.alphaBtn,
              l === activeLetter ? classes.alphaBtnActive : '',
            ].join(' ')}
            onClick={() => setActiveLetter(l)}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Body — filtered place list */}
      <div className={classes.listWrap}>
        {filteredPlaces.length === 0
          ? <p className={classes.empty}>No places for this selection.</p>
          : filteredPlaces.map((place, i) => {
              const isFocus = focusPlace?.name === place.name && focusPlace?.place_type === place.place_type
              return (
                <button
                  key={`${i}-${place.name}`}
                  className={[classes.placeBtn, isFocus ? classes.placeBtnFocus : ''].join(' ')}
                  onClick={() => onPlaceSelect(place)}
                >
                  {place.name}
                </button>
              )
            })
        }
      </div>

    </div>
  )
}
