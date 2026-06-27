import { createClient } from '@supabase/supabase-js';

// Vite embeds VITE_* at build time, but Docker builds don't have them.
// In production, the server injects window.__WASI_ENV__ into index.html at runtime.
const runtimeEnv = typeof window !== 'undefined' ? (window as any).__WASI_ENV__ : undefined;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || runtimeEnv?.SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || runtimeEnv?.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[supabase] Missing env vars — cart/auth features will not work. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

export function getOrCreateSession(): string {
  let sid = sessionStorage.getItem('wasi_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('wasi_sid', sid);
  }
  return sid;
}
