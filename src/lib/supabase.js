/**
 * @file supabase.js
 * @description Supabase client for client-side auth operations.
 * Uses the anon key -- safe to expose in browser code.
 */

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { flowType: 'implicit', persistSession: false } }
)
