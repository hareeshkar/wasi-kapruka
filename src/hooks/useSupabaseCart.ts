import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CartItem, Product } from '../types';
import { getOrCreateSession, supabase } from '../lib/supabase';

export function useSupabaseCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionId = useMemo(() => getOrCreateSession(), []);

  useEffect(() => {
    let active = true;
    supabase
      .from('cart_items')
      .select('*')
      .eq('session_id', sessionId)
      .then(({ data, error }) => {
        if (error) console.error('[supabase cart] load failed', error.message);
        if (active) {
          setCart((data as CartItem[]) || []);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

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

    let itemToPersist: CartItem = newItem;
    setCart(prev => {
      const existing = prev.find(i => i.product_code.toLowerCase() === product.product_code.toLowerCase());
      if (existing) {
        itemToPersist = { ...existing, quantity: existing.quantity + 1 };
        return prev.map(i =>
          i.product_code.toLowerCase() === product.product_code.toLowerCase()
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, newItem];
    });

    const { error } = await supabase.from('cart_items').upsert({
      session_id: sessionId,
      product_code: itemToPersist.product_code,
      product_name: itemToPersist.name,
      quantity: itemToPersist.quantity,
      price_lkr: itemToPersist.price_lkr,
      image_url: itemToPersist.image_url,
      category: itemToPersist.category,
      variant_id: itemToPersist.variant_id,
      variant_name: itemToPersist.variant_name,
    }, { onConflict: 'session_id,product_code' });
    if (error) console.error('[supabase cart] upsert failed', error.message);
  }, [sessionId]);

  const removeItem = useCallback(async (code: string) => {
    setCart(prev => prev.filter(i => i.product_code.toLowerCase() !== code.toLowerCase()));
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('session_id', sessionId)
      .eq('product_code', code);
    if (error) console.error('[supabase cart] delete failed', error.message);
  }, [sessionId]);

  const updateQty = useCallback(async (code: string, qty: number) => {
    if (qty <= 0) {
      await removeItem(code);
      return;
    }
    setCart(prev => prev.map(i =>
      i.product_code.toLowerCase() === code.toLowerCase() ? { ...i, quantity: qty } : i
    ));
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: qty })
      .eq('session_id', sessionId)
      .eq('product_code', code);
    if (error) console.error('[supabase cart] update failed', error.message);
  }, [sessionId, removeItem]);

  const clearCart = useCallback(async () => {
    setCart([]);
    const { error } = await supabase.from('cart_items').delete().eq('session_id', sessionId);
    if (error) console.error('[supabase cart] clear failed', error.message);
  }, [sessionId]);

  return { cart, loading, addItem, removeItem, updateQty, clearCart };
}
