/**
 * @file MidPaneTabs.jsx
 * @description Tab strip for the mid pane — Info tab and Map tab.
 *
 * Controlled component — activeTab and onTabChange are passed from Locations.jsx.
 * Parent drives tab switches; user can also click tabs manually.
 *
 * Layout:
 *   Both panels are always rendered and stacked via absolute positioning.
 *   Map panel is always visible — Leaflet retains container dimensions at all times.
 *   Info panel overlays the map with a white background when active.
 *   Toggling between tabs never touches the map container, so invalidateSize
 *   is never needed.
 *
 * Props:
 *   mapPane        — JSX for the Map tab (MidPaneMap)
 *   infoPane       — JSX for the Info tab (LocationInfo)
 *   activeTab      — 'map' | 'info'
 *   onTabChange    — (tab: string) => void
 *   viewMode       — 'browse' | 'explore'
 *   onToggleExpand — () => void  (toggles between browse and explore)
 */

import LocationSearch from './LocationSearch.jsx'

const TAB_HEIGHT   = 36
const ACTIVE_COLOR = '#2f9e44'
const BORDER_COLOR = '#dee2e6'

/**
 * @param {{
 *   mapPane:     React.ReactNode,
 *   infoPane:    React.ReactNode,
 *   activeTab:   'map' | 'info',
 *   onTabChange: (tab: string) => void
 * }} props
 */
export default function MidPaneTabs({ mapPane, infoPane, activeTab, onTabChange, viewMode, onToggleExpand, onPlaceSelect, onGeoSelect }) {
  const expanded = viewMode === 'explore'

  const tabStyle = (id) => ({
    padding:      '0 16px',
    height:       TAB_HEIGHT,
    border:       'none',
    borderBottom: activeTab === id ? `2px solid ${ACTIVE_COLOR}` : '2px solid transparent',
    background:   'none',
    cursor:       'pointer',
    fontSize:     '13px',
    fontWeight:   activeTab === id ? 600 : 400,
    color:        activeTab === id ? ACTIVE_COLOR : '#868e96',
    transition:   'color 0.15s, border-color 0.15s',
    userSelect:   'none',
    flexShrink:   0,
  })

  return (
    <div style={{
      position:      'absolute',
      inset:         0,
      display:       'flex',
      flexDirection: 'column',
    }}>
      {/* Tab strip */}
      <div style={{
        flexShrink:   0,
        height:       TAB_HEIGHT,
        display:      'flex',
        alignItems:   'flex-end',
        borderBottom: `1px solid ${BORDER_COLOR}`,
        paddingLeft:  4,
        background:   '#fff',
        position:     'relative',
        zIndex:       10,
      }}>
        <button style={tabStyle('info')} onClick={() => onTabChange('info')}>Info</button>
        <button style={tabStyle('map')}  onClick={() => onTabChange('map')}>Map</button>

        {/* Location search — fills space between tabs and expand toggle */}
        {onPlaceSelect && <LocationSearch onPlaceSelect={onPlaceSelect} onGeoSelect={onGeoSelect} />}

        {/* Expand / collapse toggle — right-aligned in the tab strip */}
        <button
          onClick={onToggleExpand}
          title={expanded ? 'Collapse' : 'Expand'}
          style={{
            marginLeft:  'auto',
            marginRight: 6,
            alignSelf:   'center',
            height:      24,
            width:       24,
            border:      `1px solid ${BORDER_COLOR}`,
            borderRadius: 4,
            background:  'none',
            cursor:      'pointer',
            display:     'flex',
            alignItems:  'center',
            justifyContent: 'center',
            fontSize:    12,
            color:       '#868e96',
            lineHeight:  1,
            padding:     0,
            flexShrink:  0,
          }}
        >
          {expanded ? '▼' : '▲'}
        </button>
      </div>

      {/* Content area — both panels stacked. isolation:isolate contains
          Leaflet's internal z-index values within the map panel. */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, isolation: 'isolate' }}>

        {/* Map panel — always rendered, always visible, z-index 1.
            Leaflet never loses container dimensions. */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          {mapPane}
        </div>

        {/* Info panel — sits above map at z-index 2 when active.
            White background fully covers the map panel beneath. */}
        <div style={{
          position:      'absolute',
          inset:         0,
          zIndex:        2,
          background:    '#fff',
          overflowY:     'auto',
          display:       activeTab === 'info' ? 'block' : 'none',
        }}>
          {infoPane}
        </div>

      </div>
    </div>
  )
}
