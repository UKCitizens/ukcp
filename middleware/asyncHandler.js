/**
 * @file middleware/asyncHandler.js
 * @description Wraps an async Express route handler so any thrown error is
 * forwarded to next(err) rather than becoming an unhandled rejection.
 *
 * Express 4 does not catch async errors natively. Without this wrapper,
 * any thrown or rejected promise in a route handler bypasses the central
 * error handler and risks crashing the process.
 *
 * Usage:
 *   import { asyncHandler } from '../middleware/asyncHandler.js'
 *   router.get('/path', asyncHandler(async (req, res) => { ... }))
 *
 * Apply to every async route handler. Sync handlers do not need wrapping.
 */

/**
 * @param {Function} fn - Async route handler (req, res, next) => Promise
 * @returns {Function} Express middleware that catches rejections and calls next(err)
 */
export const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)
