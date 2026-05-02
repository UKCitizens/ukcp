/**
 * @file playwright.config.js
 * @description Sprint test runner config.
 *
 * Targets the local HTTPS Express server on :3443 (cert.pem + key.pem).
 * Self-signed cert is ignored. Single worker with serial execution because
 * tests share Phil's real user account in Mongo and clean state between runs.
 *
 * Run:
 *   npm run start          (separate terminal — keeps :3443 alive)
 *   npm run test:sprint
 */

import { defineConfig } from '@playwright/test'
import 'dotenv/config'

export default defineConfig({
  testDir:  './tests',
  timeout:  30_000,
  workers:  1,
  fullyParallel: false,
  reporter: [['list']],

  use: {
    baseURL:           'https://localhost:3443',
    ignoreHTTPSErrors: true,
    headless:          true,
    trace:             'retain-on-failure',
    video:             'retain-on-failure',
    screenshot:        'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use:  { browserName: 'chromium' },
    },
  ],
})
