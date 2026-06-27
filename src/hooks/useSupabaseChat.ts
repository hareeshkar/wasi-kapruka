import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { City, DeliveryCheckResult, Message, Order, OrderIntent, Product } from '../types';
import { getOrCreateSession, supabase } from '../lib/supabase';

// Chat hook — scoped to a SINGLE CONVERSATION.
// All messages for a conversation are loaded on mount; new ones are
// appended locally and persisted to Supabase.

type UseSupabaseChatOpts = {
  ownerId: string | null;
  conversationId: string | null;
};

type SupabaseMessageRow = {
  id: string;
  role: string;
  content: string | null;
  products: Product[] | null;
  metadata: {
    timestamp?: string;
    city_suggest?: City[];
    checking_delivery?: boolean;
    delivery_checked?: DeliveryCheckResult;
    order_created?: Order;
    tracking_result?: any;
    order_intent?: OrderIntent;
    search_cursor?: { q: string; cursor: string } | null;
    uploaded_images?: Array<{ data: string; mimeType: string }> | null;
    product_detail?: Product | null;
    compare_products?: Product[] | null;
    categories?: any[] | null;
    error?: { message: string; category: string; isRetryable: boolean; retryAfterMs?: number } | null;
    isRetrying?: boolean;
    audio_data?: string | null;
    audio_mime_type?: string | null;
    transcription?: string | null;
  } | null;
  created_at: string;
};

const formatTimestamp = (value?: string) => {
  if (!value) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const toMessage = (row: SupabaseMessageRow): Message => ({
  id: row.id,
  role: row.role === 'assistant' ? 'assistant' : 'user',
  content: row.content || '',
  timestamp: row.metadata?.timestamp || formatTimestamp(row.created_at),
  products: row.products ?? undefined,
  city_suggest: row.metadata?.city_suggest,
  checking_delivery: row.metadata?.checking_delivery,
  delivery_checked: row.metadata?.delivery_checked,
  order_created: row.metadata?.order_created,
  tracking_result: row.metadata?.tracking_result,
  order_intent: row.metadata?.order_intent,
  search_cursor: row.metadata?.search_cursor ?? null,
  uploaded_images: row.metadata?.uploaded_images ?? undefined,
  product_detail: row.metadata?.product_detail ?? undefined,
  compare_products: row.metadata?.compare_products ?? undefined,
  categories: row.metadata?.categories ?? undefined,
  error: row.metadata?.error ?? undefined,
  isRetrying: row.metadata?.isRetrying ?? undefined,
  audio_data: row.metadata?.audio_data ?? undefined,
  audio_mime_type: row.metadata?.audio_mime_type ?? undefined,
  transcription: row.metadata?.transcription ?? undefined,
});

type AddMessageOptions = {
  persist?: boolean;
};

export function useSupabaseChat({ ownerId, conversationId }: UseSupabaseChatOpts) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionId = useMemo(() => getOrCreateSession(), []);

  // Reload messages when conversation OR auth state changes
  useEffect(() => {
    // Clear immediately so the previous conv's messages never bleed into the new one
    // (prevents isFirstMessage from being wrong during the async DB load).
    setMessages([]);
    if (!conversationId) {
      setLoading(false);
      return;
    }

    // Flush any queued messages from the optimistic temp-ID phase.
    // Keep failed messages in the queue so they retry on next conversationId change.
    if (!conversationId.startsWith('temp-') && pendingFlush.current.length > 0) {
      const queued = [...pendingFlush.current];
      pendingFlush.current = [];
      (async () => {
        for (const msg of queued) {
          try {
            await addMessage(msg);
          } catch {
            pendingFlush.current.push(msg);
          }
        }
      })();
    }

    let active = true;
    setLoading(true);

    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('[supabase chat] load failed', error.message);
        if (active) {
          const rows = (data as SupabaseMessageRow[]) || [];
          setMessages(rows.filter(row => row.role === 'user' || row.role === 'assistant').map(toMessage));
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [conversationId, ownerId]);

  // Queued messages that arrived before the real conversation ID (optimistic new-chat).
  // Once the real ID arrives, these are flushed to Supabase.
  const pendingFlush = useRef<Message[]>([]);

  const addMessage = useCallback(async (msg: Message, options: AddMessageOptions = {}) => {
    setMessages(prev => [...prev, msg]);
    if (options.persist === false) return;
    if (!conversationId) {
      console.warn('[supabase chat] addMessage called with no active conversation');
      return;
    }

    // Optimistic temp ID — queue for later flush instead of trying to persist
    if (conversationId.startsWith('temp-')) {
      pendingFlush.current.push(msg);
      return;
    }

    const row: Record<string, any> = {
      conversation_id: conversationId,
      role: msg.role,
      content: msg.content,
      tool_calls: (msg as any).toolCalls ?? null,
      products: msg.products || null,
      metadata: {
        timestamp: msg.timestamp,
        city_suggest: msg.city_suggest,
        checking_delivery: msg.checking_delivery,
        delivery_checked: msg.delivery_checked,
        order_created: msg.order_created,
        tracking_result: msg.tracking_result,
        order_intent: msg.order_intent,
        search_cursor: msg.search_cursor,
        uploaded_images: msg.uploaded_images ?? null,
        product_detail: msg.product_detail ?? null,
        compare_products: msg.compare_products ?? null,
        categories: msg.categories ?? null,
        error: msg.error ?? null,
        isRetrying: msg.isRetrying ?? false,
        audio_data: msg.audio_data ?? null,
        audio_mime_type: msg.audio_mime_type ?? null,
        transcription: msg.transcription ?? null,
      },
    };
    if (ownerId) row.owner_id = ownerId;
    row.session_id = sessionId;

    const { error } = await supabase.from('messages').insert(row);
    if (error) console.error('[supabase chat] insert failed', error.message);

    // Keep sidebar ordering fresh — server-side persistence (which used to bump
    // this) is now disabled in favour of client-side rich persistence.
    void supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)
      .then(({ error: bumpErr }) => {
        if (bumpErr) console.error('[supabase chat] last_message_at bump failed', bumpErr.message);
      });
  }, [sessionId, ownerId, conversationId]);

  const clearMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setMessages([]);
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);
    if (error) console.error('[supabase chat] clear failed', error.message);
  }, [conversationId]);

  const replaceMessages = useCallback(async (next: Message[]) => {
    setMessages(next);
    if (!conversationId) return;
    const { error: clearError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);
    if (clearError) {
      console.error('[supabase chat] replace clear failed', clearError.message);
      return;
    }
    if (next.length === 0) return;

    const rows = next.map(msg => {
      const row: Record<string, any> = {
        conversation_id: conversationId,
        role: msg.role,
        content: msg.content,
        products: msg.products || null,
        metadata: {
          timestamp: msg.timestamp,
          city_suggest: msg.city_suggest,
          checking_delivery: msg.checking_delivery,
          delivery_checked: msg.delivery_checked,
          order_created: msg.order_created,
          tracking_result: msg.tracking_result,
          order_intent: msg.order_intent,
          search_cursor: msg.search_cursor,
          uploaded_images: msg.uploaded_images ?? null,
          product_detail: msg.product_detail ?? null,
          compare_products: msg.compare_products ?? null,
          categories: msg.categories ?? null,
          error: msg.error ?? null,
          isRetrying: msg.isRetrying ?? false,
          audio_data: msg.audio_data ?? null,
          audio_mime_type: msg.audio_mime_type ?? null,
          transcription: msg.transcription ?? null,
        },
      };
      if (ownerId) row.owner_id = ownerId;
      row.session_id = sessionId;
      return row;
    });

    const { error } = await supabase.from('messages').insert(rows);
    if (error) console.error('[supabase chat] replace insert failed', error.message);
  }, [sessionId, ownerId, conversationId]);

  const updateMessage = useCallback(async (msgId: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, ...updates } : m));
    // Persist to Supabase so the update survives page refresh
    if (conversationId && !conversationId.startsWith('temp-')) {
      const { error } = await supabase
        .from('messages')
        .update({
          content: updates.content,
          metadata: updates.transcription ? { transcription: updates.transcription } : undefined,
        })
        .eq('conversation_id', conversationId)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) console.error('[supabase chat] updateMessage failed', error.message);
    }
  }, [conversationId]);

  return { messages, loading, addMessage, clearMessages, replaceMessages, updateMessage, sessionId };
}
