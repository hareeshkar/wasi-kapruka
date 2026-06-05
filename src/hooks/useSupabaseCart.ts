import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CartItem, Product } from '../types';
import { getOrCreateSession, supabase } from '../lib/supabase';

// Cart hook — supports BOTH modes:
//   - Guest:  rows have session_id = local_sid, owner_id IS NULL
//   - Auth:   rows have owner_id = auth.uid(), session_id may be anything
// The hook re-queries whenever the auth state changes (sign-in / sign-out).

type UseSupabaseCartOpts = {
  ownerId: string | null; // null = guest mode
};

export function useSupabaseCart({ ownerId }: UseSupabaseCartOpts) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionId = useMemo(() => getOrCreateSession(), []);

  // Reload cart when auth state changes
  useEffect(() => {
    let active = true;
    setLoading(true);

    const query = supabase
      .from('cart_items')
      .select('*')
      .order('created_at', { ascending: true });

    // Supabase chain — filter on whichever identity is active
    const filtered = ownerId
      ? query.eq('owner_id', ownerId)
      : query.eq('session_id', sessionId);

    filtered.then(({ data, error }) => {
      if (error) console.error('[supabase cart] load failed', error.message);
      if (active) {
        setCart((data as CartItem[]) || []);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [sessionId, ownerId]);

  const addItem = useCallback(async (product: Product, variant?: any) => {
    const price = variant ? variant.price_lkr : product.price_lkr;
    const newItem: CartItem = {
      product_code: product.product_code,
      name: product.name,
      price_lkr: price,
      image_url: product.image_url,
      quantity: 1,
      category: product.category,
      variant_id: variant?.id,
      variant_name: variant?.name,
    };

    // React state update with quantity merge
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

    // Build the row payload with auth-aware identity
    const row: Record<string, any> = {
      product_code: itemToPersist.product_code,
      product_name: itemToPersist.name,
      quantity: itemToPersist.quantity,
      price_lkr: itemToPersist.price_lkr,
      image_url: itemToPersist.image_url,
      category: itemToPersist.category,
      variant_id: itemToPersist.variant_id,
      variant_name: itemToPersist.variant_name,
    };
    if (ownerId) {
      row.owner_id = ownerId;
      // Keep session_id for legacy compat; could be null
      row.session_id = sessionId;
    } else {
      row.session_id = sessionId;
    }

    // Upsert: on (session_id, product_code) when guest, on (owner_id, product_code) when authed.
    //
    // Auth path note: we can't use a plain onConflict upsert here because the
    // unique constraint is on (session_id, product_code) — but for authed users
    // the dedup key is (owner_id, product_code). So we do a SELECT-then-INSERT-or-UPDATE:
    //   1. SELECT by (owner_id, product_code)
    //   2. if exists: UPDATE
    //   3. if missing: INSERT
    // The previous version tried UPDATE first and only inserted on updateErr — but
    // an UPDATE that matches 0 rows returns NO error, so the INSERT never fired
    // and cart_items stayed empty for authed users.
    let error: any = null;
    if (ownerId) {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('product_code', itemToPersist.product_code)
        .maybeSingle();

      if (existing) {
        const { error: updateErr } = await supabase
          .from('cart_items')
          .update({
            quantity: itemToPersist.quantity,
            price_lkr: itemToPersist.price_lkr,
            variant_id: itemToPersist.variant_id,
            variant_name: itemToPersist.variant_name,
          })
          .eq('id', existing.id);
        error = updateErr;
      } else {
        const { error: insertErr } = await supabase.from('cart_items').insert(row);
        error = insertErr;
      }
    } else {
      // Guest: use UNIQUE(session_id, product_code) onConflict
      const { error: upsertErr } = await supabase
        .from('cart_items')
        .upsert(row, { onConflict: 'session_id,product_code' });
      error = upsertErr;
    }

    if (error) console.error('[supabase cart] upsert failed', error.message);
  }, [sessionId, ownerId]);

  const removeItem = useCallback(async (code: string) => {
    const matchKey = code.toLowerCase();
    setCart(prev => prev.filter(i => i.product_code.toLowerCase() !== matchKey));

    let q = supabase.from('cart_items').delete();
    q = ownerId ? q.eq('owner_id', ownerId) : q.eq('session_id', sessionId);
    const { error } = await q.eq('product_code', code);
    if (error) console.error('[supabase cart] delete failed', error.message);
  }, [sessionId, ownerId]);

  const updateQty = useCallback(async (code: string, qty: number) => {
    if (qty <= 0) {
      await removeItem(code);
      return;
    }
    const matchKey = code.toLowerCase();
    setCart(prev => prev.map(i =>
      i.product_code.toLowerCase() === matchKey ? { ...i, quantity: qty } : i
    ));

    let q = supabase.from('cart_items').update({ quantity: qty });
    q = ownerId ? q.eq('owner_id', ownerId) : q.eq('session_id', sessionId);
    const { error } = await q.eq('product_code', code);
    if (error) console.error('[supabase cart] update failed', error.message);
  }, [sessionId, ownerId, removeItem]);

  const clearCart = useCallback(async () => {
    setCart([]);
    let q = supabase.from('cart_items').delete();
    q = ownerId ? q.eq('owner_id', ownerId) : q.eq('session_id', sessionId);
    const { error } = await q;
    if (error) console.error('[supabase cart] clear failed', error.message);
  }, [sessionId, ownerId]);

  return { cart, loading, addItem, removeItem, updateQty, clearCart };
}
