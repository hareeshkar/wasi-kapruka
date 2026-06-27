import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CartItem, Product } from '../types';
import { getOrCreateSession, supabase } from '../lib/supabase';

// Cart hook — scoped to a SINGLE CONVERSATION.
// Cart contents are filtered by (owner_id + conversation_id) when authed,
// or (session_id + conversation_id) when guest.
// When conversationId is null, the cart is empty and add/remove are no-ops.

type UseSupabaseCartOpts = {
  ownerId: string | null;
  conversationId: string | null;
};

export function useSupabaseCart({ ownerId, conversationId }: UseSupabaseCartOpts) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionId = useMemo(() => getOrCreateSession(), []);

  // Reload cart when conversation OR auth state changes
  useEffect(() => {
    if (!conversationId) {
      setCart([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);

    const query = supabase
      .from('cart_items')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    query.then(({ data, error }) => {
      if (error) console.error('[supabase cart] load failed', error.message);
      if (active) {
        // DB rows store the name as `product_name`; CartItem expects `name`.
        // Casting rows directly left name undefined after refresh — map explicitly.
        const rows: CartItem[] = (data || []).map((r: any) => ({
          product_code: r.product_code,
          name: r.product_name ?? r.name ?? 'Item',
          price_lkr: r.price_lkr ?? 0,
          currency: r.currency ?? 'LKR',
          image_url: r.image_url ?? '',
          quantity: r.quantity ?? 1,
          category: r.category ?? undefined,
          variant_id: r.variant_id ?? undefined,
          variant_name: r.variant_name ?? undefined,
        }));
        setCart(rows);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [conversationId, ownerId]);

  const addItem = useCallback(async (product: Product, variant?: any) => {
    if (!conversationId) {
      console.warn('[supabase cart] addItem called with no active conversation');
      return;
    }
    const price = variant ? variant.price_lkr : product.price_lkr;
    const newItem: CartItem = {
      product_code: product.product_code,
      name: product.name,
      price_lkr: price,
      currency: product.currency ?? 'LKR',
      image_url: product.image_url,
      quantity: 1,
      category: product.category,
      variant_id: variant?.id,
      variant_name: variant?.name,
    };

    let itemToPersist: CartItem = newItem;
    const matchKey = newItem.product_code.toLowerCase();
    setCart(prev => {
      const existing = prev.find(i => i.product_code.toLowerCase() === matchKey);
      if (existing) {
        itemToPersist = { ...existing, quantity: existing.quantity + 1 };
        return prev.map(i =>
          i.product_code.toLowerCase() === matchKey
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, newItem];
    });

    // Build the row payload — identity via conversation_id (primary key now)
    const row: Record<string, any> = {
      conversation_id: conversationId,
      product_code: itemToPersist.product_code,
      product_name: itemToPersist.name,
      quantity: itemToPersist.quantity,
      price_lkr: itemToPersist.price_lkr,
      currency: itemToPersist.currency ?? 'LKR',
      image_url: itemToPersist.image_url,
      category: itemToPersist.category,
      variant_id: itemToPersist.variant_id,
      variant_name: itemToPersist.variant_name,
    };
    if (ownerId) row.owner_id = ownerId;
    row.session_id = sessionId;

    // SELECT-then-INSERT-or-UPDATE pattern (per-conversation unique)
    const { data: existing } = await supabase
      .from('cart_items')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('product_code', itemToPersist.product_code)
      .maybeSingle();

    let error: any = null;
    if (existing) {
      const r = await supabase
        .from('cart_items')
        .update({
          quantity: itemToPersist.quantity,
          price_lkr: itemToPersist.price_lkr,
          currency: itemToPersist.currency ?? 'LKR',
          variant_id: itemToPersist.variant_id,
          variant_name: itemToPersist.variant_name,
        })
        .eq('id', existing.id);
      error = r.error;
    } else {
      const r = await supabase.from('cart_items').insert(row);
      error = r.error;
    }

    if (error) console.error('[supabase cart] upsert failed', error.message);
  }, [sessionId, ownerId, conversationId]);

  const removeItem = useCallback(async (code: string) => {
    if (!conversationId) return;
    const matchKey = code.toLowerCase();
    setCart(prev => prev.filter(i => i.product_code.toLowerCase() !== matchKey));

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('product_code', code);
    if (error) console.error('[supabase cart] delete failed', error.message);
  }, [conversationId]);

  const updateQty = useCallback(async (code: string, qty: number) => {
    if (!conversationId) return;
    if (qty <= 0) {
      await removeItem(code);
      return;
    }
    const matchKey = code.toLowerCase();
    setCart(prev => prev.map(i =>
      i.product_code.toLowerCase() === matchKey ? { ...i, quantity: qty } : i
    ));

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: qty })
      .eq('conversation_id', conversationId)
      .eq('product_code', code);
    if (error) console.error('[supabase cart] update failed', error.message);
  }, [conversationId, removeItem]);

  const clearCart = useCallback(async () => {
    if (!conversationId) return;
    setCart([]);
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('conversation_id', conversationId);
    if (error) console.error('[supabase cart] clear failed', error.message);
  }, [conversationId]);

  return { cart, loading, addItem, removeItem, updateQty, clearCart };
}
