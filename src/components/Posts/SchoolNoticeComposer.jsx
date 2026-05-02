/**
 * @file src/components/Posts/SchoolNoticeComposer.jsx
 * @description Wrapper around PostComposer for school_notice posts.
 *   Adds a notice_category select (Community | Event | Alert) into meta.
 */

import { useState } from 'react'
import PostComposer from './PostComposer.jsx'

const CATEGORIES = ['Community', 'Event', 'Alert']

/**
 * @param {{
 *   origin: { entity_type: string, entity_id: string, entity_name?: string, geo_scope?: object },
 *   onSuccess: (post: object) => void,
 * }} props
 */
export default function SchoolNoticeComposer({ origin, onSuccess }) {
  const [category, setCategory] = useState(CATEGORIES[0])

  return (
    <PostComposer
      postType="school_notice"
      origin={origin}
      onSuccess={onSuccess}
      meta={{ notice_category: category }}
    >
      <div style={variantRow}>
        <label style={label}>Category</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={select}
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </PostComposer>
  )
}

const variantRow = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }
const label      = { fontSize: 12, color: '#495057', minWidth: 70 }
const select     = { fontSize: 12, padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: 4, background: '#fff' }
