import { createClient } from '@supabase/supabase-js';
import { safeStorage } from './safeStorage';

const SUPABASE_URL = 'https://lkkneoqzxgtqihpjrmbp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra25lb3F6eGd0cWlocGpybWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDk2OTksImV4cCI6MjA4ODI4NTY5OX0.14SEPOjPPnqhQHTd_ppQkdYlY8LnA41ryezy5l1cPHU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
