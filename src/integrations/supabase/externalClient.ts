import { createClient } from '@supabase/supabase-js';

// Hardcoded congressOS project
const EXTERNAL_URL = 'https://yqusqfdaikkvvjflgmmh.supabase.co';
const EXTERNAL_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY || '';

// Safe init — won't crash if key is empty (queries will just fail gracefully)
export const externalSupabase = EXTERNAL_KEY
  ? createClient(EXTERNAL_URL, EXTERNAL_KEY)
  : null;

export const EXTERNAL_PROJECT_URL = EXTERNAL_URL;
export const hasValidKey = !!EXTERNAL_KEY;
