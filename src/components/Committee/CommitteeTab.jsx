/**
 * @file src/components/Committee/CommitteeTab.jsx
 * @description Committee tab panel. Fetches and displays the constituency committee
 * forum for the current location scope. Renders forum header, Join Forum flow, and
 * a full post feed with composer via PostsTab.
 *
 * Props:
 *   locationType  — geo node type (constituency | ward | county | ...)
 *   locationSlug  — geo node slug (e.g. "Liverpool,_Riverside")
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import JoinForumModal from './JoinForumModal.jsx'
import PostsTab from '../Posts/PostsTab.jsx'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

/**
 * @param {{ locationType: string|null, locationSlug: string|null }} props
 */
export default function CommitteeTab({ locationType, locationSlug }) {
  const { session } = useAuth()
  const [forum,         setForum]         = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const [isMember,      setIsMember]      = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  useEffect(() => {
    if (locationType !== 'constituency' || !locationSlug) {
      setForum(null)
      setIsMember(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setForum(null)
    setIsMember(false)

    const headers = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}

    fetch(
      `${API_BASE}/api/forums?type=constituency&slug=${encodeURIComponent(locationSlug)}`,
      { headers }
    )
      .then(r => {
        if (r.status === 404) return null
        if (!r.ok) return Promise.reject(r.status)
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        setForum(data)
        setIsMember(data?.is_member ?? false)
        setLoading(false)
        if (!data) return

        // Auto-open join modal if returning from auth with a pending join for this forum
        const pendingId = sessionStorage.getItem('pendingForumJoin')
        if (pendingId && pendingId === String(data._id) && session) {
          sessionStorage.removeItem('pendingForumJoin')
          setShowJoinModal(true)
        }
      })
      .catch(() => {
        if (!cancelled) { setError('Failed to load committee forum'); setLoading(false) }
      })

    return () => { cancelled = true }
  }, [locationType, locationSlug, session])

  function handleJoinSuccess() {
    setShowJoinModal(false)
    setIsMember(true)
    setForum(prev => prev ? { ...prev, member_count: (prev.member_count ?? 0) + 1 } : prev)
  }

  if (locationType !== 'constituency') {
    return <div style={wrap}><p style={dim}>Select a constituency to see its committee forum.</p></div>
  }

  if (loading) return <div style={wrap}><p style={dim}>Loading committee forum…</p></div>
  if (error)   return <div style={wrap}><p style={dim}>{error}</p></div>
  if (!forum)  return <div style={wrap}><p style={dim}>No committee forum found for this constituency.</p></div>

  return (
    <div style={wrap}>
      {/* Forum header */}
      <div style={forumHeader}>
        <p style={forumName}>{forum.name}</p>
        <p style={forumDesc}>
          The public forum for {forum.committee?.name ?? locationSlug.replace(/_/g, ' ')} constituency
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <span style={memberCountStyle}>{forum.member_count ?? 0} members</span>
          {isMember
            ? <span style={joinedBadge}>Joined</span>
            : (
              <button style={joinBtn} onClick={() => setShowJoinModal(true)}>
                Join Forum
              </button>
            )
          }
        </div>
        {forum.committee?.mp_name && (
          <p style={mpLine}>
            MP: {forum.committee.mp_name}
            {forum.committee.mp_party ? ` · ${forum.committee.mp_party}` : ''}
          </p>
        )}
      </div>

      {/* Post feed + composer */}
      <PostsTab
        origin={{
          entity_type: 'committee',
          entity_id:   String(forum._id),
          entity_name: forum.committee?.name ?? forum.name,
          geo_scope: {
            ward_gss:         null,
            constituency_gss: forum.con_gss ?? null,
            county_gss:       null,
            region:           forum.region  ?? null,
            country:          forum.country ?? null,
          },
        }}
      />

      {/* Join modal */}
      {showJoinModal && (
        <JoinForumModal
          forum={forum}
          onClose={() => setShowJoinModal(false)}
          onSuccess={handleJoinSuccess}
        />
      )}
    </div>
  )
}

const wrap             = { padding: 16 }
const dim              = { fontSize: 13, color: '#868e96', margin: 0 }
const forumHeader      = { background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 6, padding: 14, marginBottom: 20 }
const forumName        = { fontSize: 15, fontWeight: 700, color: '#212529', margin: '0 0 4px 0' }
const forumDesc        = { fontSize: 12, color: '#495057', margin: 0 }
const memberCountStyle = { fontSize: 12, color: '#868e96' }
const mpLine           = { fontSize: 12, color: '#495057', margin: '8px 0 0 0' }
const joinedBadge      = { fontSize: 12, color: '#2f9e44', fontWeight: 600 }
const joinBtn          = { fontSize: 12, padding: '4px 12px', border: 'none', borderRadius: 4, background: '#2f9e44', color: '#fff', cursor: 'pointer' }
