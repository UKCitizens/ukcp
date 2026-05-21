# Prompt: UKCP UI Audit -- Desktop
# Viewport: 1280px wide (default browser)
# Output: ukcp-ui-reference.docx in UKCP/Ali/
# Re-run this after each sprint to track UI state over time.

---

## Task

You have browser access via Playwright. Perform the sequence below and produce a
single .docx file. Each step is a titled section containing a full-page screenshot
and factual commentary on visible controls and content.

---

## Pre-condition

Before screenshotting any page, confirm it is in a state that exposes real data
and visible controls. If a page is empty or requires interaction (login, data
selection, filter activation) to surface content, complete that interaction first.
Never screenshot a loading state or a blank page.

Login credentials are in CLAUDE.md or project context. Use the phild / ADMIN account.

---

## Viewport

Set browser viewport to 1280 x 900 before starting. Do not resize during the run.

---

## Sequence

### Section 1 -- Unauthenticated State
Navigate to the UKCP root URL before logging in.
Screenshot the sign-in / entry screen. Label: "1.1 Sign-In / Entry Screen".
Comment: what is visible to an unauthenticated user, what form controls exist.

### Section 2 -- Site Navigation (Header Bar)
Log in as phild. Screenshot the persistent header bar in context on any page.
Comment: all icon buttons present, context indicator, logo link.

### Section 3 -- Authenticated Pages
For each page below: navigate, confirm content is visible, screenshot, comment.

- /locations (default landing -- Map tab active). Label: "2.1 Locations -- Map Tab"
- /myhome. Label: "2.2 My Home"
- /people. Label: "2.3 People"
- /profile. Label: "2.4 Profile"
- /help. Label: "2.5 Help"
- /settings (Data Manager). Label: "3. Data Manager"

Within /settings, click each tab (Geo Content, Locations, Users) and screenshot each.

### Section 4 -- Locations Hierarchy
Drill down: UK > England > London > Outer London > Acton (Town).
Screenshot at each level. Labels: "4.1 England", "4.2 London", "4.3 Outer London",
"4.4 Acton -- Map Tab".

### Section 5 -- Mid-Pane Tabs at Town Level
At Acton (Town), click each tab in the centre pane and screenshot.
Labels: "5.1 Groups", "5.2 News", "5.3 Local Traders", "5.4 Info", "5.5 Map".
If Civic tab is present at a higher level, capture it there with sub-tabs:
Committee Forum, Petitions, Civic Acts. Labels: "5.5 Civic -- Committee Forum",
"5.6 Civic -- Petitions", "5.7 Civic -- Civic Acts".

### Section 6 -- Right Pane Overlays
At Outer London level, activate the right-pane filter buttons one at a time and
in combination. Screenshot: Constituency active, Schools active, Ward + Schools +
Constituency active simultaneously.
Labels: "6.1 Constituency Overlay", "6.2 Schools Overlay",
"6.3 Ward + Schools + Constituency".

### Section 7 -- Notes for Agents
Write a plain-text summary section (no screenshot) covering:
- Overall layout pattern
- Header bar contents
- Tab availability rules by hierarchy depth
- Any controls or states that are role-gated (ADMIN only vs CITIZEN)
- Viewport width used
- Date and user account used for the run

---

## Output

File: UKCP/Ali/ukcp-ui-reference.docx
Structure: sections in sequence order above.
Each section: heading, screenshot (full page), 2-4 sentences of factual commentary.
Section 7: text only.
Overwrite any existing file at that path.

---

## Constraints

- Do not screenshot loading states or empty pages.
- If a nav element cannot be located, note it in the document and continue.
- Commentary is factual and descriptive -- what is visible, not what should be there.
- One file. No separate files per section.
- ASCII only in document text (no curly quotes, no em-dashes, no decorative Unicode).
