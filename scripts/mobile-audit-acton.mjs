/**
 * @file scripts/mobile-audit-acton.mjs
 * @description Section 4+5 of mobile audit -- Acton drill-down at 390x844.
 * Run: node scripts/mobile-audit-acton.mjs
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
  await page.waitForTimeout(600)
  await page.screenshot({ path: file, fullPage: true })
  console.log(`SHOT: ${label}`)
  return file
}

async function run() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
  })
  const page = await context.newPage()

  // Login
  const loginLink = await generateLink(`${BASE}/locations`)
  await page.goto(loginLink, { waitUntil: 'domcontentloaded' })
  await page.waitForURL(/\/locations/, { timeout: 15000 })
  await page.waitForTimeout(2500)

  // Click left handle (Open left panel)
  const leftHandle = page.locator('[aria-label="Open left panel"]')
  await leftHandle.waitFor({ state: 'visible', timeout: 5000 })
  await leftHandle.click()
  // Wait for drawer CSS transition (0.22s) + render
  await page.waitForTimeout(600)

  // Debug: screenshot with drawer open
  await shot(page, 'DEBUG -- left drawer open')

  // The search input is inside the drawer (.drawerContent) -- use CSS selector
  // The drawer uses overflow:hidden on wrapper, but once open translateX(0) it's in bounds
  const drawerInput = page.locator('[class*="drawerContent"] input[placeholder*="Search"]').first()

  // Check if visible; if not, use force
  const isVisible = await drawerInput.isVisible().catch(() => false)
  console.log('drawer input visible:', isVisible)

  if (isVisible) {
    await drawerInput.fill('Acton')
  } else {
    // Force fill via JS
    await page.evaluate(() => {
      const drawers = document.querySelectorAll('[class*="drawerContent"] input')
      if (drawers.length > 0) {
        const inp = drawers[0]
        inp.value = 'Acton'
        inp.dispatchEvent(new Event('input', { bubbles: true }))
        inp.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })
  }
  await page.waitForTimeout(1500)
  await shot(page, 'DEBUG -- search results for Acton')

  // Try clicking any result that mentions Acton (within the drawer)
  const actonResult = page.locator('[class*="drawerContent"]').locator('text=/Acton/').first()
  const actonCount = await actonResult.count()
  console.log('Acton results found:', actonCount)

  if (actonCount > 0) {
    await actonResult.click({ force: true })
    await page.waitForTimeout(2500)
    // Close the drawer
    await page.locator('[aria-label="Close panel"]').first().click({ force: true }).catch(() => {})
    await page.waitForTimeout(500)
  } else {
    console.log('WARN: no Acton result found in drawer -- taking screenshot of current state')
  }

  // 4.1 Acton Map Tab
  await shot(page, '4.1 Acton -- Map Tab -- Mobile')

  // Tabs are plain <button> elements (no role="tab") in MidPaneTabs.jsx
  const tabs = [
    { text: 'Groups',        label: '5.1 Groups -- Mobile' },
    { text: 'News',          label: '5.2 News -- Mobile' },
    { text: 'Local Traders', label: '5.3 Local Traders -- Mobile' },
    { text: 'Info',          label: '5.4 Info -- Mobile' },
  ]

  for (const t of tabs) {
    const tab = page.locator('button').filter({ hasText: new RegExp(`^${t.text}$`) }).first()
    const count = await tab.count()
    console.log(`Tab "${t.text}" count: ${count}`)
    if (count > 0) {
      await tab.click()
      await page.waitForTimeout(1200)
      await shot(page, t.label)
    } else {
      // Fallback: any element with this text
      const fallback = page.locator(`text="${t.text}"`).first()
      if (await fallback.count() > 0) {
        await fallback.click()
        await page.waitForTimeout(1200)
        await shot(page, t.label)
      } else {
        console.log(`SKIP: ${t.label}`)
      }
    }
  }

  await browser.close()
  console.log(`\nDone. All shots in: ${SHOT_DIR}`)
}

run().catch(e => { console.error(e.message); process.exit(1) })
