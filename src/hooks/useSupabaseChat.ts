import { useCallback, useEffect, useMemo, useState } from 'react';
import type { City, DeliveryCheckResult, Message, Order, OrderIntent, Product } from '../types';
import { getOrCreateSession, supabase } from '../lib/supabase';

// Chat hook — supports BOTH modes:
//   - Guest:  rows have session_id = local_sid, owner_id IS NULL
//   - Auth:   rows have owner_id = auth.uid(), session_id may be anything
// The hook re-queries whenever the auth state changes (sign-in / sign-out).

type UseSupabaseChatOpts = {
  ownerId: string | null;
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
});

type AddMessageOptions = {
  persist?: boolean;
};

export function useSupabaseChat({ ownerId }: UseSupabaseChatOpts) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionId = useMemo(() => getOrCreateSession(), []);

  // Reload messages when auth state changes
  useEffect(() => {
    let active = true;
    setLoading(true);

    const base = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    const filtered = ownerId
      ? base.eq('owner_id', ownerId)
      : base.eq('session_id', sessionId);

    filtered.then(({ data, error }) => {
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
  }, [sessionId, ownerId]);

  const addMessage = useCallback(async (msg: Message, options: AddMessageOptions = {}) => {
    setMessages(prev => [...prev, msg]);
    if (options.persist === false) return;

    const row: Record<string, any> = {
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
      },
    };
    if (ownerId) {
      row.owner_id = ownerId;
      row.session_id = sessionId;
    } else {
      row.session_id = sessionId;
    }

    const { error } = await supabase.from('messages').insert(row);
    if (error) console.error('[supabase chat] insert failed', error.message);
  }, [sessionId, ownerId]);

  const clearMessages = useCallback(async () => {
    setMessages([]);
    let q = supabase.from('messages').delete();
    q = ownerId ? q.eq('owner_id', ownerId) : q.eq('session_id', sessionId);
    const { error } = await q;
    if (error) console.error('[supabase chat] clear failed', error.message);
  }, [sessionId, ownerId]);

  const replaceMessages = useCallback(async (next: Message[]) => {
    setMessages(next);
    let q = supabase.from('messages').delete();
    q = ownerId ? q.eq('owner_id', ownerId) : q.eq('session_id', sessionId);
    const { error: clearError } = await q;
    if (clearError) {
      console.error('[supabase chat] replace clear failed', clearError.message);
      return;
    }
    if (next.length === 0) return;

    const rows = next.map(msg => {
      const row: Record<string, any> = {
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
        },
      };
      if (ownerId) {
        row.owner_id = ownerId;
        row.session_id = sessionId;
      } else {
        row.session_id = sessionId;
      }
      return row;
    });

    const { error } = await supabase.from('messages').insert(rows);
    if (error) console.error('[supabase chat] replace insert failed', error.message);
  }, [sessionId, ownerId]);

  return { messages, loading, addMessage, clearMessages, replaceMessages, sessionId };
}
