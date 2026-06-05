import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  signInWithMagicLink as authSignInWithMagicLink,
  signInWithPassword as authSignInWithPassword,
  signOut as authSignOut,
  signUpWithPassword as authSignUpWithPassword,
} from '../lib/supabase-auth';

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;   // true until we've seen the initial session
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{
    user: User | null;
    session: Session | null;
    error: string | null;
    needsEmailConfirm?: boolean;
  }>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
};

export function useAuth(): AuthState {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial session + subscription to changes (sign-in, sign-out, token refresh)
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await authSignInWithPassword(email, password);
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { user, session, error } = await authSignUpWithPassword(email, password);
    return {
      user,
      session,
      error,
      needsEmailConfirm: !error && !!user && !user.email_confirmed_at,
    };
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    return authSignInWithMagicLink(email);
  }, []);

  const signOut = useCallback(async () => {
    return authSignOut();
  }, []);

  return { user, session, loading, signIn, signUp, signInWithMagicLink, signOut };
}
