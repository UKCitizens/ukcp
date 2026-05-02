/**
 * @file tests/helpers/auth.js
 * @description Test login via Supabase admin generateLink.
 *
 * Bypasses the email round-trip: server-side admin generates a magic link
 * that points back at our app. Playwright navigates to that URL directly,
 * Supabase verifies the token in-page and a session is established. After
 * SIGNED_IN fires, the app redirects to /locations.
 *
 * Two flavours:
 *   loginViaLogin(page)     — redirects through /login so Home.jsx's
 *                             SIGNED_IN listener runs (used for the merge test).
 *   loginViaLocations(page) — redirects directly to /locations (faster; used
 *                             for tests that just need a session, no merge).
 *
 * No password is set on the user account. The link is single-use and expires.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TEST_EMAIL = process.env.DEX_TEST_EMAIL ?? 'phild@btltd.net'
const BASE_URL   = 'https://localhost:3443'

async function generateAndNavigate(page, redirectTo) {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type:    'magiclink',
    email:   TEST_EMAIL,
    options: { redirectTo },
  })
  if (error) throw new Error(`generateLink: ${error.message}`)

  const link = data?.properties?.action_link
  if (!link) throw new Error('generateLink returned no action_link')

  await page.goto(link)
  await page.waitForURL(/\/locations/, { timeout: 15_000 })
}

export async function loginViaLocations(page) {
  await generateAndNavigate(page, `${BASE_URL}/locations`)
}

export async function loginViaLogin(page) {
  await generateAndNavigate(page, `${BASE_URL}/login`)
}

export function getTestEmail() {
  return TEST_EMAIL
}
