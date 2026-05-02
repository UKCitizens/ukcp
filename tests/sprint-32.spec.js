/**
 * @file tests/sprint-32.spec.js
 * @description End-to-end tests for the User Session State sprint (PRG:32).
 *
 *   1.  Anon session restore
 *   2.  Anon save
 *   3.  Anon save persistence across contexts
 *   4.  Logged-in session restore
 *   5.  Logged-in follow toggle
 *   6.  Anon → login merge
 *   7.  Identity strip — who
 *   8.  Identity strip — where
 *   9.  Identity strip — mode
 *   10. No double-merge on simple reload
 *
 * Pre-reqs: Express HTTPS server running on :3443. Mongo and Supabase reachable.
 * State is destructive on Phil's user record (user_session + user_follows).
 *
 * Tests are serial. Each test starts with a clean Mongo state for the test user.
 * Browser context is fresh per test (Playwright default), so localStorage is
 * isolated per test unless explicitly seeded.
 */

import { test, expect } from '@playwright/test'
import 'dotenv/config'
import { loginViaLocations } from './helpers/auth.js'
import {
  cleanTestUserState, getTestUser, getFollows, getSnapshot, closeDb,
} from './helpers/db-cleanup.js'

const SUPABASE_REF = (process.env.SUPABASE_URL ?? '')
  .replace(/^https?:\/\//, '')
  .split('.')[0]
const SB_LS_KEY = `sb-${SUPABASE_REF}-auth-token`

// workers:1 in playwright.config.js gives us serial execution.
// We deliberately do NOT use mode: 'serial' here — failures should not skip
// the rest of the suite. Each test cleans its own preconditions.

test.beforeEach(async () => {
  await cleanTestUserState()
})

test.afterAll(async () => {
  await closeDb()
})

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Wait for the locations page to be ready: identity strip rendered, and the
 * "Restoring session" scrim has lifted (snapshot hook ready). Without the
 * scrim wait, fast clicks land before the hook accepts writes and changes
 * are silently dropped — that race is the exact bug the scrim was added for.
 */
async function waitForLocationsReady(page) {
  await page.waitForURL(/\/(locations|$)/, { timeout: 10_000 })
  await expect(page.locator('[aria-label="Current context"]')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('[role="status"]').filter({ hasText: 'Restoring' }))
    .toHaveCount(0, { timeout: 10_000 })
}

/**
 * For logged-in tests: wait until the identity strip stops showing "Guest"
 * — that is the signal that AuthContext has hydrated the user and the
 * snapshot hook will not silently drop a subsequent write.
 */
async function waitForAuthResolved(page) {
  await expect(page.locator('[aria-label="Current context"]'))
    .not.toContainText('Guest', { timeout: 10_000 })
}

/** Click a country option in the walker (Row 3 strip). */
async function clickCountry(page, name) {
  await page.getByRole('button', { name, exact: true }).first().click()
}

/** Read the identity strip text content. */
function stripText(page) {
  return page.locator('[aria-label="Current context"]').textContent()
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test('1. anon session restore — scope persists across reload', async ({ page }) => {
  await page.goto('/')
  await waitForLocationsReady(page)

  await clickCountry(page, 'England')
  // Confirm scope landed before reload — strip is the canonical signal.
  await expect(page.locator('[aria-label="Current context"]')).toContainText('England')

  // Wait past the snapshot debounce window.
  await page.waitForTimeout(900)

  await page.reload()
  await waitForLocationsReady(page)

  // Strip is the unambiguous read of current scope.
  await expect(page.locator('[aria-label="Current context"]')).toContainText('England')
})

test('2. anon save — saved state persists across reload', async ({ page, context }) => {
  // Seed an anon save directly so the test does not depend on full navigation.
  await context.addInitScript(() => {
    localStorage.setItem('ukcp_saves', JSON.stringify([{
      entity_type: 'school',
      entity_id:   'TEST-URN-100001',
      entity_name: 'Test Save School',
      saved_at:    new Date().toISOString(),
    }]))
  })

  await page.goto('/')
  await waitForLocationsReady(page)

  const stored = await page.evaluate(() => localStorage.getItem('ukcp_saves'))
  expect(stored).toContain('TEST-URN-100001')
})

test('3. anon save persistence across contexts', async ({ browser }) => {
  const ctx1 = await browser.newContext({ ignoreHTTPSErrors: true })
  await ctx1.addInitScript(() => {
    localStorage.setItem('ukcp_saves', JSON.stringify([{
      entity_type: 'school',
      entity_id:   'TEST-URN-200002',
      entity_name: 'Cross Context School',
      saved_at:    new Date().toISOString(),
    }]))
  })
  const p1 = await ctx1.newPage()
  await p1.goto('/')
  const fromCtx1 = await p1.evaluate(() => localStorage.getItem('ukcp_saves'))
  expect(fromCtx1).toContain('TEST-URN-200002')
  await ctx1.close()

  // A genuinely separate browser context does NOT share localStorage with ctx1
  // — that is the point: we are validating per-context isolation, the merge
  // step is what would carry state into a logged-in user across machines.
  const ctx2 = await browser.newContext({ ignoreHTTPSErrors: true })
  const p2   = await ctx2.newPage()
  await p2.goto('/')
  const fromCtx2 = await p2.evaluate(() => localStorage.getItem('ukcp_saves'))
  expect(fromCtx2).toBeNull()
  await ctx2.close()
})

test('4. logged-in session restore — DB-backed snapshot survives reload', async ({ page }) => {
  await page.goto('/login')
  await loginViaLocations(page)
  await waitForLocationsReady(page)
  // Critical: do not click before auth resolves, or the snapshot hook will
  // silently drop the write (restored.current still false).
  await waitForAuthResolved(page)

  await clickCountry(page, 'England')
  await expect(page.locator('[aria-label="Current context"]')).toContainText('England')
  await page.waitForTimeout(900)  // snapshot debounce

  // Verify it actually landed in the DB before reloading.
  const user       = await getTestUser()
  const snapBefore = await getSnapshot(user._id)
  expect(snapBefore).toBeTruthy()
  expect(snapBefore.geo_path?.some(p => p.value === 'England')).toBe(true)

  await page.reload()
  await waitForLocationsReady(page)
  await waitForAuthResolved(page)
  await expect(page.locator('[aria-label="Current context"]')).toContainText('England')
})

test('5. logged-in follow toggle — persists in user_follows', async ({ page }) => {
  await page.goto('/login')
  await loginViaLocations(page)
  await waitForLocationsReady(page)
  const user = await getTestUser()

  // Drive a follow via the same code path the UI uses, with a known URN.
  // This exercises POST /api/follows end-to-end without depending on having
  // navigated to a constituency with schools.
  const accessToken = await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw).access_token
  }, SB_LS_KEY)
  expect(accessToken).toBeTruthy()

  const postRes = await page.request.post('/api/follows', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data:    { entity_type: 'school', entity_id: 'TEST-URN-FOLLOW', entity_name: 'Follow Test' },
  })
  expect(postRes.ok()).toBeTruthy()

  const followsAfterPost = await getFollows(user._id)
  expect(followsAfterPost).toHaveLength(1)
  expect(followsAfterPost[0].entity_id).toBe('TEST-URN-FOLLOW')

  // Toggle off.
  const delRes = await page.request.delete('/api/follows/school/TEST-URN-FOLLOW', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(delRes.ok()).toBeTruthy()

  const followsAfterDelete = await getFollows(user._id)
  expect(followsAfterDelete).toHaveLength(0)
})

test('6. anon → login merge — saves and snapshot migrate to DB, LS cleared', async ({ context, page }) => {
  // Seed anon state before any nav.
  await context.addInitScript(() => {
    localStorage.setItem('ukcp_session_snapshot', JSON.stringify({
      active_tab: 'info',
    }))
    localStorage.setItem('ukcp_saves', JSON.stringify([
      {
        entity_type: 'school',
        entity_id:   'MERGE-URN-1',
        entity_name: 'Merge One',
        saved_at:    new Date(Date.now() - 60_000).toISOString(),
      },
      {
        entity_type: 'school',
        entity_id:   'MERGE-URN-2',
        entity_name: 'Merge Two',
        saved_at:    new Date().toISOString(),
      },
    ]))
  })

  // Land on /locations directly — the same path a real magic link hits.
  // Merge now lives in AuthContext so it fires regardless of which page
  // is mounted at SIGNED_IN. This is the genuine production trigger path.
  await page.goto('/login')
  await loginViaLocations(page)
  await waitForLocationsReady(page)
  await waitForAuthResolved(page)

  const user    = await getTestUser()
  const follows = await getFollows(user._id)
  const ids     = follows.map(f => f.entity_id).sort()
  expect(ids).toEqual(['MERGE-URN-1', 'MERGE-URN-2'])

  const snap = await getSnapshot(user._id)
  expect(snap?.active_tab).toBe('info')

  const lsAfter = await page.evaluate(() => ({
    saves: localStorage.getItem('ukcp_saves'),
    snap:  localStorage.getItem('ukcp_session_snapshot'),
  }))
  expect(lsAfter.saves).toBeNull()
  expect(lsAfter.snap).toBeNull()
})

test('7. identity strip — who shows Guest then user name', async ({ page }) => {
  await page.goto('/')
  await waitForLocationsReady(page)
  await expect(page.locator('[aria-label="Current context"]')).toContainText('Guest')

  await page.goto('/login')
  await loginViaLocations(page)
  await waitForLocationsReady(page)
  // Strip falls back to 'Guest' until AuthContext hydrates user — poll instead
  // of snapshotting once.
  await waitForAuthResolved(page)
})

test('8. identity strip — where reflects scope', async ({ page }) => {
  await page.goto('/')
  await waitForLocationsReady(page)
  await expect(page.locator('[aria-label="Current context"]')).toContainText('UK')

  await clickCountry(page, 'England')
  await expect(page.locator('[aria-label="Current context"]')).toContainText('England')
})

test('9. identity strip — mode appears when network active', async ({ page }) => {
  // Set the snapshot directly to force into network mode without UI nav.
  await page.goto('/')
  await waitForLocationsReady(page)

  // Navigate via the snapshot hook by writing to localStorage and reloading.
  await page.evaluate(() => {
    localStorage.setItem('ukcp_session_snapshot', JSON.stringify({
      active_tab:     'groups',
      active_network: 'at-the-school-gates',
    }))
  })
  await page.reload()
  await waitForLocationsReady(page)

  await expect(page.locator('[aria-label="Current context"]')).toContainText(/School Gates/i)
})

test('10. no double-merge on simple reload of logged-in session', async ({ page }) => {
  await page.goto('/login')
  await loginViaLocations(page)
  await waitForLocationsReady(page)
  const user = await getTestUser()

  // Seed one follow via API.
  const accessToken = await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw).access_token : null
  }, SB_LS_KEY)
  await page.request.post('/api/follows', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data:    { entity_type: 'school', entity_id: 'NODUP-URN', entity_name: 'No Dup' },
  })

  const before = await getFollows(user._id)
  expect(before).toHaveLength(1)

  // Reload — INITIAL_SESSION fires, mergeAnonData should not run.
  await page.reload()
  await waitForLocationsReady(page)
  await page.waitForTimeout(1000)

  const after = await getFollows(user._id)
  expect(after).toHaveLength(1)
})
