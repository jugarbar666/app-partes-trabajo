import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const OFFICIAL_SUPABASE_URL = 'https://rjrfbkflzocyjnlsswfq.supabase.co';
export const OFFICIAL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqcmZia2Zsem9jeWpubHNzd2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODMxNjksImV4cCI6MjEwODI1OTE2OX0.AW0CBG_-s2K9SG1q45EmOgtNfcO00_IFSyMt2zLNL_g';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || OFFICIAL_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || OFFICIAL_SUPABASE_ANON_KEY;
const forceLocalEngine = import.meta.env.VITE_ENABLE_LOCAL_ENGINE === 'true';

export const isRemoteSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('tu-proyecto-empresa') &&
    !forceLocalEngine
);

export const supabaseClient: SupabaseClient | null = isRemoteSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;
