/**
 * @file Register.jsx
 * @description Retired. Registration is now handled by LoginModal (Register tab).
 * This route redirects to / where the modal handles the flow.
 */

import { Navigate } from 'react-router-dom'

export default function Register() {
  return <Navigate to="/" replace />
}
