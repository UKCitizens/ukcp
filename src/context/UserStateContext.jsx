/**
 * @file UserStateContext.jsx
 * @description Surfaces the user's current app context to the header strip.
 *
 * Stores two short labels:
 *   scopeLabel         — current geo position e.g. 'Liverpool' or 'UK'
 *   activeNetworkLabel — current network mode label e.g. 'School Gates' (empty when none)
 *
 * Locations.jsx writes here on every relevant state change. SiteHeaderRow1
 * reads from here. AuthContext supplies the user identity separately.
 *
 * Kept deliberately minimal — this is presentation context, not application
 * state. The session snapshot and user_follows collections own the durable
 * record of what the user is doing.
 */

import { createContext, useContext, useState, useCallback } from 'react'

const UserStateContext = createContext(null)

export function UserStateProvider({ children }) {
  const [scopeLabel,         setScopeLabel]         = useState('')
  const [activeNetworkLabel, setActiveNetworkLabel] = useState('')

  /**
   * Patch one or both labels. Pass undefined to leave a field unchanged.
   * @param {{ scope?: string, network?: string }} args
   */
  const updateUserState = useCallback(({ scope, network }) => {
    if (scope   !== undefined) setScopeLabel(scope)
    if (network !== undefined) setActiveNetworkLabel(network)
  }, [])

  return (
    <UserStateContext.Provider value={{ scopeLabel, activeNetworkLabel, updateUserState }}>
      {children}
    </UserStateContext.Provider>
  )
}

export function useUserState() {
  const ctx = useContext(UserStateContext)
  if (!ctx) throw new Error('useUserState must be used inside UserStateProvider')
  return ctx
}
