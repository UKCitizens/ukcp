# Prompt: UKCP UI Audit -- Mobile
# Viewport: 390 x 844 (iPhone 14 equivalent)
# Output: ukcp-ui-reference-mobile.docx in UKCP/Ali/
# Purpose: expose mobile layout problems for remediation.

---

## Task

You have browser access via Playwright. Set the viewport to 390 x 844 (portrait
phone) before navigating anywhere. Do not resize during the run.

Perform the sequence below and produce a single .docx file. Each section contains
a full-page screenshot and factual commentary focused on layout problems, overflow,
collapsed/hidden controls, and anything that looks broken or degraded at this width.

This is a diagnostic run. Be specific about problems -- do not just describe what
is visible, note what is wrong: overflow, text truncation, unusable controls,
hidden navigation, missing affordances, anything that would impair a mobile user.

---

## Pre-condition

Before screenshotting any page, confirm it is in a state that exposes real data
and visible controls. Login credentials are in CLAUDE.md or project context.
Use the phild / ADMIN account.

---

## Viewport

390 x 844. Set before first navigation. Do not change.

---

## Sequence

### Section 1 -- Unauthenticated State
Navigate to UKCP root before logging in.
Screenshot the sign-in screen. Label: "1.1 Sign-In -- Mobile".
Note: does the form fit the viewport? Is the keyboard likely to obscure inputs?

### Section 2 -- Locations (Default Landing)
Log in and navigate to /locations.
Screenshot with Map tab active. Label: "2.1 Locations -- Map Tab -- Mobile".
Note: how does the three-column layout behave? Is a column hidden, stacked,
or collapsed to a hamburger/drawer? Are tabs still accessible?

### Section 3 -- My Home
Navigate to /myhome. Screenshot. Label: "2.2 My Home -- Mobile".

### Section 4 -- People
Navigate to /people. Screenshot. Label: "2.3 People -- Mobile".

### Section 5 -- Profile
Navigate to /profile. Screenshot. Label: "2.4 Profile -- Mobile".

### Section 6 -- Data Manager
Navigate to /settings. Screenshot the Data Manager tab. Label: "3. Data Manager -- Mobile".
Click the Locations tab. Screenshot. Label: "3.1 Locations Tab -- Mobile".

### Section 7 -- Location Hierarchy at Town Level
Drill down to Acton (Town). Screenshot Map tab. Label: "4.1 Acton -- Map Tab -- Mobile".
Click each mid-pane tab and screenshot: Groups, News, Local Traders, Info.
Labels: "5.1 Groups -- Mobile", "5.2 News -- Mobile", "5.3 Local Traders -- Mobile",
"5.4 Info -- Mobile".

### Section 8 -- Notes for Agents
Write a plain-text summary (no screenshot) covering:
- Viewport used
- Overall assessment of mobile responsiveness (functional / degraded / broken)
- List of the most significant layout problems found
- Any controls that are completely inaccessible at this width
- Date and user account used for the run

---

## Output

File: UKCP/Ali/ukcp-ui-reference-mobile.docx
Structure: sections in sequence order above.
Each section: heading, screenshot (full page), 2-4 sentences of factual commentary
with emphasis on layout problems and mobile UX failures.
Section 8: text only.
Overwrite any existing file at that path.

---

## Constraints

- Do not screenshot loading states or empty pages.
- If a nav element cannot be located, note it and continue.
- Be specific about problems -- vague commentary ("looks a bit cramped") is not useful.
- One file. No separate files per section.
- ASCII only in document text (no curly quotes, no em-dashes, no decorative Unicode).
