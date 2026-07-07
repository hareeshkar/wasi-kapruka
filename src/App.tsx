import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, Product, Order, City, OrderIntent } from './types';
import { Zap, ShoppingBag, X, Plus, Globe, LogIn, LogOut, PanelLeftClose, Package, MapPin, Calendar, User } from 'lucide-react';
import { KaprukaLogo } from './lib/kapruka';
import { formatPrice, detectCurrency, type Currency } from './lib/currency';
import ChatSection from './components/ChatSection';
import EmptyStatePlaceholder from './components/EmptyStatePlaceholder';
import CartDrawer from './components/CartDrawer';
import SignInPanel from './components/SignInPanel';
import ProductTour, { isProductTourComplete } from './components/ProductTour';
import SaveCartBanner from './components/SaveCartBanner';
import ProgressiveProfilePrompt from './components/ProgressiveProfilePrompt';
import ProductDetailModal from './components/ProductDetailModal';
import PaymentModal from './components/PaymentModal';
import ErrorToast from './components/ErrorToast';
import { useSupabaseCart } from './hooks/useSupabaseCart';
import { useSupabaseChat } from './hooks/useSupabaseChat';
import { useConversations } from './hooks/useConversations';
import { useAuth } from './hooks/useAuth';
import { useUserProfile, missingOptionalFields } from './hooks/useUserProfile';
import { migrateGuestDataToUser } from './lib/auth-migration';
import { profileToContext } from './lib/user-profile';
import { useGeminiLive } from './hooks/useGeminiLive';
import { createLiveTranscriptRouter } from './lib/liveTranscriptRouter';

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
  const [userCurrency, setUserCurrency] = useState<string>('LKR');

  // Auth + profile
  const { user, loading: authLoading, signOut } = useAuth();
  const ownerId = user?.id ?? null;
  const { profile, save: saveProfile, refresh: refreshProfile } = useUserProfile(ownerId);
  const [signInOpen, setSignInOpen] = useState(false);
  const [profilePromptOpen, setProfilePromptOpen] = useState(false);
  const [showSaveBanner, setShowSaveBanner] = useState(false);
  const bannerDismissed = useRef(false);

  // Sync userCurrency from profile when it loads
  useEffect(() => {
    if (profile?.preferred_currency && profile.preferred_currency !== userCurrency) {
      setUserCurrency(profile.preferred_currency);
    }
  }, [profile?.preferred_currency]);

  // ── Conversations (sidebar) ─────────────────────────────────────────────────
  const {
    conversations, loading: convsLoading, refresh: refreshConvs,
    create: createConv, updateTitle: updateConvTitle,
  } = useConversations({ ownerId });

  // Product tour (first visit)
  const [tourOpen, setTourOpen] = useState(() => !isProductTourComplete());

  // Cart overlay open/close
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // Payment modal (in-app checkout)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Sidebar expand/collapse (expanded by default)
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  // Mobile: tab bar tucks away while the chat composer is focused (keyboard open)
  const [composerFocused, setComposerFocused] = useState(false);

  // Cart + chat — scoped to active conversation (per-conversation persistence)
  const { cart, loading: cartLoading, addItem, removeItem, updateQty, clearCart } = useSupabaseCart({ ownerId, conversationId: activeConvId });
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderResult, setOrderResult] = useState<Order | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Conversational state
  const { messages, loading: chatLoading, addMessage, clearMessages, replaceMessages, updateMessage, sessionId } = useSupabaseChat({ ownerId, conversationId: activeConvId });
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [isStreaming, setIsStreaming] = useState(false);

  // Live voice mode — transcripts route into the same message thread as
  // typed chat via the router below, instead of a separate feed.
  const liveTranscriptRouterRef = useRef(
    createLiveTranscriptRouter({
      addMessage: (msg) => { void addMessage(msg); },
      updateMessage: (id, updates) => { void updateMessage(id, updates); },
      newId: () => crypto.randomUUID(),
      // Match ChatSection's typed-message timestamp format (toLocaleTimeString)
      // rather than a raw ISO string — the two are rendered by the same
      // <span>{msg.timestamp}</span> in ChatSection.tsx, so they must agree.
      now: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })
  );
  // De-dupes stuttered tool calls across a live session. The text-chat flow
  // dedupes repeated identical calls within one batched response via
  // processToolCalls' actionSeen set, but Live delivers each tool call as a
  // separate async message — that per-response set can't see across them, so
  // a stuttered wasi_add_to_cart (same call twice in a few seconds) would
  // double-add without this.
  const liveToolCallSeenRef = useRef<Map<string, number>>(new Map());
  const LIVE_TOOL_DEDUPE_WINDOW_MS = 3000;

  // Error toast state
  const [errorToast, setErrorToast] = useState<{
    message: string;
    category?: string;
    isRetryable?: boolean;
  } | null>(null);

  // Auto-fill intent extracted from chat (recipient, city, address, phone, message)
  const [orderIntent, setOrderIntent] = useState<OrderIntent | null>(null);

  // Checkout wizard state — set when LLM calls wasi_show_checkout_wizard
  const [checkoutWizardMsg, setCheckoutWizardMsg] = useState<{ mode: 'gift' | 'self' } | null>(null);

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

  // ── Live voice mode ────────────────────────────────────────────────────────
  const live = useGeminiLive({
    onUserTranscript: (text) => {
      liveTranscriptRouterRef.current.onFragment('user', text);
    },
    onModelTranscript: (text) => {
      liveTranscriptRouterRef.current.onFragment('model', text);
    },
    onTurnComplete: (role) => {
      liveTranscriptRouterRef.current.endTurn(role);
    },
    onToolCall: (name, args) => {
      console.log(`[Live/Tool] ${name}`, args);
    },
    onToolResult: (name, args, result) => {
      void applyLiveToolResult(name, args, result);
    },
    getToolContext: () => ({
      cart: cartForAI(),
      budget,
      formState: orderIntent ? {
        recipient_name:   orderIntent.recipient_name   || '',
        recipient_phone:  orderIntent.recipient_phone  || '',
        city_name:        orderIntent.city_name        || '',
        delivery_address: orderIntent.delivery_address || '',
        delivery_date:    orderIntent.delivery_date    || '',
        sender_name:      orderIntent.sender_name      || '',
      } : {},
    }),
    onEnd: () => {
      liveTranscriptRouterRef.current.reset();
    },
    onError: (msg, shouldFallback) => {
      console.error('[Live] Error:', msg, shouldFallback ? '(fallback to text)' : '');
      liveTranscriptRouterRef.current.reset();
      if (shouldFallback) {
        // Transcripts already live in the main thread — falling back to
        // text is a continuation, not a reset. Say so in Wasi's own voice.
        void addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Voice ended — ${msg}. Keep typing, I've got the full conversation.`,
          timestamp: new Date().toISOString(),
        });
      } else {
        setErrorToast({ message: `Live error: ${msg}`, category: 'unknown', isRetryable: false });
      }
    },
  });

  // Live session elapsed-time label, driven off live.state (used by
  // LiveControlBar instead of a separate timer component).
  const [liveElapsed, setLiveElapsed] = useState(0);
  useEffect(() => {
    if (live.state !== 'active') { setLiveElapsed(0); return; }
    const start = Date.now();
    const id = setInterval(() => setLiveElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [live.state]);
  const liveElapsedLabel = `${String(Math.floor(liveElapsed / 60)).padStart(2, '0')}:${String(liveElapsed % 60).padStart(2, '0')}`;

  /**
   * Build the Live session system prompt with full context.
   * This mirrors the server-side WASI_SYSTEM_PROMPT but adds:
   *  - Live-specific voice instructions (speak naturally, short responses)
   *  - Cart contents and budget
   *  - User profile (name, city, tone, preferences)
   *  - Current date/time (Sri Lanka timezone)
   */
  const buildLiveSystemPrompt = useCallback(() => {
    const nowLK = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Colombo' });
    const [datePart, timePart] = nowLK.split(', ');
    const tomorrowLK = new Date(Date.now() + 86_400_000)
      .toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });

    // Cart context
    const cartLines = cart.map(item =>
      `${item.name} (code=${item.product_code}, Rs.${item.price_lkr}, qty=${item.quantity})`
    );
    const cartTotal = cart.reduce((sum, item) => sum + item.price_lkr * item.quantity, 0);
    const cartContext = cartLines.length > 0
      ? `\nCURRENT CART (${cartLines.length} items, total Rs.${cartTotal}):\n${cartLines.map(l => `- ${l}`).join('\n')}`
      : '\nCART: empty';

    // Budget context
    const budgetContext = budget > 0 ? `\nUSER'S BUDGET: Rs.${budget}` : '';

    // Profile context
    const profileCtx = profileToContext(profile);
    const profileContext = profile && profile.first_name
      ? `\nUSER PROFILE: ${profileCtx}`
      : '\nUSER: anonymous guest';

    // Currency context
    const currencyContext = userCurrency !== 'LKR'
      ? `\nDISPLAY CURRENCY: ${userCurrency} (convert prices when mentioning them)`
      : '';

    // Live-specific voice instructions
    const voiceInstructions = `
VOICE MODE — CRITICAL RULES FOR SPOKEN RESPONSES:
- You are speaking through a voice assistant. Keep responses SHORT (1-3 sentences max).
- Do NOT use markdown, bullet points, or formatted text — this is audio.
- Do NOT say "click here" or reference visual UI elements — the user can't see them.
- Speak naturally, like a friend on the phone. Use contractions ("I'll", "don't", "it's").
- When listing products, describe them verbally: "There's a beautiful rose bouquet for Rs.2500, and a chocolate hamper for Rs.3800."
- When the user asks to add something, confirm verbally: "Done! I've added that to your cart."
- If you need to ask a clarifying question, keep it to ONE question at a time.
- For checkout, ask for details one by one: "What's the recipient's name?" then "Which city?" etc.
- Match the user's language — if they speak Sinhala/Tamil/Tanglish, respond in that language.
- Be decisive: "I'd go with the truffle cake — it's perfect for birthdays" not "Here are 9 options."`;

    // Build the full prompt
    return `You are Wasi — Kapruka's AI shopping bestie for Sri Lanka. You are a close friend who helps find anything from Kapruka's 120,000+ products.

PERSONA: Warm, confident, concise. You celebrate Sri Lankan occasions with genuine enthusiasm. You speak the user's language — Sinhala, Tamil, Tanglish, or English. Be decisive — recommend, don't just list.

EMOTIONAL INTELLIGENCE:
- If the user is stressed (forgot anniversary, last-minute buyer), respond to the feeling FIRST, then give advice.
- Match their energy: excited → celebrate, stressed → calm & fast, sad → gentle & no emojis.
- Upsell like a friend: "if you're getting roses, a small chocolate box seals it" — only when it helps.
- Be decisive: "get the truffle cake, she'll love it" — not "here are 9 options."

CAPABILITIES — YOU HAVE TOOLS TO HELP:
- Search products: kapruka_search_products(q, category, max_price, min_price, sort, limit)
- Get product details: kapruka_get_product(product_id, currency)
- List categories: kapruka_list_categories(depth)
- List delivery cities: kapruka_list_delivery_cities(query) — call before check_delivery
- Check delivery: kapruka_check_delivery(city, delivery_date, product_id)
- Create order: kapruka_create_order(cart, recipient details, ...)
- Track an order: kapruka_track_order(order_ref or order_id)

You ALSO have the same cart/UI tools as typed chat — use them exactly the same way:
- wasi_add_to_cart / wasi_remove_from_cart / wasi_update_cart_quantity — mutate the visible cart
- wasi_get_cart — check what's already in the cart before adding more
- wasi_prefill_checkout — save recipient name/phone/city/address/date as the user tells you, one at a time
- wasi_show_product_detail(product_id) / wasi_compare_products(product_ids) — show a visual card for something you're discussing
- wasi_show_categories / wasi_browse_subcategories — show a visual category grid if the user wants to browse
- wasi_show_checkout_wizard — offer the visual step-by-step form if the user seems overwhelmed listing details by voice
- wasi_new_order — start a fresh order (clears the cart)
- wasi_convert_currency — convert cart total to the user's currency if they ask

When the user asks about products, USE THE TOOLS. Don't just describe from memory.
Whenever you call a tool that has a visual result (search, product detail, comparison, categories, order confirmation), it will ALSO appear as a card in the chat — you don't need to describe every field out loud, just confirm the gist ("Found a lovely bouquet, it's on your screen too").
${cartContext}${budgetContext}${profileContext}${currencyContext}

LIVE CLOCK — Asia/Colombo (use for ALL date calculations):
Today: ${datePart}
Tomorrow: ${tomorrowLK}
Time now: ${timePart} (Sri Lanka Standard Time, UTC+5:30)

${voiceInstructions}`;
  }, [cart, budget, profile, userCurrency]);

  /**
   * Build recent conversation history as PLAIN TEXT to fold into the Live
   * system prompt. Not sent via sendClientContent: gemini-3.1-flash-live-preview
   * requires historyConfig.initialHistoryInClientContent for that call to be
   * accepted, and that field doesn't exist in the installed @google/genai
   * SDK's LiveConnectConfig type — text in systemInstruction is a plain,
   * already-proven path that carries the same context without that risk.
   */
  const buildLiveHistory = useCallback(() => {
    // Last 10 messages for context (not too many to avoid token waste)
    const recentMessages = messages.slice(-10);
    return recentMessages
      .map(m => ({ role: m.role === 'assistant' ? 'Wasi' : 'User', content: m.content || '' }))
      .filter(m => m.content.trim().length > 0);
  }, [messages]);

  const handleLiveToggle = useCallback(() => {
    if (live.state === 'active' || live.state === 'connecting') {
      live.disconnect();
    } else {
      const history = buildLiveHistory();
      const historyText = history.length > 0
        ? `\n\nRECENT CONVERSATION (already happened, for context — don't repeat greetings or re-ask what's already answered here):\n${history.map(h => `${h.role}: ${h.content}`).join('\n')}`
        : '';
      const sysPrompt = buildLiveSystemPrompt() + historyText;
      live.connect({ systemPrompt: sysPrompt });
    }
  }, [live, buildLiveSystemPrompt, buildLiveHistory]);
  // 'error' is deliberately excluded — every onError call site sets
  // shouldFallback=true, which already surfaces an in-thread fallback
  // message (see the onError handler above), so instantly returning to the
  // normal composer is the right UX rather than showing a dead-end error
  // pill. 'disconnecting' IS included so the brief "Ending…" transition
  // (see useGeminiLive's disconnect()) is actually visible.
  const isLiveActive = live.state === 'active' || live.state === 'connecting' || live.state === 'disconnecting';

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

  // NOTE: ProgressiveProfilePrompt is not auto-triggered.
  // The user already provided core info at sign-up (name, DOB, language).
  // The prompt is opened explicitly via the sidebar avatar or "Set up your profile" nudge.

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
    pendingParentCategory: string | null;
    shouldClearCart: boolean;
    shouldOrderNow: boolean;
    shouldShowCheckoutWizard: boolean;
    checkoutWizardMode: 'gift' | 'self';
    actions: ToolAction[];
  };

  /**
   * Serializes a message for the LLM history payload. UI-only messages
   * (category grids, product cards) have empty text content — without these
   * annotations the model can't see what's already on screen, so it re-calls
   * the same display tools (e.g. wasi_browse_subcategories) every turn.
   * Single source of truth for ALL /api/chat history payloads.
   */
  const toHistoryEntry = (m: Message) => ({
    role: m.role,
    content: m.content
      + (m.products?.length ?
        '\n[Searched products: ' + m.products.map(p => `${p.name} (code=${p.product_code}, Rs.${p.price_lkr})`).join('; ') + ']' : '')
      + (m.search_cursor ?
        `\n[Pagination: more "${m.search_cursor.q}" results available — pass cursor="${m.search_cursor.cursor}" to kapruka_search_products if the user asks for more of the same]` : '')
      + (m.categories?.length ?
        `\n[UI: ${m.parentCategory ? `subcategory grid for "${m.parentCategory}"` : 'category grid'} (${m.categories.length} entries) already shown to the user — do NOT call wasi_show_categories or wasi_browse_subcategories for it again; search products directly instead]` : '')
      + (m.product_detail ?
        `\n[UI: full detail card for "${m.product_detail.name}" (code=${m.product_detail.product_code}) already shown — do NOT call wasi_show_product_detail for it again]` : '')
      + (m.compare_products?.length ?
        `\n[UI: comparison card already shown for: ${m.compare_products.map(p => `${p.name} (code=${p.product_code})`).join(' vs ')} — do NOT call wasi_compare_products for the same set again]` : '')
      + (m.city_suggest?.length ?
        `\n[UI: city suggestions shown: ${m.city_suggest.map(c => c.name).join(', ')}]` : '')
      + (m.order_created ?
        `\n[UI: order confirmation card shown — order_ref=${m.order_created.order_ref}, total Rs.${m.order_created.total_lkr}]` : '')
      + (m.tracking_result ?
        `\n[UI: order tracking card shown — order ${m.tracking_result.order_number ?? ''}, status: ${m.tracking_result.status_display ?? m.tracking_result.status ?? 'unknown'} — do NOT call kapruka_track_order for it again unless the user asks for an update]` : '')
      + (m.checkout_wizard ?
        `\n[UI: checkout wizard card is visible in chat — the user can fill details directly OR type/speak naturally. Continue calling wasi_prefill_checkout when they mention details (name, phone, city, address, date) to auto-fill the wizard. When all required fields are filled, the wizard shows a "Go to Cart" prompt automatically. Do NOT call wasi_show_checkout_wizard again if one is already visible.]` : ''),
  });

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
    let pendingParentCategory: string | null = null;
    let shouldClearCart = false;
    let shouldOrderNow = false;
    let shouldShowCheckoutWizard = false;
    let checkoutWizardMode: 'gift' | 'self' = 'gift';
    const actions: ToolAction[] = [];

    // The adapter dedupes identical calls within one tool round, but the model
    // can stutter the same call across rounds of the same turn. An identical
    // action twice in one response is never intentional (quantity changes go
    // through wasi_update_cart_quantity) — drop repeats so e.g. a doubled
    // wasi_add_to_cart doesn't double the quantity.
    const actionSeen = new Set<string>();
    const pushAction = (a: ToolAction) => {
      const key = JSON.stringify(a);
      if (actionSeen.has(key)) return;
      actionSeen.add(key);
      actions.push(a);
    };

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
        pushAction({
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
        pushAction({ type: 'remove_from_cart', productId: tc.result.product_id });
      }

      // ── V4: wasi_update_cart_quantity ─────────────────────────────────────
      if (tc.toolName === 'wasi_update_cart_quantity' && tc.result?.product_id) {
        pushAction({ type: 'update_cart', productId: tc.result.product_id, quantity: tc.result.quantity ?? 1 });
      }

      // ── V5: wasi_show_progress ───────────────────────────────────────────
      if (tc.toolName === 'wasi_show_progress' && tc.result) {
        pushAction({ type: 'show_progress', step: tc.result.step, message: tc.result.message });
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

      // ── V12: wasi_browse_subcategories ───────────────────────────────────
      if (tc.toolName === 'wasi_browse_subcategories' && tc.result?.subcategories) {
        pendingCategories = tc.result.subcategories;
        pendingParentCategory = tc.result.category || null;
      }

      // ── V10: wasi_new_order ──────────────────────────────────────────────
      if (tc.toolName === 'wasi_new_order') {
        shouldClearCart = true;
      }

      // ── V11: wasi_show_checkout_wizard ─────────────────────────────────
      if (tc.toolName === 'wasi_show_checkout_wizard' && tc.result) {
        shouldShowCheckoutWizard = true;
        checkoutWizardMode = tc.result.order_mode === 'self' ? 'self' : 'gift';
      }

      // ── Unrecognized tool name — log for debugging ─────────────────────
      const KNOWN_TOOLS = [
        'kapruka_search_products', 'kapruka_get_product', 'kapruka_list_delivery_cities',
        'kapruka_create_order', 'kapruka_track_order', 'kapruka_list_categories',
        'kapruka_check_delivery',
        'wasi_prefill_checkout', 'wasi_add_to_cart', 'wasi_remove_from_cart',
        'wasi_update_cart_quantity', 'wasi_show_progress', 'wasi_order_now',
        'wasi_show_product_detail', 'wasi_compare_products', 'wasi_show_categories',
        'wasi_browse_subcategories', 'wasi_new_order', 'wasi_get_form_state',
        'wasi_get_cart', 'wasi_convert_currency', 'wasi_show_checkout_wizard',
      ];
      if (!KNOWN_TOOLS.includes(tc.toolName)) {
        console.warn(`[processToolCalls] Unrecognized tool name: "${tc.toolName}" — result discarded. Possible LLM typo or new tool not yet integrated.`);
      }
    }

    return {
      linkedProducts, lastSearchCursor, suggestedCities, orderCreated,
      trackingData, currentPrefill, pendingDetailId, pendingCompareIds,
      pendingCategories, pendingParentCategory, shouldClearCart, shouldOrderNow,
      shouldShowCheckoutWizard, checkoutWizardMode, actions,
    };
  };

  /**
   * Post-message deferred processing: fetches product details / comparisons
   * and adds them as additional messages. Shared by all three handlers.
   */
  const processDeferredTools = async (state: ToolCallState) => {
    // Defense-in-depth against redundant display-tool calls: the history
    // annotations (toHistoryEntry) tell the model what's already on screen,
    // but if it re-calls a display tool anyway, skip re-rendering a card that
    // is already in the recent tail of the conversation. An explicit
    // "show it again" much later still works.
    const recentlyShown = (pred: (m: Message) => boolean | undefined) =>
      messagesRef.current.slice(-10).some(m => !!pred(m));

    // wasi_show_product_detail → fetch full details and add inline card
    if (state.pendingDetailId && !recentlyShown(m => m.product_detail?.product_code === state.pendingDetailId)) {
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
    const sameCompareSet = (shown?: Product[]) => {
      if (!shown || !state.pendingCompareIds) return false;
      const shownIds = new Set(shown.map(p => p.product_code));
      return state.pendingCompareIds.length === shownIds.size &&
        state.pendingCompareIds.every(id => shownIds.has(id));
    };
    if (state.pendingCompareIds && !recentlyShown(m => sameCompareSet(m.compare_products))) {
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

    // wasi_show_categories / wasi_browse_subcategories → add category message
    if (state.pendingCategories && !recentlyShown(m =>
      !!m.categories?.length && (m.parentCategory || null) === (state.pendingParentCategory || null)
    )) {
      const cats = state.pendingCategories;
      void addMessage({
        id: `categories-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        categories: cats,
        parentCategory: state.pendingParentCategory || undefined,
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
        case 'show_progress': {
          // Same-phase progress repeated across turns is model stutter, not
          // new information — skip if the identical status line is recent.
          const dup = messagesRef.current.slice(-10).some(m => m.content === `*${action.message}*`);
          if (dup) break;
          void addMessage({
            id: `progress-${Date.now()}-${action.step}`,
            role: 'assistant' as const,
            content: `*${action.message}*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          break;
        }
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
      // When order created, capture the full prefill context so the confirmation card
      // can display recipient name, delivery date, city, and gift message.
      order_intent: state.orderCreated
        ? (state.currentPrefill || orderIntent || undefined)
        : data.toolCalls?.find((tc: any) => tc.toolName === 'wasi_prefill_checkout')?.result,
      search_cursor: state.lastSearchCursor,
      checkout_wizard: state.shouldShowCheckoutWizard || undefined,
      checkout_wizard_mode: state.shouldShowCheckoutWizard ? state.checkoutWizardMode : undefined,
    };
    void addMessage(replyMsg);

    // Prefetch full details for all products in the reply (background, no await)
    if (filteredProducts.length > 0) prefetchProductDetails(filteredProducts);

    // Post-message deferred processing (product detail, compare, categories)
    await processDeferredTools(state);

    return replyMsg;
  };

  /**
   * Live voice equivalent of processAndApplyToolResponse. Gemini Live calls
   * tools one at a time, out-of-band from any single "reply" object (the
   * spoken/transcribed reply is handled separately by liveTranscriptRouter),
   * so this applies the SAME side effects (cart, order, prefill, product/
   * comparison/category cards) per individual tool call instead of per
   * batched chat response — reusing processToolCalls/processDeferredTools
   * so voice and text stay behaviorally identical.
   */
  const applyLiveToolResult = async (name: string, args: Record<string, unknown>, result: any) => {
    // Stutter guard — see liveToolCallSeenRef declaration for why this is
    // needed in addition to processToolCalls' own within-response dedup.
    const dedupeKey = `${name}:${JSON.stringify(args)}`;
    const now = Date.now();
    const lastSeen = liveToolCallSeenRef.current.get(dedupeKey);
    for (const [key, ts] of liveToolCallSeenRef.current) {
      if (now - ts > LIVE_TOOL_DEDUPE_WINDOW_MS) liveToolCallSeenRef.current.delete(key);
    }
    liveToolCallSeenRef.current.set(dedupeKey, now);
    if (lastSeen && now - lastSeen < LIVE_TOOL_DEDUPE_WINDOW_MS) {
      console.warn(`[Live/Tool] Skipped duplicate call within ${LIVE_TOOL_DEDUPE_WINDOW_MS}ms: ${name}`);
      return;
    }

    const state = processToolCalls([{ toolName: name, args, result }], { budget, orderIntent });

    // Execute side-effect actions (same switch as processAndApplyToolResponse)
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
        case 'show_progress': {
          const dup = messagesRef.current.slice(-10).some(m => m.content === `*${action.message}*`);
          if (dup) break;
          void addMessage({
            id: `progress-${Date.now()}-${action.step}`,
            role: 'assistant' as const,
            content: `*${action.message}*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          break;
        }
      }
    }

    // Apply state changes
    if (state.currentPrefill) setOrderIntent(state.currentPrefill);
    if (state.orderCreated) setOrderResult(state.orderCreated);
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

    // Visual-only card (no text content — Wasi's spoken reply is already
    // streaming into the thread separately) for anything with a visual:
    // search results, delivery cities, order confirmation, tracking.
    const withinBudget = filterByBudget(state.linkedProducts, budget);
    const hasVisual = withinBudget.length > 0 || state.suggestedCities.length > 0
      || !!state.orderCreated || !!state.trackingData || state.shouldShowCheckoutWizard;
    if (hasVisual) {
      void addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        products: withinBudget.length > 0 ? withinBudget : undefined,
        city_suggest: state.suggestedCities.length > 0 ? state.suggestedCities : undefined,
        order_created: state.orderCreated,
        tracking_result: state.trackingData,
        order_intent: state.orderCreated ? (state.currentPrefill || orderIntent || undefined) : undefined,
        search_cursor: state.lastSearchCursor,
        checkout_wizard: state.shouldShowCheckoutWizard || undefined,
        checkout_wizard_mode: state.shouldShowCheckoutWizard ? state.checkoutWizardMode : undefined,
      });
      if (withinBudget.length > 0) prefetchProductDetails(withinBudget);
    }

    // Post-call deferred processing (product detail, compare, categories)
    await processDeferredTools(state);
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
    // Detect currency preference from user message
    const currencyMatch = text.match(/\b(usd|dollars?|gbp|pounds?|eur|euros?|aud)\b/i);
    if (currencyMatch) {
      const word = currencyMatch[1].toLowerCase();
      const detected = word.startsWith('usd') || word.startsWith('dollar') ? 'USD'
        : word.startsWith('gbp') || word.startsWith('pound') ? 'GBP'
        : word.startsWith('eur') || word.startsWith('euro') ? 'EUR'
        : word.startsWith('aud') ? 'AUD'
        : null;
      if (detected) setUserCurrency(detected);
    }
    // Also detect "I'm from [country]" pattern
    const countryMatch = text.match(/\b(?:from|in|in the)\s+(US|USA|United States|UK|United Kingdom|Britain|Australia|Europe|Dubai|Singapore)\b/i);
    if (countryMatch) {
      const country = countryMatch[1].toLowerCase();
      const detected = country.includes('us') || country.includes('united states') ? 'USD'
        : country.includes('uk') || country.includes('united kingdom') || country.includes('britain') ? 'GBP'
        : country.includes('australia') ? 'AUD'
        : country.includes('europe') ? 'EUR'
        : null;
      if (detected) setUserCurrency(detected);
    }

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
          history: messagesRef.current.slice(-50).map(toHistoryEntry),
          language,
          budget,
          occasion,
          currency: userCurrency,
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
  // Voice handler — STT-first design for instant transcript display:
  // 1. Call /api/stt immediately → show transcript in bubble before AI replies.
  // 2. Call /api/chat with transcript text (full text-path parity, no audio tokens).
  // 3. If STT fails → fall back to audio inlineData path (Gemini hears it natively).
  const handleSendVoice = async (audioBase64: string, mimeType: string) => {
    setIsStreaming(true);

    const lastCartAction = lastCartActionRef.current;
    lastCartActionRef.current = '';

    // ── STEP 1: Fast transcription call (shows in bubble while AI is thinking) ──
    let transcript: string | null = null;
    const voiceMsgId = messagesRef.current[messagesRef.current.length - 1]?.id;
    try {
      const sttRes = await fetch('/api/stt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_base64: audioBase64, mime_type: mimeType }),
      });
      const sttData = await sttRes.json();
      if (sttData.text?.trim()) {
        transcript = sttData.text.trim();
        // Show transcript in the voice bubble immediately — before AI replies
        if (voiceMsgId) {
          updateMessage(voiceMsgId, { content: transcript, transcription: transcript });
        }
        console.log('[handleSendVoice] Transcript ready:', transcript.substring(0, 80));
      }
    } catch (sttErr: any) {
      console.warn('[handleSendVoice] STT pre-pass failed, falling back to audio path:', sttErr.message);
    }

    // ── STEP 2: Main chat call ─────────────────────────────────────────────────
    // When transcript available → send as text (parity with typed messages).
    // When transcript failed → send raw audio (Gemini hears it natively, fallback).
    const chatHistory = messagesRef.current.slice(-50).map(toHistoryEntry);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: transcript ?? '[Voice message — listen to the attached audio and respond to what was said.]',
          history: chatHistory,
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
          // Only send audio when transcript failed (saves tokens when text available)
          ...(!transcript ? { audio_data: audioBase64, audio_mime_type: mimeType } : {}),
          formState: orderIntent ? {
            recipient_name:   orderIntent.recipient_name   || '',
            recipient_phone:  orderIntent.recipient_phone  || '',
            city_name:        orderIntent.city_name        || '',
            delivery_address: orderIntent.delivery_address || '',
            delivery_date:    orderIntent.delivery_date    || '',
            sender_name:      orderIntent.sender_name      || '',
          } : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await processAndApplyToolResponse(data);
      } else {
        console.error('[handleSendVoice] Chat failed:', data.error);
        setErrorToast({
          message: getFriendlyErrorMessage('voice'),
          category: 'voice',
          isRetryable: true,
        });
      }
    } catch (err: any) {
      console.error('[handleSendVoice] Network error:', err);
      setErrorToast({
        message: err.message || 'Network error',
        category: 'network',
        isRetryable: true,
      });
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
      const historyForRetry = truncated.slice(0, -1).map(toHistoryEntry);

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
          history: messagesRef.current.slice(-30).map(toHistoryEntry),
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
    setOrderError(null);
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
    setOrderError(null);
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
        setOrderError(null);
        
        // Push checkout card to dialog history
        const orderMsg: Message = {
          id: `order-${Date.now()}`,
          role: 'assistant',
          content: `Your order is locked and ready! Click "Open Kapruka Checkout" below to complete payment. After paying, Kapruka will email you a KAP tracking number.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          order_created: data.order
        };
        void addMessage(orderMsg);
      } else {
        const msg = data.message || data.error || 'Kapruka did not return a checkout link. Check delivery details and try again.';
        setOrderError(msg);
        setErrorToast({
          message: msg,
          category: 'server',
          isRetryable: true,
        });
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

  // Checkout wizard completion — sends summary message and opens cart
  const handleCheckoutWizardComplete = useCallback((data: OrderIntent) => {
    // Update the order intent so CartDrawer gets prefilled
    setOrderIntent(data);

    // Send a summary message to chat
    const summaryMsg: Message = {
      id: `wizard-${Date.now()}`,
      role: 'assistant',
      content: `Hey, check your details before confirming:\n\n**${data.recipient_name}** in **${data.city_name}**\n📞 ${data.recipient_phone}\n🏠 ${data.delivery_address}\n📅 ${data.delivery_date}${data.gift_message ? `\n🎁 "${data.gift_message}"` : ''}\n\nHead to the cart to review and checkout!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    void addMessage(summaryMsg);

    // Open the cart drawer
    setIsCartOpen(true);
  }, [addMessage]);

  // Open cart drawer
  const handleOpenCart = useCallback(() => {
    setIsCartOpen(true);
  }, []);

  // Renew lock
  const handleRenewOrder = async () => {
    if (cart.length === 0) return;
    setIsOrdering(true);
    setOrderError(null);
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
        setOrderError(null);
      } else {
        setOrderError(data.error || 'Could not renew price lock. Try checkout again.');
      }
    } catch (err) {
      console.error(err);
      setOrderError('Network error while renewing price lock.');
    } finally {
      setIsOrdering(false);
    }
  };

  // Auto-order from chat (wasi_order_now virtual tool)
  const handleChatOrder = async (prefill?: OrderIntent | null) => {
    const intent = prefill || orderIntent;
    if (cart.length === 0 || !intent?.city_name || !intent?.recipient_name) return null;
    setIsOrdering(true);
    setOrderError(null);
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
        setOrderError(null);
        return data.order;
      }
      setOrderError(data.error || 'Checkout failed — missing Kapruka response.');
    } catch (err) {
      console.error('[chatOrder]', err);
      setOrderError('Network error during checkout.');
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
        text: 'Actually, I am in London. Can you show me prices in GBP instead?',
        reply: 'Got it! I have updated everything to GBP for you — your cart total is currently £29.97. Here are more options in your currency.',
        products: discoverProducts.filter(p => p.category === 'Flowers').slice(0, 1),
        delay: 4000
      },
      {
        action: 'checkout',
        text: 'Proceed to guest checkout on Colombo 01',
        reply: 'Verified destination Colombo 01! I have locked your prices. Pay below — the checkout opens right here, no new tab needed.',
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

  const sidebarWidth = sidebarExpanded ? 220 : 80;

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
          {sidebarExpanded && <KaprukaLogo className="h-7 w-auto" />}
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

          {/* Profile completion nudge — only for signed-in users with gaps */}
          {user && profile && missingOptionalFields(profile).length > 0 && (
            <button
              onClick={() => setProfilePromptOpen(true)}
              className="sidebar-item"
              title="Set up your profile"
              style={{ position: 'relative' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.08) 100%)',
                  border: '1px solid rgba(201,168,76,0.3)',
                }}
              >
                <Zap className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
              </div>
              {sidebarExpanded && (
                <span className="sidebar-label text-[11px] font-semibold leading-tight" style={{ color: '#C9A84C' }}>
                  Set up your<br />
                  <span className="font-normal opacity-70">profile</span>
                </span>
              )}
              {/* Subtle glow dot */}
              <span
                className="absolute top-0 right-0 w-2 h-2 rounded-full"
                style={{ background: '#C9A84C', boxShadow: '0 0 6px rgba(201,168,76,0.8)', animation: 'langPulse 2s ease-in-out infinite' }}
              />
            </button>
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

          {/* Sign out — last option, signed-in only */}
          {user && (
            <button
              onClick={() => signOut()}
              className="sidebar-item"
              title="Sign out"
              style={{ color: 'rgba(180, 60, 60, 0.6)' }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(180, 60, 60, 0.06)' }}>
                <LogOut className="w-4 h-4" />
              </div>
              {sidebarExpanded && <span className="sidebar-label text-[12px] font-medium">Sign out</span>}
            </button>
          )}
        </nav>

        {/* ── Order summary card (sidebar) — shows when an order is active ── */}
        {sidebarExpanded && orderResult && orderResult.order_ref && (
          <div className="mx-1 mb-3 p-3 rounded-2xl border border-[#C9A84C]/20 bg-gradient-to-b from-[#FDF9EE] to-white" style={{ boxShadow: '0 2px 12px rgba(201,168,76,0.10)' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Package className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color: '#C9A84C' }}>Order Details</span>
            </div>
            {orderIntent?.recipient_name && (
              <div className="flex items-center gap-1.5 mb-1">
                <User className="w-3 h-3 text-[#5B3E8A] flex-shrink-0" style={{ width: 10, height: 10 }} />
                <span className="text-[10px] font-mono text-[#5B3E8A] truncate">{orderIntent.recipient_name}</span>
              </div>
            )}
            {orderIntent?.city_name && (
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="w-3 h-3 text-[#5B3E8A] flex-shrink-0" style={{ width: 10, height: 10 }} />
                <span className="text-[10px] font-mono text-[#5B3E8A] truncate">{orderIntent.city_name}</span>
              </div>
            )}
            {orderIntent?.delivery_date && (
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3 h-3 text-[#5B3E8A] flex-shrink-0" style={{ width: 10, height: 10 }} />
                <span className="text-[10px] font-mono text-[#5B3E8A]">{orderIntent.delivery_date}</span>
              </div>
            )}
            {orderResult.total_lkr > 0 && (
              <div className="mt-2 pt-2 border-t border-[#C9A84C]/10 flex items-center justify-between">
                <span className="text-[9px] font-mono text-[#B0A8BC] uppercase">Total</span>
                <span className="text-[12px] font-display font-bold" style={{ color: '#402970' }}>
                  {formatPrice(orderResult.total_lkr, (orderIntent?.currency || 'LKR') as Currency)}
                </span>
              </div>
            )}
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="mt-2 w-full py-1.5 rounded-lg text-[10px] font-mono font-bold text-center cursor-pointer transition-all"
              style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8C96B 100%)', color: '#fff', boxShadow: '0 1px 4px rgba(201,168,76,0.25)' }}
            >
              Pay Now
            </button>
          </div>
        )}

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

      {/* ── Mobile tab bar — horizontal echo of the desktop glass pill, shown only below 640px ── */}
      <nav className={`mobile-tabbar ${composerFocused ? 'mobile-tabbar-collapsed' : ''}`} aria-label="Primary">
        <button
          onClick={async () => {
            await clearCart();
            setOrderIntent(null);
            const conv = await createConv({ language });
            if (conv) { setActiveConvId(conv.id); clearMessages(); }
          }}
          className="mobile-tabbar-item"
          title="New conversation"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            const langs: Array<'en' | 'si' | 'ta'> = ['en', 'si', 'ta'];
            const next = langs[(langs.indexOf(language) + 1) % langs.length];
            setLanguage(next);
          }}
          className="mobile-tabbar-item"
          title="Change language"
        >
          <Globe className="w-5 h-5" />
          <span
            className="absolute -bottom-0.5 -right-0.5 text-[7px] font-black font-mono px-1 rounded-full"
            style={{ background: '#402970', color: '#fff', lineHeight: '12px' }}
          >
            {language === 'en' ? 'EN' : language === 'si' ? 'සි' : 'த'}
          </span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className="mobile-tabbar-item"
          title="Cart"
        >
          <ShoppingBag className="w-5 h-5" />
          {cart.length > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[16px] h-[16px] text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5"
              style={{ background: '#0d6efd', boxShadow: '0 1px 4px rgba(13,110,253,0.35)' }}
            >{cart.length}</span>
          )}
        </button>

        {!authLoading && (
          user ? (
            <button
              onClick={() => setProfilePromptOpen(true)}
              className="mobile-tabbar-item is-primary"
              title="Profile"
            >
              <span className="text-[13px] font-bold">{(user.email?.[0] || 'U').toUpperCase()}</span>
            </button>
          ) : (
            <button
              onClick={() => setSignInOpen(true)}
              className="mobile-tabbar-item"
              title="Sign in"
            >
              <LogIn className="w-5 h-5" />
            </button>
          )
        )}
      </nav>

      {/* ── Main content area ──────────────────────────────────────────────── */}
      <div
        className={`app-shell flex flex-col min-h-screen transition-[margin-left] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${messages.length === 0 ? 'needs-tabbar-space' : ''}`}
        style={{ marginLeft: sidebarWidth + 16 }}
      >

      {/* ── Main — chat fills full width ──────────────────────────────────────
           No vertical padding here when the chat is active: ChatSection is a
           fixed 100dvh box with its own internal scroll region (the message
           list). Any padding added around it here pushes total document
           height past one viewport, causing a second, page-level scrollbar
           that fights the chat's own scroll — a "double scroll" bug. ──── */}
      <main className={`flex-1 relative z-10 flex flex-col ${messages.length === 0 ? 'pb-6 pt-4' : ''}`}>

        <ProductTour
          lang={language}
          isSignedIn={!!user}
          open={tourOpen && messages.length === 0}
          onComplete={() => setTourOpen(false)}
          onSignIn={() => setSignInOpen(true)}
          onTryPrompt={(text) => handleSendMessage(text)}
          onLangChange={setLanguage}
        />

        <div className={`flex-1 flex flex-col ${messages.length === 0 ? 'pt-2' : ''}`}>
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
            onLiveToggle={handleLiveToggle}
            isLiveActive={isLiveActive}
            liveState={live.state}
            liveIsMuted={live.isMuted}
            onLiveToggleMic={live.toggleMic}
            liveElapsedLabel={liveElapsedLabel}
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
            cartItems={cart}
            onComposerFocusChange={setComposerFocused}
            onPay={(order) => { if (order) setOrderResult(order); setPaymentModalOpen(true); }}
            onCheckoutWizardComplete={handleCheckoutWizardComplete}
            orderIntent={orderIntent}
            onOpenCart={handleOpenCart}
            onLiveToggle={handleLiveToggle}
            isLiveActive={isLiveActive}
            liveState={live.state}
            liveIsMuted={live.isMuted}
            onLiveToggleMic={live.toggleMic}
            liveElapsedLabel={liveElapsedLabel}
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
              orderError={orderError}
              onClearOrderError={() => setOrderError(null)}
              onRenewOrder={handleRenewOrder}
              isDemoMode={false}
              orderIntent={orderIntent}
              onPay={() => { setIsCartOpen(false); setPaymentModalOpen(true); }}
              preferredCurrency={userCurrency}
            />
          </div>
        </div>
      )}


      {/* ── Save-cart banner — floating overlay above input, non-disruptive ── */}
      {showSaveBanner && !user && (
        <div
          className="fixed z-40 animate-fade-in"
          style={{
            bottom: 90,
            left: sidebarWidth + 32,
            right: 24,
            maxWidth: 680,
            margin: '0 auto',
          }}
        >
          <SaveCartBanner
            visible={showSaveBanner}
            itemsAdded={cart.length}
            lang={language}
            onSignIn={() => setSignInOpen(true)}
            onDismiss={() => { bannerDismissed.current = true; setShowSaveBanner(false); }}
          />
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
            await refreshProfile();
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

      {/* ── Payment Modal (in-app checkout) ─────────────────────────────── */}
      <PaymentModal
        order={orderResult ?? { order_ref: '', order_id: '', pay_url: '', total_lkr: 0, expires_at: '' }}
        cart={cart}
        currency={orderIntent?.currency || 'LKR'}
        deliveryMeta={orderIntent ? {
          recipientName: orderIntent.recipient_name,
          deliveryDate:  orderIntent.delivery_date,
          city:          orderIntent.city_name,
          giftMessage:   orderIntent.gift_message,
          occasion:      orderIntent.occasion,
          senderName:    orderIntent.sender_name,
        } : undefined}
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        lang={language}
      />

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
          className="new-convo-fab fixed bottom-20 right-6 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90 hover:shadow-xl cursor-pointer"
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
