# Dex Sprint -- Mobile Side Drawer (Option 3)

## Goal
Replace the current MobileNavPanel (which sits above the mid pane and compresses it)
with side-edge drawer handles embedded inside the mid pane. On mobile, a left handle
and a right handle are anchored to the edges of the mid pane Paper. Tapping either
slides a full-height drawer in from that side over the mid pane content.

Desktop is unaffected. Left/right columns still show on desktop as before.

---

## What to build

### 1. New component: `src/components/Layout/MobileDrawerWrapper.jsx`

Wraps mid pane content. Renders two vertical handle tabs and two drawer panels.
Mobile only -- handles and drawers are CSS display:none above 767px.

Props:
  leftContent   {ReactNode}  -- content for left drawer (same as leftPane)
  rightContent  {ReactNode}  -- content for right drawer (same as rightPane)
  children      {ReactNode}  -- the mid pane content (MidPaneTabs etc.)

Behaviour:
  - Outer wrapper: position relative, height 100%, overflow hidden.
  - Left handle: position absolute, left 0, top 50%, transform translateY(-50%).
    36px wide, 72px tall, green (#2E7D32) background, white chevron icon (<<).
    border-radius 0 4px 4px 0. z-index 20.
  - Right handle: same but right 0, blue (#1864ab), chevron (>>).
    border-radius 4px 0 0 4px.
  - Left drawer panel: position absolute, top 0, left 0, height 100%, width 82%,
    max-width 320px, background #fff, z-index 30, overflow-y auto.
    Transform: translateX(-100%) when closed, translateX(0) when open.
    Transition: transform 0.22s ease.
    Has a close button (x) at top-right inside the panel, 32px.
  - Right drawer panel: same but right 0, transform translateX(100%)/translateX(0).
  - Backdrop: position absolute, inset 0, background rgba(0,0,0,0.25), z-index 25.
    Only rendered when either drawer is open. Tap closes the open drawer.
  - Only one drawer open at a time -- opening one closes the other.

Plain React state (useState). No Mantine. No external libraries.

CSS via MobileDrawerWrapper.module.css:
  - .wrapper: position relative, height 100%, overflow hidden
  - .handle: position absolute, display none (desktop hidden)
  - .drawerPanel: position absolute, transition, etc.
  - .backdrop: position absolute, inset 0, etc.
  @media (max-width: 767px): .handle { display flex }

Handle chevron content: use plain text characters.
  Left handle: show >> when closed (pointing into pane), << when open.
  Right handle: show << when closed, >> when open.
  Rotate or swap the character via state -- no SVG needed.

---

### 2. Modify `src/components/PageLayout.jsx`

Current:
  - Accepts `mobilePanel` prop and renders it in `mobilePanelSlot` div above midCol.

Change:
  - Remove `mobilePanel` prop and `mobilePanelSlot` div entirely.
  - Wrap midCol content with MobileDrawerWrapper, passing leftPane and rightPane:

    ```jsx
    import MobileDrawerWrapper from './Layout/MobileDrawerWrapper.jsx'
    ...
    <div className={classes.midCol}>
      <Paper p="md" className={classes.column}>
        <MobileDrawerWrapper leftContent={leftPane} rightContent={rightPane}>
          {midPane}
        </MobileDrawerWrapper>
      </Paper>
    </div>
    ```

  - Remove `mobilePanelSlot` CSS class usage.

---

### 3. Modify `src/components/PageLayout.module.css`

Remove:
  - `.mobilePanelSlot` rule (both base and @media block).

The mobile @media block for leftCol/rightCol hide remains unchanged.

---

### 4. Modify `src/pages/Locations.jsx`

Remove:
  - The entire mobile nav panel block (lines approx 800-865 -- the let mobilePanelEl
    = null block and all six if/else cases).
  - The `mobilePanel={mobilePanelEl}` prop from the PageLayout call.
  - The MobileNavPanel import line.

No other changes to Locations.jsx.

---

### 5. Delete or deprecate `src/components/Layout/MobileNavPanel.jsx`
   and `src/components/Layout/MobileNavPanel.module.css`

Check no other page imports MobileNavPanel before deleting.
If any other page imports it, leave the file and note it in a comment -- do not
delete until confirmed clear.

---

## Constraints

- No TypeScript. Plain ES modules.
- No Mantine components inside MobileDrawerWrapper. Plain HTML + module CSS only.
- Desktop layout must be pixel-identical to before this sprint. All changes are
  mobile-only (max-width 767px media query).
- The drawer content is whatever Locations.jsx passes as leftPane/rightPane --
  MobileDrawerWrapper does not know or care what it is. It is a dumb wrapper.
- overflow-y auto on the drawer panel -- pane content may be tall.
- The mid pane Paper has `position: relative` already via `.column` in PageLayout.module.css.
  MobileDrawerWrapper's `position: absolute` children will be contained by it.

---

## Test checklist

After build + server restart:

1. Mobile viewport (<768px):
   - Mid pane fills full width, no panel bars above it. [PASS]
   - Left green handle visible on left edge of mid pane. [PASS]
   - Right blue handle visible on right edge of mid pane. [PASS]
   - Tap left handle -> left drawer slides in from left. [PASS]
   - Tap right handle -> right drawer slides in from right. [PASS]
   - Backdrop visible behind open drawer. [PASS]
   - Tap backdrop -> drawer closes. [PASS]
   - Tap x button inside drawer -> drawer closes. [PASS]
   - Opening left when right is open -> right closes, left opens. [PASS]
   - Drawer content scrolls independently if taller than viewport. [PASS]

2. Desktop viewport (>=768px):
   - Left and right handles not visible. [PASS]
   - Left and right columns visible as before. [PASS]
   - No layout change on desktop whatsoever. [PASS]

3. Tablet (768-899px):
   - Columns stack vertically as before (no change). [PASS]
   - Handles not visible on tablet. [PASS]
