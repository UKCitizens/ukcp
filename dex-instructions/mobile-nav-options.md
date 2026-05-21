# Mobile Nav Panel -- Display Options Assessment

## Current architecture

MobileNavPanel renders in `mobilePanelSlot`, a separate flex child that sits **above** `midCol`
in the DOM. When either bar is expanded, the content pushes midCol downward. The two bars
(green = left pane, blue = right pane) are always visible as collapsed headers above the
mid pane Paper.

The mid pane Paper (`midCol`) is a completely separate DOM node -- MobileNavPanel has no
structural relationship to it.

---

## Option 1 -- Current (status quo)
Bars above mid pane, expand inline, push pane down.

Pro: simple, no z-index issues, content doesn't obscure the map.
Con: visually disconnected from mid pane; bars consume vertical space even collapsed;
     mid pane gets compressed or scrolled out of view when both bars are open.

---

## Option 2 -- Bars inside mid pane, content as absolute overlay (DROP-DOWN POPOVER)
Move the trigger bars to the TOP of the mid pane Paper (inside `midCol`).
On expand, content renders as an `absolute`-positioned panel dropping down over
the mid pane content below.

Implementation:
  - Remove `mobilePanelSlot` from PageLayout / Locations.jsx.
  - Pass `mobilePanel` as a prop into `midPane` instead.
  - MobileNavPanel renders inside the Paper with `position: relative` wrapper.
  - Expanded content uses `position: absolute; top: 100%; left/right: 0; z-index: 50`.
  - A semi-transparent backdrop or auto-close-on-outside-click dismisses it.

Pro: bars are visually part of the mid pane; zero vertical space cost to mid pane
     height; mid pane never gets compressed.
Con: expanded content overlays the map / tab content -- user must dismiss to interact
     with what's underneath. Acceptable for nav/filter panels (they're modal by nature).

This is the direct answer to Phil's "rollout popover" question -- YES, this is achievable
with minimal structural change.

---

## Option 3 -- Side-edge drawer handles on the mid pane
Two small vertical tab handles anchored to the LEFT and RIGHT edges of the mid pane Paper.
Tap left handle -> left pane slides in from the left over the mid content.
Tap right handle -> right pane slides in from the right.

Implementation:
  - `position: absolute` handles at left:0 and right:0, centred vertically.
  - Slide-in panel: `transform: translateX(-100%)` -> `translateX(0)` on open.
  - Overlay covers mid content while open; tap outside or X to close.

Pro: zero vertical footprint; handle icons (< >) are intuitive; mirrors the desktop
     left/right column metaphor visually.
Con: more CSS/animation complexity; two separate open states; harder to see both
     panes simultaneously.

---

## Option 4 -- Floating action buttons (FABs) on mid pane corners
Small circular buttons (e.g., 36px) anchored to bottom-left and bottom-right corners
of the mid pane Paper. Tap -> popover expands upward with pane content.

Pro: least intrusive when collapsed; established mobile pattern.
Con: popover covers map content; button positioning can conflict with map controls
     (zoom +/- is already in that zone); feels more app-like than the current tone.

---

## Option 5 -- Tab bar injection (icons at ends of MidPaneTabs)
Add small left/right icons at the ends of the existing MidPaneTabs bar.
Tap -> drawer slides down below the tab bar inside the mid pane Paper.

Pro: no additional chrome; uses existing navigation bar real estate.
Con: tab bar already has 5 tabs + labels; adding icons at ends risks crowding on
     narrow screens; tab bar width may not accommodate it cleanly.

---

## Recommendation

Option 2 (drop-down popover from inside the mid pane top) is the cleanest fit for
Phil's stated intent. It:
- Answers "can they be part of the mid pane" -- yes
- Keeps the two-bar pattern (green/blue) which is already established
- Requires the smallest structural change: remove mobilePanelSlot from PageLayout,
  pass mobilePanel down into midPane prop, adjust MobileNavPanel CSS to absolute-drop
- Mid pane height is fully restored (no compression)

Option 3 (side handles) is the better UX if the goal is non-obstructive access --
but it's more build work and breaks the single-panel mental model.

The two options are not mutually exclusive: Option 2 can be built first as a structural
fix, Option 3 considered as a follow-on UX refinement.
