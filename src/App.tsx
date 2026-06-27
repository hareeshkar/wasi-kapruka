import React, { useState, useEffect, useRef } from 'react';
import { Message, Product, Order, City, OrderIntent } from './types';
import { Sparkles, ShoppingBag, X, Plus, Globe, LogIn, PanelLeftClose } from 'lucide-react';
import { KaprukaLogo } from './lib/kapruka';
import { formatPrice, detectCurrency, type Currency } from './lib/currency';
import ChatSection from './components/ChatSection';
import EmptyStatePlaceholder from './components/EmptyStatePlaceholder';
import CartDrawer from './components/CartDrawer';
import SignInPanel from './components/SignInPanel';
import SaveCartBanner from './components/SaveCartBanner';
import ProgressiveProfilePrompt from './components/ProgressiveProfilePrompt';
import ProductDetailModal from './components/ProductDetailModal';
import ErrorToast from './components/ErrorToast';
import { useSupabaseCart } from './hooks/useSupabaseCart';
import { useSupabaseChat } from './hooks/useSupabaseChat';
import { useConversations } from './hooks/useConversations';
import { useAuth } from './hooks/useAuth';
import { useUserProfile, missingOptionalFields } from './hooks/useUserProfile';
import { migrateGuestDataToUser } from './lib/auth-migration';
import { profileToContext } from './lib/user-profile';

// ── App-level sidebar copy ─────────────────────────────────────────────────
// ⚠️ SI/TA translations need native-speaker review before shipping
const APP_L = {
  newChat:  { en: 'New Chat',  si: 'අලුත් Chat',          ta: 'புதிய Chat' },
  signIn:   { en: 'Sign In',   si: 'Sign In',              ta: 'உள்நுழை' },
  cart:     { en: 'Cart',      si: 'Cart',                 ta: 'கார்ட்' },
  account:  { en: 'Account',   si: 'Account',              ta: 'கணக்கு' },
};
const appT = (k: keyof typeof APP_L, lang: 'en' | 'si' | 'ta') => APP_L[k][lang] ?? APP_L[k].en;

export default function App() {
  const [language, setLanguage] = useState<'en' | 'si' | 'ta'>('en');
  const [budget, setBudget] = useState<number>(0);
  const [occasion, setOccasion] = useState<string>('');

  // Auth + profile
  const { user, loading: authLoading, signOut } = useAuth();
  const ownerId = user?.id ?? null;
  const { profile, save: saveProfile } = useUserProfile(ownerId);
  const [signInOpen, setSignInOpen] = useState(false);
  const [profilePromptOpen, setProfilePromptOpen] = useState(false);
  const [showSaveBanner, setShowSaveBanner] = useState(false);
  const bannerDismissed = useRef(false);

  // ── Conversations (sidebar) ─────────────────────────────────────────────────
  const {
    conversations, loading: convsLoading, refresh: refreshConvs,
    create: createConv, updateTitle: updateConvTitle,
  } = useConversations({ ownerId });

  // Cart overlay open/close
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // Sidebar expand/collapse (expanded by default)
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  // Cart + chat — scoped to active conversation (per-conversation persistence)
  const { cart, loading: cartLoading, addItem, removeItem, updateQty, clearCart } = useSupabaseCart({ ownerId, conversationId: activeConvId });
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderResult, setOrderResult] = useState<Order | null>(null);

  // Conversational state
  const { messages, loading: chatLoading, addMessage, clearMessages, replaceMessages, updateMessage, sessionId } = useSupabaseChat({ ownerId, conversationId: activeConvId });
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [isStreaming, setIsStreaming] = useState(false);

  // Error toast state
  const [errorToast, setErrorToast] = useState<{
    message: string;
    category?: string;
    isRetryable?: boolean;
  } | null>(null);

  // Auto-fill intent extracted from chat (recipient, city, address, phone, message)
  const [orderIntent, setOrderIntent] = useState<OrderIntent | null>(null);

  // Cart→AI feedback: last add/remove action is appended to next chat request then cleared
  const lastCartActionRef = useRef<string>('');

  // Discovery rail for the landing page (pre-chat product previews)
  const [discoverProducts, setDiscoverProducts] = useState<Product[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const discoverLoaded = useRef(false);

  // Product detail modal, comparison, and categories — triggered by LLM virtual tools
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<Product | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Client-side cache for product details — avoids re-fetching on repeated clicks
  const productCache = useRef<Map<string, Product>>(new Map());

  // Normalize raw API product into our Product type
  const normalizeProductDetail = (raw: any, productCode: string): Product => ({
    product_code:     raw.id ?? raw.product_code ?? productCode,
    name:             raw.name ?? '',
    price_lkr:        raw.price?.amount ?? raw.price_lkr ?? 0,
    currency:         raw.price?.currency ?? raw.currency ?? 'LKR',
    compare_at_price: raw.compare_at_price?.amount ?? undefined,
    category:         raw.category?.name ?? raw.category ?? '',
    image_url:        raw.images?.[0] ?? raw.image_url ?? '',
    description:      raw.description ?? raw.summary ?? '',
    summary:          raw.summary ?? undefined,
    stock_level:      raw.stock_level ?? (raw.in_stock ? 'high' : 'low'),
    in_stock:         raw.in_stock ?? undefined,
    rating:           raw.rating ?? undefined,
    variants:         raw.variants?.map((v: any) => ({
      id: v.id, name: v.name,
      price_lkr: v.price?.amount ?? v.price_lkr ?? 0,
      currency:  v.price?.currency ?? 'LKR',
      stock_level: v.stock_level,
      sku: v.sku ?? undefined,
      in_stock: v.in_stock ?? undefined,
      attributes: v.attributes ?? undefined,
    })),
    url:        raw.url ?? undefined,
    images:     raw.images ?? [],
    attributes: raw.attributes ?? undefined,
    shipping:   raw.shipping ?? undefined,
  });

  // Prefetch product details in the background when search results arrive
  const prefetchProductDetails = (products: Product[]) => {
    for (const p of products) {
      const code = p.product_code;
      if (code && !productCache.current.has(code)) {
        // Cache the basic info we already have from search
        productCache.current.set(code, p);
        // Fetch full details in background (fire-and-forget)
        fetch(`/api/products/${code}`)
          .then(r => r.json())
          .then(d => {
            if (d.success && d.product) {
              productCache.current.set(code, normalizeProductDetail(d.product, code));
            }
          })
          .catch(() => {});
      }
    }
  };

  // Fetch full product details for the detail modal
  const handleViewDetails = async (productCode: string) => {
    setExpandedProductId(productCode);

    // Check cache first — instant if already prefetched
    const cached = productCache.current.get(productCode);
    if (cached && cached.variants) {
      setExpandedProduct(cached);
      setLoadingDetail(false);
      return;
    }

    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/products/${productCode}`);
      const data = await res.json();
      if (data.success && data.product) {
        const normalized = normalizeProductDetail(data.product, productCode);
        productCache.current.set(productCode, normalized);
        setExpandedProduct(normalized);
      }
    } finally {
      setLoadingDetail(false);
    }
  };


  // Migrate guest → user data when user signs in (runs once per user)
  useEffect(() => {
    if (!user?.id) return;
    migrateGuestDataToUser(user.id).catch(err => console.error('[auth migration]', err));
  }, [user?.id]);

  // NOTE: ProgressiveProfilePrompt is NO LONGER auto-triggered.
  // Respecting user intent: the user already provided DOB + language at signup.
  // Re-asking for the same info via a pop-up is intrusive. The prompt is now
  // opened explicitly via "Complete my profile" in the UserMenu (UserMenu.tsx).

  // When the user signs in for the first time (or page loads), auto-pick the
  // most recent conversation so they see their chat history.
  // Only runs once per user-id to avoid overriding their active selection.
  // Restores the conversation the user was in before refresh (localStorage),
  // falling back to the most recent one.
  const initialConvPicked = useRef(false);
  useEffect(() => {
    if (convsLoading) return;
    if (initialConvPicked.current) return;
    initialConvPicked.current = true;
    if (conversations.length > 0) {
      const stored = localStorage.getItem('wasi_active_conv');
      const restored = stored && conversations.some(c => c.id === stored) ? stored : conversations[0].id;
      setActiveConvId(restored);
    } else {
      // First visit — silently create a conversation so chat is ready immediately
      createConv({ language }).then(conv => { if (conv) setActiveConvId(conv.id); });
    }
  }, [convsLoading, conversations]);

  // Remember the active conversation across refreshes
  useEffect(() => {
    if (activeConvId) localStorage.setItem('wasi_active_conv', activeConvId);
    else localStorage.removeItem('wasi_active_conv');
  }, [activeConvId]);

  // Surface the "save cart" banner after first add-to-cart when not signed in
  // (only shown if user hasn't already dismissed it for this session)
  useEffect(() => {
    if (user) { setShowSaveBanner(false); return; }
    if (cart.length >= 1 && !bannerDismissed.current) setShowSaveBanner(true);
  }, [user, cart.length]);

  // Restore session from sessionStorage on mount (survives HMR / page refresh)
  useEffect(() => {
    const saved = sessionStorage.getItem('wasi_session');
    if (saved) {
      try {
        const { language: lang, budget: bud } = JSON.parse(saved);
        if (lang) setLanguage(lang);
        if (bud) setBudget(bud);
        // Only restore onboarded state if there were actual messages — otherwise
        // just pre-fill the form silently.
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (discoverLoaded.current) return;
    discoverLoaded.current = true;
    // Load curated products from known-working MCP search terms.
    // Live MCP returns empty for q=* — use specific terms instead.
    const loadCurated = async () => {
      setIsDiscovering(true);
      try {
        const mode = 'live';
        // Rotate through verified working queries — pick 3 at random each session load
        const allTerms = ['cake', 'rose', 'chocolate', 'hamper', 'ring', 'plush', 'wine', 'saree', 'balloon', 'candle', 'lotion', 'book', 'anniversary', 'birthday'];
        const shuffled = allTerms.slice().sort(() => Math.random() - 0.5);
        const terms = shuffled.slice(0, 3);
        const responses = await Promise.all(
          terms.map(q =>
            fetch(`/api/products?q=${q}&limit=4`, { headers: { 'x-mcp-mode': mode } })
              .then(r => r.json())
              .catch(() => ({ success: false, products: [] }))
          )
        );
        const merged: Product[] = [];
        const seen = new Set<string>();
        for (const data of responses) {
          for (const p of (data.products || [])) {
            if (!seen.has(p.product_code)) {
              seen.add(p.product_code);
              merged.push(p);
            }
          }
        }
        setDiscoverProducts(merged);
      } catch (err) {
        console.error('Curated products load failed, using fallbacks');
      } finally {
        setIsDiscovering(false);
      }
    };
    loadCurated();
  }, []);

  // Client-side budget guard: final safety net after AI + max_price filtering
  const filterByBudget = (products: Product[], cap: number): Product[] =>
    cap > 0 ? products.filter(p => p.price_lkr <= cap) : products;

  // ── Shared tool-processing helpers ────────────────────────────────────────
  // Single source of truth for normalizing tool call results. Used by all three
  // entry points (handleSendMessage, handleSendVoice, handleRetryMessage) so
  // behavior stays consistent regardless of how the user sent their message.

  /** Normalize a raw MCP product (from T1 search or T2 get) into a Product. */
  const normalizeProduct = (raw: any, fallbackId?: string): Product => ({
    product_code:     raw.id ?? raw.product_code ?? fallbackId ?? '',
    name:             raw.name ?? '',
    price_lkr:        raw.price?.amount ?? raw.price_lkr ?? 0,
    currency:         raw.price?.currency ?? raw.currency ?? 'LKR',
    compare_at_price: raw.compare_at_price?.amount ?? undefined,
    category:         raw.category?.name ?? raw.category ?? '',
    image_url:        raw.images?.[0] ?? raw.image_url ?? '',
    description:      raw.description ?? raw.summary ?? '',
    summary:          raw.summary ?? undefined,
    stock_level:      raw.stock_level ?? (raw.in_stock ? 'high' : 'low'),
    in_stock:         raw.in_stock ?? undefined,
    rating:           raw.rating ?? undefined,
    variants:         raw.variants?.map((v: any) => ({
      id: v.id, name: v.name,
      price_lkr: v.price?.amount ?? v.price_lkr ?? 0,
      currency:  v.price?.currency ?? 'LKR',
      stock_level: v.stock_level,
      sku: v.sku ?? undefined, in_stock: v.in_stock ?? undefined,
      attributes: v.attributes ?? undefined,
    })),
    url:        raw.url ?? undefined,
    images:     raw.images ?? [],
    attributes: raw.attributes ?? undefined,
    shipping:   raw.shipping ?? undefined,
  });

  /** Side-effect actions collected during tool processing. */
  type ToolAction =
    | { type: 'add_to_cart'; product: Product; variant?: any }
    | { type: 'remove_from_cart'; productId: string }
    | { type: 'update_cart'; productId: string; quantity: number }
    | { type: 'show_progress'; step: string; message: string };

  /** State bag returned by processToolCalls — everything the handlers need. */
  type ToolCallState = {
    linkedProducts: Product[];
    lastSearchCursor: { q: string; cursor: string } | null;
    suggestedCities: City[];
    orderCreated: Order | undefined;
    trackingData: any;
    currentPrefill: OrderIntent | null;
    pendingDetailId: string | null;
    pendingCompareIds: string[] | null;
    pendingCategories: any[] | null;
    shouldClearCart: boolean;
    shouldOrderNow: boolean;
    actions: ToolAction[];
  };

  /**
   * Single source of truth for processing tool calls from the LLM response.
   * Returns a state bag — handlers apply side effects (cart, routing, etc.)
   * by executing the actions array. This keeps tool normalization deterministic
   * regardless of entry point (text, voice, retry).
   */
  const processToolCalls = (toolCalls: any[], opts: { budget: number; orderIntent: OrderIntent | null }): ToolCallState => {
    const linkedProducts: Product[] = [];
    const linkedSeen = new Set<string>();
    let lastSearchCursor: { q: string; cursor: string } | null = null;
    const suggestedCities: City[] = [];
    let orderCreated: Order | undefined;
    let trackingData: any = undefined;
    let currentPrefill: OrderIntent | null = null;
    let pendingDetailId: string | null = null;
    let pendingCompareIds: string[] | null = null;
    let pendingCategories: any[] | null = null;
    let shouldClearCart = false;
    let shouldOrderNow = false;
    const actions: ToolAction[] = [];

    for (const tc of toolCalls) {
      // ── T1: kapruka_search_products ──────────────────────────────────────
      if (tc.toolName === 'kapruka_search_products') {
        const results = Array.isArray(tc.result) ? tc.result : (tc.result?.results ?? tc.result?.products ?? []);
        if (!Array.isArray(tc.result) && tc.result?.next_cursor) {
          lastSearchCursor = { q: tc.args?.q ?? '', cursor: tc.result.next_cursor };
        }
        for (const p of results) {
          const code = p?.id ?? p?.product_code ?? '';
          if (code && !linkedSeen.has(code)) {
            linkedSeen.add(code);
            linkedProducts.push(normalizeProduct(p, code));
          }
        }
      }

      // ── T2: kapruka_get_product (full detail — variants, images, etc.) ──
      if (tc.toolName === 'kapruka_get_product' && tc.result && !tc.result._raw_string) {
        const normalized = normalizeProduct(tc.result);
        if (normalized.product_code && !linkedSeen.has(normalized.product_code)) {
          linkedSeen.add(normalized.product_code);
          linkedProducts.push(normalized);
        }
      }

      // ── T3: kapruka_list_delivery_cities ─────────────────────────────────
      if (tc.toolName === 'kapruka_list_delivery_cities') {
        const cities = Array.isArray(tc.result) ? tc.result : (tc.result?.cities ?? []);
        suggestedCities.push(...cities);
      }

      // ── T4: kapruka_create_order ─────────────────────────────────────────
      if (tc.toolName === 'kapruka_create_order' && (tc.result?.order_ref || tc.result?.order_id)) {
        const r = tc.result;
        orderCreated = {
          order_ref:  r.order_ref,
          order_id:   r.order_id ?? r.order_ref,
          pay_url:    r.pay_url ?? r.checkout_url ?? '',
          total_lkr:  r.total_lkr ?? r.summary?.grand_total ?? 0,
          expires_at: r.expires_at ?? '',
          summary:    r.summary,
        };
      }

      // ── T5: kapruka_track_order ──────────────────────────────────────────
      if (tc.toolName === 'kapruka_track_order') {
        trackingData = tc.result;
      }

      // ── V1: wasi_prefill_checkout ────────────────────────────────────────
      if (tc.toolName === 'wasi_prefill_checkout' && tc.result) {
        currentPrefill = { ...opts.orderIntent, ...tc.result };
      }

      // ── V2: wasi_add_to_cart ─────────────────────────────────────────────
      if (tc.toolName === 'wasi_add_to_cart' && tc.result) {
        const p = tc.result;
        if (opts.budget > 0 && p.price_lkr > opts.budget) continue;
        actions.push({
          type: 'add_to_cart',
          product: {
            product_code: p.product_id, name: p.product_name,
            price_lkr: p.price_lkr, image_url: p.image_url,
            category: p.category, currency: p.currency,
          } as Product,
          variant: p.variant_id
            ? { id: p.variant_id, name: p.variant_name, price_lkr: p.price_lkr }
            : undefined,
        });
      }

      // ── V3: wasi_remove_from_cart ────────────────────────────────────────
      if (tc.toolName === 'wasi_remove_from_cart' && tc.result?.product_id) {
        actions.push({ type: 'remove_from_cart', productId: tc.result.product_id });
      }

      // ── V4: wasi_update_cart_quantity ─────────────────────────────────────
      if (tc.toolName === 'wasi_update_cart_quantity' && tc.result?.product_id) {
        actions.push({ type: 'update_cart', productId: tc.result.product_id, quantity: tc.result.quantity ?? 1 });
      }

      // ── V5: wasi_show_progress ───────────────────────────────────────────
      if (tc.toolName === 'wasi_show_progress' && tc.result) {
        actions.push({ type: 'show_progress', step: tc.result.step, message: tc.result.message });
      }

      // ── V6: wasi_order_now ───────────────────────────────────────────────
      if (tc.toolName === 'wasi_order_now') {
        shouldOrderNow = true;
      }

      // ── V7: wasi_show_product_detail ─────────────────────────────────────
      if (tc.toolName === 'wasi_show_product_detail' && tc.result?.product_id) {
        pendingDetailId = tc.result.product_id;
      }

      // ── V8: wasi_compare_products ────────────────────────────────────────
      if (tc.toolName === 'wasi_compare_products' && tc.result?.product_ids) {
        pendingCompareIds = tc.result.product_ids;
      }

      // ── V9: wasi_show_categories ─────────────────────────────────────────
      if (tc.toolName === 'wasi_show_categories' && tc.result?.categories) {
        pendingCategories = tc.result.categories;
      }

      // ── V10: wasi_new_order ──────────────────────────────────────────────
      if (tc.toolName === 'wasi_new_order') {
        shouldClearCart = true;
      }

      // ── Unrecognized tool name — log for debugging ─────────────────────
      const KNOWN_TOOLS = [
        'kapruka_search_products', 'kapruka_get_product', 'kapruka_list_delivery_cities',
        'kapruka_create_order', 'kapruka_track_order', 'kapruka_list_categories',
        'kapruka_check_delivery',
        'wasi_prefill_checkout', 'wasi_add_to_cart', 'wasi_remove_from_cart',
        'wasi_update_cart_quantity', 'wasi_show_progress', 'wasi_order_now',
        'wasi_show_product_detail', 'wasi_compare_products', 'wasi_show_categories',
        'wasi_new_order', 'wasi_get_form_state',
      ];
      if (!KNOWN_TOOLS.includes(tc.toolName)) {
        console.warn(`[processToolCalls] Unrecognized tool name: "${tc.toolName}" — result discarded. Possible LLM typo or new tool not yet integrated.`);
      }
    }

    return {
      linkedProducts, lastSearchCursor, suggestedCities, orderCreated,
      trackingData, currentPrefill, pendingDetailId, pendingCompareIds,
      pendingCategories, shouldClearCart, shouldOrderNow, actions,
    };
  };

  /**
   * Post-message deferred processing: fetches product details / comparisons
   * and adds them as additional messages. Shared by all three handlers.
   */
  const processDeferredTools = async (state: ToolCallState) => {
    // wasi_show_product_detail → fetch full details and add inline card
    if (state.pendingDetailId) {
      const pid = state.pendingDetailId;
      try {
        const res = await fetch(`/api/products/${pid}`);
        const data = await res.json();
        if (data.success && data.product) {
          void addMessage({
            id: `detail-${Date.now()}`,
            role: 'assistant',
            content: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            product_detail: normalizeProduct(data.product, pid),
          });
        }
      } catch (err) {
        console.error('[product_detail] fetch failed', err);
      }
    }

    // wasi_compare_products → fetch each and add comparison card
    if (state.pendingCompareIds) {
      const ids = state.pendingCompareIds;
      try {
        const results = await Promise.allSettled(
          ids.map(async (id: string) => {
            const res = await fetch(`/api/products/${id}`);
            const data = await res.json();
            if (data.success && data.product) {
              return normalizeProduct(data.product, id);
            }
            return null;
          })
        );
        const validProducts = results
          .filter((r): r is PromiseFulfilledResult<Product> => r.status === 'fulfilled' && r.value !== null)
          .map(r => r.value);
        if (validProducts.length >= 2) {
          void addMessage({
            id: `compare-${Date.now()}`,
            role: 'assistant',
            content: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            compare_products: validProducts,
          });
        }
      } catch (err) {
        console.error('[compare] fetch failed', err);
      }
    }

    // wasi_show_categories → add category grid message
    if (state.pendingCategories) {
      const cats = state.pendingCategories;
      void addMessage({
        id: `categories-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        categories: cats,
      });
    }
  };

  /**
   * Shared post-response processing for all three handlers (text, voice, retry).
   * Processes tool calls, executes actions, applies state changes, builds reply,
   * and runs deferred tools. Returns the reply message for the caller to send.
   */
  const processAndApplyToolResponse = async (data: {
    reply: string;
    toolCalls?: any[];
  }): Promise<Message> => {
    const state = processToolCalls(data.toolCalls || [], { budget, orderIntent });

    // Execute side-effect actions
    for (const action of state.actions) {
      switch (action.type) {
        case 'add_to_cart':
          handleAddToCart(action.product, action.variant, true);
          break;
        case 'remove_from_cart':
          handleRemoveItem(action.productId);
          break;
        case 'update_cart':
          handleUpdateQty(action.productId, action.quantity);
          break;
        case 'show_progress':
          void addMessage({
            id: `progress-${Date.now()}-${action.step}`,
            role: 'assistant' as const,
            content: `*${action.message}*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          break;
      }
    }

    // Apply state changes
    if (state.currentPrefill) {
      setOrderIntent(state.currentPrefill);
    }
    if (state.orderCreated) {
      setOrderResult(state.orderCreated);
    }
    if (state.shouldClearCart) {
      await clearCart();
      setOrderIntent(null);
    }
    if (state.shouldOrderNow) {
      const order = await handleChatOrder(state.currentPrefill || orderIntent);
      if (order) {
        state.orderCreated = order;
        setOrderResult(order);
      }
    }

    // Build reply message
    const withinBudget = filterByBudget(state.linkedProducts, budget);

    // ── RELEVANCE GATE (client-side safety net) ──────────────────────────────
    // Primary filter is server-side (search query vs product category).
    // This is the FALLBACK for edge cases the server can't catch.
    const replyText = data.reply || '';
    const replyLower = replyText.toLowerCase().trim();

    // Strong negatives: AI explicitly says it found nothing
    const strongNegative = [
      "couldn't find", "can't find", "cannot find",
      "no results", "no matching", "no exact match",
      "not available", "out of stock", "doesn't have any",
      "don't have any", "does not carry", "don't carry", "doesn't carry",
      "not currently", "not in stock",
    ];
    // Positive: AI is explicitly endorsing/showing products
    const positive = [
      "here are", "here's what", "i found", "check out",
      "take a look", "these might", "these could", "how about",
      "what about", "similar", "alternative", "option",
    ];

    const hasStrongNegative = strongNegative.some(s => replyLower.includes(s));
    const hasPositive = positive.some(s => replyLower.includes(s));

    // C2 fix: strong + positive = AI is offering alternatives → KEEP
    const shouldStripProducts = hasStrongNegative && !hasPositive;

    // C3 fix: minimal reply (emoji, single char) with products → strip
    const isMinimalReply = replyLower.length <= 2 && !replyLower.includes('?');

    // Empty reply → no AI endorsement → strip
    const filteredProducts = (!replyText || shouldStripProducts || isMinimalReply) ? [] : withinBudget;

    if (shouldStripProducts && withinBudget.length > 0) {
      console.warn(`[relevance-gate] Stripped ${withinBudget.length} products (strong negative, no positive)`);
    }
    if (isMinimalReply && withinBudget.length > 0) {
      console.warn(`[relevance-gate] Stripped ${withinBudget.length} products (minimal reply: "${replyText}")`);
    }

    const replyMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: data.reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      products: filteredProducts.length > 0 ? filteredProducts : undefined,
      city_suggest: state.suggestedCities.length > 0 ? state.suggestedCities : undefined,
      order_created: state.orderCreated,
      tracking_result: state.trackingData,
      order_intent: data.toolCalls?.find((tc: any) => tc.toolName === 'wasi_prefill_checkout')?.result,
      search_cursor: state.lastSearchCursor,
    };
    void addMessage(replyMsg);

    // Prefetch full details for all products in the reply (background, no await)
    if (filteredProducts.length > 0) prefetchProductDetails(filteredProducts);

    // Post-message deferred processing (product detail, compare, categories)
    await processDeferredTools(state);

    return replyMsg;
  };

  // Serialise cart for AI context — include product_code so LLM knows exact IDs
  const cartForAI = () => cart.map(i => ({
    product_code: i.product_code,
    name: i.name,
    price_lkr: i.price_lkr,
    currency: i.currency ?? 'LKR',
    quantity: i.quantity,
    category: i.category ?? '',
  }));

  // ── Friendly error messages by category ───────────────────────────────────
  const getFriendlyErrorMessage = (category: string): string => {
    switch (category) {
      case 'network':      return "I can't reach the server right now. Check your connection and try again.";
      case 'timeout':      return "That took too long. Kapruka might be busy — let's try once more.";
      case 'rate_limit':   return "I'm getting a lot of requests. Give me a moment, then try again.";
      case 'auth':         return "Your session expired. Please sign in again.";
      case 'server':       return "Kapruka's servers are having a moment. This usually fixes itself quickly.";
      case 'voice':        return "I couldn't process that voice message. Try speaking a bit closer to the mic.";
      case 'image':        return "I couldn't process that image. Try a different photo or describe what you need.";
      default:             return "Something went wrong on my end. Let's try that again.";
    }
  };

  // Main conversational submission hook
  const handleSendMessage = async (text: string, images?: Array<{ data: string; mimeType: string }>) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      uploaded_images: images && images.length > 0 ? images : undefined,
    };

    // Capture before adding so we can detect the first message for title generation
    const isFirstMessage = messagesRef.current.length === 0;
    // Client persists messages (it owns the rich render data — products, order
    // cards, intents). Server-side persistence is disabled to avoid bare
    // duplicate rows that lose product cards on refresh.
    void addMessage(userMsg);
    setIsStreaming(true);

    // Capture and clear the cart-action note so it's sent once then forgotten
    const lastCartAction = lastCartActionRef.current;
    lastCartActionRef.current = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messagesRef.current.slice(-50).map(m => ({
            role: m.role,
            content: m.content
              + (m.products?.length ?
                '\n[Searched products: ' + m.products.map(p => `${p.name} (code=${p.product_code}, Rs.${p.price_lkr})`).join('; ') + ']' : '')
              + (m.search_cursor ?
                `\n[Pagination: more "${m.search_cursor.q}" results available — pass cursor="${m.search_cursor.cursor}" to kapruka_search_products if the user asks for more of the same]` : '')
          })),
          language,
          budget,
          occasion,
          session_id: sessionId,
          owner_id: ownerId,
          conversation_id: activeConvId,
          persist: false,
          cart: cartForAI(),
          profile: profileToContext(profile),
          lastCartAction: lastCartAction || undefined,
          images: images && images.length > 0 ? images.map(img => ({ data: img.data, mimeType: img.mimeType })) : undefined,
          // Pass current form state so wasi_get_form_state (V5) can return field-level status
          formState: orderIntent ? {
            recipient_name:   orderIntent.recipient_name   || '',
            recipient_phone:  orderIntent.recipient_phone  || '',
            city_name:        orderIntent.city_name        || '',
            delivery_address: orderIntent.delivery_address || '',
            delivery_date:    orderIntent.delivery_date    || '',
            sender_name:      orderIntent.sender_name      || '',
          } : null,
        })
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(errBody || `Server error (${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        await processAndApplyToolResponse(data);

        // Fire-and-forget title generation after the first real exchange
        if (isFirstMessage && activeConvId) {
          fetch(`/api/conversations/${activeConvId}/title`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_id: ownerId, session_id: sessionId }),
          })
            .then(r => r.json())
            .then(d => { if (d.success && d.title) updateConvTitle(activeConvId, d.title); })
            .catch(() => {});
        }
      }

      // ── below is the handleSendMessage catch (same function)
    } catch (err: any) {
      console.error('[Chat] Error:', err);
      
      // Parse error response from server
      let errorInfo = {
        message: getFriendlyErrorMessage('unknown'),
        category: 'unknown',
        isRetryable: true,
      };

      // Check if it's a fetch error with JSON response
      if (err?.response) {
        try {
          const errorData = await err.response.json();
          if (errorData.error) {
            errorInfo = {
              message: errorData.error || getFriendlyErrorMessage(errorData.category || 'unknown'),
              category: errorData.category || 'unknown',
              isRetryable: errorData.isRetryable !== false,
            };
          }
        } catch { /* ignore parse error */ }
      } else if (err?.message) {
        // Network or other client-side error
        if (err.message.includes('fetch')) {
          errorInfo.message = getFriendlyErrorMessage('network');
          errorInfo.category = 'network';
        } else {
          errorInfo.message = err.message;
        }
      }

      // Show error toast
      setErrorToast(errorInfo);

      // Mark the last user message as failed
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        const updatedMessages = messages.map(m => 
          m.id === lastUserMsg.id 
            ? { ...m, error: errorInfo }
            : m
        );
        replaceMessages(updatedMessages);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  // ── Voice message handler ──────────────────────────────────────────────────
  // Sends audio to /api/chat with inlineData for Gemini native audio processing.
  // The voice message bubble is already added by ChatSection before calling this.
  const handleSendVoice = async (audioBase64: string, mimeType: string) => {
    setIsStreaming(true);

    // Capture and clear the cart-action note so it's sent once then forgotten
    const lastCartAction = lastCartActionRef.current;
    lastCartActionRef.current = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '[Voice message — the user spoke in the attached audio. Listen to the audio and respond to what they said. If you cannot process audio, use the text fallback.]',
          history: messagesRef.current.slice(-50).map(m => ({
            role: m.role,
            content: m.content
              + (m.products?.length ?
                '\n[Searched products: ' + m.products.map(p => `${p.name} (code=${p.product_code}, Rs.${p.price_lkr})`).join('; ') + ']' : '')
              + (m.search_cursor ?
                `\n[Pagination: more "${m.search_cursor.q}" results available — pass cursor="${m.search_cursor.cursor}" to kapruka_search_products if the user asks for more of the same]` : '')
          })),
          language,
          budget,
          occasion,
          session_id: sessionId,
          owner_id: ownerId,
          conversation_id: activeConvId,
          persist: false,
          cart: cartForAI(),
          profile: profileToContext(profile),
          lastCartAction: lastCartAction || undefined,
          audio_data: audioBase64,
          audio_mime_type: mimeType,
          formState: orderIntent ? {
            recipient_name:   orderIntent.recipient_name   || '',
            recipient_phone:  orderIntent.recipient_phone  || '',
            city_name:        orderIntent.city_name        || '',
            delivery_address: orderIntent.delivery_address || '',
            delivery_date:    orderIntent.delivery_date    || '',
            sender_name:      orderIntent.sender_name      || '',
          } : null,
        })
      });
      const data = await res.json();
      if (data.success) {
        await processAndApplyToolResponse(data);
      } else {
        // ── Fallback: audio processing failed → try transcription as text ──────
        console.warn('[handleSendVoice] Audio processing failed, falling back to transcription:', data.error);
        try {
          const sttRes = await fetch('/api/stt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_base64: audioBase64, mime_type: mimeType }),
          });
          const sttData = await sttRes.json();
          if (sttData.text?.trim()) {
            // Update the voice message with transcription content so it shows as text
            const voiceMsgId = messagesRef.current[messagesRef.current.length - 1]?.id;
            if (voiceMsgId) {
              updateMessage(voiceMsgId, { content: sttData.text.trim(), transcription: sttData.text.trim() });
            }
            // Re-send as a regular text message for AI processing
            await handleSendMessage(sttData.text.trim());
          } else {
            setErrorToast({
              message: getFriendlyErrorMessage('voice'),
              category: 'voice',
              isRetryable: true,
            });
          }
        } catch (fallbackErr: any) {
          console.error('[handleSendVoice] Fallback transcription also failed:', fallbackErr);
          setErrorToast({
            message: getFriendlyErrorMessage('voice'),
            category: 'voice',
            isRetryable: true,
          });
        }
      }
    } catch (err: any) {
      // ── Network error fallback → try transcription as text ──────────────────
      console.error('[handleSendVoice] Network error, falling back to transcription:', err);
      try {
        const sttRes = await fetch('/api/stt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio_base64: audioBase64, mime_type: mimeType }),
        });
        const sttData = await sttRes.json();
        if (sttData.text?.trim()) {
          const voiceMsgId = messagesRef.current[messagesRef.current.length - 1]?.id;
          if (voiceMsgId) {
            updateMessage(voiceMsgId, { content: sttData.text.trim(), transcription: sttData.text.trim() });
          }
          await handleSendMessage(sttData.text.trim());
        } else {
          setErrorToast({
            message: err.message || 'Network error',
            category: 'network',
            isRetryable: true,
          });
        }
      } catch (fallbackErr: any) {
        setErrorToast({
          message: err.message || 'Network error',
          category: 'network',
          isRetryable: true,
        });
      }
    } finally {
      setIsStreaming(false);
    }
  };

  // ── Retry / Regenerate message ──────────────────────────────────────────────
  // ChatGPT-style: retrying truncates all messages after the target, creating a
  // fresh branch from that point.
  const handleRetryMessage = async (messageId: string) => {
    const targetMsg = messages.find(m => m.id === messageId);
    if (!targetMsg) return;

    // Find the user message and its index — everything after it gets truncated
    let userMsgToRetry: Message | undefined;
    let userMsgIndex: number = -1;

    if (targetMsg.role === 'user') {
      userMsgToRetry = targetMsg;
      userMsgIndex = messages.findIndex(m => m.id === messageId);
    } else if (targetMsg.role === 'assistant') {
      const msgIndex = messages.findIndex(m => m.id === messageId);
      for (let i = msgIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          userMsgToRetry = messages[i];
          userMsgIndex = i;
          break;
        }
      }
    }

    if (!userMsgToRetry || userMsgIndex < 0) return;

    // Capture and clear the cart-action note so it's sent once then forgotten
    const lastCartAction = lastCartActionRef.current;
    lastCartActionRef.current = '';

    // Truncate: keep messages up to and including the target user message, remove everything after
    const truncated = messages.slice(0, userMsgIndex + 1).map(m =>
      m.id === userMsgToRetry!.id ? { ...m, isRetrying: true, error: undefined } : m
    );
    replaceMessages(truncated);

    try {
      setIsStreaming(true);

      // Build history from the TRUNCATED messages (not full history)
      const historyForRetry = truncated.slice(0, -1).map(m => ({
        role: m.role,
        content: m.content
          + (m.products?.length ?
            '\n[Searched products: ' + m.products.map(p => `${p.name} (code=${p.product_code}, Rs.${p.price_lkr})`).join('; ') + ']' : '')
          + (m.search_cursor ?
            `\n[Pagination: more "${m.search_cursor.q}" results available — pass cursor="${m.search_cursor.cursor}" to kapruka_search_products if the user asks for more of the same]` : '')
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsgToRetry.content,
          history: historyForRetry,
          language,
          budget,
          occasion,
          session_id: sessionId,
          owner_id: ownerId,
          conversation_id: activeConvId,
          persist: false,
          cart: cartForAI(),
          profile: profileToContext(profile),
          lastCartAction: lastCartAction || undefined,
          images: userMsgToRetry.uploaded_images && userMsgToRetry.uploaded_images.length > 0 
            ? userMsgToRetry.uploaded_images.map(img => ({ data: img.data, mimeType: img.mimeType })) 
            : undefined,
          audio_data: userMsgToRetry.audio_data || undefined,
          audio_mime_type: userMsgToRetry.audio_mime_type || undefined,
          formState: orderIntent ? {
            recipient_name:   orderIntent.recipient_name   || '',
            recipient_phone:  orderIntent.recipient_phone  || '',
            city_name:        orderIntent.city_name        || '',
            delivery_address: orderIntent.delivery_address || '',
            delivery_date:    orderIntent.delivery_date    || '',
            sender_name:      orderIntent.sender_name      || '',
          } : null,
        })
      });

      const data = await res.json();
      
      if (data.success) {
        // Clear retrying state on the user message
        const finalMessages = truncated.map(m =>
          m.id === userMsgToRetry!.id ? { ...m, isRetrying: false, error: undefined } : m
        );
        replaceMessages(finalMessages);

        // Process and add assistant response using shared helper
        await processAndApplyToolResponse(data);
      } else {
        const errorInfo = {
          message: data.error || getFriendlyErrorMessage(data.category || 'unknown'),
          category: data.category || 'unknown',
          isRetryable: data.isRetryable !== false,
        };
        const retryFailedMessages = truncated.map(m =>
          m.id === userMsgToRetry!.id ? { ...m, isRetrying: false, error: errorInfo } : m
        );
        replaceMessages(retryFailedMessages);
      }
    } catch (err: any) {
      console.error('[Retry] Error:', err);
      const retryFailedMessages = truncated.map(m =>
        m.id === userMsgToRetry!.id ? { ...m, isRetrying: false, error: {
          message: 'Network error — check your connection',
          category: 'network',
          isRetryable: true,
        }} : m
      );
      replaceMessages(retryFailedMessages);
    } finally {
      setIsStreaming(false);
    }
  };

  // ── Cart operations ────────────────────────────────────────────────────────
  // silent=true when called from the LLM tool loop — the LLM already replied that turn,
  // so we skip the notifyAIProductAdded follow-up call to prevent a double response.
  const handleAddToCart = async (product: Product, variant?: any, silent = false) => {
    const price = variant ? variant.price_lkr : product.price_lkr;
    await addItem(product, variant);

    // Only fire a follow-up AI chat when the user clicked the card button.
    // When the LLM called wasi_add_to_cart (silent=true), it already replied — skip.
    if (!silent) {
      notifyAIProductAdded(product, variant, price);
    }
  };

  // Sends a silent user event + waits for AI's tailored follow-up question.
  const notifyAIProductAdded = async (product: Product, variant: any, price: number) => {
    if (isStreaming) return; // don't stack AI calls

    const variantNote = variant ? ` — ${variant.name}` : '';

    // Show a compact user-side event bubble so the conversation reads naturally
    const addedMsg: Message = {
      id: `bundle-${Date.now()}`,
      role: 'user',
      content: `Added to bundle: "${product.name}"${variantNote} — ${formatPrice(price, (product.currency || 'LKR') as Currency)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    void addMessage(addedMsg);
    setIsStreaming(true);

    // Build updated cart snapshot for context (cart state may not have flushed yet)
    const cartSnapshot = [
      ...cart.filter(i => i.product_code !== product.product_code),
      { name: product.name, price_lkr: price, quantity: 1, category: product.category ?? '' },
    ];

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Pass full product JSON so AI has everything: ID, category, description, stock
          message: `The customer just added this product to their gift bundle:\n${JSON.stringify({
            product_id:  product.product_code,
            name:        product.name,
            price_lkr:   price,
            category:    product.category,
            description: product.description ?? '',
            stock_level: product.stock_level ?? '',
            variant:     variant ? { id: variant.id, name: variant.name } : null,
            url:         (product as any).url ?? null,
          }, null, 2)}\n\nAcknowledge in ONE warm sentence. Then ask the single most useful tailored question:\n- Cake/Cheesecake → ask what icing text to write on the cake\n- Flowers/Rose/Bouquet → ask if they want a card message included\n- Chocolates/Hamper → suggest one complementary add-on within budget\n- Anything else → ask who the recipient is if not yet known`,
          history: messagesRef.current.slice(-30).map(m => ({
            role: m.role,
            content: m.content + (m.products?.length ?
              '\n[Products: ' + m.products.map(p => `${p.name} (code=${p.product_code}, Rs.${p.price_lkr})`).join('; ') + ']' : '')
          })),
          language,
          budget,
          occasion,
          session_id: sessionId,
          owner_id: ownerId,
          conversation_id: activeConvId,
          persist: false,
          cart: cartSnapshot,
          lastCartAction: `Just added: ${product.name} (Rs.${price.toLocaleString()})`,
          profile: profileToContext(profile),
        }),
      });
      const data = await res.json();
      if (data.success) {
        void addMessage({
          id: `bundle-reply-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } catch (err) {
      console.error('[bundle notify]', err);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleUpdateQty = async (code: string, qty: number) => {
    if (qty <= 0) { handleRemoveItem(code); return; }
    await updateQty(code, qty);
  };

  const handleRemoveItem = async (code: string) => {
    const item = cart.find(i => i.product_code.toLowerCase() === code.toLowerCase());
    if (item) lastCartActionRef.current = `Removed "${item.name}" from cart`;
    await removeItem(code);
  };

  const handleClearCart = async () => {
    await clearCart();
    setOrderResult(null);
  };

  // Checkout order placement
  const handleConfirmOrder = async (recipient: {
    name: string;
    phone: string;
    city_code: string;
    city_name: string;
    delivery_date: string;
    address: string;
    gift_message: string;
    icing_text?: string;
    sender_name?: string;
    location_type?: string;
    delivery_instructions?: string;
    anonymous?: boolean;
    currency?: string;
    order_mode?: string;
  }) => {
    setIsOrdering(true);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          owner_id: ownerId,
          conversation_id: activeConvId,
          items: cart.map(i => ({
            product_code: i.product_code,
            variant_id: i.variant_id,
            price_lkr: i.price_lkr,
            quantity: i.quantity,
            icing_text: i.category?.toLowerCase().includes('cake') ? recipient.icing_text : undefined,
          })),
          recipient_name: recipient.name,
          recipient_phone: recipient.phone,
          city_code: recipient.city_name || recipient.city_code,
          city:      recipient.city_name,
          delivery_date: recipient.delivery_date,
          address: recipient.address,
          gift_message: recipient.order_mode === 'self' ? '' : (recipient.gift_message || ''),
          sender_name: recipient.order_mode === 'self' ? recipient.name : (recipient.sender_name || 'Guest'),
          anonymous: recipient.anonymous ?? false,
          currency: recipient.currency || 'LKR',
          location_type: recipient.location_type || 'house',
          delivery_instructions: recipient.delivery_instructions || undefined,
        })
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrderResult(data.order);
        
        // Push checkout card to dialog history
        const orderMsg: Message = {
          id: `order-${Date.now()}`,
          role: 'assistant',
          content: `Your order is locked and ready! Click "Open Kapruka Checkout" below to complete payment. After paying, Kapruka will email you a KAP tracking number.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          order_created: data.order
        };
        void addMessage(orderMsg);
      }
    } catch (err) {
      console.error('[confirmOrder]', err);
      setErrorToast({
        message: getFriendlyErrorMessage('server'),
        category: 'server',
        isRetryable: true,
      });
    } finally {
      setIsOrdering(false);
    }
  };

  // Renew lock
  const handleRenewOrder = async () => {
    if (cart.length === 0) return;
    setIsOrdering(true);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-mcp-mode': 'live'
        },
        body: JSON.stringify({
          session_id: sessionId,
          owner_id: ownerId,
          conversation_id: activeConvId,
          items: cart.map(i => ({
            product_code: i.product_code,
            price_lkr: i.price_lkr,
            quantity: i.quantity,
            icing_text: i.category?.toLowerCase().includes('cake') ? orderIntent?.gift_message : undefined,
          })),
          recipient_name: orderIntent?.recipient_name || 'Recipient',
          recipient_phone: orderIntent?.recipient_phone || '0771234567',
          city_code: orderIntent?.city_name || 'Colombo 01',
          delivery_date: orderIntent?.delivery_date || new Date().toISOString().split('T')[0],
          address: orderIntent?.delivery_address || 'Address',
          gift_message: orderIntent?.gift_message || '',
          sender_name: orderIntent?.sender_name || 'Guest',
          anonymous: false,
          // sender_email omitted: MCP rejects it; Kapruka collects it at checkout
        })
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrderResult(data.order);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsOrdering(false);
    }
  };

  // Auto-order from chat (wasi_order_now virtual tool)
  const handleChatOrder = async (prefill?: OrderIntent | null) => {
    const intent = prefill || orderIntent;
    if (cart.length === 0 || !intent?.city_name || !intent?.recipient_name) return null;
    setIsOrdering(true);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          owner_id: ownerId,
          conversation_id: activeConvId,
          items: cart.map(i => ({
            product_code: i.product_code,
            variant_id: i.variant_id,
            price_lkr: i.price_lkr,
            quantity: i.quantity,
            icing_text: i.category?.toLowerCase().includes('cake') ? (intent?.gift_message || '') : undefined,
          })),
          recipient_name: intent.recipient_name,
          recipient_phone: intent.recipient_phone || '0770000000',
          city_code: intent.city_name,
          city: intent.city_name,
          delivery_date: intent.delivery_date || new Date().toISOString().split('T')[0],
          address: intent.delivery_address || 'Sri Lanka',
          gift_message: intent.gift_message || '',
          sender_name: intent.sender_name || 'Guest',
          anonymous: false,
          currency: cart[0]?.currency || intent.currency || 'LKR'
        })
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrderResult(data.order);
        return data.order;
      }
    } catch (err) {
      console.error('[chatOrder]', err);
    } finally {
      setIsOrdering(false);
    }
    return null;
  };

  // ── DEMO TOUR DISABLED — kept for reference, not called ─────────────────────
  /* const handleStartDemo = () => {
    setIsOnboarded(true);
    // setIsDemoActive(true);
    // setDemoStep(1);

    const steps = [
      {
        text: 'Hello Wasi, I want of birthday cake for my sister in Kandy town.',
        reply: 'Refreshing greetings! Let me query Kandy Cakes for your sister\'s anniversary birthday. Here are matching bestselling items.',
        products: discoverProducts.filter(p => p.category === 'Cakes').slice(0, 2),
        delay: 2000
      },
      {
        action: 'add_cake',
        text: 'This Fudge Cake looks spectacular! Add that cake, and add some Roses too.',
        reply: 'Stellar choice! I have added the Chocolate Fudge Cake and look up matching premium long-stemmed Colombo/Kandy red roses. Standard checks are loading.',
        products: discoverProducts.filter(p => p.category === 'Flowers').slice(0, 1),
        delay: 4000
      },
      {
        action: 'checkout',
        text: 'Proceed to guest checkout on Colombo 01',
        reply: 'Verified destination Colombo 01! Launching Checkout values now. I have locked your prices. Pay below.',
        order: {
          order_ref: 'ORD-20260604-8923',
          order_id: 'KAP-309485',
          pay_url: 'https://checkout.kapruka.com/pay/ORD-20260604-8923',
          total_lkr: 8150,
          expires_at: new Date(Date.now() + 3600000).toISOString()
        },
        delay: 6000
      }
    ];

    let currentMsgList: Message[] = [
      {
        id: 'welcome-demo',
        role: 'assistant',
        content: 'Entering Wasi 90-second animated Tour for Judges. Automatic inputs playing.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    void replaceMessages(currentMsgList);

    let currentStep = 0;
    const runNextDemoStep = () => {
      if (currentStep >= steps.length) {
        setIsDemoActive(false);
        return;
      }

      const step = steps[currentStep];
      // User typing
      setTimeout(() => {
        const userMsg: Message = {
          id: `demo-u-${currentStep}`,
          role: 'user',
          content: step.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        currentMsgList = [...currentMsgList, userMsg];
        void replaceMessages(currentMsgList);
        setIsStreaming(true);

        // Assistant reply
        setTimeout(() => {
          setIsStreaming(false);

          if (step.action === 'add_cake') {
            handleAddToCart(discoverProducts[0]);
          }

          const devOrder = step.order ? {
            order_ref: step.order.order_ref,
            order_id: step.order.order_id,
            pay_url: step.order.pay_url,
            total_lkr: step.order.total_lkr,
            expires_at: step.order.expires_at
          } : undefined;

          const assistantMsg: Message = {
            id: `demo-a-${currentStep}`,
            role: 'assistant',
            content: step.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            products: step.products,
            order_created: devOrder
          };

          if (devOrder) {
            setOrderResult(devOrder);
          }

          currentMsgList = [...currentMsgList, assistantMsg];
          void replaceMessages(currentMsgList);

          currentStep++;
          runNextDemoStep();
        }, 3000);

      }, 1500);
    };

    runNextDemoStep();
  }; */ // END DEMO TOUR — DISABLED

  const sidebarWidth = sidebarExpanded ? 200 : 80;

  return (
    <div className="min-h-screen font-sans text-ink relative" style={{ background: '#FAFAF8' }}>

      {/* ── Sidebar — vertical glass pill ──────────────────────────────────── */}
      <aside
        className={`sidebar-glass fixed left-4 top-1/2 -translate-y-1/2 z-30 select-none flex flex-col ${sidebarExpanded ? 'sidebar-expanded' : ''}`}
        style={{
          width: sidebarWidth,
          height: 'calc(92dvh)',
          borderRadius: 28,
          overflow: 'hidden',
          padding: sidebarExpanded ? '20px 12px 16px' : '20px 16px 16px',
        }}
      >
        {/* Brand */}
        <div className="mb-8 px-1 flex flex-col items-center gap-1.5">
          {sidebarExpanded && <KaprukaLogo className="h-5" />}
          <span
            className="font-display font-bold text-[15px] tracking-tight"
            style={{ color: '#402970' }}
          >
            WASI
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-2 px-1 w-full overflow-hidden">

          {/* New conversation */}
          <button
            onClick={async () => {
              await clearCart();
              setOrderIntent(null);
              const conv = await createConv({ language });
              if (conv) { setActiveConvId(conv.id); clearMessages(); }
            }}
            className="sidebar-item"
            title="New conversation"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(64,41,112,0.06)' }}>
              <Plus className="w-4 h-4" />
            </div>
            {sidebarExpanded && <span className="sidebar-label text-[12px] font-medium">{appT('newChat', language)}</span>}
          </button>

          {/* Language — animated */}
          <button
            onClick={() => {
              const langs: Array<'en' | 'si' | 'ta'> = ['en', 'si', 'ta'];
              const next = langs[(langs.indexOf(language) + 1) % langs.length];
              setLanguage(next);
            }}
            className="sidebar-item"
            title="Change language"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 relative" style={{ background: 'rgba(64,41,112,0.06)' }}>
              <Globe className="w-4 h-4" />
              {/* Animated language indicator */}
              <span
                className="absolute -bottom-0.5 -right-0.5 text-[7px] font-black font-mono px-1 rounded-full"
                style={{
                  background: '#402970',
                  color: '#fff',
                  animation: 'langPulse 3s ease-in-out infinite',
                  lineHeight: '12px',
                }}
              >
                {language === 'en' ? 'EN' : language === 'si' ? 'සි' : 'த'}
              </span>
            </div>
            {sidebarExpanded && (
              <span className="sidebar-label text-[12px] font-medium">
                {language === 'en' ? 'English' : language === 'si' ? 'සිංහල' : 'தமிழ்'}
              </span>
            )}
          </button>

          {/* Auth */}
          {!authLoading && (
            user ? (
              <button
                onClick={() => setProfilePromptOpen(true)}
                className="sidebar-item"
                title="Profile"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #5B3E8A 0%, #402970 100%)' }}>
                  {(user.email?.[0] || 'U').toUpperCase()}
                </div>
                {sidebarExpanded && <span className="sidebar-label text-[12px] font-medium truncate">{user.email?.split('@')[0] || appT('account', language)}</span>}
              </button>
            ) : (
              <button
                onClick={() => setSignInOpen(true)}
                className="sidebar-item"
                title="Sign in"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(64,41,112,0.06)' }}>
                  <LogIn className="w-4 h-4" />
                </div>
                {sidebarExpanded && <span className="sidebar-label text-[12px] font-medium">{appT('signIn', language)}</span>}
              </button>
            )
          )}

          {/* Cart */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="sidebar-item relative"
            title="Cart"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 relative" style={{ background: 'rgba(64,41,112,0.06)' }}>
              <ShoppingBag className="w-4 h-4" />
              {cart.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[15px] h-[15px] text-white text-[7px] font-black rounded-full flex items-center justify-center px-0.5"
                  style={{ background: '#0d6efd', boxShadow: '0 1px 4px rgba(13,110,253,0.35)' }}
                >{cart.length}</span>
              )}
            </div>
            {sidebarExpanded && <span className="sidebar-label text-[12px] font-medium">{appT('cart', language)}</span>}
          </button>
        </nav>

        {/* Collapse toggle — right-aligned */}
        <div className="mt-auto pt-3 flex justify-end px-1">
          <button
            onClick={() => setSidebarExpanded(prev => !prev)}
            className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-black/5 active:scale-90"
            style={{ color: 'rgba(64,41,112,0.35)' }}
            title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <PanelLeftClose
              className="w-4 h-4 transition-transform duration-300"
              style={{ transform: sidebarExpanded ? 'rotate(0deg)' : 'rotate(180deg)' }}
            />
          </button>
        </div>
      </aside>

      {/* ── Main content area ──────────────────────────────────────────────── */}
      <div
        className="flex flex-col min-h-screen transition-[margin-left] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ marginLeft: sidebarWidth + 16 }}
      >

      {/* ── Main — chat fills full width ────────────────────────────────────── */}
      <main className="flex-1 relative z-10 flex flex-col pb-6 pt-4">
        {/* Save-cart banner */}
        {showSaveBanner && !user && (
          <div className="max-w-4xl mx-auto px-4 pt-3">
            <SaveCartBanner
              visible={showSaveBanner}
              itemsAdded={cart.length}
              lang={language}
              onSignIn={() => setSignInOpen(true)}
              onDismiss={() => { bannerDismissed.current = true; setShowSaveBanner(false); }}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col pt-2">
          {messages.length === 0 ? (
            <EmptyStatePlaceholder
            lang={language}
            isSignedIn={!!user}
            userName={profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined : undefined}
            onSignIn={() => setSignInOpen(true)}
            onNewChat={async () => {
              await clearCart();
              setOrderIntent(null);
              const conv = await createConv({ language });
              if (conv) {
                setActiveConvId(conv.id);
                clearMessages();
              }
            }}
            onSendMessage={handleSendMessage}
            onSendVoice={handleSendVoice}
            onAddMessage={addMessage}
            onUpdateMessage={updateMessage}
          />
        ) : (
          <ChatSection
            messages={messages}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage as any}
            onSendVoice={handleSendVoice}
            onRetryMessage={handleRetryMessage}
            onAddMessage={addMessage}
            onUpdateMessage={updateMessage}
            onNewChat={async () => {
              await clearCart();
              setOrderIntent(null);
              const conv = await createConv({ language });
              if (conv) {
                setActiveConvId(conv.id);
                clearMessages();
              }
            }}
            lang={language}
            onAddToBundle={handleAddToCart}
            onViewDetails={handleViewDetails}
            onQuickReply={handleSendMessage as any}
            cartSize={cart.length}
          />
        )}
        </div>
      </main>

      {/* ── Cart overlay drawer ──────────────────────────────────────────────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(30,14,69,0.40)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            onClick={() => setIsCartOpen(false)}
          />
          <div className="relative z-10 w-full sm:max-w-sm h-[85vh] sm:h-full overflow-hidden flex flex-col rounded-t-2xl sm:rounded-t-none" style={{ boxShadow: '0 -8px 40px rgba(64,41,112,0.20)' }}>
            <CartDrawer
              cart={cart}
              lang={language}
              onUpdateQty={handleUpdateQty}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onConfirmOrder={handleConfirmOrder}
              isOrdering={isOrdering}
              orderResult={orderResult}
              onRenewOrder={handleRenewOrder}
              isDemoMode={false}
              orderIntent={orderIntent}
            />
          </div>
        </div>
      )}


      {/* ── Auth + Profile modals (rendered globally) ─────────────────────── */}
      <SignInPanel
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        lang={language}
      />

      {user && profilePromptOpen && missingOptionalFields(profile).length > 0 && (
        <ProgressiveProfilePrompt
          userId={user.id}
          fields={missingOptionalFields(profile)}
          onClose={() => setProfilePromptOpen(false)}
          onComplete={async () => {
            await saveProfile({ profile_complete: true });
          }}
          lang={language}
        />
      )}

      {/* ── Product Detail Modal (rendered globally) ─────────────────────── */}
      {expandedProduct && (
        <ProductDetailModal
          product={expandedProduct}
          isOpen={!!expandedProductId}
          onClose={() => { setExpandedProductId(null); setExpandedProduct(null); }}
          onAddToBundle={handleAddToCart}
          isAdded={cart.some(i => i.product_code === expandedProduct.product_code)}
          lang={language}
        />
      )}

      {/* ── New Conversation FAB (always visible when there are messages) ─── */}
      {messages.length > 0 && (
        <button
          onClick={async () => {
            await clearCart();
            setOrderIntent(null);
            const conv = await createConv({ language });
            if (conv) {
              setActiveConvId(conv.id);
              clearMessages();
            }
          }}
          className="fixed bottom-20 right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90 hover:shadow-xl cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #5B3E8A 0%, #402970 100%)',
            boxShadow: '0 4px 20px rgba(64,41,112,0.35)',
          }}
          title="Start new conversation"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* ── Error Toast ──────────────────────────────────────────────────── */}
      {errorToast && (
        <ErrorToast
          message={errorToast.message}
          category={errorToast.category}
          isRetryable={errorToast.isRetryable}
          onRetry={() => {
            setErrorToast(null);
            const lastUserMsg = [...messages].reverse().find(m => m.role === 'user' && m.error);
            if (lastUserMsg) {
              handleRetryMessage(lastUserMsg.id);
            }
          }}
          onDismiss={() => setErrorToast(null)}
          duration={6000}
        />
      )}

      </div>
    </div>
  );
}
