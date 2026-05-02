/**
 * @file DataManager.jsx
 * @description Location data manager — finder + field editor for geo-content.json.
 *
 * Two-panel layout:
 *   Left  — Finder: searchable/filterable list of all geo-content entries
 *            with per-entry completeness indicators. Sorted lowest→highest completeness.
 *   Right — Editor: field-by-field form for the selected entry. Tracks dirty
 *            state. Saves via PATCH /api/admin/geo-content/:key.
 *
 * Data source: /data/geo-content.json (loaded fresh on mount).
 * Save target: PATCH /api/admin/geo-content/:key (Express endpoint).
 */

import { useState, useEffect, useMemo } from 'react'
import API_BASE from '../../config.js'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  TextInput, Textarea, Button, Badge, Stack, Group, Text, Title,
  ScrollArea, Divider, ActionIcon, Loader, Alert, Tabs,
} from '@mantine/core'
import PlaceCorrector from './PlaceCorrector.jsx'
import UserManager    from './UserManager.jsx'

// ── Field schema ─────────────────────────────────────────────────────────────
// Defines display order, label, input type, and contextual hint for each field.

const FIELDS = [
  { key: 'f1',        label: 'Banner image',         input: 'text',     hint: 'Path or URL to flag/banner asset' },
  { key: 'f2',        label: 'Population',            input: 'text',     hint: 'Formatted number, e.g. 67,026,292' },
  { key: 'f3',        label: 'Blurb',                 input: 'textarea', hint: 'Short descriptive paragraph shown in info panel' },
  { key: 'f4',        label: 'Motto',                 input: 'text',     hint: 'Official motto or slogan' },
  { key: 'f5',        label: 'Area',                  input: 'text',     hint: 'e.g. 242,495 km²' },
  { key: 'f6',        label: 'Political composition', input: 'text',     hint: 'e.g. Lab: 329 · Con: 90 · LD: 59' },
  { key: 'f7',        label: 'Economy',               input: 'textarea', hint: 'Economic character paragraph' },
  { key: 'f8',        label: 'Cultural character',    input: 'textarea', hint: 'Cultural identity paragraph' },
  { key: 'f10',       label: 'History',               input: 'textarea', hint: 'Historical context paragraph' },
  { key: 'f13',       label: 'Official website',      input: 'text',     hint: 'https://...' },
  { key: 'f14',       label: 'Environment',           input: 'textarea', hint: 'Environment and designations paragraph' },
  { key: '_qid',      label: 'Wikidata QID',          input: 'text',     hint: 'e.g. Q145 — used for population lookups' },
  { key: 'seed_text', label: 'Seed text',             input: 'textarea', hint: 'Source text used for AI seeding (reference)' },
]

// Fields that count toward the completeness score.
// Meta/reference fields (_qid, seed_text, f1) are excluded.
const CONTENT_FIELDS = ['f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f10', 'f13', 'f14']
const CONTENT_TOTAL  = CONTENT_FIELDS.length

const TYPE_LABELS  = { country: 'Country', region: 'Region', county: 'County' }
const TYPE_COLOURS = { country: 'blue',    region: 'teal',   county: 'violet' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function countFilled(entry) {
  return CONTENT_FIELDS.filter(k => {
    const v = entry[k]
    return v && String(v).trim() && v !== 'Content coming soon.'
  }).length
}

function scoreColour(score) {
  if (score === CONTENT_TOTAL) return 'green'
  if (score >= CONTENT_TOTAL * 0.6) return 'yellow'
  if (score > 0) return 'orange'
  return 'red'
}

function typeFromKey(key) {
  return key.split(':')[0]
}

// ── DataManager ───────────────────────────────────────────────────────────────

export default function DataManager() {
  const { session } = useAuth()
  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {}

  const [activeTab, setActiveTab] = useState('geo')
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState(null)
  const [search,      setSearch]      = useState('')
  const [typeFilter,  setTypeFilter]  = useState('all')
  const [selectedKey, setSelectedKey] = useState(null)
  const [form,        setForm]        = useState({})
  const [dirty,       setDirty]       = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [saveStatus,  setSaveStatus]  = useState(null) // 'ok' | 'error' | null

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/data/geo-content.json')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d  => { setData(d); setLoading(false) })
      .catch(e => { setLoadError(e.message); setLoading(false) })
  }, [])

  // ── Filtered entry list ───────────────────────────────────────────────────
  const entries = useMemo(() => {
    if (!data) return []
    const term = search.toLowerCase().trim()
    return Object.entries(data)
      .filter(([key, entry]) => {
        if (typeFilter !== 'all' && typeFromKey(key) !== typeFilter) return false
        if (term && !entry.name?.toLowerCase().includes(term)) return false
        return true
      })
      .map(([key, entry]) => ({ key, entry, score: countFilled(entry) }))
      .sort((a, b) => a.score - b.score || a.entry.name?.localeCompare(b.entry.name))
  }, [data, search, typeFilter])

  // ── Select an entry ───────────────────────────────────────────────────────
  function selectEntry(key) {
    setSelectedKey(key)
    setSaveStatus(null)
    setDirty(false)
    const entry = data[key] ?? {}
    const next  = {}
    FIELDS.forEach(f => { next[f.key] = entry[f.key] ?? '' })
    setForm(next)
  }

  // ── Field change ──────────────────────────────────────────────────────────
  function handleChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaveStatus(null)
    setDirty(true)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function save() {
    if (!selectedKey || !dirty || saving) return
    setSaving(true)
    setSaveStatus(null)
    try {
      const res = await fetch(`${API_BASE}/api/admin/geo-content/${encodeURIComponent(selectedKey)}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body:    JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      setData(prev => ({ ...prev, [selectedKey]: { ...prev[selectedKey], ...form } }))
      setDirty(false)
      setSaveStatus('ok')
    } catch (e) {
      console.error('[DataManager] save failed:', e)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function resetForm() {
    if (selectedKey) selectEntry(selectedKey)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedEntry = selectedKey ? data[selectedKey] : null
  const selectedType  = selectedKey ? typeFromKey(selectedKey) : null

  const geoPanel = loading ? (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
      <Loader size="sm" color="green" />
    </div>
  ) : loadError ? (
    <Alert color="red" title="Failed to load geo-content.json" mt="md">{loadError}</Alert>
  ) : (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>

      {/* ── Finder ──────────────────────────────────────────────────────── */}
      <div style={{
        width: 270,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #e9ecef',
        overflow: 'hidden',
      }}>

        <div style={{ padding: '10px 10px 6px' }}>
          <TextInput
            size="xs"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            rightSection={search ? (
              <ActionIcon size="xs" variant="subtle" c="dimmed" onClick={() => setSearch('')}>✕</ActionIcon>
            ) : null}
          />
        </div>

        <div style={{ padding: '0 10px 8px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['all', 'country', 'region', 'county'].map(t => (
            <Button
              key={t}
              size="compact-xs"
              variant={typeFilter === t ? 'filled' : 'light'}
              color={t === 'all' ? 'gray' : TYPE_COLOURS[t]}
              onClick={() => setTypeFilter(t)}
              style={{ fontSize: 10 }}
            >
              {t === 'all' ? 'All' : TYPE_LABELS[t]}
            </Button>
          ))}
        </div>

        <Divider />

        <div style={{ padding: '4px 10px' }}>
          <Text size="10px" c="dimmed">{entries.length} entries · sorted by completeness ↑</Text>
        </div>

        <ScrollArea style={{ flex: 1 }}>
          {entries.map(({ key, entry, score }) => {
            const type       = typeFromKey(key)
            const isSelected = key === selectedKey
            return (
              <div
                key={key}
                onClick={() => selectEntry(key)}
                style={{
                  padding: '6px 10px',
                  cursor: 'pointer',
                  background:  isSelected ? '#f3f0ff' : 'transparent',
                  borderLeft:  isSelected ? '3px solid #7950f2' : '3px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <Text size="xs" fw={isSelected ? 600 : 400} truncate>{entry.name}</Text>
                  <Badge size="xs" color={TYPE_COLOURS[type]} variant="light" style={{ marginTop: 1 }}>
                    {TYPE_LABELS[type]}
                  </Badge>
                </div>
                <Badge size="xs" color={scoreColour(score)} variant="filled" style={{ flexShrink: 0 }}>
                  {score}/{CONTENT_TOTAL}
                </Badge>
              </div>
            )
          })}
        </ScrollArea>
      </div>

      {/* ── Editor ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {!selectedKey ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text size="sm" c="dimmed">Select a location to edit</Text>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #e9ecef', flexShrink: 0 }}>
              <Group gap="sm" align="center">
                <Badge color={TYPE_COLOURS[selectedType]} variant="filled" size="sm">
                  {TYPE_LABELS[selectedType]}
                </Badge>
                <Title order={5} style={{ margin: 0 }}>{selectedEntry?.name}</Title>
                {dirty && (
                  <Badge color="orange" size="xs" variant="dot">Unsaved changes</Badge>
                )}
              </Group>
            </div>

            {/* Fields */}
            <ScrollArea style={{ flex: 1 }}>
              <Stack gap="sm" style={{ padding: '12px 16px 4px' }}>
                {FIELDS.map(f => {
                  const val     = form[f.key] ?? ''
                  const display = (f.key === 'f3' && val === 'Content coming soon.') ? '' : val
                  const pholder = (f.key === 'f3' && val === 'Content coming soon.') ? 'Content coming soon.' : undefined

                  return f.input === 'textarea' ? (
                    <Textarea
                      key={f.key}
                      label={f.label}
                      description={f.hint}
                      size="xs"
                      autosize
                      minRows={2}
                      maxRows={6}
                      value={display}
                      placeholder={pholder}
                      onChange={e => handleChange(f.key, e.currentTarget.value)}
                    />
                  ) : (
                    <TextInput
                      key={f.key}
                      label={f.label}
                      description={f.hint}
                      size="xs"
                      value={val}
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

  return (
    <Tabs
      value={activeTab}
      onChange={setActiveTab}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <Tabs.List style={{ flexShrink: 0 }}>
        <Tabs.Tab value="geo">Geo Content</Tabs.Tab>
        <Tabs.Tab value="places">Locations</Tabs.Tab>
        <Tabs.Tab value="users">Users</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="geo"   style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {geoPanel}
      </Tabs.Panel>
      <Tabs.Panel value="places" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <PlaceCorrector />
      </Tabs.Panel>
      <Tabs.Panel value="users" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <UserManager />
      </Tabs.Panel>
    </Tabs>
  )
}
