/**
 * @file src/components/Groups/CommunityNetworkCard.jsx
 * @description Small icon tile for a community network in the horizontal scroller.
 *
 * Props:
 *   name        -- network display name
 *   description -- shown in "i" popup
 *   topicCategory -- used to pick fallback icon
 *   isSelected  -- bool, highlights tile
 *   onClick     -- () => void, selects the network
 */

import { useState } from 'react'

// Inline SVG icons keyed by topic_category slug.
// Add more as networks are defined.
const ICONS = {
  'Education': SchoolIcon,
}

function fallbackIcon(topicCategory) {
  return ICONS[topicCategory] ?? GenericIcon
}

export default function CommunityNetworkCard({ name, description, topicCategory, isSelected, onClick }) {
  const [popupOpen, setPopupOpen] = useState(false)
  const Icon = fallbackIcon(topicCategory)

  function handleInfo(e) {
    e.stopPropagation()
    setPopupOpen(true)
  }

  function closePopup(e) {
    e.stopPropagation()
    setPopupOpen(false)
  }

  return (
    <>
      <div
        onClick={onClick}
        style={{
          position:    'relative',
          borderRadius: 6,
          border:      isSelected ? '1.5px solid #2f9e44' : '0.5px solid #dee2e6',
          background:  '#fff',
          cursor:      'pointer',
          userSelect:  'none',
          overflow:    'hidden',
        }}
      >
        {/* Icon area */}
        <div style={{
          height:         44,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          background:     isSelected ? '#d6eddc' : '#eaf3de',
        }}>
          <Icon size={28} />
        </div>

        {/* Label */}
        <div style={{ padding: '3px 4px 4px' }}>
          <p style={{
            fontSize:     10,
            fontWeight:   500,
            color:        isSelected ? '#2f9e44' : '#212529',
            margin:       0,
            lineHeight:   1.2,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            textAlign:    'center',
          }}>
            {name}
          </p>
        </div>

        {/* Info button */}
        {description && (
          <button
            onClick={handleInfo}
            title="About this network"
            style={{
              position:       'absolute',
              top:            3,
              right:          3,
              width:          14,
              height:         14,
              borderRadius:   '50%',
              background:     'rgba(255,255,255,0.9)',
              border:         '0.5px solid rgba(0,0,0,0.18)',
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       9,
              fontWeight:     600,
              color:          '#2f9e44',
              lineHeight:     1,
              padding:        0,
            }}
          >
            i
          </button>
        )}
      </div>

      {/* Popup -- rendered inline, not fixed, so it doesn't collapse the iframe */}
      {popupOpen && (
        <div
          onClick={closePopup}
          style={{
            position:       'fixed',
            inset:          0,
            background:     'rgba(0,0,0,0.38)',
            zIndex:         200,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:   '#fff',
              borderRadius: 10,
              border:       '0.5px solid #dee2e6',
              padding:      '18px 20px 16px',
              maxWidth:     300,
              width:        '88%',
              position:     'relative',
            }}
          >
            <button
              onClick={closePopup}
              style={{
                position:   'absolute',
                top:        8,
                right:      10,
                background: 'none',
                border:     'none',
                fontSize:   14,
                cursor:     'pointer',
                color:      '#868e96',
                padding:    '2px 4px',
                lineHeight: 1,
              }}
            >
              x
            </button>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#212529', margin: '0 0 8px' }}>
              {name}
            </p>
            <p style={{ fontSize: 12, color: '#495057', lineHeight: 1.6, margin: '0 0 12px' }}>
              {description}
            </p>
            {topicCategory && (
              <span style={{
                display:      'inline-block',
                fontSize:     11,
                background:   '#eaf3de',
                color:        '#27500a',
                borderRadius: 4,
                padding:      '2px 7px',
              }}>
                {topicCategory}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SchoolIcon({ size = 40 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width={size} height={size}>
      <path fill="#3b6d11" d="M40 44H8V20L24 8l16 12z"/>
      <path fill="#27500a" d="M24 8 8 20v2l16-12 16 12v-2z"/>
      <rect x="20" y="28" width="8" height="10" rx="1" fill="#eaf3de"/>
      <rect x="15" y="24" width="6" height="6" rx="1" fill="#d6eddc"/>
      <rect x="27" y="24" width="6" height="6" rx="1" fill="#d6eddc"/>
      <rect x="22" y="4" width="4" height="6" rx="1" fill="#639922"/>
      <circle cx="24" cy="2" r="1.5" fill="#2f9e44"/>
      <rect x="4" y="20" width="40" height="2" rx="1" fill="#27500a"/>
    </svg>
  )
}

function GenericIcon({ size = 40 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width={size} height={size}>
      <circle cx="24" cy="24" r="16" fill="#d6eddc"/>
      <path fill="#3b6d11" d="M24 14a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16A8 8 0 0 0 24 16z"/>
      <circle cx="24" cy="24" r="3" fill="#3b6d11"/>
    </svg>
  )
}
