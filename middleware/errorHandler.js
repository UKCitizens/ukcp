/**
 * @file middleware/errorHandler.js
 * @description Central Express error handler. Must be registered last in
 * server.js (after all routes) via app.use(errorHandler).
 *
 * Classifies errors into known categories, returns a structured JSON response
 * to the client, and logs the full error server-side. The client receives
 * enough information to handle the error gracefully without exposing internals.
 *
 * Error categories:
 *   DUPLICATE    - MongoDB E11000 duplicate key (409)
 *   UNAVAILABLE  - MongoDB network/topology error (503)
 *   AUTH         - Explicit 401 set upstream (401)
 *   FORBIDDEN    - Explicit 403 set upstream (403)
 *   VALIDATION   - Bad input, explicit 400 set upstream (400)
 *   NOT_FOUND    - Explicit 404 set upstream (404)
 *   INTERNAL     - Everything else (500)
 *
 * Client response shape:
 *   { error: string, code: string, message: string }
 *
 * Logging:
 *   All errors logged to console.error with timestamp, method, path, and
 *   stack trace. Replace console.error with a structured logger when needed.
 */

// Map error category codes to HTTP status and user-facing messages.
const ERROR_MAP = {
  DUPLICATE:   { status: 409, message: 'A conflict occurred. Please try again.' },
  UNAVAILABLE: { status: 503, message: 'Service temporarily unavailable. Please try again shortly.' },
  AUTH:        { status: 401, message: 'Authentication required.' },
  FORBIDDEN:   { status: 403, message: 'You do not have permission to do that.' },
  VALIDATION:  { status: 400, message: 'Invalid request.' },
  NOT_FOUND:   { status: 404, message: 'Resource not found.' },
  INTERNAL:    { status: 500, message: 'An unexpected error occurred.' },
}

/**
 * Classifies an error into one of the known categories.
 *
 * @param {Error} err
 * @returns {string} Category key from ERROR_MAP
 */
function classify(err) {
  // MongoDB duplicate key
  if (err.code === 11000) return 'DUPLICATE'

  // MongoDB network / topology failure
  if (
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoTopologyClosedError' ||
    (err.message && err.message.toLowerCase().includes('topology was destroyed'))
  ) return 'UNAVAILABLE'

  // Explicit status codes set upstream (e.g. middleware returning res.status(401))
  // These should not normally reach here but handle defensively.
  const status = err.status ?? err.statusCode
  if (status === 401) return 'AUTH'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 400) return 'VALIDATION'
  if (status === 503) return 'UNAVAILABLE'

  // Mongoose / express-validator style validation errors
  if (err.name === 'ValidationError') return 'VALIDATION'

  return 'INTERNAL'
}

/**
 * Central Express error handler.
 * Four-argument signature is required for Express to recognise it as an
 * error handler. Do not remove the unused `next` parameter.
 *
 * @param {Error}           err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next  // required by Express -- do not remove
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const category = classify(err)
  const { status, message } = ERROR_MAP[category]

  // Full server-side log -- stack trace included for debugging.
  console.error(
    `[${new Date().toISOString()}] ERROR ${status} ${category}`,
    `${req.method} ${req.originalUrl}`,
    err.stack ?? err.message ?? err
  )

  // Structured response -- no internal detail exposed to client.
  res.status(status).json({
    error:   category,
    code:    status,
    message,
  })
}
