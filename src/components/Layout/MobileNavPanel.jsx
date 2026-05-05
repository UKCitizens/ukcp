/**
 * @file MobileNavPanel.jsx
 * @description Unified mobile navigation panel for UKCP.
 *
 * Replaces separate mobile drawers with a single collapsible panel.
 * Green bar (top) = left pane content. Blue bar (below) = right pane content.
 * Each bar is a collapsible header; sections under each bar are sub-collapsibles.
 *
 * Only renders on mobile (< 768px). Desktop: display none via CSS.
 * No Mantine components — plain React state + module CSS.
 */

import { useState } from 'react'
import classes from './MobileNavPanel.module.css'

const GREEN = '#2E7D32'
const BLUE  = '#1864ab'

/**
 * Slim accent bar that toggles a pane open/closed.
 * @param {object}   props
 * @param {string}   props.colour   - Hex colour for border, text, and tint.
 * @param {string}   props.label    - Bar label text.
 * @param {boolean}  props.open     - Current open state.
 * @param {Function} props.onToggle - Toggle callback.
 */
function PanelBar({ colour, label, open, onToggle }) {
  return (
    <button
      type="button"
      className={classes.panelBar}
      onClick={onToggle}
      aria-expanded={open}
      style={{
        borderLeft: `3px solid ${colour}`,
        color: colour,
        background: `${colour}1A`,
      }}
    >
      <span>{label}</span>
      <span
        className={classes.chevron}
        style={{ transform: open ? 'rotate(90deg)' : 'none' }}
      >
        ›
      </span>
    </button>
  )
}

/**
 * Sub-collapsible section inside a pane bar.
 * @param {object}        props
 * @param {string}        props.label        - Section header text.
 * @param {React.ReactNode} props.content    - Section body content.
 * @param {boolean}       [props.defaultOpen] - Open on mount (default true).
 */
function Section({ label, content, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={classes.section}>
      <button
        type="button"
        className={classes.sectionBar}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span>{label}</span>
        <span
          className={classes.chevron}
          style={{ transform: open ? 'rotate(90deg)' : 'none' }}
        >
          ›
        </span>
      </button>
      {open && (
        <div className={classes.sectionContent}>
          {content}
        </div>
      )}
    </div>
  )
}

/**
 * Renders the unified mobile navigation panel.
 *
 * @param {object}              props
 * @param {string|null}         props.leftLabel      - Green bar header (bar omitted if null).
 * @param {Array|null}          props.leftSections   - Sections under green bar.
 * @param {string|null}         props.rightLabel     - Blue bar header (bar omitted if null).
 * @param {Array|null}          props.rightSections  - Sections under blue bar.
 * @returns {JSX.Element}
 */
export default function MobileNavPanel({ leftLabel, leftSections, rightLabel, rightSections }) {
  const [leftOpen,  setLeftOpen]  = useState(false)
  const [rightOpen, setRightOpen] = useState(false)

  return (
    <div className={classes.mobileNavPanel}>

      {leftLabel && leftSections && (
        <div>
          <PanelBar
            colour={GREEN}
            label={leftLabel}
            open={leftOpen}
            onToggle={() => setLeftOpen(o => !o)}
          />
          {leftOpen && leftSections.map((s, i) => (
            <Section
              key={i}
              label={s.label}
              content={s.content}
              defaultOpen={s.defaultOpen ?? true}
            />
          ))}
        </div>
      )}

      {rightLabel && rightSections && (
        <div>
          <PanelBar
            colour={BLUE}
            label={rightLabel}
            open={rightOpen}
            onToggle={() => setRightOpen(o => !o)}
          />
          {rightOpen && rightSections.map((s, i) => (
            <Section
              key={i}
              label={s.label}
              content={s.content}
              defaultOpen={s.defaultOpen ?? true}
            />
          ))}
        </div>
      )}

    </div>
  )
}
