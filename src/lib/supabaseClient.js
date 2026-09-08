import { createClient } from '@supabase/supabase-js';

// Supabase is used by KAYAD's frontend only for Realtime infrastructure.
// Authentication is owned by the KAYAD backend and its HttpOnly cookie/JWT
// contract. Do not call supabase.auth.* here: that would create a second,
// unrelated browser authentication session.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingSupabaseConfig = !supabaseUrl || !supabaseAnonKey;
if (missingSupabaseConfig && import.meta.env.PROD) {
  throw new Error('[KAYAD] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for Realtime in production.');
}

const safeUrl = supabaseUrl || 'http://127.0.0.1:54321';
const safeKey = supabaseAnonKey || 'development-only-missing-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
  global: {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  },
});

export default supabase;
