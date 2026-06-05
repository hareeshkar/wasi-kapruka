import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export function getOrCreateSession(): string {
  let sid = sessionStorage.getItem('wasi_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('wasi_sid', sid);
  }
  return sid;
}
