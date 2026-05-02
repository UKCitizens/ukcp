/**
 * @file MidPaneTabs.jsx
 * @description Tab strip for the mid pane.
 *
 * Tabs: Groups | News | Local Traders | Civic (geo hierarchy only) | Map | Info
 * Controlled component -- activeTab and onTabChange are passed from Locations.jsx.
 *
 * Layout:
 *   All panels are always rendered and stacked via absolute positioning.
 *   Map panel is always visible -- Leaflet retains container dimensions at all times.
 *   Other panels overlay the map with a white background when active.
 *
 * Props:
 *   mapPane      -- JSX for the Map tab (MidPaneMap)
 *   infoPane     -- JSX for the Info tab (LocationInfo)
 *   newsPane     -- JSX for the News tab
 *   groupsPane   -- JSX for the Groups tab
 *   tradersPane  -- JSX for the Local Traders tab
 *   civicPane    -- JSX for the Civic tab (geo hierarchy only, includes committee content)
 *   activeTab    -- string
 *   onTabChange  -- (tab: string) => void
 *   locationType -- string|null  (current context type for tab visibility)
 *   viewMode     -- 'browse' | 'explore'
 *   onToggleExpand -- () => void
 */

import LocationSearch from './LocationSearch.jsx'

const TAB_HEIGHT   = 36
const ACTIVE_COLOR = '#2f9e44'
const BORDER_COLOR = '#dee2e6'

const NAMED_PLACES = ['city', 'town', 'village', 'hamlet']

/**
 * @param {{
 *   mapPane:       React.ReactNode,
 *   infoPane:      React.ReactNode,
 *   newsPane:      React.ReactNode,
 *   groupsPane:    React.ReactNode,
 *   tradersPane:   React.ReactNode,
 *   civicPane:     React.ReactNode,
 *   activeTab:     string,
 *   onTabChange:   (tab: string) => void,
 *   locationType:  string|null,
 *   viewMode:      string,
 *   onToggleExpand: () => void
 * }} props
 */
export default function MidPaneTabs({
  mapPane, infoPane, newsPane, groupsPane, tradersPane, civicPane,
  activeTab, onTabChange, locationType, viewMode, onToggleExpand,
  tabNavMode, onToggleTabNav, onPlaceSelect, onGeoSelect,
}) {
  const expanded     = viewMode === 'explore'
  const isNamedPlace = NAMED_PLACES.includes((locationType ?? '').toLowerCase())

  const tabs = [
    { id: 'groups',    label: 'Groups' },
    { id: 'news',      label: 'News' },
    { id: 'traders',   label: 'Local Traders' },
    ...(!isNamedPlace ? [{ id: 'civic', label: 'Civic' }] : []),
    { id: 'map',       label: 'Map' },
    { id: 'info',      label: 'Info' },
  ]

  const tabStyle = (id) => ({
    padding:      '0 8px',
    height:       TAB_HEIGHT,
    border:       'none',
    borderBottom: activeTab === id ? `2px solid ${ACTIVE_COLOR}` : '2px solid transparent',
    background:   'none',
    cursor:       'pointer',
    fontSize:     '12px',
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
      {/* Tab strip -- outer div is overflow:visible so the search dropdown can escape */}
      <div style={{
        flexShrink:   0,
        height:       TAB_HEIGHT,
        display:      'flex',
        alignItems:   'flex-end',
        borderBottom: `1px solid ${BORDER_COLOR}`,
        background:   '#fff',
        position:     'relative',
        zIndex:       10,
        overflow:     'visible',
      }}>
        {/* Location search -- left of tab strip, outside the scrollable tab row */}
        {onPlaceSelect && <LocationSearch onPlaceSelect={onPlaceSelect} onGeoSelect={onGeoSelect} />}

        {/* Scrollable tab row -- sits between search and expand toggle */}
        <div style={{ display: 'flex', alignItems: 'flex-end', overflowX: 'auto', flex: 1, paddingLeft: 4 }}>
          {tabs.map(t => (
            <button key={t.id} style={tabStyle(t.id)} onClick={() => onTabChange(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab nav mode toggle -- switches side panes between location nav and tab-specific nav */}
        {onToggleTabNav && (
          <button
            onClick={onToggleTabNav}
            title={tabNavMode ? 'Back to location nav' : 'Advanced tab nav'}
            style={{
              marginRight:    4,
              alignSelf:      'center',
              height:         24,
              padding:        '0 7px',
              border:         `1px solid ${tabNavMode ? '#2f9e44' : BORDER_COLOR}`,
              borderRadius:   4,
              background:     tabNavMode ? '#2f9e44' : 'none',
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       11,
              fontWeight:     600,
              color:          tabNavMode ? '#fff' : '#868e96',
              lineHeight:     1,
              flexShrink:     0,
              whiteSpace:     'nowrap',
            }}
          >
            {tabNavMode ? 'Location' : 'Advanced'}
          </button>
        )}

        {/* Expand / collapse toggle -- right-aligned in the tab strip */}
        <button
          onClick={onToggleExpand}
          title={expanded ? 'Collapse' : 'Expand'}
          style={{
            marginRight:    6,
            alignSelf:      'center',
            height:         24,
            width:          24,
            border:         `1px solid ${BORDER_COLOR}`,
            borderRadius:   4,
            background:     'none',
            cursor:         'pointer',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       12,
            color:          '#868e96',
            lineHeight:     1,
            padding:        0,
            flexShrink:     0,
          }}
        >
          {expanded ? '▼' : '▲'}
        </button>
      </div>

      {/* Content area -- all panels stacked. isolation:isolate contains
          Leaflet's internal z-index values within the map panel. */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, isolation: 'isolate' }}>

        {/* Map panel -- always rendered, always visible, z-index 1. */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          {mapPane}
        </div>

        {/* Info panel */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: '#fff', overflowY: 'auto', display: activeTab === 'info' ? 'block' : 'none' }}>
          {infoPane}
        </div>

        {/* News panel */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: '#fff', overflowY: 'auto', display: activeTab === 'news' ? 'block' : 'none' }}>
          {newsPane}
        </div>

        {/* Groups panel */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: '#fff', overflowY: 'auto', display: activeTab === 'groups' ? 'block' : 'none' }}>
          {groupsPane}
        </div>

        {/* Local Traders panel */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: '#fff', overflowY: 'auto', display: activeTab === 'traders' ? 'block' : 'none' }}>
          {tradersPane}
        </div>

        {/* Civic panel -- geo hierarchy only, not rendered for named places */}
        {!isNamedPlace && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: '#fff', overflowY: 'auto', display: activeTab === 'civic' ? 'block' : 'none' }}>
            {civicPane}
          </div>
        )}

      </div>
    </div>
  )
}
