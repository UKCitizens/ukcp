# Prompt: UKCP Functional Manual -- Desktop
# Viewport: 1280 x 900
# Output: UKCP/Ali/ukcp-functional-manual.docx
# Purpose: produce a functional user manual that describes what the application
#          does, how it works, and where it is incomplete or broken.

---

## Context -- Read Before Starting

UKCP is a civic web platform in active development. It is not finished. Some features
are partially built, some are stubbed, some may produce errors or behave
unexpectedly. Your task is not to validate that the application works correctly --
it is to document what it does, including its gaps, failures, and rough edges.

This document will serve as a functional baseline: a record of what the service
actually does at this point in time, written in plain language that a non-technical
reader could understand. It is not a bug report and not a look-and-feel audit.
It is the closest thing to a user manual the application currently has.

Approach the application as an informed first-time user. Try things. Follow the
natural interaction paths. When something does not work as you would expect, say so
and describe what happens instead. When something is clearly incomplete (empty
sections, placeholder content, broken navigation), note it explicitly.

Login credentials are in CLAUDE.md or project context. Use the phild / ADMIN
account for the full authenticated run. This account has admin-level access so
some panels and tabs may only be visible to this role.

---

## Viewport

1280 x 900. Set before first navigation. Do not change during the run.

---

## Screenshot discipline

Screenshots illustrate key states and transitions -- they are not required for
every sub-step. Use your judgement: capture a screenshot when the visual state
is significantly different from the previous one, when a new functional area is
entered, or when something unexpected occurs. Aim for enough coverage to make the
document navigable, not exhaustive coverage for its own sake.

Every screenshot must show real data and visible controls. Never capture a loading
spinner or blank state. If a page requires interaction to surface content, complete
that interaction first.

---

## Sequence and functional areas

Work through the following areas in order. Each area should produce a titled
section in the document. The section should contain: a brief explanation of what
this part of the application is for, one or more screenshots showing it in a
meaningful state, and factual commentary on how it works -- what the user can do,
what happens when they do it, and where it falls short or breaks.

---

### Section 1 -- Entry and Authentication

Navigate to the UKCP root URL without logging in.

Describe: what does an unauthenticated visitor see? Is there a meaningful landing
experience or is it purely a login gate? What options are available (login, register,
continue anonymously)?

Log in as phild. Note the transition -- what changes after authentication?

---

### Section 2 -- Application Shell and Navigation

With phild logged in, describe the persistent application shell: the header bar
and its rows. What is always visible? What controls exist in the header and what
do they do? Is there a global search, a context indicator, navigation icons?

Describe how the header changes as the user navigates deeper into a location
(the breadcrumb / crumb trail).

---

### Section 3 -- Locations Page: Geographic Navigation

Navigate to /locations. This is the primary page of the application.

Describe the overall layout: left pane, centre pane (mid pane), right pane.
What is each pane for?

Describe the geographic navigation walker in the header. Explain how a user drills
down through the hierarchy: UK -> country -> region -> county. What does each step
show? What are the navigation options at each depth?

Walk a specific path: England -> North West -> Lancashire. Screenshot at each
meaningful step. Explain what the left and right panes show at each depth.

Describe the breadcrumb trail that builds as the user navigates. Can they click
back up the trail? What happens when they do?

---

### Section 4 -- Locations Page: Places (Left Pane)

At county level (Lancashire), focus on the left pane.

Describe the places browser: the City / Town / Village / Hamlet type selector,
the A-Z alpha strip, and the scrollable place list. How does the type selector
work? What does selecting a letter do?

Describe "All" mode on the alpha strip -- what does it show and how does it
differ from a letter selection?

Select a specific town (e.g. Blackpool or Preston). What happens to the page
when a place is selected? Does anything change in the centre or right pane?

Describe right-click behaviour on a place name -- what menu appears and what
options does it offer?

---

### Section 5 -- Locations Page: Constituencies (Right Pane)

At county level, focus on the right pane.

Describe the constituency browser: A-Z strip, constituency list, and the ward
panel that appears when a constituency is selected. How does walking a
constituency to its wards work?

Describe right-click behaviour on constituency and ward names.

Note whether the right pane scope changes as the user drills into the hierarchy
(does filtering to Lancashire show only Lancashire constituencies?).

---

### Section 6 -- Locations Page: Centre Pane Tabs

With a place selected (e.g. Blackpool Town), work through each tab in the
centre pane. For each tab: describe what it is for, what data or content it
shows, and whether it is functional, stub, or broken.

Tabs to cover (note which are present at this location level):
- Map
- Info
- Groups
- News
- Local Traders
- Civic (with any sub-tabs: Committee Forum, Petitions, Civic Acts)
- Schools

Note: tab availability may vary by location depth and type. If a tab is absent
at town level, try capturing it at a different depth (e.g. Civic at county level).
State clearly at which depth each tab becomes available.

---

### Section 7 -- Location Search

Describe the global place search in the header. How does a user invoke it?
What does it search across? Does it return results as you type (typeahead) or
on submit?

Perform a search for "Blackpool" and describe the results. What fields are shown
for each result? What happens when a result is selected?

Note any edge cases or unexpected behaviour encountered.

---

### Section 8 -- Follow / GeoContextMenu

Right-click on a location name in the nav (place, constituency, ward, or walker
option in the header). Describe the context menu that appears. What options does
it offer? What happens when Follow is selected -- where does the followed location
appear?

Demonstrate the full follow flow: right-click a constituency -> Follow -> navigate
to MyHome -> observe the followed item in the left pane.

---

### Section 9 -- My Home Page

Navigate to /myhome.

Describe the three-pane layout: left (MyIncludes), centre (FeedZone), right (MyMeta).

MyIncludes: describe the list of followed items. How are they grouped? What actions
are available on each item (the ... menu)? What does "Open" do for a place-type follow?

FeedZone: describe the feed in All mode (aggregated across followed locations).
Describe the reach control -- what options does it offer and what does changing it do?
Select a specific followed location from MyIncludes and describe how the feed changes.

MyMeta: describe what is shown in the right pane. Is it functional or stub?

---

### Section 10 -- People Page

Navigate to /people. Describe what this page is for and what it currently shows.
Is it functional, partially built, or a stub?

---

### Section 11 -- Profile Page

Navigate to /profile. Describe the user profile view: what information is shown,
what can be edited, what cannot. Note any sections that appear incomplete.

---

### Section 12 -- Data Manager (Admin)

Navigate to /settings. Note that this section is admin-only (phild has this access).

Describe each tab available in the Data Manager. For each tab: what is it for,
what data or controls does it expose, is it functional?

Tabs to cover: Geo Content, Locations, Users (and any others present).

---

### Section 13 -- Functional Gaps and Incomplete Areas

This section requires no screenshots. Write a plain-text summary covering:

- Features or areas that are clearly incomplete or stubbed (label them explicitly)
- Any navigation flows that broke, errored, or produced unexpected results
- Functionality that exists in the UI but appears non-operational
- Areas where the intent is visible but the implementation is absent
- Anything that would confuse or block a first-time user

Be specific. "Groups tab shows no content" is useful. "Some things don't work" is not.

---

### Section 14 -- Summary Description

Write a 3-5 paragraph plain-English description of what UKCP is and does, as you
understand it from this session. Write it as if explaining the service to someone
who has never seen it. Do not list features -- describe the purpose, the primary
user journey, and the core value the service offers in its current state.

This section is the most important in the document. Take time with it.

---

## Output

File: UKCP/Ali/ukcp-functional-manual.docx
Structure: sections in the order above.
Each section: heading, screenshot(s) where relevant, explanatory commentary.
Sections 13 and 14: text only.
Overwrite any existing file at that path.

---

## Constraints

- Commentary explains function and behaviour -- not just what is visible.
- When something is broken or missing, say so plainly and move on. Do not stop.
- Do not screenshot loading states or empty pages.
- One file. No separate files per section.
- ASCII only in all document text (no curly quotes, no em-dashes, no smart apostrophes,
  no decorative Unicode of any kind). Straight quotes and double-hyphens only.
- If a section cannot be completed (page missing, feature inaccessible), note it
  in the document and continue to the next section.
