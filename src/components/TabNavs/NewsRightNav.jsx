/**
 * @file NewsRightNav.jsx
 * @description Right nav for the News tab. Keyword and topic selector.
 *   Tag chips the user toggles to filter the news aggregator.
 */
import { useState } from 'react'

const DEFAULT_TOPICS = [
  'Housing', 'Transport', 'Environment', 'Health', 'Education',
  'Planning', 'Crime', 'Local Politics', 'Economy', 'Community',
]

export default function NewsRightNav() {
  const [active, setActive] = useState([])

  function toggle(t) {
    setActive(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  return (
    <div style={{ padding: 8 }}>
      <p style={head}>Topics</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {DEFAULT_TOPICS.map(t => (
          <button
            key={t}
            style={active.includes(t) ? { ...chip, ...chipActive } : chip}
            onClick={() => toggle(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {active.length > 0 && (
        <button style={clearBtn} onClick={() => setActive([])}>Clear all</button>
      )}
    </div>
  )
}
const head       = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 8px 0', letterSpacing: '0.05em' }
const chip       = { fontSize: 11, padding: '3px 8px', border: '1px solid #dee2e6', borderRadius: 12, background: '#fff', color: '#495057', cursor: 'pointer' }
const chipActive = { background: '#1971c2', color: '#fff', borderColor: '#1971c2' }
const clearBtn   = { marginTop: 8, fontSize: 11, padding: '3px 8px', border: 'none', background: 'none', color: '#1971c2', cursor: 'pointer', display: 'block' }
