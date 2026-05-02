/**
 * @file TradersLeftNav.jsx
 * @description Left nav for the Local Traders tab. Trade type selector
 *   and text search. Drives the traders listing when built.
 */
import { useState } from 'react'

const TYPES = [
  'All', 'Food & Drink', 'Retail', 'Services',
  'Health & Beauty', 'Trades & Repairs', 'Other',
]

export default function TradersLeftNav() {
  const [activeType, setActiveType] = useState('All')
  const [search, setSearch]         = useState('')

  return (
    <div style={{ padding: '8px 10px' }}>
      <p style={head}>Type</p>
      {TYPES.map(t => (
        <label key={t} style={row}>
          <input
            type="radio"
            name="traders-type"
            checked={activeType === t}
            onChange={() => setActiveType(t)}
            style={{ margin: 0, marginRight: 6, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, color: activeType === t ? '#e8590c' : '#495057', fontWeight: activeType === t ? 500 : 400 }}>
            {t}
          </span>
        </label>
      ))}
      <p style={{ ...head, marginTop: 10 }}>Search</p>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Trader name..."
        style={input}
      />
    </div>
  )
}
const head  = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 6px 0', letterSpacing: '0.05em' }
const row   = { display: 'flex', alignItems: 'center', marginBottom: 5, cursor: 'pointer', userSelect: 'none' }
const input = { width: '100%', fontSize: 12, padding: '4px 6px', border: '1px solid #dee2e6', borderRadius: 4, boxSizing: 'border-box' }
