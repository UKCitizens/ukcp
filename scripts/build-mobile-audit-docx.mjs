/**
 * @file scripts/build-mobile-audit-docx.mjs
 * @description Builds ukcp-ui-reference-mobile.docx from audit screenshots.
 * Run: node scripts/build-mobile-audit-docx.mjs
 */

import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } from 'docx'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SHOT_DIR  = path.join(__dirname, 'audit-shots')
const OUT = 'C:\\Users\\phild\\Desktop\\Projects\\Ali-Projects\\UKCP\\Ali\\ukcp-ui-reference-mobile.docx'

// Display size for phone screenshots in the doc (pixels at 96dpi)
// 390x844 viewport -- show at ~2.5 inches wide (240px), proportional height (~519px)
const IMG_W = 240
const IMG_H = 519

function h1(text) {
  return new Paragraph({
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, font: 'Arial', color: '1F3864' })],
  })
}

function h2(text) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, font: 'Arial', color: '2E5090' })],
  })
}

function body(text) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, size: 20, font: 'Arial' })],
  })
}

function gap() {
  return new Paragraph({ spacing: { after: 160 }, children: [new TextRun('')] })
}

function img(filename) {
  const p = path.join(SHOT_DIR, filename)
  if (!fs.existsSync(p)) return body(`[MISSING: ${filename}]`)
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 120, after: 120 },
    children: [
      new ImageRun({
        type: 'png',
        data: fs.readFileSync(p),
        transformation: { width: IMG_W, height: IMG_H },
        altText: { title: filename, description: filename, name: filename },
      }),
    ],
  })
}

const children = [
  // Title
  new Paragraph({
    spacing: { before: 0, after: 240 },
    children: [new TextRun({ text: 'UKCP Mobile UI Audit', bold: true, size: 40, font: 'Arial', color: '1F3864' })],
  }),
  body('Viewport: 390 x 844 (iPhone 14 equivalent, portrait)'),
  body('Date: 2026-05-07'),
  body('User: phild@btltd.net (ADMIN / CITIZEN)'),
  body('Server: https://localhost:3443 (Express production build)'),
  gap(),

  h1('1.1 Sign-In -- Mobile'),
  img('1_1_sign_in____mobile.png'),
  body('The sign-in card renders correctly at 390px. Logo, Sign in/Register tab toggle, email and password inputs, and the Sign in button all fit within the card with no overflow. The card carries visible horizontal margin (grey background either side) -- inputs are narrower than the full viewport width as a result. Keyboard occlusion of the password field is a risk on small devices -- no scroll-into-view logic is evident. No magic-link or passwordless option is surfaced; users must know their password, which conflicts with the Supabase magic-link auth model used internally.'),
  gap(),

  h1('2.1 Locations -- Map Tab -- Mobile'),
  img('2_1_locations____map_tab____mobile.png'),
  body('The three-column layout collapses to a single mid pane correctly -- the map fills the available width. The header stack (UKCP logo row + UK Citizens Portal / Log out row) consumes approximately 15% of the 844px height before any content appears. The map overlay controls (place-type pills, political toggles, crumb trail) are all rendered on top of the map, creating significant visual density. The six-tab strip (Groups, News, Local Traders, Civic, Map, Info) overflows horizontally with no scroll indicator -- tabs beyond Civic may not be discoverable. The green and blue drawer handles float at mid-height over the map and partially obscure the zoom controls.'),
  gap(),

  h1('2.2 My Home -- Mobile'),
  img('2_2_my_home____mobile.png'),
  body('The identity strip, reach selector (Ward / Constituency / County / Region / National), and filter row are all visible and readable. The left panel (MyIncludes -- followed entities driving the feed) and right panel (MyMeta -- notifications and counts) are both entirely hidden behind unlabelled drawer handles. The green >> and blue << handles carry no tooltip or label explaining their purpose. A user landing here for the first time has no indication that personalisation controls exist or how to access them. The feed area shows "No posts here yet" against the background image, which bleeds into the content area rather than being contained to a designated zone.'),
  gap(),

  h1('2.3 People -- Mobile'),
  img('2_3_people____mobile.png'),
  body('The member list renders correctly and is readable. The primary layout problem is the green >> drawer handle, which sits at mid-height and directly overlaps the test1-phild member row, making it appear as though the handle is a control attached to that specific row rather than a global navigation element. The blue << handle on the right creates a similar alignment with the CITIZEN badge column. No search or filter controls are visible -- if they exist they are in a hidden panel with no affordance.'),
  gap(),

  h1('2.4 Profile -- Mobile'),
  img('2_4_profile____mobile.png'),
  body('Profile content (civic footprint, followed schools, joined forums, memberships) is readable and fits the single-column layout adequately. The drawer handles appear at mid-height overlapping the content list -- on a page with no obvious left/right navigation need their presence is confusing and looks like a layout error. The Your profile heading and section labels render at appropriate sizes. No critical content is clipped.'),
  gap(),

  h1('3. Data Manager -- Mobile'),
  img('3__data_manager____mobile.png'),
  body('The Data Manager tab strip (Geo Content, System, Access, Locations, Users) renders across the full width and fits without overflow at this viewport. The content area shows the Geo Content tab with search, filter pills, and a ranked location list -- all readable. The right-side contextual label "Select location to edit" is partially obscured by the blue drawer handle, cutting off the instructional text. Score badges (e.g. 6/10, 5/10) on list items are visible but tight against the handle.'),
  gap(),

  h2('3.1 Locations Tab -- Mobile'),
  img('3_1_locations_tab____mobile.png'),
  body('The Locations tab shows search, three stacked filter dropdowns (country, type, field filter), a place list, and pagination. The stacked filters consume significant vertical height before any results appear. Pagination numerics (1, 2, 3, 4, 5 ... 1085) are visible and tappable. The right drawer handle again overlaps the Select location to edit guidance text. No critical data is inaccessible but the filter layout is dense for a mobile form factor.'),
  gap(),

  h1('4.1 Acton -- Map Tab -- Mobile'),
  img('4_1_acton____map_tab____mobile.png'),
  body('NOTE: search located Acton within Ealing Central and Acton constituency -- the crumb resolves to Outer London, not a named Town node. The map at place level is significantly denser than at country level: place-type pills, political boundary toggles, zoom controls, and the crumb strip all occupy the map surface simultaneously. On 390px the map is reduced to a narrow functional strip with controls competing for the same space. The drawer handles add further clutter. Navigation to this level requires opening the drawer, searching, and selecting a result -- three steps with no persistent affordance.'),
  gap(),

  h1('5.1 Groups -- Mobile'),
  img('5_1_groups____mobile.png'),
  body('At place level the layout splits into a persistent map panel above and the tab content below. The map consumes roughly 35% of the viewport height, leaving approximately 550px for the tab panel. The Groups tab content (No groups at this location yet; No local spaces at this location yet) fits within the remaining space. The crumb trail (UK > England > London > Outer London > Ealing Central and Acton) wraps to two lines which is acceptable. The six-tab strip at this level also has no scroll affordance.'),
  gap(),

  h1('5.2 News -- Mobile'),
  img('5_2_news____mobile.png'),
  body('The News tab shows Local and Regional sections with placeholder items marked COMING SOON. Content fits within the available panel height without overflow. The persistent map above the tabs remains unchanged -- there is no way to collapse or dismiss it on mobile. Placeholder labels appear beneath news headline text, indicating test records -- not a layout problem but visible in the audit.'),
  gap(),

  h1('5.3 Local Traders -- Mobile'),
  img('5_3_local_traders____mobile.png'),
  body('The Local Traders tab adds a category filter pill row (All, Food & Drink, Health, Services, Retail, Trades) beneath the tab strip. Seven pills across approximately 360px of usable width (accounting for drawer handles) are tight but visible. A Register your business CTA card appears above the trader list, consuming significant height before content begins. Two trader listings are visible. The right drawer handle overlaps the rightmost pill (Trades) at the edge of the filter row.'),
  gap(),

  h1('5.4 Info -- Mobile'),
  img('5_4_info____mobile.png'),
  body('The Info tab renders the MP card (Dr Rupa Huq, LABOUR, with photo, constituency name, and population figure) alongside an embedded mini constituency map. The MP photo and label are legible. The right drawer handle overlaps the right edge of the constituency mini-map, clipping its boundary. Population and constituency data are readable. This is one of the better-performing tabs on mobile -- content density is appropriate and the card layout suits the single-column constraint.'),
  gap(),

  // Section 8 -- text only
  h1('Section 8 -- Notes for Agents'),
  body('Viewport: 390 x 844 (iPhone 14 equivalent, portrait)'),
  body('Date: 2026-05-07'),
  body('User account: phild@btltd.net (ADMIN/CITIZEN role)'),
  body('Local server: https://localhost:3443 (Express production build)'),
  gap(),
  new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text: 'Overall assessment: DEGRADED', bold: true, size: 20, font: 'Arial' })],
  }),
  body('The app is functional at this viewport -- no routes are completely inaccessible and no critical content is fully clipped. The layout is a mechanical port of the desktop three-column design rather than a considered mobile experience. Several problems impair usability.'),
  gap(),
  new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: 'Most significant problems:', bold: true, size: 20, font: 'Arial' })],
  }),
  body('1. Drawer handles have no label or affordance. The green >> and blue << handles appear on every page at mid-height, overlapping content rows. On People and Profile they look like controls attached to specific list items. Users have no indication what is inside the drawers or that they are navigation triggers. This is the single largest usability problem at this viewport.'),
  body('2. Map dominates at place level. On Locations tabs (Groups, News, Traders, Info), the Leaflet map occupies 35-40% of the viewport height with no way to dismiss or minimise it. At town level the data tabs are more important and the persistent map wastes screen real estate.'),
  body('3. Tab strip overflow not signalled. MidPaneTabs has six entries in a 390px container. The strip scrolls horizontally but there is no fade, pip, or arrow to indicate that tabs exist beyond the visible set. Map and Info tabs may not be discovered.'),
  body('4. My Home left panel invisible without discovery. MyIncludes (followed entities driving the feed) is hidden with no label on the handle. A first-time user sees an empty feed with no obvious personalisation path.'),
  body('5. Right drawer handle clips Data Manager guidance. The Select location to edit text is partially hidden behind the blue handle on both Geo Content and Locations tabs.'),
  body('6. Header row height. The two-row header (UKCP logo + icons; UK Citizens Portal text + Log out) takes roughly 90-100px before content begins. The second row adds little value on mobile and could be consolidated.'),
  gap(),
  body('Controls completely inaccessible at this width: None -- all content is reachable via the drawer mechanism, but the handles are the only affordance and they are unlabelled.'),
]

const doc = new Document({
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children,
  }],
})

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf)
  console.log(`Written: ${OUT} (${(buf.length / 1024).toFixed(0)} KB)`)
}).catch(e => { console.error(e.message); process.exit(1) })
