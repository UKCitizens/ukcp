/**
 * @file config.js
 * @description API base URL — empty string in development (relative paths via Vite proxy),
 * full Railway URL in production via VITE_API_URL env var.
 */

const API_BASE = import.meta.env.VITE_API_URL || ''
export default API_BASE
