/**
 * @file MidPaneTabs.jsx
 * @description Tab strip for the mid pane.
 *
 * Tabs: Groups | News | Local Traders | Civic (geo hierarchy only) | Map | Info
 * Controlled component -- activeTab and onTabChange are passed from Locations.jsx.
 *
 * Navigation map has moved to SiteHeaderRow2. The Map tab here is reserved for
 * a future content/annotated map (Sprint 2). For now it shows a placeholder.
 *
 * All panels are simple show/hide -- no always-rendered Leaflet dependency.
 * Advanced button removed -- pane mode is now controlled by clicking the header map.
 *
 * Props:
 *   infoPane     -- JSX for the Info tab
 *   newsPane     -- JSX for the News tab
 *   groupsPane   -- JSX for the Groups tab
 *   tradersPane  -- JSX for the Local Traders tab
 *   civicPane    -- JSX for the Civic tab
 *   activeTab    -- string
 *   onTabChange  -- (tab: string) => void
 *   locationType -- string|null
 *   viewMode     -- 'browse' | 'explore'
 *   onToggleExpand -- () => void
 *   onPlaceSelect  -- passed to LocationSearch
 *   onGeoSelect    -- passed to LocationSearch
 *   session        -- Supabase session or null (gates auth-required tabs)
 */

import LocationSearch from './LocationSearch.jsx'

const TAB_HEIGHT   = 36
const ACTIVE_COLOR = '#2f9e44'
const BORDER_COLOR = '#dee2e6'

const NAMED_PLACES = ['city', 'town', 'village', 'hamlet']

function LoginGate({ tabLabel }) {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      height:         '100%',
      gap:            12,
      color:          '#868e96',
      fontSize:       14,
    }}>
      <span>Log in to access {tabLabel}</span>
      <a
        href="/login"
        style={{
          padding:        '6px 16px',
          background:     '#2f9e44',
          color:          '#fff',
          borderRadius:   4,
          textDecoration: 'none',
          fontSize:       13,
          fontWeight:     600,
        }}
      >
        Log in
      </a>
    </div>
  )
}

function MapPlaceholder() {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      height:         '100%',
      color:          '#adb5bd',
      fontSize:       13,
      fontStyle:      'italic',
    }}>
      Content map coming soon
    </div>
  )
}

export default function MidPaneTabs({
  infoPane, newsPane, groupsPane, tradersPane, civicPane, mapPane,
  activeTab, onTabChange, locationType, viewMode, onToggleExpand,
  onPlaceSelect, onGeoSelect,
  session,
}) {
  const expanded     = viewMode === 'explore'
  const isNamedPlace = NAMED_PLACES.includes((locationType ?? '').toLowerCase())

  const tabs = [
    { id: 'groups',  label: 'Groups'       },
    { id: 'news',    label: 'News'         },
    { id: 'traders', label: 'Local Traders'},
    ...(!isNamedPlace ? [{ id: 'civic', label: 'Civic' }] : []),
    { id: 'map',     label: 'Map'          },
    { id: 'info',    label: 'Info'         },
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
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>

      {/* Tab strip */}
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
        {onPlaceSelect && <LocationSearch onPlaceSelect={onPlaceSelect} onGeoSelect={onGeoSelect} />}

        <div style={{ display: 'flex', alignItems: 'flex-end', overflowX: 'auto', flex: 1, paddingLeft: 4 }}>
          {tabs.map(t => (
            <button key={t.id} style={tabStyle(t.id)} onClick={() => onTabChange(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Expand / collapse toggle */}
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

      {/* Content panels -- simple show/hide */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>

        <div style={{ position: 'absolute', inset: 0, background: '#fff', overflowY: 'auto', display: activeTab === 'map'     ? 'block' : 'none' }}>
          {mapPane ?? <MapPlaceholder />}
        </div>

        <div style={{ position: 'absolute', inset: 0, background: '#fff', overflowY: 'auto', display: activeTab === 'info'    ? 'block' : 'none' }}>
          {infoPane}
        </div>

        <div style={{ position: 'absolute', inset: 0, background: '#fff', overflowY: 'auto', display: activeTab === 'news'    ? 'block' : 'none' }}>
          {session ? newsPane : <LoginGate tabLabel="News" />}
        </div>

        <div style={{ position: 'absolute', inset: 0, background: '#fff', overflowY: 'auto', display: activeTab === 'groups'  ? 'block' : 'none' }}>
          {session ? groupsPane : <LoginGate tabLabel="Groups" />}
        </div>

        <div style={{ position: 'absolute', inset: 0, background: '#fff', overflowY: 'auto', display: activeTab === 'traders' ? 'block' : 'none' }}>
          {session ? tradersPane : <LoginGate tabLabel="Local Traders" />}
        </div>

        {!isNamedPlace && (
          <div style={{ position: 'absolute', inset: 0, background: '#fff', overflowY: 'auto', display: activeTab === 'civic' ? 'block' : 'none' }}>
            {session ? civicPane : <LoginGate tabLabel="Civic" />}
          </div>
        )}

      </div>
    </div>
  )
}
