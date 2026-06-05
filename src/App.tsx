import React, { useState, useEffect, useRef } from 'react';
import { Message, CartItem, Product, Order, City, DeliveryCheckResult, OrderIntent } from './types';
import Onboarding from './components/Onboarding';
import ChatSection from './components/ChatSection';
import CartDrawer from './components/CartDrawer';

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [language, setLanguage] = useState<'en' | 'si' | 'ta'>('en');
  const [budget, setBudget] = useState<number>(0);
  const [occasion, setOccasion] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderResult, setOrderResult] = useState<Order | null>(null);

  // Conversational state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Auto-fill intent extracted from chat (recipient, city, address, phone, message)
  const [orderIntent, setOrderIntent] = useState<OrderIntent | null>(null);

  // Cart→AI feedback: last add/remove action is appended to next chat request then cleared
  const lastCartActionRef = useRef<string>('');

  // Discovery rail for the landing page (pre-chat product previews)
  const [discoverProducts, setDiscoverProducts] = useState<Product[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const discoverLoaded = useRef(false);
  const discoveryShown = useRef(false); // tracks whether first product carousel has been shown

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
        const terms = ['chocolate', 'birthday', 'rose'];
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

  // Serialise cart for AI context — include product_code so LLM knows exact IDs
  const cartForAI = () => cart.map(i => ({
    product_code: i.product_code,
    name: i.name,
    price_lkr: i.price_lkr,
    quantity: i.quantity,
    category: i.category ?? '',
  }));

  // Onboard starting event
  const handleOnboard = async (params: { occasion: string; budget: number; language: 'en' | 'si' | 'ta' }) => {
    setLanguage(params.language);
    setBudget(params.budget);
    setOccasion(params.occasion);
    setIsOnboarded(true);

    // Persist across HMR / page refresh
    sessionStorage.setItem('wasi_session', JSON.stringify({
      language: params.language,
      budget: params.budget,
      occasion: params.occasion,
    }));

    // Bootstrap initial welcoming prompt
    const welcomeMsg: Message = {
      id: 'welcome',
      role: 'assistant',
      content: params.language === 'si'
        ? `ආයුබෝවන්! 🌿 මම වාසි, ඔබේ කපෘක තෑගි උපදෙස්කරු. ඔබ ඔබේ ${params.occasion} අවස්ථාව වෙනුවෙන් රු. ${params.budget.toLocaleString()} ක උපරිමයකින් තෑග්ගක් සොයන බව මට වැටහුණා. මම ඒ සඳහා හොඳම දේවල් සොයාදෙන්නම්!`
        : params.language === 'ta'
        ? `வணக்கம்! 🌿 நான் வாசி, உங்கள் கப்ருகா பரிசுத் துணைவன். உங்களின் ${params.occasion} நிகழ்விற்காக ரூ. ${params.budget.toLocaleString()} பட்ஜெட்டில் சரியான பரிசைத் தேடத் தொடங்குகிறேன்!`
        : `Aney cardially welcome! 🌿 I am Wasi, your Kapruka gift concierge. I see we are planning a special ${params.occasion} surprise with a budget constraint of Rs. ${params.budget.toLocaleString()} LKR. Let me pull up some of Kapruka's bestselling ideas for you!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([welcomeMsg]);

    setIsStreaming(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Find a gift for ${params.occasion}, budget Rs.${params.budget} LKR. Greet warmly, show 2–4 relevant products under Rs.${params.budget}, then ask who the recipient is and their Sri Lankan city.`,
          history: [],
          language: params.language,
          budget: params.budget,
          occasion: params.occasion,
          cart: [],
        })
      });
      const data = await res.json();
      if (data.success) {
        const linkedProducts: Product[] = [];
        const linkedSeen = new Set<string>();
        const suggestedCities: City[] = [];
        let orderCreated: Order | undefined;

        if (data.toolCalls) {
          for (const tc of data.toolCalls) {
            if (tc.toolName === 'kapruka_search_products') {
              const results = Array.isArray(tc.result) ? tc.result : (tc.result?.results ?? tc.result?.products ?? []);
              for (const p of results) {
                if (p && p.product_code && !linkedSeen.has(p.product_code)) {
                  linkedSeen.add(p.product_code);
                  linkedProducts.push(p);
                }
              }
            }
            // Normalize kapruka_get_product single-item response to Product shape
            if (tc.toolName === 'kapruka_get_product' && tc.result && !tc.result._raw_string) {
              const raw = tc.result;
              const normalized: Product = {
                product_code: raw.id ?? raw.product_code ?? '',
                name: raw.name ?? '',
                price_lkr: raw.price?.amount ?? raw.price_lkr ?? 0,
                category: raw.category?.name ?? raw.category ?? '',
                image_url: raw.images?.[0] ?? raw.image_url ?? '',
                description: raw.description ?? raw.summary ?? '',
                stock_level: raw.stock_level ?? (raw.in_stock ? 'high' : 'low'),
                variants: raw.variants,
              };
              if (normalized.product_code && !linkedSeen.has(normalized.product_code)) {
                linkedSeen.add(normalized.product_code);
                linkedProducts.push(normalized);
              }
            }
            if (tc.toolName === 'kapruka_list_delivery_cities') {
              const cities = Array.isArray(tc.result) ? tc.result : (tc.result?.cities ?? []);
              suggestedCities.push(...cities);
            }
            if (tc.toolName === 'kapruka_create_order' && tc.result?.order_ref) {
              orderCreated = tc.result;
            }
            if (tc.toolName === 'wasi_prefill_checkout' && tc.result) {
              setOrderIntent(prev => ({ ...prev, ...tc.result }));
            }
            if (tc.toolName === 'wasi_add_to_cart' && tc.result) {
              const p = tc.result;
              if (p.price_lkr > params.budget) continue;
              if (cart.some(i => i.product_code.toLowerCase() === p.product_id.toLowerCase())) continue;
              // silent=true — LLM already replied, no second chat call
              handleAddToCart({
                product_code: p.product_id, name: p.product_name,
                price_lkr: p.price_lkr, image_url: p.image_url,
                category: p.category,
              }, p.variant_id ? { id: p.variant_id, name: p.variant_name, price_lkr: p.price_lkr } : undefined, true);
            }
            if (tc.toolName === 'wasi_remove_from_cart' && tc.result?.product_id) {
              handleRemoveItem(tc.result.product_id);
            }
            if (tc.toolName === 'wasi_update_cart_quantity' && tc.result?.product_id) {
              handleUpdateQty(tc.result.product_id, tc.result.quantity ?? 1);
            }
            if (tc.toolName === 'wasi_order_now' && tc.result) {
              const order = await handleChatOrder();
              if (order) orderCreated = order;
            }
            if (tc.toolName === 'wasi_show_progress' && tc.result) {
              setMessages(prev => [...prev, {
                id: `progress-${Date.now()}-${tc.result.step}`,
                role: 'assistant',
                content: `*${tc.result.message}*`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }]);
            }
          }
        }

        const withinBudget = filterByBudget(linkedProducts, params.budget);
        // Onboarding: always show cards on first discovery
        const showProducts = withinBudget.length > 0;
        if (showProducts) discoveryShown.current = true;
        const replyMsg: Message = {
          id: `reply-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          products: showProducts ? withinBudget : undefined,
          city_suggest: suggestedCities.length > 0 ? suggestedCities : undefined,
          order_created: orderCreated,
          order_intent: data.toolCalls?.find((tc: any) => tc.toolName === 'wasi_prefill_checkout')?.result
        };
        setMessages(prev => [...prev, replyMsg]);
      }

      // ── below is handleOnboard catch block
    } catch (err) {
      console.error(err);
    } finally {
      setIsStreaming(false);
    }
  };

  // Main conversational submission hook
  const handleSendMessage = async (text: string) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
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
          history: messages.slice(-50).map(m => ({
            role: m.role,
            content: m.content + (m.products?.length ?
              '\n[Searched products: ' + m.products.map(p => `${p.name} (code=${p.product_code}, Rs.${p.price_lkr})`).join('; ') + ']' : '')
          })),
          language,
          budget,
          occasion,
          cart: cartForAI(),
          lastCartAction: lastCartAction || undefined,
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
      const data = await res.json();
      if (data.success) {
        const linkedProducts: Product[] = [];
        const linkedSeen = new Set<string>();
        const suggestedCities: City[] = [];
        let orderCreated: Order | undefined;
        let trackingData: any = undefined;

        // Collect prefill data from this turn to pass directly to order handler
        let currentPrefill: OrderIntent | null = null;

        if (data.toolCalls) {
          for (const tc of data.toolCalls) {
            // Live MCP: kapruka_search_products returns {results:[...]}
            if (tc.toolName === 'kapruka_search_products') {
              const results = Array.isArray(tc.result) ? tc.result : (tc.result?.results ?? tc.result?.products ?? []);
              for (const p of results) {
                if (p && p.product_code && !linkedSeen.has(p.product_code)) {
                  linkedSeen.add(p.product_code);
                  linkedProducts.push(p);
                }
              }
            }
            // kapruka_get_product returns a single product with a different shape — normalize it
            if (tc.toolName === 'kapruka_get_product' && tc.result && !tc.result._raw_string) {
              const raw = tc.result;
              const normalized: Product = {
                product_code: raw.id ?? raw.product_code ?? '',
                name: raw.name ?? '',
                price_lkr: raw.price?.amount ?? raw.price_lkr ?? 0,
                category: raw.category?.name ?? raw.category ?? '',
                image_url: raw.images?.[0] ?? raw.image_url ?? '',
                description: raw.description ?? raw.summary ?? '',
                stock_level: raw.stock_level ?? (raw.in_stock ? 'high' : 'low'),
                variants: raw.variants,
              };
              if (normalized.product_code && !linkedSeen.has(normalized.product_code)) {
                linkedSeen.add(normalized.product_code);
                linkedProducts.push(normalized);
              }
            }
            if (tc.toolName === 'kapruka_list_delivery_cities') {
              const cities = Array.isArray(tc.result) ? tc.result : (tc.result?.cities ?? []);
              suggestedCities.push(...cities);
            }
            if (tc.toolName === 'kapruka_create_order' && tc.result?.order_ref) {
              orderCreated = tc.result;
              setOrderResult(tc.result);
            }
            if (tc.toolName === 'kapruka_track_order' && tc.result?.status) {
              trackingData = tc.result;
            }
            if (tc.toolName === 'wasi_prefill_checkout' && tc.result) {
              currentPrefill = { ...orderIntent, ...tc.result };
              setOrderIntent(currentPrefill);
            }
            if (tc.toolName === 'wasi_add_to_cart' && tc.result) {
              const p = tc.result;
              // Budget gate — same guard as handleOnboard
              if (budget > 0 && p.price_lkr > budget) continue;
              // silent=true: LLM already replied this turn — don't fire a second AI call
              handleAddToCart({
                product_code: p.product_id, name: p.product_name,
                price_lkr: p.price_lkr, image_url: p.image_url,
                category: p.category,
              }, p.variant_id ? { id: p.variant_id, name: p.variant_name, price_lkr: p.price_lkr } : undefined, true);
            }
            if (tc.toolName === 'wasi_remove_from_cart' && tc.result?.product_id) {
              handleRemoveItem(tc.result.product_id);
            }
            if (tc.toolName === 'wasi_update_cart_quantity' && tc.result?.product_id) {
              handleUpdateQty(tc.result.product_id, tc.result.quantity ?? 1);
            }
            if (tc.toolName === 'wasi_show_progress' && tc.result) {
              setMessages(prev => [...prev, {
                id: `progress-${Date.now()}-${tc.result.step}`,
                role: 'assistant' as const,
                content: `*${tc.result.message}*`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }]);
            }
            if (tc.toolName === 'wasi_order_now') {
              const order = await handleChatOrder(currentPrefill || orderIntent);
              if (order) {
                orderCreated = order;
                setOrderResult(order);
              }
            }
          }
        }

        const withinBudget = filterByBudget(linkedProducts, budget);
        // Product cards ONLY show on the very first assistant message (initial discovery).
        const showProducts = withinBudget.length > 0 && !discoveryShown.current;
        if (showProducts) discoveryShown.current = true;
        const replyMsg: Message = {
          id: `reply-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          products: showProducts ? withinBudget : undefined,
          city_suggest: suggestedCities.length > 0 ? suggestedCities : undefined,
          order_created: orderCreated,
          tracking_result: trackingData,
          order_intent: data.toolCalls?.find((tc: any) => tc.toolName === 'wasi_prefill_checkout')?.result
        };
        setMessages(prev => [...prev, replyMsg]);
      }

      // ── below is the handleSendMessage catch (same function)
    } catch (err) {
      console.error(err);
    } finally {
      setIsStreaming(false);
    }
  };

  // ── Cart operations ────────────────────────────────────────────────────────
  // silent=true when called from the LLM tool loop — the LLM already replied that turn,
  // so we skip the notifyAIProductAdded follow-up call to prevent a double response.
  const handleAddToCart = (product: Product, variant?: any, silent = false) => {
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

    setCart(prev => {
      const existing = prev.find(i => i.product_code.toLowerCase() === product.product_code.toLowerCase());
      if (existing) {
        return prev.map(i =>
          i.product_code.toLowerCase() === product.product_code.toLowerCase() ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, newItem];
    });

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
      content: `Added to bundle: "${product.name}"${variantNote} — Rs.${price.toLocaleString()} LKR`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, addedMsg]);
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
          history: messages.slice(-30).map(m => ({
            role: m.role,
            content: m.content + (m.products?.length ?
              '\n[Products: ' + m.products.map(p => `${p.name} (code=${p.product_code}, Rs.${p.price_lkr})`).join('; ') + ']' : '')
          })),
          language,
          budget,
          occasion,
          cart: cartSnapshot,
          lastCartAction: `Just added: ${product.name} (Rs.${price.toLocaleString()})`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, {
          id: `bundle-reply-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
      }
    } catch (err) {
      console.error('[bundle notify]', err);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleUpdateQty = (code: string, qty: number) => {
    if (qty <= 0) { handleRemoveItem(code); return; }
    setCart(prev => prev.map(item =>
      item.product_code.toLowerCase() === code.toLowerCase() ? { ...item, quantity: qty } : item
    ));
  };

  const handleRemoveItem = (code: string) => {
    const item = cart.find(i => i.product_code.toLowerCase() === code.toLowerCase());
    if (item) lastCartActionRef.current = `Removed "${item.name}" from cart`;
    setCart(prev => prev.filter(item => item.product_code !== code));
  };

  const handleClearCart = () => {
    setCart([]);
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
  }) => {
    setIsOrdering(true);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          gift_message: recipient.gift_message,
          sender_name: recipient.sender_name || 'Guest',
          anonymous: false,
          currency: 'LKR'
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
        setMessages(prev => [...prev, orderMsg]);
      }
    } catch (err) {
      console.error(err);
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
          currency: 'LKR'
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
    setMessages(currentMsgList);

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
        setMessages(currentMsgList);
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
          setMessages(currentMsgList);

          currentStep++;
          runNextDemoStep();
        }, 3000);

      }, 1500);
    };

    runNextDemoStep();
  }; */ // END DEMO TOUR — DISABLED

  return (
    <div className="min-h-screen bg-breathing flex flex-col font-sans text-[#1A1A1A]">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="px-6 py-3 border-b border-black/5 bg-white/85 backdrop-blur-md shadow-sm sticky top-0 z-30 select-none">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setIsOnboarded(false); setMessages([]); }}>
            <div className="w-9 h-9 bg-gradient-to-br from-[#0F6E56] to-[#0A5C45] rounded-xl flex items-center justify-center text-white font-display font-bold text-base shadow-md shadow-[#0F6E56]/20">
              W
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-[#0A5C45] leading-none">
                Wasi <span className="text-[#C0392B]">Concierge</span>
              </h1>
              <p className="text-[9px] font-mono font-semibold text-gray-400 uppercase tracking-wider">
                Powered by Kapruka MCP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live MCP indicator — always on */}
            <div className="flex items-center gap-2 bg-[#E1F5EE] px-3 py-1.5 rounded-full border border-[#0F6E56]/20">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[11px] font-semibold text-[#0A5C45]">Live MCP</span>
            </div>

            {/* Occasion chip — shown when onboarded */}
            {isOnboarded && occasion && (
              <div className="hidden sm:flex items-center gap-1.5 bg-[#FDF3DC] px-3 py-1.5 rounded-full border border-amber-200/60">
                <span className="text-[11px] font-semibold text-amber-700">{occasion}</span>
                {budget > 0 && (
                  <span className="text-[10px] font-mono text-amber-600">· Rs.{budget.toLocaleString()}</span>
                )}
              </div>
            )}

            {isOnboarded && (
              <button
                onClick={() => { setIsOnboarded(false); setMessages([]); setCart([]); setOrderResult(null); }}
                className="text-[11px] font-semibold text-[#6B6B6B] hover:text-[#1A1A1A] border border-black/8 px-3 py-1.5 rounded-full bg-white cursor-pointer active:scale-95 transition-all shadow-xs"
              >
                New Gift
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main workspace ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-5">
        {!isOnboarded ? (
          <Onboarding
            onOnboard={handleOnboard}
            onStartDemo={() => {}} // DEMO DISABLED — noop
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7">
              <ChatSection
                messages={messages}
                isStreaming={isStreaming}
                onSendMessage={handleSendMessage}
                lang={language}
                onAddToBundle={handleAddToCart}
                onQuickReply={handleSendMessage}
                cartSize={cart.length}
              />
            </div>
            <div className="lg:col-span-5">
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
      </main>

      <footer className="py-5 border-t border-black/5 bg-white/70 backdrop-blur-sm text-center text-[10px] text-gray-400 font-mono">
        Wasi by Kapruka · AI Gift Concierge · Live MCP · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
