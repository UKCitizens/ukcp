# Task: Walker Options Row — Scroll on Overflow

## Context
`SiteHeaderRow3.jsx` renders the location nav picker (regions, counties, constituencies, wards).
For large lists (worst case: Outer London ~60 constituencies), the options wrap onto 3+ lines and overflow the fixed `ROW3_HEIGHT = 72px`.

Font is 11px, gaps are `3px 6px` (row/column). These are correct — do not change them.

## What to build
When the options wrap exceeds **2 lines** of height, cap the options section at 2 lines and make it **vertically scrollable**. The row height must accommodate this without breaking shorter lists.

## Approach
1. Calculate 2-line threshold: `2 * (11px * 1.5 lineHeight) + 1 * 3px row-gap ≈ 36px`. Use a `ref` on `.optionsWrap` and a `ResizeObserver` to detect when `scrollHeight > threshold`.
2. When over threshold: apply a CSS class that sets `max-height` to the 2-line value and `overflow-y: auto` on the wrap.
3. `ROW3_HEIGHT` in `HEADER_ROWS.js` may need a small increase to accommodate the capped scroll zone + crumb row cleanly. Current value is `72`. Check if `80` is sufficient.
4. Normal lists (under 2 lines) are completely unaffected.

## Files
- `src/components/Header/SiteHeaderRow3.jsx` — add ref, ResizeObserver, scroll class toggle
- `src/components/Header/SiteHeaderRow3.module.css` — add `.optionsWrapScroll` with max-height + overflow-y
- `src/components/Header/HEADER_ROWS.js` — adjust `ROW3_HEIGHT` if needed

## Test cases
- England → London → Outer London (constituencies) — should scroll
- England → North West → Cheshire (constituencies ~20) — should not scroll
- Any region → counties — should not scroll
