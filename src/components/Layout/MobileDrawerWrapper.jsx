/**
 * @file MobileDrawerWrapper.jsx
 * @description Wraps mid pane content with side-edge drawer handles on mobile.
 * Left and right handles are anchored to the edges of the mid pane and slide
 * full-height drawers in from each side. Desktop is unaffected — handles and
 * drawers are CSS display:none above 767px.
 */

import { useState } from 'react'
import classes from './MobileDrawerWrapper.module.css'

/**
 * @param {{
 *   leftContent:  React.ReactNode,
 *   rightContent: React.ReactNode,
 *   children:     React.ReactNode
 * }} props
 * @returns {JSX.Element}
 */
export default function MobileDrawerWrapper({ leftContent, rightContent, children, leftLabel = 'Nav', rightLabel = 'Info' }) {
  const [open, setOpen] = useState(null) // null | 'left' | 'right'

  function openLeft()  { setOpen('left')  }
  function openRight() { setOpen('right') }
  function close()     { setOpen(null)    }

  return (
    <div className={classes.wrapper}>

      {/* Mid pane content */}
      {children}

      {/* Left handle — green, visible on mobile only, suppressed when no content */}
      {leftContent && (
        <button
          className={`${classes.handle} ${classes.handleLeft}`}
          onClick={open === 'left' ? close : openLeft}
          aria-label="Open left panel"
        >
          {open === 'left' ? '«' : '»'}
        </button>
      )}

      {/* Right handle — blue, visible on mobile only, suppressed when no content */}
      {rightContent && (
        <button
          className={`${classes.handle} ${classes.handleRight}`}
          onClick={open === 'right' ? close : openRight}
          aria-label="Open right panel"
        >
          {open === 'right' ? '»' : '«'}
        </button>
      )}

      {/* Backdrop — tap to close */}
      {open && (
        <div className={classes.backdrop} onClick={close} aria-hidden="true" />
      )}

      {/* Left drawer */}
      <div className={`${classes.drawer} ${classes.drawerLeft} ${open === 'left' ? classes.drawerOpen : ''}`}>
        <div className={classes.drawerHeading}>
          <span className={classes.drawerHeadingLabel}>{leftLabel}</span>
          <button className={classes.closeBtn} onClick={close} aria-label="Close panel">×</button>
        </div>
        <div className={classes.drawerContent}>
          {leftContent}
        </div>
      </div>

      {/* Right drawer */}
      <div className={`${classes.drawer} ${classes.drawerRight} ${open === 'right' ? classes.drawerOpen : ''}`}>
        <div className={classes.drawerHeading}>
          <span className={classes.drawerHeadingLabel}>{rightLabel}</span>
          <button className={classes.closeBtn} onClick={close} aria-label="Close panel">×</button>
        </div>
        <div className={classes.drawerContent}>
          {rightContent}
        </div>
      </div>

    </div>
  )
}
