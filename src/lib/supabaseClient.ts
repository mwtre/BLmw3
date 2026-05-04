import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const enabledFlag = (import.meta.env.VITE_SUPABASE_SYNC_ENABLED as string | undefined) ?? '';

export const supabaseEnabled =
  Boolean(url && anonKey) && enabledFlag.toLowerCase() !== 'false' && enabledFlag !== '0';

export const supabase = supabaseEnabled
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

