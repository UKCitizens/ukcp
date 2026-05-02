/**
 * @file PlaceCorrector.jsx
 * @description Data corrector for individual place records (newplace.csv).
 *
 * Two-panel layout:
 *   Left  — Finder: search + filter against 54K place rows via server-side API.
 *            Correction indicator shown where a place has an existing override.
 *   Right — Editor: read-only source fields + editable correction fields.
 *            Saves to place-corrections.json via PATCH /api/admin/places/:id.
 *
 * Corrections are stored as an overlay (place-corrections.json) — the source
 * CSV is never modified directly. The in-memory server index reflects changes
 * immediately so subsequent searches show updated values.
 */

import { useState, useEffect, useRef } from 'react'
import API_BASE from '../../config.js'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  TextInput, Textarea, Select, Button, Badge, Stack, Group,
  Text, ScrollArea, Divider, ActionIcon, Loader, Alert, Pagination,
} from '@mantine/core'

// ── Editable fields ───────────────────────────────────────────────────────────

const EDIT_FIELDS = [
  { key: 'place_type',   label: 'Place type',        input: 'select',   options: ['', 'Hamlet', 'Village', 'Town', 'City'] },
  { key: 'summary',      label: 'Summary',            input: 'textarea', hint: 'Short descriptive paragraph' },
  { key: 'constituency', label: 'Constituency',       input: 'text',     hint: 'Full name' },
  { key: 'con_gss',      label: 'Constituency GSS',   input: 'text',     hint: 'e.g. E14000123' },
  { key: 'ward',         label: 'Ward',               input: 'text',     hint: 'Full name' },
  { key: 'ward_gss',     label: 'Ward GSS',           input: 'text',     hint: 'e.g. E05001234' },
  { key: 'county_gss',   label: 'County GSS',         input: 'text',     hint: 'e.g. E10000018' },
]

// Read-only source fields shown for context in the editor header
const SOURCE_FIELDS = [
  { key: 'id',         label: 'ID' },
  { key: 'country',    label: 'Country' },
  { key: 'region',     label: 'Region' },
  { key: 'ctyhistnm',  label: 'Historic county' },
  { key: 'lad_name',   label: 'LAD' },
  { key: 'lat',        label: 'Lat' },
  { key: 'lng',        label: 'Lng' },
]

const COUNTRIES = ['England', 'Scotland', 'Wales', 'Northern Ireland']

// ── PlaceCorrector ────────────────────────────────────────────────────────────

export default function PlaceCorrector() {
  const { session } = useAuth()
  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {}

  const [corrections,  setCorrections]  = useState({})
  const [results,      setResults]      = useState([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)          // 1-indexed for Pagination
  const [searching,    setSearching]    = useState(false)
  const [searchError,  setSearchError]  = useState(null)

  const [search,       setSearch]       = useState('')
  const [countryFilter,setCountryFilter]= useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const [missingFilter,setMissingFilter]= useState('')

  const [selectedId,   setSelectedId]   = useState(null)
  const [selectedPlace,setSelectedPlace]= useState(null)
  const [form,         setForm]         = useState({})
  const [dirty,        setDirty]        = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [saveStatus,   setSaveStatus]   = useState(null)   // 'ok' | 'error' | null

  const debounceRef = useRef(null)
  const LIMIT = 50

  // ── Load corrections overlay on mount ───────────────────────────────────
  // Wait for auth before hitting protected admin route.
  useEffect(() => {
    if (!session?.access_token) return
    fetch(`${API_BASE}/api/admin/places/corrections`, { headers: authHeaders })
      .then(r => r.ok ? r.json() : {})
      .then(setCorrections)
      .catch(() => setCorrections({}))
  }, [session?.access_token])

  // ── Trigger search when filters change ──────────────────────────────────
  useEffect(() => {
    if (!session?.access_token) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(1), 350)
    return () => clearTimeout(debounceRef.current)
  }, [search, countryFilter, typeFilter, missingFilter, session?.access_token])

  function doSearch(pg) {
    setSearching(true)
    setSearchError(null)
    const params = new URLSearchParams({ page: pg - 1, limit: LIMIT })
    if (search.trim())   params.set('q',       search.trim())
    if (countryFilter)   params.set('country',  countryFilter)
    if (typeFilter)      params.set('type',     typeFilter)
    if (missingFilter)   params.set('missing',  missingFilter)

    fetch(`${API_BASE}/api/admin/places?${params}`, { headers: authHeaders })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(data => { setResults(data.results); setTotal(data.total); setPage(pg) })
      .catch(e => setSearchError(e.message))
      .finally(() => setSearching(false))
  }

  // ── Select a place ───────────────────────────────────────────────────────
  function selectPlace(place) {
    const corr   = corrections[place.id] ?? {}
    const merged = { ...place, ...corr }
    setSelectedId(place.id)
    setSelectedPlace(merged)
    const next = {}
    EDIT_FIELDS.forEach(f => { next[f.key] = merged[f.key] ?? '' })
    setForm(next)
    setDirty(false)
    setSaveStatus(null)
  }

  // ── Field change ─────────────────────────────────────────────────────────
  function handleChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaveStatus(null)
    setDirty(true)
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function save() {
    if (!selectedId || !dirty || saving) return
    setSaving(true)
    setSaveStatus(null)
    try {
      const res = await fetch(`${API_BASE}/api/admin/places/${encodeURIComponent(selectedId)}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body:    JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      // Update local corrections so the list indicator reflects immediately
      setCorrections(prev => ({ ...prev, [selectedId]: { ...(prev[selectedId] ?? {}), ...form } }))

      // If summary was edited, push it to the Mongo content record too.
      // Mongo endpoint busts the server-side content cache on write.
      if (form.summary !== undefined && selectedPlace) {
        const type = (selectedPlace.place_type ?? 'place').toLowerCase()
        const slug = (selectedPlace.name ?? '').replace(/ /g, '_')
        fetch(`${API_BASE}/api/admin/geo-content-mongo/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body:    JSON.stringify({ summary: form.summary }),
        }).catch(e => console.warn('[PlaceCorrector] Mongo summary sync failed:', e.message))
      }

      setDirty(false)
      setSaveStatus('ok')
    } catch (e) {
      console.error('[PlaceCorrector] save failed:', e)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    if (selectedPlace) {
      const next = {}
      EDIT_FIELDS.forEach(f => { next[f.key] = selectedPlace[f.key] ?? '' })
      setForm(next)
      setDirty(false)
      setSaveStatus(null)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>

      {/* ── Finder ──────────────────────────────────────────────────────── */}
      <div style={{
        width: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #e9ecef',
        overflow: 'hidden',
      }}>

        {/* Search input */}
        <div style={{ padding: '10px 10px 6px' }}>
          <TextInput
            size="xs"
            placeholder="Search place name…"
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            rightSection={search ? (
              <ActionIcon size="xs" variant="subtle" c="dimmed" onClick={() => setSearch('')}>✕</ActionIcon>
            ) : null}
          />
        </div>

        {/* Filters */}
        <div style={{ padding: '0 10px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Select
            size="xs"
            placeholder="All countries"
            clearable
            data={COUNTRIES}
            value={countryFilter}
            onChange={v => setCountryFilter(v ?? '')}
          />
          <Select
            size="xs"
            placeholder="All types"
            clearable
            data={['Hamlet', 'Village', 'Town', 'City']}
            value={typeFilter}
            onChange={v => setTypeFilter(v ?? '')}
          />
          <Select
            size="xs"
            placeholder="Missing field filter"
            clearable
            data={[
              { value: 'type',         label: 'Missing: type' },
              { value: 'constituency', label: 'Missing: constituency' },
              { value: 'county_gss',   label: 'Missing: county GSS' },
              { value: 'summary',      label: 'Missing: summary' },
            ]}
            value={missingFilter}
            onChange={v => setMissingFilter(v ?? '')}
          />
        </div>

        <Divider />

        {/* Result count */}
        <div style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {searching
            ? <Loader size="xs" color="gray" />
            : <Text size="10px" c="dimmed">{total.toLocaleString()} results</Text>
          }
          {searchError && <Text size="10px" c="red">Search error</Text>}
        </div>

        {/* Results list */}
        <ScrollArea style={{ flex: 1 }}>
          {results.map(place => {
            const hasCorr    = !!corrections[place.id]
            const isSelected = place.id === selectedId
            return (
              <div
                key={place.id}
                onClick={() => selectPlace(place)}
                style={{
                  padding: '6px 10px',
                  cursor: 'pointer',
                  background: isSelected ? '#f3f0ff' : 'transparent',
                  borderLeft: isSelected ? '3px solid #7950f2' : '3px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <Text size="xs" fw={isSelected ? 600 : 400} truncate>{place.name}</Text>
                  <Text size="10px" c="dimmed" truncate>{place.place_type || '—'} · {place.ctyhistnm}</Text>
                </div>
                {hasCorr && (
                  <Badge size="xs" color="blue" variant="dot" style={{ flexShrink: 0 }}>edited</Badge>
                )}
              </div>
            )
          })}
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '6px 10px', borderTop: '1px solid #e9ecef' }}>
            <Pagination
              size="xs"
              total={totalPages}
              value={page}
              onChange={pg => doSearch(pg)}
            />
          </div>
        )}
      </div>

      {/* ── Editor ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {!selectedId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text size="sm" c="dimmed">Select a location to edit</Text>
          </div>
        ) : (
          <>
            {/* Header — source context */}
            <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #e9ecef', flexShrink: 0 }}>
              <Group gap="sm" align="center" mb={4}>
                <Text fw={600} size="sm">{selectedPlace?.name}</Text>
                {dirty && <Badge color="orange" size="xs" variant="dot">Unsaved changes</Badge>}
                {corrections[selectedId] && !dirty && <Badge color="blue" size="xs" variant="dot">Has corrections</Badge>}
              </Group>
              <Group gap="lg">
                {SOURCE_FIELDS.map(f => (
                  <div key={f.key}>
                    <Text size="10px" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.05em' }}>{f.label}</Text>
                    <Text size="10px">{selectedPlace?.[f.key] || '—'}</Text>
                  </div>
                ))}
              </Group>
            </div>

            {/* Editable fields */}
            <ScrollArea style={{ flex: 1 }}>
              <Stack gap="sm" style={{ padding: '12px 16px 4px' }}>
                {EDIT_FIELDS.map(f => {
                  if (f.input === 'select') return (
                    <Select
                      key={f.key}
                      label={f.label}
                      size="xs"
                      clearable
                      data={f.options.filter(Boolean)}
                      value={form[f.key] || null}
                      onChange={v => handleChange(f.key, v ?? '')}
                    />
                  )
                  if (f.input === 'textarea') return (
                    <Textarea
                      key={f.key}
                      label={f.label}
                      description={f.hint}
                      size="xs"
                      autosize
                      minRows={2}
                      maxRows={6}
                      value={form[f.key] ?? ''}
                      onChange={e => handleChange(f.key, e.currentTarget.value)}
                    />
                  )
                  return (
                    <TextInput
                      key={f.key}
                      label={f.label}
                      description={f.hint}
                      size="xs"
                      value={form[f.key] ?? ''}
                      onChange={e => handleChange(f.key, e.currentTarget.value)}
                    />
                  )
                })}
              </Stack>
            </ScrollArea>

            {/* Save bar */}
            <div style={{
              padding: '8px 16px',
              borderTop: '1px solid #e9ecef',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <Button size="xs" color="green" loading={saving} disabled={!dirty} onClick={save}>
                Save
              </Button>
              <Button size="xs" variant="subtle" color="gray" disabled={!dirty || saving} onClick={resetForm}>
                Reset
              </Button>
              {saveStatus === 'ok'    && <Text size="xs" c="green">Saved.</Text>}
              {saveStatus === 'error' && <Text size="xs" c="red">Save failed — check console.</Text>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
