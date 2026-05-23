/**
 * @file src/components/Posts/PostThread.jsx
 * @description Reply thread rendered inside the parent PostCard.
 *   Replies are PostCards with left-border indentation (capped at 3 levels).
 *   Inline reply composer appears on "+ Reply" click.
 */

import { useState, useEffect } from 'react'
import { useAuth }             from '../../context/AuthContext.jsx'
import PostCard                from './PostCard.jsx'
import PostComposer            from './PostComposer.jsx'

const API_BASE  = import.meta.env.VITE_API_URL ?? ''
const MAX_DEPTH = 3

export default function PostThread({ postId, origin, depth = 0, onReplyAdded }) {
  const { session }            = useAuth()
  const [replies,  setReplies] = useState([])
  const [loading,  setLoading] = useState(true)
  const [error,    setError]   = useState(null)
  const [replying, setReplying]= useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`${API_BASE}/api/posts/${postId}/replies`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data  => { if (!cancelled) { setReplies(data);  setLoading(false) } })
      .catch(()   => { if (!cancelled) { setError('Failed to load replies'); setLoading(false) } })
    return () => { cancelled = true }
  }, [postId])

  function handleNewReply(post) {
    setReplies(prev => [...prev, post])
    setReplying(false)
    onReplyAdded?.()
  }

  function handleDeleted(id) {
    setReplies(prev => prev.filter(r => String(r._id) !== String(id)))
  }

  return (
    <div style={depth > 0 ? { paddingLeft: 12, borderLeft: '2px solid #f1f3f5', marginLeft: 4 } : {}}>

      {loading && <p style={dim}>Loading...</p>}
      {error   && <p style={errTxt}>{error}</p>}

      {replies.map(reply => (
        <div key={reply._id} style={{ marginBottom: 8 }}>
          <PostCard post={reply} origin={origin} depth={depth + 1} onDeleted={handleDeleted} />
          {depth < MAX_DEPTH && (
            <PostThread postId={String(reply._id)} origin={origin} depth={depth + 1} />
          )}
        </div>
      ))}

      {session && (
        replying ? (
          <div style={composerWrap}>
            <PostComposer
              postType="general_comment"
              origin={origin}
              replyTo={postId}
              onSuccess={handleNewReply}
            />
            <button type="button" onClick={() => setReplying(false)} style={cancelBtn}>Cancel</button>
          </div>
        ) : (
          <button type="button" onClick={() => setReplying(true)} style={addReplyBtn}>
            + Reply
          </button>
        )
      )}
    </div>
  )
}

const dim         = { fontSize: 12, color: '#adb5bd', margin: '4px 0' }
const errTxt      = { fontSize: 12, color: '#c92a2a', margin: '4px 0' }
const composerWrap= { marginTop: 8, padding: '10px', background: '#f8f9fa', borderRadius: 6 }
const addReplyBtn = { fontSize: 12, padding: '4px 10px', background: 'none', border: '1px solid #e9ecef', borderRadius: 20, cursor: 'pointer', color: '#868e96', marginTop: 4, display: 'inline-block' }
const cancelBtn   = { fontSize: 11, padding: '3px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#adb5bd', marginTop: 4 }
