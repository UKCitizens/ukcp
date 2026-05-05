# Dex Task: Mobile Drawer Navigation
# Date: 2026-05-05
# Scope: PageLayout.jsx + PageLayout.module.css only.
# No other files should be touched.
# Build must pass 0 errors 0 warnings. Server must start cleanly.

---

## Objective

At viewport width < 768px, replace the stacked left and right pane columns with
Mantine Drawer components. The left pane slides in from the top; the right pane
slides up from the bottom. Both are triggered by icon buttons visible only on mobile.
The centre column takes full width when both panes are hidden.

At >= 768px nothing changes -- desktop three-column layout is untouched.

---

## Current State

PageLayout.jsx renders three columns (leftCol, midCol, rightCol) inside midZone.
PageLayout.module.css already has a @media (max-width: 767px) block that stacks
the columns vertically. That stacking behaviour is what we are replacing with drawers.

PageLayout.jsx currently has no state and no imports beyond Paper, PageBackground,
and the CSS module.

---

## Task

### 1. PageLayout.jsx

Add the following imports:

  import { Paper, Drawer, ActionIcon, Tooltip, Group } from '@mantine/core'
  import { useMediaQuery }                             from '@mantine/hooks'
  import { IconList, IconLayers }                      from '@tabler/icons-react'

Add two state values inside the component:

  const [leftOpen,  setLeftOpen]  = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')

Add useState to the React import at the top of the file.

At mobile width (isMobile === true), render:

  (a) Two Mantine Drawer components before the midZone div:

      Left pane drawer:
        position="top"
        size="65%"
        opened={leftOpen}
        onClose={() => setLeftOpen(false)}
        title="Places"
        withCloseButton={true}
        zIndex={300}
        Content: {leftPane}

      Right pane drawer:
        position="bottom"
        size="50%"
        opened={rightOpen}
        onClose={() => setRightOpen(false)}
        title="Filters"
        withCloseButton={true}
        zIndex={300}
        Content: {rightPane}

  (b) A mobile control bar rendered as the first child inside midZone, above the
      midCol div. Visible only when isMobile is true. This is a Group with
      justify="space-between" and a small amount of bottom padding (pb="xs"):

      Left button:
        ActionIcon variant="light" size="lg" aria-label="Open places browser"
        onClick={() => setLeftOpen(true)}
        Icon: <IconList size={20} />
        Tooltip label: "Places"

      Right button:
        ActionIcon variant="light" size="lg" aria-label="Open filters"
        onClick={() => setRightOpen(true)}
        Icon: <IconLayers size={20} />
        Tooltip label: "Filters"

  (c) When isMobile is true, do NOT render leftCol or rightCol divs in the midZone.
      The midZone contains only: the mobile control bar Group + the midCol div.

  (d) When isMobile is false, render exactly as today -- leftCol, midCol, rightCol.
      No drawers. No control bar. No state used.

The mapExpand prop behaviour is unchanged.

---

### 2. PageLayout.module.css

In the @media (max-width: 767px) block, remove the rules for leftCol and rightCol
entirely (those elements are not rendered on mobile anymore -- no CSS needed for them).

Keep the midZone, midCol, and column rules in the mobile block as they are.

The @media (min-width: 768px) and (max-width: 899px) block is untouched.

---

## Acceptance Criteria

1. At < 768px viewport: left and right pane columns are not visible. Two icon buttons
   appear above the centre content. Tapping the left button opens a top drawer
   containing the left pane content. Tapping the right button opens a bottom drawer
   containing the right pane content. Both drawers close via their close button.

2. At >= 768px viewport: layout is identical to current. No drawers. No buttons.
   No visual change at all.

3. All pages that use PageLayout (Locations, MyHome, People, Profile, Help, Settings)
   behave correctly -- no blank panes, no errors in console.

4. Map expand mode (mapExpand prop) continues to work correctly at all widths.

5. Build: 0 errors, 0 warnings. Server starts and serves on port 3000.

---

## Notes

- useMediaQuery from @mantine/hooks SSR-safe with getServerSideProps -- no issue
  in this Vite/client-only build.
- Do not add padding or extra wrapper divs inside the Drawer content beyond what
  Mantine Drawer provides by default. leftPane and rightPane render directly as
  Drawer children.
- IconList and IconLayers are already available via @tabler/icons-react (confirmed
  in project). If either is missing from the installed version, substitute:
  IconList -> IconMenu2, IconLayers -> IconAdjustments.
- Do not change any prop signatures on PageLayout. All call sites pass the same
  props as today.
