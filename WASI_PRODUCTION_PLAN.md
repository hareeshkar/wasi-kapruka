# Wasi Production Enhancement Plan

> **Date:** June 5, 2026 | **Stack:** React 19 + Express 4 + DeepSeek v4 Flash + Kapruka MCP
> **Goal:** Add Supabase persistence + ElevenLabs TTS to the existing codebase. No rewrite. 4 days.

---

## 0. Prerequisites — Clean Up First

### Files to DELETE (54 screenshots, 333 playwright traces, 28 outputs)

```bash
cd /Users/hareeshkar/Downloads/wasi

# Screenshots in root (54 files)
rm -f *.png

# Playwright MCP trace directory (333 files)
rm -rf .playwright-mcp/

# Output directory — clear contents, keep directory
rm -f output/*.json output/*.png output/*.jpg

# Old test outputs
rm -f spock-output.json mcp-EXHAUSTIVE-raw.json mcp-FINAL-raw.json mcp-live-*.json

# Temp server logs
rm -f /tmp/wasi-server*.log /tmp/wasi_server*.log /tmp/mcp-*.ts /tmp/mcp-*.js /tmp/mcp-*.json /tmp/mcp-*.mjs

# Enterprise plan (superseded by this one, but keep for historical reference)
# WASI_ENTERPRISE_PLAN.md is kept as reference
```

### Verify before deleting
```bash
ls src/ server.ts MCP_REAL_FINDINGS.md tests/production.mjs package.json .env
```
All 6 should exist. If any are missing, restore them before proceeding.

---

## 1. Current Architecture (What Stays)

```
Browser (React SPA)
  │  React useState for UI state
  │  sessionStorage for language/budget (survives HMR)
  │  All MCP calls proxied through Express
  ▼
Express Server (server.ts — 890 lines)
  │  /api/chat — LLM agentic chat with tool calling
  │  /api/products, /api/cities, /api/check-delivery, /api/create-order
  │  System prompt: FEE DISPLAY RULE, BUDGET GATE, SEARCH ONCE
  ▼
Kapruka MCP (mcp.ts — 960 lines)
  │  Sanitization: email dropped, field names corrected, category inference
  │  Fallback: simulator with real Kapruka product data
  │  Session management with retry logic
```

### What We've Fixed (Stable — Do NOT Touch)
- `mcp.ts`: Email dropped from sender, correct field names, category inference, icing charge detection
- `server.ts`: FEE DISPLAY RULE (never quote fees), BUDGET GATE (add first, warn after), SEARCH ONCE, date context
- `App.tsx`: Case-insensitive cart comparisons, price_lkr fallback, discoveryShown ref, orderIntent merge
- `ChatSection.tsx`: Order card reads from `summary`, icing breakdown, image rendering, no delivery cities
- `CartDrawer.tsx`: sender_name field, perishable warning logic, GATES PASSED text fallback

---

## 2. What We're Adding

| Addition | Why | Files Affected |
|----------|-----|----------------|
| **Supabase persistence** | Cart survives refresh, history loads on mount, no race conditions | `src/lib/supabase.ts` (NEW), `src/hooks/useSupabaseCart.ts` (NEW), `src/hooks/useSupabaseChat.ts` (NEW), `App.tsx` (modify), `server.ts` (modify) |
| **ElevenLabs TTS** | Voice output for all 3 languages, massive wow factor | `src/components/AudioPlayer.tsx` (NEW), `server.ts` (+1 route) |

### What We're NOT Changing
- `src/lib/mcp.ts` — stable
- `src/lib/llm-adapter.ts` — stable
- `src/components/CartDrawer.tsx` — gets cart from hook, no internal changes
- `src/components/ChatSection.tsx` — just one new component added
- `src/types.ts` — already sufficient
- `MCP_REAL_FINDINGS.md` — reference, unchanged
- `tests/production.mjs` — tests remain valid
- System prompt in `server.ts` — all rules stay

---

## 3. Supabase Integration

### 3.1 New Dependency

```bash
npm install @supabase/supabase-js
```

### 3.2 New Files

#### `src/lib/supabase.ts`
Initialize Supabase client with anon key from `.env`. Export helper functions:
- `getOrCreateSession()` — generates/stores session ID in sessionStorage
- `supabase` — the client instance

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export function getOrCreateSession(): string {
  let sid = sessionStorage.getItem('wasi_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('wasi_sid', sid);
  }
  return sid;
}
```

#### `src/hooks/useSupabaseCart.ts`
Replaces `useState(cart)`. Reads from Supabase on mount, writes on mutation.

```typescript
export function useSupabaseCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionId = getOrCreateSession();

  // Load cart from Supabase on mount
  useEffect(() => {
    supabase.from('cart_items').select('*').eq('session_id', sessionId)
      .then(({ data }) => { if (data) setCart(data); setLoading(false); });
  }, []);

  // Add item — writes to BOTH React state and Supabase
  const addItem = async (product: Product, variant?: any) => {
    const newItem = { ... };
    setCart(prev => {
      const existing = prev.find(i => i.product_code.toLowerCase() === product.product_code.toLowerCase());
      if (existing) return prev.map(i => i.product_code.toLowerCase() === product.product_code.toLowerCase() ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, newItem];
    });
    // Write to Supabase (source of truth — survives race condition)
    await supabase.from('cart_items').upsert({ session_id: sessionId, ...newItem });
  };

  const removeItem = async (code: string) => {
    setCart(prev => prev.filter(i => i.product_code.toLowerCase() !== code.toLowerCase()));
    await supabase.from('cart_items').delete().eq('session_id', sessionId).eq('product_code', code);
  };

  const updateQty = async (code: string, qty: number) => {
    if (qty <= 0) { removeItem(code); return; }
    setCart(prev => prev.map(i => i.product_code.toLowerCase() === code.toLowerCase() ? { ...i, quantity: qty } : i));
    await supabase.from('cart_items').update({ quantity: qty }).eq('session_id', sessionId).eq('product_code', code);
  };

  const clearCart = async () => {
    setCart([]);
    await supabase.from('cart_items').delete().eq('session_id', sessionId);
  };

  return { cart, loading, addItem, removeItem, updateQty, clearCart };
}
```

#### `src/hooks/useSupabaseChat.ts`
Replaces `useState(messages)`. Loads conversation history from Supabase, appends on send.

```typescript
export function useSupabaseChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionId = getOrCreateSession();

  // Load messages on mount
  useEffect(() => {
    supabase.from('messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data); setLoading(false); });
  }, []);

  const addMessage = async (msg: Message) => {
    setMessages(prev => [...prev, msg]);
    // Persist to Supabase
    await supabase.from('messages').insert({
      session_id: sessionId,
      role: msg.role,
      content: msg.content,
      tool_calls: (msg as any).toolCalls,
      products: msg.products || null,
      metadata: { order_created: msg.order_created, order_intent: msg.order_intent }
    });
  };

  return { messages, loading, addMessage, sessionId };
}
```

### 3.3 Database Schema (Run in Supabase SQL Editor)

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- conversations
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null,
  occasion text,
  budget int,
  language text default 'en',
  created_at timestamptz default now()
);

-- messages
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text,
  tool_calls jsonb,
  products jsonb,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- carts
create table public.carts (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null unique,
  status text default 'active',
  updated_at timestamptz default now()
);

-- cart_items
create table public.cart_items (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null,
  product_code text not null,
  product_name text not null,
  quantity int not null default 1,
  price_lkr numeric(10,2) not null,
  image_url text,
  category text,
  variant_id text,
  variant_name text,
  created_at timestamptz default now()
);

-- orders
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  session_id text not null,
  kapruka_order_ref text,
  total_lkr numeric(12,2) not null,
  delivery_fee numeric(12,2) default 0,
  items_total numeric(12,2) default 0,
  icing_charge numeric(12,2) default 0,
  recipient_name text,
  recipient_phone text,
  delivery_address text,
  delivery_city text,
  delivery_date date,
  sender_name text,
  checkout_url text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- RLS policies (public access for anonymous guest flow)
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;

create policy "Public access" on public.conversations for all using (true);
create policy "Public access" on public.messages for all using (true);
create policy "Public access" on public.carts for all using (true);
create policy "Public access" on public.cart_items for all using (true);
create policy "Public access" on public.orders for all using (true);
```

### 3.4 App.tsx Changes

Replace these:
```typescript
// OLD — React state only
const [cart, setCart] = useState<CartItem[]>([]);
const [messages, setMessages] = useState<Message[]>([]);
```

With these:
```typescript
// NEW — Supabase-backed hooks
const { cart, loading: cartLoading, addItem, removeItem, updateQty, clearCart } = useSupabaseCart();
const { messages, loading: chatLoading, addMessage, sessionId } = useSupabaseChat();
```

Update all `setCart(...)` calls to use the hook methods (`addItem`, `removeItem`, `updateQty`, `clearCart`).
Update all `setMessages(...)` calls to use `addMessage(...)`.

### 3.5 server.ts Changes

#### Modify `/api/chat` to read/write Supabase
In the chat handler, after receiving the LLM response, persist the user + assistant messages to Supabase:

```typescript
// At the end of the /api/chat handler
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

await supabase.from('messages').insert([
  { session_id: body.session_id, role: 'user', content: message },
  { session_id: body.session_id, role: 'assistant', content: reply, tool_calls: toolCalls, products: linkedProducts }
]);
```

#### Modify `/api/create-order` to read cart from Supabase
For the race condition fix — read cart from Supabase, not request body:

```typescript
// Read cart from Supabase (always current)
const { data: items } = await supabase.from('cart_items')
  .select('*').eq('session_id', body.session_id);

// Use Supabase items for the order
const cartItems = items || body.items; // Fallback to request body
```

---

## 4. ElevenLabs TTS Integration

### 4.1 API Key
```
ELEVENLABS_API_KEY=xi_...  # Add to .env
```

### 4.2 New Route in server.ts

```typescript
// POST /api/tts — converts text to speech audio
app.post('/api/tts', async (req, res) => {
  const { text, language } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });

  // ElevenLabs multilingual voice (supports Sinhala, Tamil, English)
  const voiceId = 'JBFqnCBsd6RMkjVDRZzb'; // Replace with custom voice clone

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.0 },
        language_code: language || 'en',
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return res.status(500).json({ error: err });
  }

  res.set('Content-Type', 'audio/mpeg');
  res.set('Cache-Control', 'public, max-age=86400');
  response.body.pipe(res);
});
```

### 4.3 New Component: `src/components/AudioPlayer.tsx`

```tsx
// 🔊 button per assistant message
// Props: { text, language }
// On click: fetches /api/tts → creates Audio element → plays
// Manages play/pause state with visual feedback
```

### 4.4 Integration in ChatSection.tsx
Add `<AudioPlayer text={msg.content} language={lang} />` next to each assistant message bubble.

### 4.5 Optional: TTS Caching
Cache generated audio blobs per message ID to avoid re-fetching:

```typescript
const audioCache = new Map<string, Blob>();
async function getOrFetchTTS(text: string, lang: string, msgId: string) {
  const key = `${lang}:${msgId}`;
  if (audioCache.has(key)) return audioCache.get(key);
  const res = await fetch('/api/tts', { method: 'POST', body: JSON.stringify({ text, language: lang }) });
  const blob = await res.blob();
  audioCache.set(key, blob);
  return blob;
}
```

---

## 5. Environment Variables

```bash
# Add to .env (do NOT commit)

# Supabase
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Server-side only

# ElevenLabs
ELEVENLABS_API_KEY=xi_...

# DeepSeek (existing)
DEEPSEEK_API_KEY=sk-...
```

---

## 6. Implementation Order

| Step | Task | Files | Time |
|------|------|-------|------|
| **Step 1** | File cleanup (screenshots, traces, outputs) | Root directory | 15 min |
| **Step 2** | Create Supabase project, get API keys, add to .env | `.env` | 15 min |
| **Step 3** | Run schema SQL in Supabase SQL Editor | Supabase dashboard | 10 min |
| **Step 4** | `npm install @supabase/supabase-js` | `package.json` | 1 min |
| **Step 5** | Create `src/lib/supabase.ts` | NEW file | 15 min |
| **Step 6** | Create `src/hooks/useSupabaseCart.ts` | NEW file | 30 min |
| **Step 7** | Create `src/hooks/useSupabaseChat.ts` | NEW file | 30 min |
| **Step 8** | Update `App.tsx` — replace useState with hooks | `App.tsx` | 45 min |
| **Step 9** | Update `server.ts` — read/write Supabase in chat + create-order | `server.ts` | 45 min |
| **Step 10** | Add `/api/tts` route to `server.ts` | `server.ts` | 20 min |
| **Step 11** | Create `AudioPlayer.tsx` component | NEW file | 30 min |
| **Step 12** | Add AudioPlayer to ChatSection.tsx | `ChatSection.tsx` | 10 min |
| **Step 13** | Test: cart survives refresh, chat loads, TTS plays | Browser | 30 min |
| **Step 14** | Run `node tests/production.mjs` — all 45 tests pass | Terminal | 5 min |

**Total: ~6 hours**

---

## 7. Files NOT to Change

These files are **stable** and contain fixes won through 20+ iterations of testing. Do NOT modify them:

| File | Contains |
|------|----------|
| `src/lib/mcp.ts` | MCP sanitization, category inference, fallback simulator, delivery fee matrix |
| `src/lib/llm-adapter.ts` | LLM provider adapters, tool call declarations, response parsing |
| `src/types.ts` | TypeScript interfaces (Order, CartItem, Message, OrderIntent) |
| `src/components/CartDrawer.tsx` | Checkout form, delivery validation, payment lock card, timer |
| `MCP_REAL_FINDINGS.md` | Raw MCP wire specification for all 7 tools |
| `tests/production.mjs` | 45-test production test suite |

---

## 8. Verification — After Implementation

Run these checks:

```bash
# 1. Type-check (must pass)
npx tsc --noEmit

# 2. Production test suite (all 45 must pass)
node tests/production.mjs

# 3. Browser test (manual or Playwright)
# - Add a product to cart → refresh page → verify cart persists
# - Send a chat message → refresh page → verify history loads
# - Click 🔊 button → verify audio plays in selected language
# - Complete a checkout → verify order data saved to Supabase
```
