/**
 * @file src/components/Posts/VeracityBar.jsx
 * @description Always-on veracity voting bar. Non-disableable per design note.
 *
 * Props:
 *   postId        -- string
 *   counts        -- { true, plausible, questionable, false, total }
 *   score         -- float 0-1 or null (null = threshold not yet met)
 *   thresholdMet  -- bool
 *   userVote      -- string|null (current session's vote, local state only in v0.1)
 *   onVote        -- (newVote, result) => void  called after successful server response
 *   session       -- Supabase session or null
 */

import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const VOTES = [
  { key: 'true',         label: 'True',         color: '#2f9e44', bg: '#ebfbee' },
  { key: 'plausible',    label: 'Plausible',     color: '#1971c2', bg: '#e7f5ff' },
  { key: 'questionable', label: 'Questionable',  color: '#e67700', bg: '#fff4e6' },
  { key: 'false',        label: 'False',         color: '#c92a2a', bg: '#fff5f5' },
]

export default function VeracityBar({ postId, counts, score, thresholdMet, userVote: initialVote, onVote, session }) {
  const [localVote,   setLocalVote]   = useState(initialVote ?? null)
  const [localCounts, setLocalCounts] = useState(counts ?? { true: 0, plausible: 0, questionable: 0, false: 0, total: 0 })
  const [localScore,  setLocalScore]  = useState(score ?? null)
  const [localMet,    setLocalMet]    = useState(thresholdMet ?? false)
  const [busy,        setBusy]        = useState(false)

  async function handleVote(key) {
    if (!session?.access_token || busy) return
    setBusy(true)

    // Optimistic update
    const prev        = localVote
    const prevCounts  = { ...localCounts }
    const newCounts   = { ...localCounts }
    if (prev) newCounts[prev] = Math.max((newCounts[prev] ?? 1) - 1, 0)
    newCounts[key]    = (newCounts[key] ?? 0) + 1
    newCounts.total   = prev ? prevCounts.total : (prevCounts.total ?? 0) + 1
    setLocalVote(key)
    setLocalCounts(newCounts)

    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}/veracity`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ veracity_vote: key }),
      })
      if (res.ok) {
        const data = await res.json()
        setLocalCounts(data.veracity_counts)
        setLocalScore(data.veracity_score)
        setLocalMet(data.veracity_threshold_met)
        onVote?.(key, data)
      } else {
        // Rollback
        setLocalVote(prev)
        setLocalCounts(prevCounts)
      }
    } catch {
      setLocalVote(prev)
      setLocalCounts(prevCounts)
    }
    setBusy(false)
  }

  const scorePercent = localScore !== null ? Math.round(localScore * 100) : null

  return (
    <div style={wrap}>
      <div style={voteRow}>
        {VOTES.map(v => {
          const active = localVote === v.key
          return (
            <button
              key={v.key}
              type="button"
              disabled={!session || busy}
              onClick={() => handleVote(v.key)}
              style={{
                ...voteBtn,
                borderColor:     active ? v.color : '#dee2e6',
                background:      active ? v.bg    : '#fafafa',
                color:           active ? v.color : '#868e96',
                fontWeight:      active ? 600     : 400,
              }}
              title={session ? `Rate as ${v.label}` : 'Log in to rate veracity'}
            >
              {v.label}
              {localCounts[v.key] ? <span style={countBadge}>{localCounts[v.key]}</span> : null}
            </button>
          )
        })}
      </div>
      <div style={scoreRow}>
        {localMet && scorePercent !== null ? (
          <>
            <div style={barTrack}>
              <div style={{ ...barFill, width: `${scorePercent}%`, background: scoreColor(localScore) }} />
            </div>
            <span style={scoreLabel}>
              Community score: {scorePercent}%
              <span style={totalLabel}> ({localCounts.total} votes)</span>
            </span>
          </>
        ) : (
          <span style={pendingLabel}>
            Community scoring -- {localCounts.total > 0
              ? `${localCounts.total} of ${5} votes cast`
              : 'be the first to rate this'}
          </span>
        )}
      </div>
    </div>
  )
}

function scoreColor(score) {
  if (score >= 0.75) return '#2f9e44'
  if (score >= 0.5)  return '#1971c2'
  if (score >= 0.25) return '#e67700'
  return '#c92a2a'
}

const wrap         = { borderTop: '1px solid #f1f3f5', marginTop: 10, paddingTop: 8 }
const voteRow      = { display: 'flex', gap: 4, flexWrap: 'wrap' }
const voteBtn      = { fontSize: 11, padding: '3px 7px', border: '1px solid', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.1s' }
const countBadge   = { fontSize: 10, fontWeight: 600 }
const scoreRow     = { marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }
const barTrack     = { width: 80, height: 4, background: '#e9ecef', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }
const barFill      = { height: '100%', borderRadius: 2, transition: 'width 0.3s' }
const scoreLabel   = { fontSize: 11, color: '#495057' }
const totalLabel   = { color: '#adb5bd' }
const pendingLabel = { fontSize: 11, color: '#adb5bd', fontStyle: 'italic' }
