/**
 * @file src/components/SchoolGates/SchoolGatesMid.jsx
 * @description Mid pane for At the School Gates network mode.
 *   Fetches the school's network chapter and renders community posts via PostsTab.
 * Props: focusSchool, selectedUrns
 */
import { useState, useEffect } from 'react'
import PostsTab from '../Posts/PostsTab.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export default function SchoolGatesMid({ focusSchool, selectedUrns }) {
  const [activeTab, setActiveTab] = useState('community')
  const [chapterId, setChapterId] = useState(null)

  useEffect(() => {
    if (!focusSchool?.urn) { setChapterId(null); return }
    let cancelled = false
    fetch(`${API_BASE}/api/community-networks/chapter-by-institution?type=school&id=${focusSchool.urn}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { if (!cancelled) setChapterId(String(d.chapter_id)) })
      .catch(() => { if (!cancelled) setChapterId(null) })
    return () => { cancelled = true }
  }, [focusSchool?.urn])

  if (!focusSchool) {
    return (
      <div style={empty}>
        <p style={emptyMsg}>Select a school from the left to view its community.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={breadcrumb}>
        <span style={crumbText}>At the School Gates</span>
        <span style={crumbSep}> &gt; </span>
        <span style={crumbText}>{focusSchool.name}</span>
      </div>

      <div style={tabStrip}>
        <button
          style={activeTab === 'community' ? { ...tab, ...tabActive } : tab}
          onClick={() => setActiveTab('community')}
        >
          Community
        </button>
        <button
          style={activeTab === 'notices' ? { ...tab, ...tabActive } : tab}
          onClick={() => setActiveTab('notices')}
        >
          Notices
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {activeTab === 'community' && (
          chapterId
            ? (
              <PostsTab
                locationType="school"
                locationSlug={focusSchool.urn}
                collectiveRef={{ collection: 'network_chapters', id: chapterId }}
              />
            )
            : <p style={loading}>Loading community...</p>
        )}
        {activeTab === 'notices' && (
          <p style={{ ...loading, padding: 16 }}>School notices coming soon.</p>
        )}
      </div>
    </div>
  )
}

const empty    = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24 }
const emptyMsg = { fontSize: 12, color: '#adb5bd', textAlign: 'center', margin: 0 }
const breadcrumb = { padding: '8px 16px', borderBottom: '1px solid #f1f3f5' }
const crumbText  = { fontSize: 11, color: '#868e96' }
const crumbSep   = { fontSize: 11, color: '#ced4da' }
const tabStrip = { display: 'flex', borderBottom: '1px solid #dee2e6', padding: '0 16px' }
const tab      = { fontSize: 12, padding: '8px 12px', border: 'none', background: 'none', color: '#868e96', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -1 }
const tabActive = { color: '#2f9e44', borderBottom: '2px solid #2f9e44' }
const loading  = { fontSize: 12, color: '#adb5bd', margin: 0, fontStyle: 'italic' }
