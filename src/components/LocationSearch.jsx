/**
 * @file LocationSearch.jsx
 * @description Typeahead search box for the mid-pane tab strip.
 *
 * Searches geo entries (country/region/county) and the full 54K place list.
 * Geo hits are prepended so e.g. "London", "Inner London" surface above place rows.
 *
 * Props:
 *   onPlaceSelect  — (place) => void         — for place results
 *   onGeoSelect    — (level, value) => void  — for country/region/county results
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import API_BASE from '../config.js'

const DEBOUNCE_MS = 300
const MIN_CHARS   = 2
const DROPDOWN_Z  = 100

// Subtitle label for geo entries
const GEO_LABELS = { country: 'Country', region: 'Region', county: 'County' }

export default function LocationSearch({ onPlaceSelect, onGeoSelect }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [open,    setOpen]    = useState(false)
  const [active,  setActive]  = useState(-1)
  const timerRef  = useRef(null)
  const inputRef  = useRef(null)
  const listRef   = useRef(null)

  const fetchResults = useCallback((term) => {
    if (term.length < MIN_CHARS) { setResults([]); setOpen(false); return }
    fetch(`${API_BASE}/api/places/search?q=${encodeURIComponent(term)}&limit=12`)
      .then(r => r.json())
      .then(data => { setResults(data); setOpen(data.length > 0); setActive(-1) })
      .catch(() => { setResults([]); setOpen(false) })
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchResults(val), DEBOUNCE_MS)
  }

  const handleSelect = (result) => {
    setQuery('')
    setResults([])
    setOpen(false)
    setActive(-1)
    if (result.resultType === 'geo') {
      onGeoSelect && onGeoSelect(result.level, result.value)
    } else {
      onPlaceSelect && onPlaceSelect(result)
    }
  }

  const handleKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      handleSelect(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false); setActive(-1)
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (!inputRef.current?.closest('[data-locSearch]')?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (active >= 0 && listRef.current) {
      listRef.current.children[active]?.scrollIntoView({ block: 'nearest' })
    }
  }, [active])

  const subtitle = (r) => {
    if (r.resultType === 'geo') return GEO_LABELS[r.level] ?? r.level
    return [r.place_type, r.ctyhistnm || r.region, r.country].filter(Boolean).join(' · ')
  }

  return (
    <div
      data-locSearch
      style={{ position: 'relative', flex: 1, minWidth: 0, maxWidth: 180, margin: '0 6px', alignSelf: 'center' }}
    >
      <input
        ref={inputRef}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search all places…"
        autoComplete="off"
        spellCheck={false}
        style={{
          width:        '100%',
          height:       26,
          padding:      '0 8px',
          fontSize:     12,
          border:       '1px solid #dee2e6',
          borderRadius: 4,
          outline:      'none',
          boxSizing:    'border-box',
          background:   '#fafafa',
          color:        '#212529',
        }}
      />

      {open && (
        <div
          ref={listRef}
          style={{
            position:     'absolute',
            top:          '100%',
            left:         0,
            right:        0,
            marginTop:    2,
            background:   '#fff',
            border:       '1px solid #dee2e6',
            borderRadius: 4,
            boxShadow:    '0 4px 12px rgba(0,0,0,0.12)',
            zIndex:       DROPDOWN_Z,
            maxHeight:    320,
            overflowY:    'auto',
          }}
        >
          {results.map((r, i) => (
            <div
              key={r.resultType === 'geo' ? `geo:${r.level}:${r.value}` : r.id}
              onMouseDown={() => handleSelect(r)}
              onMouseEnter={() => setActive(i)}
              style={{
                padding:      '6px 10px',
                cursor:       'pointer',
                background:   i === active ? '#f1f3f5' : 'transparent',
                borderBottom: i < results.length - 1 ? '1px solid #f1f3f5' : 'none',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: '#212529', lineHeight: 1.3 }}>
                {r.name}
              </div>
              <div style={{ fontSize: 11, color: '#868e96', lineHeight: 1.3 }}>
                {subtitle(r)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
