/**
 * @file MapOverlayControls.jsx
 * @description Two collapsible vertical toolbars rendered as map surface overlays.
 * Each toolbar shows a single icon + toggle button when collapsed.
 * Clicking expands a vertical column of filter/layer controls below it.
 * Left: place-type filters. Right: political toggles + content layer pills.
 */

import { useState } from 'react'
import { PLACE_TYPES, POLITICAL_TYPES, MapTypeToggle } from './MapTypeToggle.jsx'

const TOOLBAR_STYLE = {
  position:       'absolute',
  top:            8,
  zIndex:         400,
  display:        'flex',
  flexDirection:  'column',
  alignItems:     'center',
  gap:            4,
  pointerEvents:  'auto',
}

const TOGGLE_BTN = {
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
  gap:             3,
  width:           36,
  height:          36,
  border:          'none',
  borderRadius:    6,
  cursor:          'pointer',
  fontSize:        16,
  fontWeight:      700,
  boxShadow:       '0 1px 4px rgba(0,0,0,0.22)',
  userSelect:      'none',
}

const PANEL_STYLE = {
  display:        'flex',
  flexDirection:  'column',
  alignItems:     'stretch',
  gap:            4,
  background:     'rgba(255,255,255,0.92)',
  borderRadius:   6,
  padding:        '6px 6px',
  boxShadow:      '0 1px 4px rgba(0,0,0,0.18)',
}

/**
 * @param {{
 *   visibleTypes:     object,
 *   onToggle:         (type: string) => void,
 *   layers:           object,
 *   onLayerToggle:    (id: string) => void,
 *   contentLayerDefs: Array<{ id: string, label: string, color: string, fill: string, available: boolean }>
 * }} props
 * @returns {JSX.Element}
 */
export default function MapOverlayControls({ visibleTypes, onToggle, layers, onLayerToggle, contentLayerDefs }) {
  const [leftOpen,  setLeftOpen]  = useState(false)
  const [rightOpen, setRightOpen] = useState(false)

  return (
    <>
      {/* Left toolbar — place type filters */}
      <div style={{ ...TOOLBAR_STYLE, left: 8 }}>
        <button
          style={{
            ...TOGGLE_BTN,
            background: leftOpen ? '#2E7D32' : 'rgba(255,255,255,0.92)',
            color:      leftOpen ? '#fff'    : '#2E7D32',
          }}
          onClick={() => setLeftOpen(o => !o)}
          title={leftOpen ? 'Hide place filters' : 'Show place filters'}
        >
          🗺 {leftOpen ? '−' : '+'}
        </button>

        {leftOpen && (
          <div style={PANEL_STYLE}>
            {PLACE_TYPES.map(type => (
              <MapTypeToggle key={type} type={type} active={visibleTypes[type]} onToggle={onToggle} compact />
            ))}
          </div>
        )}
      </div>

      {/* Right toolbar — political toggles + layer pills */}
      <div style={{ ...TOOLBAR_STYLE, right: 8 }}>
        <button
          style={{
            ...TOGGLE_BTN,
            background: rightOpen ? '#1864ab' : 'rgba(255,255,255,0.92)',
            color:      rightOpen ? '#fff'    : '#1864ab',
          }}
          onClick={() => setRightOpen(o => !o)}
          title={rightOpen ? 'Hide map layers' : 'Show map layers'}
        >
          ⚙ {rightOpen ? '−' : '+'}
        </button>

        {rightOpen && (
          <div style={PANEL_STYLE}>
            {POLITICAL_TYPES.map(type => (
              <MapTypeToggle key={type} type={type} active={visibleTypes[type]} onToggle={onToggle} compact />
            ))}
            <div style={{ height: 1, background: '#f1f3f5', margin: '2px 0' }} />
            {contentLayerDefs.map(def => {
              const isOn = !!layers[def.id] && def.available
              return (
                <button
                  key={def.id}
                  onClick={() => def.available && onLayerToggle(def.id)}
                  title={def.available ? (isOn ? `Hide ${def.label}` : `Show ${def.label}`) : `${def.label} coming soon`}
                  style={{
                    display:    'flex', alignItems: 'center', gap: 4,
                    padding:    '3px 8px 3px 6px', borderRadius: 20,
                    border:     `1.5px solid ${isOn ? def.color : '#ced4da'}`,
                    background: isOn ? def.fill : 'rgba(241,243,245,0.85)',
                    color:      isOn ? '#fff' : '#adb5bd',
                    cursor:     def.available ? 'pointer' : 'default',
                    fontSize:   11, fontWeight: 500,
                    opacity:    def.available ? 1 : 0.45,
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="8" height="8" style={{ flexShrink: 0 }}>
                    <rect x="0.5" y="0.5" width="7" height="7" rx="1.5"
                      fill={isOn ? '#fff' : '#ced4da'}
                      stroke={isOn ? 'rgba(255,255,255,0.6)' : '#ced4da'}
                      strokeWidth="1"
                    />
                  </svg>
                  {def.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
