# Wasi Enterprise Architecture Plan

## Kapruka Agent Challenge 2026 — Production-Grade AI Shopping Concierge

### 1. Executive Summary

**Mission:** Build Wasi, a culturally-aware, voice-enabled AI gift concierge for Sri Lanka that wins the Kapruka Agent Challenge by maximizing every rubric point (100/100).

**Current State:** A working but fragile React+Express prototype with 35+ architectural hacks, hardcoded values, and no persistence.

**Target State:** A production-grade, multi-agent system with persistent user sessions, voice interaction, animated visual richness, and end-to-end checkout — deployed on a free tier that stays awake for judges.

**Stack:** Python + FastAPI + LangGraph (backend) | React + Vite + Tailwind (frontend) | Supabase (auth + database) | DeepSeek v4 Flash (LLM) | ElevenLabs Creator (TTS) | Kapruka MCP (commerce)

**Timeline:** 26 days (4 June – 30 June 2026)

---

### 2. Technology Stack — Zero-Cost Deployment

| Layer | Technology | Free Tier Limits | Why |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19 + Vite + Tailwind + Framer Motion | Vercel Hobby: Unlimited deploys, 100GB bandwidth | Global CDN, instant deploys from Git |
| **Backend** | Python 3.12 + FastAPI + LangGraph + Uvicorn | Fly.io: 3 shared-cpu-1x VMs (256MB RAM), no sleep | Persistent VMs, no cold starts |
| **Database** | Supabase PostgreSQL | 500MB storage, 50K MAU, pauses after 1 week inactivity | Native auth, realtime, RLS |
| **Auth** | Supabase Anonymous Auth + Phone OTP | Unlimited users, 50K MAU | Progressive profiling, no signup friction |
| **LLM** | DeepSeek v4 Flash | Pay-as-you-go (~$0.07/1M tokens) | Cheapest capable model, tool calling |
| **TTS** | ElevenLabs Creator | 121K credits/month (~121 min audio) | Professional voice clone, 29 languages |
| **MCP** | Kapruka | Free, public, 60 req/min | Live products, delivery, checkout |
| **Storage** | Supabase Storage | 1GB free | Product images, user avatars |
| **Monitoring**| Sentry + LangSmith | Sentry: 5K errors/mo free | Error tracking, agent observability |

#### Why Not Render Free Tier?
Render Free sleeps after 15 min of inactivity. A judge opening your demo after hours would face a 30-60 second cold start. Unacceptable. Fly.io free VMs never sleep.

#### Why Python Backend Instead of TypeScript?
LangGraph is Python-native. LangGraph-JS exists but is less mature, has fewer examples, and smaller community. For a 26-day sprint, Python's ecosystem wins.

---

### 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              JUDGE / USER                                    │
│                         (Browser / Mobile)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VERCEL (Frontend)                                 │
│  React 19 • Vite • Tailwind • Framer Motion • Web Speech API                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Chat UI     │  │ Product Cards│  │ Cart Drawer │  │ Voice Input/Output  │ │
│  │ (streaming) │  │ (carousel)   │  │ (checkout)  │  │ (ElevenLabs TTS)    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │ HTTPS / SSE
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLY.IO (Backend - FastAPI)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      LANGGRAPH SUPERVISOR                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │   │
│  │  │ Router   │→ │ Product  │→ │ Cart     │→ │ Delivery │→ │Checkout│ │   │
│  │  │ (intent) │  │ Discovery│  │ Manager  │  │ & Logistics│ │ & Pay │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └────────┘ │   │
│  │         ↑________________________________________________↓          │   │
│  │                    (loops back to router)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SUPABASE CHECKPOINTER (PostgresSaver)                              │   │
│  │  • Conversation state persistence                                   │   │
│  │  • Cross-session memory (PostgresStore)                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ELEVENLABS TTS SERVICE                                             │   │
│  │  • Stream audio to frontend                                         │   │
│  │  • Voice clone for Wasi persona                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (Database + Auth)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ auth.users  │  │ profiles    │  │ conversations│ │ messages    │          │
│  │ (anon + permanent)│ (PII)   │  │ (sessions)  │  │ (chat history)│        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ carts       │  │ cart_items  │  │ orders      │  │ order_items │          │
│  │ (persistent)│  │ (products)  │  │ (Kapruka #) │  │ (line items)│          │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KAPRUKA MCP (External)                              │
│  • Search Products • Get Product • Categories • Cities • Check Delivery    │
│  • Create Order • Track Order                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 4. Database Schema (Supabase SQL)

```sql
-- ============================================
-- EXTENSIONS
-- ============================================
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (Progressive PII Collection)
-- ============================================
create table public.profiles (
    id uuid primary key references auth.users on delete cascade,
    email text,
    phone text,
    full_name text,
    address_line_1 text,
    address_line_2 text,
    city text,
    country text default 'Sri Lanka',
    postal_code text,
    preferred_language text default 'en',
    profile_completeness int default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================
-- CONVERSATIONS
-- ============================================
create table public.conversations (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text,
    status text default 'active' check (status in ('active', 'archived', 'closed')),
    occasion text,
    budget int,
    metadata jsonb default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================
-- MESSAGES (with tool call tracking)
-- ============================================
create table public.messages (
    id uuid primary key default uuid_generate_v4(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    role text not null check (role in ('user', 'assistant', 'system', 'tool')),
    content text,
    tool_calls jsonb,
    tool_call_id text,
    audio_url text,
    metadata jsonb default '{}',
    created_at timestamptz default now()
);

-- ============================================
-- CARTS (persistent across sessions)
-- ============================================
create table public.carts (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    status text default 'active' check (status in ('active', 'converted', 'abandoned')),
    metadata jsonb default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table public.cart_items (
    id uuid primary key default uuid_generate_v4(),
    cart_id uuid not null references public.carts(id) on delete cascade,
    product_id text not null,
    product_name text not null,
    quantity int not null default 1 check (quantity > 0),
    unit_price numeric(10,2) not null,
    currency text default 'LKR',
    image_url text,
    metadata jsonb default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================
-- ORDERS
-- ============================================
create table public.orders (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    cart_id uuid references public.carts(id),
    kapruka_order_number text unique,
    kapruka_order_status text default 'pending',
    subtotal numeric(12,2) not null,
    delivery_fee numeric(12,2) default 0,
    total numeric(12,2) not null,
    currency text default 'LKR',
    recipient_name text,
    recipient_phone text,
    delivery_address text,
    delivery_city text,
    delivery_date date,
    gift_message text,
    checkout_url text,
    status text default 'pending' check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================
-- RLS POLICIES
-- ============================================
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;

create policy "Users own their data" on public.profiles for all to authenticated using ((select auth.uid()) = id);
create policy "Users own their conversations" on public.conversations for all to authenticated using ((select auth.uid()) = user_id);
create policy "Users own their messages" on public.messages for all to authenticated using (conversation_id in (select id from public.conversations where user_id = (select auth.uid())));
create policy "Users own their carts" on public.carts for all to authenticated using ((select auth.uid()) = user_id);
create policy "Users own their cart items" on public.cart_items for all to authenticated using (cart_id in (select id from public.carts where user_id = (select auth.uid())));
create policy "Users own their orders" on public.orders for all to authenticated using ((select auth.uid()) = user_id);

-- ============================================
-- REALTIME
-- ============================================
alter publication supabase_realtime add table public.carts;
alter publication supabase_realtime add table public.cart_items;
alter publication supabase_realtime add table public.orders;
```

---

### 5. LangGraph Multi-Agent Design

#### 5.1 Supervisor Router

```python
from typing import Literal
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END, MessagesState

class Route(BaseModel):
    next: Literal["discovery", "cart", "delivery", "checkout", "FINISH"] = Field(
        description="The next specialist to run, or FINISH if done."
    )

llm = ChatOpenAI(
    model="deepseek-v4-flash",
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",
    temperature=0.2,
)

supervisor_prompt = """
You are Wasi, a Sri Lankan gift concierge supervisor.
Given the user's message and conversation history, route to the correct specialist:

- discovery: User wants to find/browse products, needs recommendations
- cart: User wants to add/remove/view cart items
- delivery: User is asking about cities, delivery fees, dates
- checkout: User wants to place an order, needs to provide details
- FINISH: User's request is fully resolved

Respond with the next specialist name.
"""

supervisor_chain = llm.with_structured_output(Route)

def supervisor(state: MessagesState):
    msgs = [("system", supervisor_prompt)] + state["messages"]
    decision = supervisor_chain.invoke(msgs)
    return {"next": decision.next}
```

#### 5.2 Worker Agents (Each with Focused Tools)

- **Discovery Agent:**
  * **Tools:** `kapruka_search_products`, `kapruka_get_product`, `kapruka_list_categories`
  * **System Prompt:** *"You are Wasi's product expert. Search Kapruka, present 3 curated options with images and prices. Always check budget. Never suggest out-of-stock items."*
- **Cart Agent:**
  * **Tools:** `wasi_add_to_cart`, `wasi_remove_from_cart`, `wasi_get_cart`
  * **System Prompt:** *"You manage the shopping cart. Add items only on explicit consent. Show cart total and remaining budget."*
- **Delivery Agent:**
  * **Tools:** `kapruka_list_delivery_cities`, `kapruka_check_delivery`
  * **System Prompt:** *"You handle delivery logistics. Quote accurate fees from MCP. Warn about perishable items. Check date availability."*
- **Checkout Agent:**
  * **Tools:** `kapruka_create_order`, `wasi_collect_pii`
  * **System Prompt:** *"You handle sensitive checkout. Collect name, phone, address, email progressively. Never create order without confirmation. Show exact total before payment."*

#### 5.3 State Persistence

```python
from langgraph.checkpoint.postgres import PostgresSaver

# Use Supabase connection string
DB_URI = os.environ["SUPABASE_PG_URL"]

with PostgresSaver.from_conn_string(DB_URI) as checkpointer:
    checkpointer.setup()
    
    builder = StateGraph(State)
    # ... add nodes and edges ...
    
    graph = builder.compile(checkpointer=checkpointer)
    
    # Resume conversation by thread_id
    config = {"configurable": {"thread_id": conversation_uuid}}
    result = graph.invoke({"messages": [user_message]}, config)
```

---

### 6. ElevenLabs Integration (Creator Tier)

#### 6.1 Voice Strategy

| Use Case | Voice | Model | Settings |
| :--- | :--- | :--- | :--- |
| **Wasi persona** | Professional Voice Clone | `eleven_multilingual_v2` | stability: 0.5, similarity: 0.75, speed: 1.0 |
| **Streaming chat** | Same voice | `eleven_flash_v2_5` | Low latency (~75ms), for real-time feel |
| **Celebration/Emphasis** | Same voice with style: 0.3 | `eleven_multilingual_v2` | Higher expression for "Order placed!" moments |

#### 6.2 Implementation

```python
from elevenlabs import ElevenLabs
import os

client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])

async def stream_tts(text: str, voice_id: str, language_code: str = "en"):
    """Stream TTS audio for chat responses"""
    audio_stream = client.text_to_speech.convert_as_stream(
        voice_id=voice_id,
        text=text,
        model_id="eleven_flash_v2_5",  # Low latency for chat
        output_format="mp3_44100_128",
        voice_settings={
            "stability": 0.5,
            "similarity_boost": 0.75,
            "speed": 1.0
        },
        language_code=language_code  # "en", "si", "ta"
    )
    return audio_stream
```

#### 6.3 Frontend Integration

```javascript
// React hook for TTS playback
const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const speak = async (text: string, language: string) => {
    setIsSpeaking(true);
    const response = await fetch('/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text, language })
    });
    const audioBlob = await response.blob();
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.onended = () => setIsSpeaking(false);
    await audio.play();
  };
  
  return { speak, isSpeaking };
};
```

#### 6.4 Sinhala/Tamil Voice Support
ElevenLabs `eleven_multilingual_v2` supports Tamil natively. For Sinhala, the model supports 70+ languages with `eleven_v3`. Test both models:
- **English chat:** `eleven_flash_v2_5` (fastest)
- **Tamil chat:** `eleven_multilingual_v2` with `language_code: "ta"`
- **Sinhala chat:** `eleven_v3` with `language_code: "si"` (test first)

---

### 7. MCP Integration — Real Findings & Limitations

#### 7.1 Verified Tool Behaviors

| Tool | Real Behavior | Limitation |
| :--- | :--- | :--- |
| **search_products** | "cake" NOW works (returns products). "flowers" returns 0. "teddy" returns 0. | Query sensitivity — must test each term |
| **check_delivery** | Returns rate (not delivery_fee). Batticaloa: `available: false` with `next_available_date` | Rate limit: ~5 calls/min. No standardization |
| **create_order** | Returns `order_ref`, `order_id`, `pay_url`, `checkout_url`, `total_lkr`, `total`, `expires_at` | `summary` field is MISSING in live response |
| **track_order** | Returns `status`, `recipient`, `items`, `timeline`, `has_delivery_photo`, `has_delivery_video` | Unknown orders return `order_not_found` |
| **get_product** | 16 fields including variants, images, attributes, shipping | `rating` is always null |
| **list_delivery_cities** | Batticaloa returns 0 cities! Only major cities indexed | Not all Sri Lankan cities available |

#### 7.2 MCP Rate Limiting Strategy

```python
import asyncio
from functools import wraps

def mcp_rate_limit(calls_per_minute=5):
    """Decorator to enforce MCP rate limiting"""
    min_interval = 60.0 / calls_per_minute
    last_call = [0.0]
    
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            elapsed = asyncio.get_event_loop().time() - last_call[0]
            if elapsed < min_interval:
                await asyncio.sleep(min_interval - elapsed)
            last_call[0] = asyncio.get_event_loop().time()
            return await func(*args, **kwargs)
        return async_wrapper
    return decorator

@mcp_rate_limit(calls_per_minute=5)
async def safe_mcp_call(tool_name, args):
    return await call_mcp_tool(tool_name, args)
```

#### 7.3 Parameter Name Mapping (Critical!)

| Internal Name | MCP Pydantic Name | Tool |
| :--- | :--- | :--- |
| **product_code** | `product_id` | search, get_product, check_delivery |
| **city_code** | `city` | check_delivery, create_order |
| **delivery_date** | `date` | check_delivery (NOT `delivery_date`!) |
| **query (search)** | `q` | `search_products` |
| **products (response)** | `results` | `search_products` |

---

### 8. Creative Features — Ranked by Rubric Impact

#### P0 — Must Build (Highest ROI)

1. **Tanglish Auto-Detection & Response**
   * **Rubric:** Personality (15) + Tanglish Bonus + Experience (30)
   * **How:** Detect Sinhala script OR Latin transliteration (*ammata, podunga, enna, machan*) in user message. Route to Tanglish mode.
   * **MCP Impact:** None — purely LLM prompt engineering
   * **Effort:** 2 hours
2. **Wasi "Thinking" Contextual Animations**
   * **Rubric:** Experience (30) — #1 weighted category
   * **How:** While MCP tools run, show animated Wasi avatar with contextual messages:
     * *"Browsing Kapruka for the best chocolates…"* (searching)
     * *"Checking if we can deliver to Kandy tomorrow…"* (delivery)
     * *"Locking your gift prices with Kapruka…"* (checkout)
   * **Implementation:** Backend streams intermediate states via SSE. Frontend renders with Framer Motion.
   * **Effort:** 3 hours
3. **Occasion-Themed Animated UI Skins**
   * **Rubric:** Visual Richness (20) + Personality (15) + Experience (30)
   * **How:** Dynamic CSS variables + Framer Motion particles per occasion:
     * *Birthday:* Gold confetti, cake emojis
     * *Anniversary:* Rose petals, red gradients
     * *Avurudu:* Oil lamp SVG animations, green/gold
     * *Thank You:* Floating leaf particles, emerald
   * **Effort:** 4 hours
4. **AI Gift Message Writer with Cultural Templates**
   * **Rubric:** Usefulness (15) + Gift Messaging Bonus + Personality (15)
   * **How:** Sparkle button next to gift message textarea. User picks tone (Heartfelt/Funny/Formal) and relationship. LLM generates 3 options in detected language.
     * *Sinhala Template:* "Amma, obage adaraya mawa jivayata sathyakama wenas kala…"
     * *Tamil Template:* "Amma, ungal anbu en vazhkaiyai matrithathu…"
   * **Effort:** 3 hours

#### P1 — High Impact

5. **Sinhala Voice Input + ElevenLabs TTS Output**
   * **Rubric:** Personality (15) + Sinhala Bonus + Experience (30)
   * **How:**
     * *Input:* Web Speech API with `lang: 'si-LK'` or `ta-LK'`
     * *Output:* ElevenLabs `eleven_multilingual_v2` streaming TTS
   * **Effort:** 4 hours
6. **Smart Delivery Calendar with Poya/Festival Markers**
   * **Rubric:** Delivery-Date Bonus + Usefulness (15) + Experience (30)
   * **How:** Custom calendar component marking 2026 Sri Lankan holidays. Warns if Poya day selected with alcohol/chocolate.
   * **Effort:** 4 hours
7. **AI Gift Bundle Composer**
   * **Rubric:** Multi-Item Cart Bonus + Visual Richness (20) + Usefulness (15)
   * **How:** When user mentions occasion without specific product, AI suggests 3-item bundle (main + complement + add-on) under budget. Rendered as stacked visual bundle card.
   * **Effort:** 5 hours

#### P2 — Polish & Wow Factor

8. **One-Click "Surprise Me"**
   * **Rubric:** Experience (30) + End-to-End (15) + Creativity (5)
   * **How:** Floating ✨ button. Chains search → city → delivery → create_order automatically. Shows cinematic progress animation.
   * **Effort:** 5 hours
9. **Animated Checkout Celebration + Shareable Voucher**
   * **Rubric:** Visual Richness (20) + Creativity (5) + Experience (30)
   * **How:** Confetti burst (canvas-confetti), animated gift voucher with QR code linking to tracking page.
   * **Effort:** 4 hours
10. **Sri Lanka Map Tracker**
    * **Rubric:** Visual Richness (20) + End-to-End (15)
    * **How:** SVG map of Sri Lanka. Animate delivery dot from Colombo hub to recipient city based on tracking status.
    * **Effort:** 5 hours

---

### 9. Implementation Roadmap (26 Days)

#### Week 1: Foundation (Days 1-7)

| Day | Task | Deliverable |
| :--- | :--- | :--- |
| **1** | Set up Supabase project, run schema SQL, configure auth | Database live |
| **2** | Scaffold FastAPI backend, integrate DeepSeek, test tool calling | `/api/chat` working |
| **3** | Build LangGraph supervisor + 4 worker agents | Multi-agent routing working |
| **4** | Integrate Supabase PostgresSaver for state persistence | Conversations persist |
| **5** | Port MCP tools to Python, implement rate limiting | All 7 MCP tools callable |
| **6** | Build React frontend shell (chat UI, Tailwind, dark mode) | Frontend renders |
| **7** | Connect frontend to backend, implement SSE streaming | End-to-end chat working |

#### Week 2: Core Features (Days 8-14)

| Day | Task | Deliverable |
| :--- | :--- | :--- |
| **8** | Build product search → card rendering flow | Product cards in chat |
| **9** | Implement cart state (Supabase + frontend sync) | Add/remove/update cart |
| **10**| Build delivery city lookup + fee display | Delivery quotes working |
| **11**| Implement checkout flow (PII collection → order creation) | Orders create successfully |
| **12**| Add tracking query + timeline display | Track order works |
| **13**| Integrate ElevenLabs TTS (Wasi voice clone) | Audio responses play |
| **14**| Add voice input (Web Speech API) | Talk to Wasi works |

#### Week 3: Creative Polish (Days 15-21)

| Day | Task | Deliverable |
| :--- | :--- | :--- |
| **15**| Implement Tanglish detection + response mode | *"Machan, mokakda onda?"* works |
| **16**| Build occasion-themed UI skins + particles | Visual richness demo-ready |
| **17**| Add Wasi "thinking" animations | Loading states feel alive |
| **18**| Build AI gift message writer modal | Cultural message templates |
| **19**| Implement smart delivery calendar | Poya day warnings |
| **20**| Build gift bundle composer | 3-item bundles suggested |
| **21**| Add "Surprise Me" one-click flow | Full auto-checkout demo |

#### Week 4: Testing & Deployment (Days 22-26)

| Day | Task | Deliverable |
| :--- | :--- | :--- |
| **22**| End-to-end testing: all 5 languages, all occasions | Bug fixes |
| **23**| Load testing, MCP rate limit stress test | System stable |
| **24**| Deploy to Fly.io + Vercel, configure custom domain | Live URL |
| **25**| Final polish: animations, copy, edge cases | Production ready |
| **26**| Submission: record demo video, submit to Kapruka | Entry complete |

---

### 10. Deployment Configuration

#### 10.1 Fly.io Backend (`fly.toml`)

```toml
app = "wasi-backend"
primary_region = "sin"  # Singapore (closest to Sri Lanka)

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = false  # NEVER sleep for demo
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512  # Fly.io free tier: 256MB, but we need 512 for LangGraph
```

#### 10.2 Vercel Frontend (`vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://wasi-backend.fly.dev/api/:path*" }
  ]
}
```

#### 10.3 Environment Variables

```bash
# Backend (.env)
DEEPSEEK_API_KEY=sk-...
ELEVENLABS_API_KEY=xi-...
SUPABASE_URL=https://...supabase.co
SUPABASE_KEY=eyJ...
SUPABASE_PG_URL=postgresql://...
KAPRUKA_MCP_URL=https://mcp.kapruka.com/mcp

# Frontend (.env.local)
VITE_API_URL=https://wasi-backend.fly.dev
VITE_SUPABASE_URL=https://...supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

### 11. Testing Strategy

#### 11.1 MCP Contract Tests

```python
# Test each MCP tool with valid + edge case inputs
async def test_mcp_contracts():
    # Search: test all known working + non-working queries
    assert len(await search("chocolate")) > 0
    assert len(await search("flowers")) == 0
    
    # Delivery: test all major cities
    for city in ["Colombo 01", "Kandy", "Galle", "Jaffna"]:
        result = await check_delivery(city)
        assert "rate" in result
        
    # Order: test multi-item cart
    order = await create_order(items=[...])
    assert "checkout_url" in order
```

#### 11.2 LangGraph Integration Tests

```python
# Test each agent independently
def test_discovery_agent():
    state = {"messages": [("user", "Birthday cake under 5000")]}
    result = discovery_agent.invoke(state)
    assert any("cake" in msg.content.lower() for msg in result["messages"])

def test_checkout_agent():
    state = {"messages": [("user", "Place order")], "cart": [...]}
    result = checkout_agent.invoke(state)
    assert "phone" in result["messages"][-1].content.lower()
```

#### 11.3 Frontend E2E Tests (Playwright)

```javascript
// Test: Full checkout flow
test('guest can complete checkout', async ({ page }) => {
  await page.goto('https://wasi-demo.vercel.app');
  await page.click('text=Get Started');
  await page.fill('[placeholder="Message Wasi..."]', 'Birthday gift for amma');
  await page.press('[placeholder="Message Wasi..."]', 'Enter');
  await expect(page.locator('text=chocolate')).toBeVisible();
});
```

---

### 12. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| **DeepSeek API quota** | Medium | High | Fallback to Gemini 1.5 Flash / 3.5 Flash |
| **MCP rate limiting** | High | Medium | Implement 400ms delays + in-memory caching |
| **Fly.io free tier RAM** | Medium | High | Use 512MB (may need $2-3/month) or optimize |
| **Supabase free pauses** | Medium | High | Set up UptimeRobot ping to keep alive |
| **ElevenLabs credits exhausted** | Low | Medium | Cache TTS outputs, limit to first message |
| **Sinhala voice quality poor** | Medium | Medium | Fallback to Tamil (better TTS support) |
| **Multi-agent latency** | Medium | Medium | Stream outputs, use Flash model for routing |
| **Scope creep** | High | High | Strict P0/P1/P2 prioritization, cut P2 if needed |

---

### 13. File Structure

```text
wasi-enterprise/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI entry
│   │   ├── config.py            # Settings
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── supervisor.py    # Router
│   │   │   ├── discovery.py     # Product search
│   │   │   ├── cart.py          # Cart management
│   │   │   ├── delivery.py      # Logistics
│   │   │   └── checkout.py      # Orders
│   │   ├── tools/
│   │   │   ├── __init__.py
│   │   │   ├── mcp_tools.py     # Kapruka MCP wrapper
│   │   │   └── tts_tools.py     # ElevenLabs wrapper
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── schemas.py       # Pydantic models
│   │   │   └── state.py         # LangGraph state
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── language.py      # Tanglish detection
│   │       └── cache.py         # MCP response caching
│   ├── Dockerfile
│   ├── fly.toml
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ChatSection.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── BundleCard.tsx
│   │   │   ├── CartDrawer.tsx
│   │   │   ├── VoiceInput.tsx
│   │   │   ├── WasiAvatar.tsx
│   │   │   ├── ThemeProvider.tsx
│   │   │   ├── SriLankaMap.tsx
│   │   │   └── GiftVoucher.tsx
│   │   ├── hooks/
│   │   │   ├── useSupabase.ts
│   │   │   ├── useTTS.ts
│   │   │   ├── useCart.ts
│   │   │   └── useVoice.ts
│   │   ├── lib/
│   │   │   ├── api.ts           # Backend client
│   │   │   ├── themes.ts        # Occasion themes
│   │   │   └── constants.ts     # MCP mappings
│   │   └── types/
│   │       └── index.ts
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── vercel.json
├── supabase/
│   └── schema.sql
├── docs/
│   ├── MCP_INTEGRATION.md
│   └── DEPLOYMENT.md
├── tests/
│   ├── backend/
│   │   ├── test_mcp.py
│   │   ├── test_agents.py
│   │   └── test_api.py
│   └── frontend/
│       └── e2e/
│           └── checkout.spec.ts
├── README.md
└── .env.example
```

---

### 14. MCP Call Limitations & Workarounds (From Live Testing)

#### 14.1 Rate Limiting
- **Observed limit:** ~5 `check_delivery` calls per minute before *"Error: Rate limit exceeded"*
- **Workaround:**
  * In-memory cache for delivery fees (TTL: 1 hour)
  * Batch delivery checks when possible
  * 400ms artificial delay between MCP calls

#### 14.2 City Search Gaps
- **Issue:** Batticaloa returns 0 cities from `list_delivery_cities`
- **Workaround:** Hardcode common city aliases. Use fuzzy matching on user input.

#### 14.3 Search Query Quirks
- **Cake:** "cake" NOW works (contradicts earlier documentation)
- **Flowers:** "flowers" returns 0
- **Teddy:** "teddy" returns 0
- **Workaround:** Maintain a query translation map:
  ```python
  QUERY_MAP = {
      "flowers": "rose",
      "teddy": "bear",  # test if this works
      "gift": "hamper",
      "toy": "soft toy"
  }
  ```

#### 14.4 Create Order Response Shape
- **Live response keys:** `order_ref`, `order_id`, `pay_url`, `checkout_url`, `total_lkr`, `total`, `expires_at`
- **Missing:** `summary` field documented in `MCP_REAL_FINDINGS.md`
- **Workaround:** Use `total_lkr` for order total. Parse `expires_at` for payment deadline.

#### 14.5 Stock Level Accuracy
- **Stock level:** enum `low`, `medium`, `high` (static at search time, not real-time)
- **Workaround:** Show stock badges but don't block checkout (MCP handles inventory at order time)

---

### 15. ElevenLabs Specific Integration Plan

#### 15.1 Voice Clone for Wasi Persona
Since you have Creator tier ($11/month, 121K credits):
1. Record a warm, friendly voice sample (2-3 minutes of clear speech)
2. Upload to ElevenLabs → Professional Voice Clone
3. Get `voice_id` → use in all TTS calls
4. Test multilingual: Record samples in English, Tamil, and Sinhala

#### 15.2 Streaming Architecture

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from elevenlabs import ElevenLabs

app = FastAPI()
client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])

@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    audio_stream = client.text_to_speech.convert_as_stream(
        voice_id="WASI_VOICE_ID",
        text=request.text,
        model_id="eleven_flash_v2_5",
        output_format="mp3_44100_128"
    )
    
    return StreamingResponse(
        audio_stream,
        media_type="audio/mpeg",
        headers={"X-Voice-Id": "WASI_VOICE_ID"}
    )
```

#### 15.3 Frontend Audio Player

```javascript
// Stream audio without waiting for full download
const playTTS = async (text: string) => {
  const response = await fetch('/api/tts', {
    method: 'POST',
    body: JSON.stringify({ text })
  });
  
  const reader = response.body?.getReader();
  const audioContext = new AudioContext();
  const source = audioContext.createBufferSource();
  
  // Stream chunks as they arrive
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    // Decode and queue audio chunks
  }
};
```

#### 15.4 Credit Budgeting
With 121K credits/month:
- **Average chat message:** 150 characters → 150 credits
- **Messages per session:** ~20 → 3,000 credits
- **Sessions per month:** ~40 full demos → 120K credits
- **Buffer:** Keep 10% for celebration audio, message writer
- **Optimization:** Cache TTS for common phrases ("Hello!", "Added to cart", "Delivery available").

---

### 16. LangGraph Checkpointing with Supabase

#### 16.1 Setup

```python
# pip install langgraph-checkpoint-postgres
from langgraph.checkpoint.postgres import PostgresSaver

# Supabase connection string (Transaction Pooler)
conn_string = "postgresql://postgres:PASSWORD@db.ABC.supabase.co:6543/postgres?sslmode=require"

checkpointer = PostgresSaver.from_conn_string(conn_string)
checkpointer.setup()  # Creates checkpoint tables
```

#### 16.2 Thread Management

```python
# Each conversation = one thread
config = {"configurable": {"thread_id": conversation_id}}

# Resume from last checkpoint
snapshot = graph.get_state(config)

# Get full conversation history
history = list(graph.get_state_history(config))
```

#### 16.3 Cross-Session Memory

```python
from langgraph.store.postgres import PostgresStore

store = PostgresStore.from_conn_string(conn_string)

# Save user preference
await store.aput(
    namespace=(user_id, "preferences"),
    key="shipping_default",
    value={"city": "Colombo 03", "speed": "standard"}
)

# Retrieve in future conversations
memories = await store.asearch(
    namespace=(user_id, "preferences"),
    query="delivery",
    limit=3
)
```

---

### 17. Anti-Patterns to Avoid (Based on Current Code Audit)

| Current Hack | Why It's Bad | Enterprise Fix |
| :--- | :--- | :--- |
| `cachedSessionId` global let | Race conditions under load | Per-request session management |
| `callMcpTool` falls back to simulator silently | Users see fake data without warning | Explicit error states, no silent degradation |
| `isRoleWord` hardcoded Set | Brittle, misses edge cases | LLM-based name extraction with validation |
| Frontend calculates cart totals | Price tampering risk | Server-authoritative pricing only |
| `lastCartActionRef` side-channel | Impossible to debug | Proper event system with Supabase Realtime |
| `ReactMarkdown` renders products | Wall of text, poor UX | Structured JSON responses, rich components |
| `any` types everywhere | Runtime crashes | Pydantic models, strict TypeScript |
| 105 lines of commented dead code | Maintenance burden | Delete or archive to git history |
| `Math.random()` for JSON-RPC IDs | Collision probability | UUIDv4 |
| No input validation on `/api/chat` | Injection attacks | Pydantic request models, rate limiting |

---

### 18. Multi-Language Architecture

#### 18.1 Detection Pipeline

```python
def detect_language(text: str) -> str:
    # 1. Check for Sinhala Unicode
    if re.search(r'[අ-ෆ]', text):
        return 'si'
    
    # 2. Check for Tamil Unicode
    if re.search(r'[அ-ஹ]', text):
        return 'ta'
    
    # 3. Check for Tanglish (Latin transliteration)
    tanglish_words = ['ammata', 'podunga', 'enna', 'machan', 'aiyo', 
                      'dannawa', 'ganna', 'sethunga', 'eppa', 'nallatha']
    if any(word in text.lower() for word in tanglish_words):
        return 'tg'  # Tanglish
    
    # 4. Default to English
    return 'en'
```

#### 18.2 Language-Specific Prompts

```python
LANGUAGE_PROMPTS = {
    'en': "You are Wasi, a friendly Sri Lankan gift concierge. Respond in English.",
    'si': "ඔබ වසී — ශ්රී ලාංකික තෑගි සංවර්ධකයෙක්. සිංහලෙන් පිළිතුරු දෙන්න.",
    'ta': "நீ வசී — இலங்கை பரிசு உதவியாளர். தமிழில் பதிலளிக்கவும்.",
    'tg': "You are Wasi — a Sri Lankan gift concierge. Respond in Tanglish (mix Sinhala and English naturally, like texting a friend: 'machan', 'ammapa', 'podunga')."
}
```

#### 18.3 MCP Query Translation

```python
def translate_search_query(query: str, lang: str) -> str:
    """Convert non-English queries to English for MCP search"""
    translations = {
        'si': {'කේක්': 'cake', 'මල්': 'rose', 'ටෙඩි': 'teddy'},
        'ta': {'கேக்': 'cake', 'மலர்': 'rose', 'டெடி': 'teddy'},
        'tg': {'cake': 'cake', 'rose': 'rose', 'chocolate': 'chocolate'}
    }
    # Simple word replacement (can be expanded)
    return translations.get(lang, {}).get(query.lower(), query)
```

---

### 19. Monitoring & Observability

#### 19.1 LangSmith (Free Tier: 5K traces/month)

```python
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "ls-..."

# Every LangGraph invocation is automatically traced
```

#### 19.2 Sentry (Free Tier: 5K errors/month)

```python
import sentry_sdk
sentry_sdk.init(
    dsn=os.environ["SENTRY_DSN"],
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
)
```

#### 19.3 Custom Metrics

```python
from prometheus_client import Counter, Histogram

mcp_calls = Counter('mcp_calls_total', 'Total MCP calls', ['tool'])
response_time = Histogram('response_duration_seconds', 'Response time')

@mcp_calls.labels(tool='search').inc()
@response_time.observe()
async def search_products(query: str):
    # ...
```

---

### 20. Final Checklist Before Submission

#### 20.1 Functionality
- [ ] Onboarding flow works (language, budget, occasion)
- [ ] Product search returns relevant results
- [ ] Cart add/remove/update works
- [ ] Delivery check shows correct fees for all cities
- [ ] Checkout creates real Kapruka order with pay URL
- [ ] Tracking query returns timeline
- [ ] Multi-item cart supported
- [ ] Gift messaging works
- [ ] Delivery date selection works

#### 20.2 Languages
- [ ] English prompts work end-to-end
- [ ] Sinhala prompts work end-to-end
- [ ] Tamil prompts work end-to-end
- [ ] Tanglish prompts work end-to-end

#### 20.3 Voice (ElevenLabs)
- [ ] TTS plays for English responses
- [ ] TTS plays for Tamil responses
- [ ] TTS plays for Sinhala responses (test quality)
- [ ] Voice input transcribes correctly
- [ ] Audio doesn't autoplay (respect user preference)

#### 20.4 Visual Polish
- [ ] Occasion themes render correctly
- [ ] Product cards show images
- [ ] Animations are smooth (60fps)
- [ ] Mobile responsive
- [ ] Dark mode works

#### 20.5 Deployment
- [ ] URL is live and stays awake
- [ ] Custom domain configured (optional)
- [ ] SSL certificate valid
- [ ] No console errors
- [ ] Load time < 3 seconds

---

### 21. Single-Sentence Pitch to Judges

> "Wasi isn't just a chatbot — it's a culturally-aware, voice-enabled Sri Lankan gift concierge that thinks in Tanglish, celebrates Avurudu with oil lamp animations, builds AI-curated bundles, writes heartfelt Sinhala messages, and tracks your gift across a live map of Sri Lanka — all powered by the live Kapruka MCP, DeepSeek AI, and ElevenLabs voice."

This plan represents a complete, production-grade architecture. The current codebase has served its purpose as a proof-of-concept, but to win the Kapruka Agent Challenge, a clean rebuild with proper multi-agent orchestration, persistent state, voice interaction, and visual richness is essential.

**Estimated total effort:** 120-150 hours over 26 days. Solo builder, fully achievable.

---

## ADDENDUM: Live MCP Findings & Plan Corrections — 2026-06-04

> Source: 149 live wire calls (mcp-max-probe.mjs v2.0) + real Kapruka checkout ground truth

### Corrections to Section 7.1 (MCP Tool Behaviors)

| Tool | Old (Wrong) | Corrected |
|------|-------------|-----------|
| `search_products` | "cake NOW works" | cake ✅ always worked (47 results at limit=50) |
| `search_products` | "flowers returns 0" | ✅ confirmed zero; use "rose" instead |
| `search_products` | unknown | NEW: wine ✅, arrack ✅, beer ✅, saree ✅, shirt ✅, phone ✅, laptop ✅, plush ✅, balloon ✅, candle ✅, ring ✅, rice ✅, vitamin ✅, ayurvedic ✅, book ✅, pet ✅, bicycle ✅ |
| `search_products` | unknown | DEAD: watch, toy, gift, jewellery, grocery, medicine |
| `check_delivery` | "returns rate (not delivery_fee)" | returns `rate`; server normalizes to `delivery_fee` |
| `create_order` | "summary field is MISSING in live response" | **WRONG** — summary IS returned with `delivery_fee`, `items_total`, `grand_total` |
| `list_delivery_cities` | "Batticaloa returns 0 cities" | **WRONG** — Batticaloa returns 1 city ("Batticaloa"); check_delivery returns available:false |
| Rate limit | "~5 calls/min for check_delivery" | **WRONG** — confirmed 60 req/min per session (from ratelimit-limit header) |

### Corrections to Section 7.3 (Parameter Name Mapping)

| Internal | MCP Pydantic | Notes |
|----------|-------------|-------|
| `delivery_date` | `delivery_date` in check_delivery | NOT `date` — mcp.ts normalizes `date`→`delivery_date` |
| `date` | `date` inside delivery block of create_order | Key is `date`, NOT `delivery_date` |
| `sender.email` | ❌ REJECTED | extra_forbidden — Kapruka substitutes guest@kapruka.com |
| `recipient.address` | ❌ REJECTED | Must be in `delivery.address` |
| `recipient.city` | ❌ REJECTED | Must be in `delivery.city` |

### New Findings Not In Original Plan

1. **Delivery fee is a three-tier hierarchy** (authoritative order):
   - Tier 1: Kapruka checkout page (±5 LKR from tier 2)
   - Tier 2: `create_order.summary.delivery_fee` (±5 LKR from tier 1)
   - Tier 3: `check_delivery.rate` (±130 LKR from tier 1 for Jaffna)

2. **Sender email silent substitution**: Kapruka replaces missing email with `guest@kapruka.com`.
   KAP tracking number is emailed only to the address entered on Kapruka's own checkout page.
   Do NOT collect email in the agent flow.

3. **icing_text surcharge**: Rs. 140 per cake item with icing text (server-enforced).

4. **sender.anonymous is optional** (defaults to false).

5. **City aliases fail in check_delivery**: "galagedara" → `city_not_found`. Only canonical names work.

6. **limit=1 returns 0 results**. Minimum effective limit is 2.

7. **sort=relevance / sort=newest returns ≤2 results** — avoid for product browsing.

8. **Order tags at checkout**: Kapruka marks all MCP-agent orders as `ORDCAT-MCP_AGENT` and `[MCP_ORDER-{order_ref}]` internally.

9. **New cities discovered**: Kegalle, Thangalle (via "Galle" query), Nuwara Eliya, Medamahanuwara, Serunuwara, Welikanda Polonnaruwa, Kilinochchiya, Hambanthota (canonical spellings).

### Corrected Delivery Fee Matrix

| City | Old Plan | **Actual (live probe)** |
|------|----------|------------------------|
| Matara | ~1,090 | **1,370** |
| Anuradhapura | ~1,400 | **1,950** |
| Kurunegala | ~950 | **1,290** |
| Trincomalee | ~2,800 | **2,980** |
| Badulla | ~1,500 | **3,140** |
| Jaffna | 2,500 (check_delivery) | **~2,370** (checkout ground truth) |
| Batticaloa | 3,900 | **3,900** ✓ |
| Colombo 01–15 | 300 | **300** ✓ |
| Kandy | 1,075 | **1,075** ✓ |
| Galle | 1,090 | **1,090** ✓ |
| Negombo | 960 | **960** ✓ |

### Updated QUERY_MAP for Section 14.3

```python
QUERY_MAP = {
    "flowers": "rose",         # confirmed zero for "flowers", rose returns 4+
    "teddy": "plush",          # confirmed zero for "teddy", plush returns 3+
    "gift": "hamper",          # confirmed zero for "gift"
    "watch": "ring",           # watch returns 0, ring returns 5+
    "toy": "plush",            # toy returns 0
    "jewellery": "ring",       # jewellery returns 0
    "grocery": "hamper",       # grocery returns 0
    "medicine": "vitamin",     # medicine returns 0
    # NEW additions discovered:
    "alcohol": "arrack",       # arrack, wine, beer all return 4+
    "clothes": "saree",        # saree returns 3+
    "electronics": "phone",    # phone returns 5+
    "health": "vitamin",       # vitamin returns 3+
}
```

### Updated MCP Rate Limit (Section 14.1)

**Actual confirmed**: 60 requests/minute per session (from `ratelimit-limit: 60` header on initialize response). No separate limit for check_delivery. Safe delay between bulk calls: 1.5-2 seconds. No need for the aggressive 400ms limits described in the original plan.

