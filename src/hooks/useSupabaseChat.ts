import { useCallback, useEffect, useMemo, useState } from 'react';
import type { City, DeliveryCheckResult, Message, Order, OrderIntent, Product } from '../types';
import { getOrCreateSession, supabase } from '../lib/supabase';

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

export function useSupabaseChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionId = useMemo(() => getOrCreateSession(), []);

  useEffect(() => {
    let active = true;
    supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('[supabase chat] load failed', error.message);
        if (active) {
          const rows = (data as SupabaseMessageRow[]) || [];
          setMessages(rows.map(toMessage));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const addMessage = useCallback(async (msg: Message) => {
    setMessages(prev => [...prev, msg]);
    const { error } = await supabase.from('messages').insert({
      session_id: sessionId,
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
    });
    if (error) console.error('[supabase chat] insert failed', error.message);
  }, [sessionId]);

  const clearMessages = useCallback(async () => {
    setMessages([]);
    const { error } = await supabase.from('messages').delete().eq('session_id', sessionId);
    if (error) console.error('[supabase chat] clear failed', error.message);
  }, [sessionId]);

  const replaceMessages = useCallback(async (next: Message[]) => {
    setMessages(next);
    const { error: clearError } = await supabase.from('messages').delete().eq('session_id', sessionId);
    if (clearError) {
      console.error('[supabase chat] replace clear failed', clearError.message);
      return;
    }
    if (next.length === 0) return;
    const { error } = await supabase.from('messages').insert(next.map(msg => ({
      session_id: sessionId,
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
    })));
    if (error) console.error('[supabase chat] replace insert failed', error.message);
  }, [sessionId]);

  return { messages, loading, addMessage, clearMessages, replaceMessages, sessionId };
}
