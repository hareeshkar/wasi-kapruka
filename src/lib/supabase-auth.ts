import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

// ── Auth helpers ──────────────────────────────────────────────────────────────
// Thin wrappers over supabase.auth. Keeps the call sites clean and gives us
// a single place to add logging, telemetry, or error normalization.

export type AuthResult = { user: User | null; session: Session | null; error: string | null };

const normalizeError = (err: any): string => {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  return JSON.stringify(err);
};

export async function signUpWithPassword(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return {
    user: data.user,
    session: data.session,
    error: error ? normalizeError(error) : null,
  };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return {
    user: data.user,
    session: data.session,
    error: error ? normalizeError(error) : null,
  };
}

export async function signInWithMagicLink(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  return { error: error ? normalizeError(error) : null };
}

export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  return { error: error ? normalizeError(error) : null };
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
