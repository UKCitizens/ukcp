# Dex Instruction File — Right-Pane Walker Mode Bug Fix
> Session: 25 Apr 2026 | Ali

---

## Bug

Letter clicks in ConstituencyPane call `onWalkerModeChange?.(false)`, silently exiting walker mode. User clicks "All" (enters walker mode), then clicks a letter to filter the list — walker mode exits without any visual feedback. The next constituency click fires `selectMany`, commits to path, collapses the list to one entry, and the pane appears stuck.

---

## Fix — Two files

### File 1: `src/components/ConstituencyPane.jsx`

Remove `onWalkerModeChange?.(false)` from every letter button's onClick. Letter clicks should only filter the list — they must not exit walker mode.

Find this block (approximately line 158–166):
```js
{ALL_LETTERS.filter(l => availableLetters.has(l)).map(l => (
  <button
    key={l}
    className={[classes.alphaBtn, l === activeLetter ? classes.alphaBtnActive : ''].join(' ')}
    onClick={() => { setActiveLetter(l); onWalkerModeChange?.(false) }}
  >
    {l}
  </button>
))}
```

Replace with:
```js
{ALL_LETTERS.filter(l => availableLetters.has(l)).map(l => (
  <button
    key={l}
    className={[classes.alphaBtn, l === activeLetter ? classes.alphaBtnActive : ''].join(' ')}
    onClick={() => setActiveLetter(l)}
  >
    {l}
  </button>
))}
```

---

### File 2: `src/pages/Locations.jsx`

Add `setRightWalkerMode(false)` to the three nav action handlers so walker mode clears correctly when the user navigates away.

**handleNavSelect** — add one line:
```js
function handleNavSelect(level, value) {
  dismissPending()
  setPendingConstituency(null)
  setPendingWard(null)
  setRightWalkerMode(false)    // add this line
  select(level, value)
}
```

**handleGoTo** — add one line:
```js
const handleGoTo = useCallback((index) => {
  goTo(index)
  dismissPending()
  setPendingConstituency(null)
  setPendingWard(null)
  setRightWalkerMode(false)    // add this line
  setWalkerOpen(true)
}, [goTo, dismissPending])
```

**handleReset** — add one line:
```js
const handleReset = useCallback(() => {
  reset()
  dismissPending()
  setPendingConstituency(null)
  setPendingWard(null)
  setRightWalkerMode(false)    // add this line
  setWalkerOpen(true)
  setViewMode('browse')
  setMidTab('map')
}, [reset, dismissPending])
```

---

## Build & Test

```
cd C:\Users\phild\Desktop\Projects\Ali-Projects\UKCP
npm run build
node server.js
```

**Test sequence:**
1. Navigate to Lancashire.
2. Click "All" in the right pane — constituencies show.
3. Click a letter (e.g. "B") — list filters to B entries. Ward panel stays. Walker mode stays on.
4. Click a constituency — wards update. Path does NOT change (crumb trail unchanged).
5. Click a different letter — still in walker mode.
6. Click another constituency — wards update again.
7. Navigate away via crumb trail (e.g. click "North West") — walker mode clears, pending cleared.
8. Confirm standard drill mode still works (without clicking "All" first — constituency click commits to path as before).

Commit and push when passing.
