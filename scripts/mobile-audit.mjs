/**
 * @file scripts/mobile-audit.mjs
 * @description Mobile UI audit -- 390x844 viewport, phild account via generateLink.
 * Saves screenshots to scripts/audit-shots/ then exits.
 * Run: node scripts/mobile-audit.mjs
 */

import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SHOT_DIR = path.join(__dirname, 'audit-shots')
const BASE = 'https://localhost:3443'
const EMAIL = 'phild@btltd.net'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://wmvyimeirfmzytnhfkik.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function generateLink(redirectTo) {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: EMAIL,
    options: { redirectTo },
  })
  if (error) throw new Error(`generateLink: ${error.message}`)
  return data.properties.action_link
}

async function shot(page, label) {
  const safe = label.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const file = path.join(SHOT_DIR, `${safe}.png`)
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
  await page.screenshot({ path: file, fullPage: true })
  console.log(`SHOT: ${label} -> ${file}`)
  return file
}

async function run() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
  })

  // --- Section 1: Unauthenticated sign-in page ---
  const page = await context.newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await shot(page, '1.1 Sign-In -- Mobile')

  // --- Login via magic link ---
  const loginLink = await generateLink(`${BASE}/locations`)
  await page.goto(loginLink, { waitUntil: 'domcontentloaded' })
  await page.waitForURL(/\/locations/, { timeout: 15000 })
  await page.waitForTimeout(2000)

  // --- Section 2: Locations -- Map Tab ---
  await shot(page, '2.1 Locations -- Map Tab -- Mobile')

  // --- Section 3: My Home ---
  await page.goto(`${BASE}/myhome`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  await shot(page, '2.2 My Home -- Mobile')

  // --- Section 4: People ---
  await page.goto(`${BASE}/people`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  await shot(page, '2.3 People -- Mobile')

  // --- Section 5: Profile ---
  await page.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  await shot(page, '2.4 Profile -- Mobile')

  // --- Section 6: Data Manager (Settings) ---
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  await shot(page, '3. Data Manager -- Mobile')
  // Click Locations tab inside settings
  const locTab = page.getByRole('tab', { name: /locations/i })
  if (await locTab.count() > 0) {
    await locTab.click()
    await page.waitForTimeout(1000)
    await shot(page, '3.1 Locations Tab -- Mobile')
  } else {
    console.log('SKIP: Locations tab not found in settings')
    fs.writeFileSync(path.join(SHOT_DIR, '3_1_locations_tab__mobile_SKIP.txt'), 'Tab not found')
  }

  // --- Section 7: Acton (Town) drill-down ---
  // Navigate to Locations, then drill down to Acton
  await page.goto(`${BASE}/locations`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  // Try to find Acton by navigating the hierarchy or direct URL
  // Try /locations/acton or search approach
  const searchInput = page.getByPlaceholder(/search/i).or(page.getByRole('textbox')).first()
  if (await searchInput.count() > 0) {
    await searchInput.click()
    await searchInput.fill('Acton')
    await page.waitForTimeout(1500)
    const actonResult = page.getByText('Acton', { exact: false }).first()
    if (await actonResult.count() > 0) {
      await actonResult.click()
      await page.waitForTimeout(2000)
    }
  }
  await shot(page, '4.1 Acton -- Map Tab -- Mobile')

  // Mid-pane tabs: Groups, News, Local Traders, Info
  const tabLabels = [
    { name: /groups/i,         label: '5.1 Groups -- Mobile' },
    { name: /news/i,           label: '5.2 News -- Mobile' },
    { name: /local traders/i,  label: '5.3 Local Traders -- Mobile' },
    { name: /info/i,           label: '5.4 Info -- Mobile' },
  ]
  for (const { name, label } of tabLabels) {
    const tab = page.getByRole('tab', { name }).or(page.getByText(name)).first()
    if (await tab.count() > 0) {
      await tab.click()
      await page.waitForTimeout(1000)
      await shot(page, label)
    } else {
      console.log(`SKIP: tab not found: ${label}`)
      fs.writeFileSync(path.join(SHOT_DIR, label.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_SKIP.txt'), 'Tab not found')
    }
  }

  await browser.close()
  console.log(`\nAll screenshots saved to: ${SHOT_DIR}`)
  console.log('SHOT_DIR_PATH:' + SHOT_DIR)
}

run().catch(e => { console.error(e); process.exit(1) })
