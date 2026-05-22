/**
 * @file GeoContextMenu.jsx
 * @description Portal-based right-click context menu for geographic entities.
 *
 * Renders at cursor position. Dismisses on outside click or Escape.
 * Shows Follow / Unfollow for the target entity.
 *
 * Props:
 *   x          {number}   client X from contextmenu event
 *   y          {number}   client Y from contextmenu event
 *   entityId   {string}   e.g. 'county:Merseyside'
 *   entityName {string}   display name
 *   onClose    {Function} called when menu should close
 */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePlaceFollows } from '../hooks/usePlaceFollows.js'
import classes from './GeoContextMenu.module.css'

export default function GeoContextMenu({ x, y, entityId, entityName, onClose }) {
  const { followedSet, follow, unfollow, isLoggedIn } = usePlaceFollows()
  const menuRef = useRef(null)
  const followed = followedSet.has(entityId)

  useEffect(() => {
    function onMouseDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  if (!isLoggedIn) return null

  return createPortal(
    <div ref={menuRef} className={classes.menu} style={{ top: y, left: x }}>
      <div className={classes.title}>{entityName}</div>
      <button
        className={classes.item}
        onClick={() => {
          followed ? unfollow(entityId) : follow(entityId, entityName)
          onClose()
        }}
      >
        {followed ? 'Unfollow' : 'Follow'}
      </button>
    </div>,
    document.body
  )
}
