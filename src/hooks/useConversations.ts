import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOrCreateSession, supabase } from '../lib/supabase';

// Conversations hook — lists, creates, and deletes conversations for a user.
// Used by the left sidebar.

export type Conversation = {
  id: string;
  title: string;
  occasion: string | null;
  budget: number | null;
  language: string;
  last_message_at: string;
  created_at: string;
  owner_id: string | null;
  session_id: string;
};

type UseConversationsOpts = {
  ownerId: string | null;
  // When provided, the hook reports the current conversation in the list
  // (so the sidebar can highlight it).
  activeId?: string | null;
};

export function useConversations({ ownerId }: UseConversationsOpts) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionId = useMemo(() => getOrCreateSession(), []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const base = supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    const filtered = ownerId ? base.eq('owner_id', ownerId) : base.eq('session_id', sessionId);
    const { data, error } = await filtered;
    if (error) {
      console.error('[conversations] load failed', error.message);
      setConversations([]);
    } else {
      setConversations((data as Conversation[]) || []);
    }
    setLoading(false);
  }, [ownerId, sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (params: {
    occasion?: string;
    budget?: number;
    language?: string;
  }): Promise<Conversation | null> => {
    const now = new Date().toISOString();
    // Optimistic: create a temp conversation locally so the UI is instant.
    // The real ID comes back from Supabase and replaces the temp one.
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: Conversation = {
      id: tempId,
      title: 'New conversation',
      occasion: params.occasion || null,
      budget: params.budget || null,
      language: params.language || 'en',
      last_message_at: now,
      created_at: now,
      owner_id: ownerId,
      session_id: sessionId,
    };
    setConversations(prev => [optimistic, ...prev]);

    // Persist to Supabase in background
    const row: Record<string, any> = {
      session_id: sessionId,
      title: 'New conversation',
      occasion: params.occasion || null,
      budget: params.budget || null,
      language: params.language || 'en',
      last_message_at: now,
    };
    if (ownerId) row.owner_id = ownerId;

    const { data, error } = await supabase
      .from('conversations')
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error('[conversations] create failed', error.message);
      // Remove the optimistic entry so the user doesn't see a dead conversation
      setConversations(prev => prev.filter(c => c.id !== tempId));
      return null;
    }
    const conv = data as Conversation;
    // Replace the temp entry with the real one
    setConversations(prev => prev.map(c => c.id === tempId ? conv : c));
    return conv;
  }, [sessionId, ownerId]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[conversations] delete failed', error.message);
      return false;
    }
    setConversations(prev => prev.filter(c => c.id !== id));
    return true;
  }, []);

  const updateTitle = useCallback(async (id: string, title: string): Promise<boolean> => {
    // Optimistic local update — server already wrote to DB via service key,
    // so show the title immediately even if the client-side write is blocked by RLS (guests).
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
    const { error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', id);
    if (error) {
      console.error('[conversations] update title failed', error.message);
      return false;
    }
    return true;
  }, []);

  // Bump last_message_at when a message is sent — done by the server, but
  // we expose a client-side helper for optimistic updates.
  const touch = useCallback((id: string) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, last_message_at: new Date().toISOString() } : c
    ));
  }, []);

  const clearAll = useCallback(async (): Promise<boolean> => {
    let q = supabase.from('conversations').delete();
    q = ownerId ? q.eq('owner_id', ownerId) : q.eq('session_id', sessionId);
    const { error } = await q;
    if (error) {
      console.error('[conversations] clear all failed', error.message);
      return false;
    }
    setConversations([]);
    return true;
  }, [ownerId, sessionId]);

  return { conversations, loading, refresh, create, remove, updateTitle, touch, clearAll };
}
