/**
 * @file MapTypeToggle.jsx
 * @description Shared type toggle pill for nav map layer controls.
 *   Used in MidPaneMap (both modes) and in the nav pane filter strips.
 */

export const MARKER_STYLE = {
  City:         { radius: 8, color: '#1864ab', fillColor: '#1971c2', fillOpacity: 0.85 },
  Town:         { radius: 5, color: '#2f9e44', fillColor: '#37b24d', fillOpacity: 0.80 },
  Village:      { radius: 4, color: '#e67700', fillColor: '#f08c00', fillOpacity: 0.75 },
  Hamlet:       { radius: 3, color: '#868e96', fillColor: '#adb5bd', fillOpacity: 0.70 },
  Constituency: { radius: 7, color: '#862e9c', fillColor: '#ae3ec9', fillOpacity: 0.20 },
  Ward:         { radius: 3, color: '#0c8599', fillColor: '#22b8cf', fillOpacity: 0.65 },
}

export const PLACE_TYPES     = ['City', 'Town', 'Village', 'Hamlet']
export const POLITICAL_TYPES = ['Constituency', 'Ward']
export const ALL_TYPES       = [...PLACE_TYPES, ...POLITICAL_TYPES]

export function MapTypeToggle({ type, active, onToggle, compact = false }) {
  const s = MARKER_STYLE[type]
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle(type) }}
      title={active ? `Hide ${type}s` : `Show ${type}s`}
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            compact ? '3px' : '5px',
        padding:        compact ? '2px 6px 2px 4px' : '3px 10px 3px 7px',
        borderRadius:   '20px',
        border:         `1.5px solid ${active ? s.color : '#ced4da'}`,
        background:     active ? s.fillColor : 'rgba(241,243,245,0.85)',
        color:          active ? '#fff' : '#adb5bd',
        cursor:         'pointer',
        fontSize:       compact ? '10px' : '12px',
        fontWeight:     500,
        transition:     'all 0.15s ease',
        userSelect:     'none',
        backdropFilter: compact ? 'blur(2px)' : 'none',
      }}
    >
      <svg width="10" height="10" style={{ flexShrink: 0 }}>
        <circle
          cx="5" cy="5" r={Math.min(s.radius * 0.55, 4.5)}
          fill={active ? '#fff' : '#ced4da'}
          stroke={active ? 'rgba(255,255,255,0.6)' : '#ced4da'}
          strokeWidth="1"
        />
      </svg>
      {type}
    </button>
  )
}
