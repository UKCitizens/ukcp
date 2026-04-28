/**
 * @file config/constants.js
 * @description Shared constants used across route modules.
 *
 * Centralising these prevents drift when adding new content types -- one edit
 * here propagates to all routes that validate or switch on content type.
 */

/**
 * The full set of content types the server accepts for content and admin routes.
 * Any type not in this set is rejected with a 400.
 */
export const ALLOWED_CONTENT_TYPES = new Set([
  'country', 'region', 'county', 'city', 'town', 'village', 'hamlet', 'constituency', 'ward',
])

/** Device cookie name -- shared between deviceCookie middleware and auth routes. */
export const DEVICE_COOKIE_NAME    = 'ukcp_device'

/** Device cookie max age in milliseconds (1 year). */
export const DEVICE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000
