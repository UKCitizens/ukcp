/**
 * @file NewsLeftNav.jsx
 * @description Left nav for the News tab. News source list with include
 *   checkboxes. Drives the NewsTab aggregator (wired when NewsTab is built).
 */
import { useState } from 'react'

const DEFAULT_SOURCES = [
  { id: 'bbc',      label: 'BBC News',        included: true  },
  { id: 'guardian', label: 'The Guardian',     included: true  },
  { id: 'itv',      label: 'ITV News',         included: false },
  { id: 'sky',      label: 'Sky News',         included: false },
  { id: 'localrss', label: 'Local RSS (area)', included: true  },
]

export default function NewsLeftNav() {
  const [sources, setSources] = useState(DEFAULT_SOURCES)

  function toggle(id) {
    setSources(prev => prev.map(s => s.id === id ? { ...s, included: !s.included } : s))
  }

  return (
    <div style={{ padding: '8px 10px' }}>
      <p style={head}>News Sources</p>
      {sources.map(s => (
        <label key={s.id} style={row}>
          <input
            type="checkbox"
            checked={s.included}
            onChange={() => toggle(s.id)}
            style={{ margin: 0, marginRight: 6, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, color: s.included ? '#2f9e44' : '#495057', fontWeight: s.included ? 500 : 400 }}>
            {s.label}
          </span>
        </label>
      ))}
    </div>
  )
}
const head = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 6px 0', letterSpacing: '0.05em' }
const row  = { display: 'flex', alignItems: 'center', marginBottom: 5, cursor: 'pointer', userSelect: 'none' }
