/**
 * @file GroupsLeftNav.jsx
 * @description Left nav for the Groups tab. Filter selector: All / Groups /
 *   Local Spaces. Community Networks lives in the right nav. Drives GroupsTab
 *   filter from outside.
 * Props: filter, onFilterChange
 */
export default function GroupsLeftNav({ filter, onFilterChange }) {
  const FILTERS = [
    { key: 'all',    label: 'All' },
    { key: 'groups', label: 'Groups' },
    { key: 'spaces', label: 'Local Spaces' },
  ]
  return (
    <div style={{ padding: '8px 10px' }}>
      <p style={head}>Filter</p>
      {FILTERS.map(f => (
        <label key={f.key} style={row}>
          <input
            type="radio"
            name="groups-filter"
            checked={filter === f.key}
            onChange={() => onFilterChange(f.key)}
            style={{ margin: 0, marginRight: 6, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, color: filter === f.key ? '#2f9e44' : '#495057', fontWeight: filter === f.key ? 500 : 400 }}>
            {f.label}
          </span>
        </label>
      ))}
    </div>
  )
}
const head = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#868e96', margin: '0 0 6px 0', letterSpacing: '0.05em' }
const row  = { display: 'flex', alignItems: 'center', marginBottom: 5, cursor: 'pointer', userSelect: 'none' }
