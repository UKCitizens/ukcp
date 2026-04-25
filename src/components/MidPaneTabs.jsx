/**
 * @file MidPaneTabs.jsx
 * @description Tab strip for the mid pane — 8-tab system.
 *
 * Tabs: Info, Map, News, Groups, Posts, People, Government (geo hierarchy only), Committee.
 * Controlled component — activeTab and onTabChange are passed from Locations.jsx.
 *
 * Layout:
 *   All panels are always rendered and stacked via absolute positioning.
 *   Map panel is always visible — Leaflet retains container dimensions at all times.
 *   Other panels overlay the map with a white background when active.
 *
 * Props:
 *   mapPane        — JSX for the Map tab (MidPaneMap)
 *   infoPane       — JSX for the Info tab (LocationInfo)
 *   newsPane       — JSX for the News tab stub
 *   groupsPane     — JSX for the Groups tab stub
 *   postsPane      — JSX for the Posts tab stub
 *   peoplePane     — JSX for the People tab stub
 *   governmentPane — JSX for the Government tab stub (geo hierarchy only)
 *   committeePane  — JSX for the Committee tab stub
 *   activeTab      — string
 *   onTabChange    — (tab: string) => void
 *   locationType   — string|null  (current context type for tab visibility)
 *   viewMode       — 'browse' | 'explore'
 *   onToggleExpand — () => void
 */

import LocationSearch from './LocationSearch.jsx'

const TAB_HEIGHT   = 36
const ACTIVE_COLOR = '#2f9e44'
const BORDER_COLOR = '#dee2e6'

const NAMED_PLACES = ['city', 'town', 'village', 'hamlet']

/**
 * @param {{
 *   mapPane:        React.ReactNode,
 *   infoPane:       React.ReactNode,
 *   newsPane:       React.ReactNode,
 *   groupsPane:     React.ReactNode,
 *   postsPane:      React.ReactNode,
 *   peoplePane:     React.ReactNode,
 *   governmentPane: React.ReactNode,
 *   committeePane:  React.ReactNode,
 *   activeTab:      string,
 *   onTabChange:    (tab: string) => void,
 *   locationType:   string|null,
 *   viewMode:       string,
 *   onToggleExpand: () => void
 * }} props
 */
export default function MidPaneTabs({
  mapPane, infoPane, newsPane, groupsPane, postsPane, peoplePane, governmentPane, committeePane,
  activeTab, onTabChange, locationType, viewMode, onToggleExpand, onPlaceSelect, onGeoSelect,
}) {
  const expanded     = viewMode === 'explore'
  const isNamedPlace = NAMED_PLACES.includes((locationType ?? '').toLowerCase())

  const tabs = [
    { id: 'info',       label: 'Info' },
    { id: 'map',        label: 'Map' },
    { id: 'news',       label: 'News' },
    { id: 'groups',     label: 'Groups' },
    { id: 'posts',      label: 'Posts' },
    { id: 'people',     label: 'People' },
    ...(!isNamedPlace ? [{ id: 'government', label: 'Government' }] : []),
    { id: 'committee',  label: 'Committee' },
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
      {/* Tab strip — outer div is overflow:visible so the search dropdown can escape */}
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
        {/* Location search — left of tab strip, outside the scrollable tab row */}
        {onPlaceSelect && <LocationSearch onPlaceSelect={onPlaceSelect} onGeoSelect={onGeoSelect} />}

        {/* Scrollable tab row — sits between search and expand toggle */}
        <div style={{ display: 'flex', alignItems: 'flex-end', overflowX: 'auto', flex: 1, paddingLeft: 4 }}>
          {tabs.map(t => (
            <button key={t.id} style={tabStyle(t.id)} onClick={() => onTabChange(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Expand / collapse toggle — right-aligned in the tab strip */}
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

      {/* Content area — all panels stacked. isolation:isolate contains
          Leaflet's internal z-index values within the map panel. */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, isolation: 'isolate' }}>

        {/* Map panel — always rendered, always visible, z-index 1. */}
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

        {/* Posts panel */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: '#fff', overflowY: 'auto', display: activeTab === 'posts' ? 'block' : 'none' }}>
          {postsPane}
        </div>

        {/* People panel */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: '#fff', overflowY: 'auto', display: activeTab === 'people' ? 'block' : 'none' }}>
          {peoplePane}
        </div>

        {/* Government panel — geo hierarchy only, not rendered for named places */}
        {!isNamedPlace && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: '#fff', overflowY: 'auto', display: activeTab === 'government' ? 'block' : 'none' }}>
            {governmentPane}
          </div>
        )}

        {/* Committee panel */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: '#fff', overflowY: 'auto', display: activeTab === 'committee' ? 'block' : 'none' }}>
          {committeePane}
        </div>

      </div>
    </div>
  )
}
