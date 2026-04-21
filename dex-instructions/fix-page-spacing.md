# DEX TASK: Fix PageLayout spacing issues
File: `src/components/PageLayout.jsx`

Three problems to fix. All changes are in PageLayout.jsx unless stated otherwise.

---

## Problem 1 — Header and footer appearing full-width

The outer `Flex` is `100vw/100vh`. The inner `Flex` is correctly set to `width: '95%'` with `margin: 'auto'`, which should create the inset card effect. However, Mantine's `Grid` component applies **negative horizontal margins** for gutters by default, which causes the header and footer grids to bleed outside the 95% container.

**Fix:** Add `overflow: 'hidden'` to the inner `Flex` (the 95% container), and set `gutter={0}` on both the header Grid and footer Grid to suppress negative margin bleed.

Inner Flex — add `overflow: 'hidden'`:
```jsx
style={{
  height: isFullScreen ? '100%' : '95%',
  width: isFullScreen ? '100%' : '95%',
  backgroundColor: '#f4f4f5',
  margin: 'auto',
  padding: 0,
  gap: 0,
  overflowY: 'auto',
  overflowX: 'hidden',   // ADD THIS
}}
```

Header Grid — add `gutter={0}`:
```jsx
<Grid
  columns={12}
  gutter={0}         // ADD THIS
  style={{
    backgroundColor: '#f5f5f5',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    margin: 0,
    padding: 0,
  }}
>
```

Footer Grid — add `gutter={0}`:
```jsx
<Grid
  columns={12}
  gutter={0}         // ADD THIS
  style={{
    backgroundColor: '#dcdcdc',
    margin: 0,
    padding: 0,
  }}
>
```

---

## Problem 2 — Mid panes riding up underneath the sticky header

The sticky header has `position: 'sticky'` and `top: 0`. The content Grid immediately below has no top offset, so content scrolls under the sticky header.

**Fix:** Add a `paddingTop` to the content Grid equal to the approximate header height. The SiteHeader is approximately 60px, the HeaderNavigation adds roughly 40px more — use `paddingTop: 8` as a small breathing gap (the sticky element already reserves its own space in normal flow, so this is just a visual gap, not a full offset). If content still clips under the header after testing, increase this value.

Content Grid — add `paddingTop`:
```jsx
<Grid
  style={{
    flexGrow: 1,
    margin: 0,
    padding: 0,
    paddingTop: 8,     // ADD THIS — adjust value after visual check
    gutter: 0,
  }}
>
```

---

## Problem 3 — Massive gap above the footer

The left and right pane `Grid.Col` components have `height: '50vh'` and `position: sticky; top: '40%'`. This forces the three-column grid row to a minimum height of 50vh regardless of content. Combined with `flexGrow: 1` on the grid, there is significant dead vertical space between the bottom of the mid pane content and the footer.

**Fix:** Remove `height: '50vh'` from both the left and right pane `Grid.Col`. Keep `position: sticky` if desired, but change `top` to something sensible like `top: 0`. The mid pane content height should now drive the row height naturally.

Left pane:
```jsx
<Grid.Col
  span={2}
  style={{
    backgroundColor: '#eaeaea',
    position: 'sticky',
    top: 0,            // CHANGED from '40%'
    // height: '50vh', // REMOVE THIS LINE
    gutter: 0,
  }}
>
```

Right pane — same change:
```jsx
<Grid.Col
  span={2}
  style={{
    backgroundColor: '#eaeaea',
    position: 'sticky',
    top: 0,            // CHANGED from '40%'
    // height: '50vh', // REMOVE THIS LINE
    gutter: 0,
  }}
>
```

---

## After making changes

Run the dev server and visually verify:
1. Header and footer should be inset from viewport edges with visible background on left/right (~2.5% each side)
2. Content panels should begin cleanly below the header with a small gap
3. Footer should sit flush below the last content row with no large gap

If the header still bleeds, also check `SiteHeader.jsx` — its outer `<Grid>` may need `gutter={0}` too.
