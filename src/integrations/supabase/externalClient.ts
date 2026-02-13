import { createClient } from '@supabase/supabase-js';

// Hardcoded congressOS project credentials (publishable anon key)
const EXTERNAL_URL = 'https://yqusqfdaikkvvjflgmmh.supabase.co';
const EXTERNAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdXNxZmRhaWtrdnZqZmxnbW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDMxNzYsImV4cCI6MjA4MjY3OTE3Nn0.nWRj48zSZxz5qUK_wkV3PKbkG969rdpsbQ8OAWdBESk';

export const externalSupabase = createClient(EXTERNAL_URL, EXTERNAL_KEY);
export const EXTERNAL_PROJECT_URL = EXTERNAL_URL;
export const hasValidKey = true;
