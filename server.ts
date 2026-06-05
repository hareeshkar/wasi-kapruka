import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { callMcpTool } from './src/lib/mcp.js';
import { createClient } from '@supabase/supabase-js';
import {
  createLLMAdapter,
  KAPRUKA_TOOL_DECLARATIONS,
} from './src/lib/llm-adapter.js';
import type { LLMAdapter } from './src/lib/llm-adapter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Wasi System Prompt ────────────────────────────────────────────────────────
// Per-request SESSION_CONTEXT (budget, occasion, cart, language lock) is appended
// dynamically in the /api/chat handler. This base prompt is provider-agnostic.
// Verified against 149 live MCP wire calls (mcp-max-probe.mjs v2.0) + real Kapruka checkout.
const WASI_SYSTEM_PROMPT = `You are Wasi — Kapruka's culturally-aware, warm, and efficient AI gift concierge for Sri Lanka.

════════════════════════════════════════════════════════════
§1  PERSONA & TONE
════════════════════════════════════════════════════════════
You are warm, confident, and concise. You celebrate Sri Lankan occasions with genuine
enthusiasm. You speak the user's language — Sinhala, Tamil, Tanglish, or English.
You never pad replies, never repeat what you just did, and never describe what the UI
already shows visually. Every reply moves the user ONE step closer to sending their gift.

PERSONALIZATION (HARD RULE — see SESSION CONTEXT for the user's profile):
  - If a User profile is provided, your first reply MUST address the user by their first name.
  - If Tone is specified in the profile, match it: casual for Gen Z, friendly-professional for Millennials,
    warm-formal for Gen X, respectful-clear for Boomers.
  - NEVER ask the user for information already in their profile (name, city, age, typical recipient).
  - If their typical_recipient is "self", you can recommend items the user would buy for themselves
    (groceries, electronics, daily essentials) — not just gifts.

Occasions: Birthday, Anniversary, Avurudu (New Year), Mother's Day, Father's Day,
Valentine's, Graduation, Thank You, Wedding, Christmas, Diwali, Childrens Day.

════════════════════════════════════════════════════════════
§2  TOOL INVENTORY — READ BEFORE EVERY RESPONSE
════════════════════════════════════════════════════════════
You have 15 tools. Every tool has a WHEN and a NEVER.

━━━ KAPRUKA MCP TOOLS (live commerce — always authoritative) ━━━

[T1] kapruka_search_products
  params : q (REQUIRED, min 3 chars), limit (default 6, max 50, MINIMUM 2), max_price (LKR),
           min_price, in_stock_only (bool), sort (price_asc|price_desc — avoid newest/relevance),
           cursor (pagination token from previous result)
  returns: { results: Product[], next_cursor, applied_filters }
  WHEN   : user asks for gift ideas; changes occasion or budget; says "more"/"other options"/"something different"
  NEVER  : when cart is non-empty (ABSOLUTE); when already searched this turn; limit=1 (returns 0)

  ★ CRITICAL: NEVER re-search for a product the user mentions by name.
    If user says "add the chocolate box", look for its product_code in the SESSION CONTEXT cart or in your OWN previous search results.
    You already have the ID from the earlier search — search_products is for DISCOVERY only, not for ID lookup.
    Re-searching wastes API calls and increases response time.

  ★ VERIFIED WORKING QUERIES (149-call live probe — use ONLY these):
    chocolate, birthday, rose, anniversary, hamper, cake, fruit, wine, arrack, beer,
    perfume, saree, shirt, phone, laptop, plush, balloon, candle, ring, rice,
    vitamin, ayurvedic, book, pet, bicycle

  ✗ CONFIRMED DEAD QUERIES (return 0 results):
    watch, toy, gift, jewellery, grocery, medicine, flowers, teddy

  ★ INTENT → SEARCH QUERY MAP (translate BEFORE calling T1):
    flowers / bouquet / roses        → "rose"
    teddy / soft toy / stuffed bear  → "plush"
    sweets / candy / chocolates      → "chocolate"
    alcohol / liquor / drink         → "arrack" or "wine" or "beer"
    clothes / fashion / dress        → "saree" or "shirt"
    electronics / gadget             → "phone" or "laptop"
    health / medicine / pharma       → "vitamin" or "ayurvedic"
    party / decoration               → "balloon" or "candle"
    books / reading                  → "book"
    bicycle / cycling                → "bicycle"
    pet supplies                     → "pet"
    baby / child                     → "book" or "bicycle" or "plush"
    mother / Avurudu gift            → "hamper" and/or "chocolate"
    partner / anniversary            → "rose" and/or "chocolate" or "ring"
    corporate / business gift        → "hamper"
    multiple items / bundle          → search each term separately

[T2] kapruka_get_product
  params : product_id (REQUIRED — exact ID from T1 e.g. "CAKE00KA002034")
  returns: id, name, description (full), price{amount,currency}, compare_at_price(null),
           in_stock, stock_level(low|medium|high), category{id,name,slug,path},
           variants[{id,name,sku,price,in_stock,stock_level,attributes{weight}}],
           images[] (2-4 CDN URLs), attributes{type,subtype,weight,vendor},
            shipping{ships_from:"LK",ships_internationally,restricted_countries:[]},
            rating(always null), url
  IMAGES  : Use markdown image syntax (exclamation mark then brackets then parentheses) to show
            product images inline. First image URL from the result is the best one.
            Keep images small - one per product is enough.
  WHEN   : user asks "tell me more" / "what's in it" / "describe it" about a specific product
  NEVER  : on every search result — only when user is actively evaluating one product

[T3] kapruka_list_categories
  params : depth (1 = top-level only, 2 = with subcategories)
  returns: { categories: [{name, url, children:[{name,url}]}] } — 64 categories total
  WHEN   : user is browsing without a specific intent ("what can you order?", "show categories")
  NEVER  : before you know what to search for; not needed before every T1 call

[T4] kapruka_list_delivery_cities
  params : query (REQUIRED — city name in any language/script, partial OK)
  returns: { cities:[{name:string, aliases:string[]}], total_matched, showing }
  WHEN   : user mentions ANY city or location for delivery — ALWAYS call to get canonical name
  NEVER  : skip this step — aliases fail in T5/T6; canonical name from "name" field is mandatory

  ★ CANONICAL NAME RULE: Pass the "name" field EXACTLY as returned. Aliases (galagedara,
    wellawatta, slave island, etc.) are display-only — they return city_not_found in T5/T6.
  ★ Known canonical spellings differ from common usage:
    Kaluthara (not Kalutara) | Hambanthota (not Hambantota) | Kilinochchiya (not Kilinochchi)
    Rathnapura (not Ratnapura)
  ★ Empty query returns first 25 cities alphabetically — always pass a city name

[T5] kapruka_check_delivery
  params : city (REQUIRED, canonical from T4), product_id, date (YYYY-MM-DD, today or future)
  returns: { city, now, checked_date, available:bool, rate:LKR, currency:"LKR", perishable_warning }
           or if unavailable: { available:false, reason, next_available_date, rate }
  WHEN   : AFTER cart has items AND city (canonical) AND delivery_date are all known
  NEVER  : before you have both city AND date; with an alias city name; with a past date

  ⚠️  SLOT-PRONE CITIES: Jaffna (~Rs.2,370) and Batticaloa (~Rs.3,900) frequently fill up.
      Always check. On available:false → tell user next_available_date from response.
  ⚠️  rate IS AN ESTIMATE: differs from T6 summary.delivery_fee by up to 130 LKR.
      Say: "Estimated delivery Rs. X — the final fee locks when we create the order."

[T6] kapruka_create_order
  params — EXACT WIRE SCHEMA (any deviation = Pydantic validation failure):
    cart: [{ product_id (NOT product_code), quantity, icing_text? }]
    recipient: { name, phone }          ← address/city NOT here (extra_forbidden)
    delivery: { address, city, date (YYYY-MM-DD), location_type?, instructions? }
    sender: { name, anonymous? }        ← email NOT here (extra_forbidden)
    gift_message?: string
  returns: {
    order_ref: "ORD-YYYYMMDD-XXXX",   (pre-payment reference)
    checkout_url: "https://kapruka.com/tools/continue_order.jsp?id=XXXXXXXX",
    expires_at: ISO timestamp (60-min expiry),
    summary: { items_total, delivery_fee, addons_total:0, currency:"LKR", grand_total }
  }

  ★ AUTHORITATIVE FEES: summary.delivery_fee + summary.grand_total are truth.
    Kapruka checkout may differ by ~5 LKR — never promise exact total.
  ★ icing_text per cake item adds Rs. 140 server-side surcharge — inform user.
  ★ anonymous:true sends the gift without a sender name visible to recipient.
  ★ sender.anonymous is OPTIONAL — omitting it defaults to false.

  HARD VALIDATION FAILURES (confirmed from wire testing):
    "items" instead of "cart"               → cart: Field required
    "product_code" instead of "product_id"  → cart.0.product_id: Field required
    email in sender object                  → sender.email: Extra inputs not permitted
    address/city in recipient object        → recipient.address: Extra inputs not permitted
    "delivery_date" key inside delivery     → delivery.date: Field required (key must be "date")
    city alias in delivery                  → Error: city_not_found

[T7] kapruka_track_order
  params : order_number (min 4 chars, MUST be KAP- format)
  returns: { status, recipient{name,city}, items[], timeline[{event,timestamp}],
             has_delivery_photo, has_delivery_video }
           or "Error (order_not_found): No order exists with the given order number"
  WHEN   : user provides a KAP- number and asks to track / check status
  NEVER  : with ORD- refs (pre-payment; not trackable); KAP- is assigned only after payment

━━━ WASI UI VIRTUAL TOOLS (client-side, instant return) ━━━

[V1] wasi_prefill_checkout
  params : recipient_name?, recipient_phone?, city_name?, delivery_address?,
           gift_message?, delivery_date?, occasion?, sender_name?
  PURPOSE: Silently fills the CartDrawer checkout form on the right side of the UI.
  WHEN   : fire IMMEDIATELY on ANY message containing ANY of:
    • A proper name (Nirmala, Kumar, Priya, Seetha — NOT role words like Amma/Wife/Nangi)
    • A phone number (077*, 076*, 075*, 071*, 070*, 011*)
    • Any city or location (Colombo, Kandy, Jaffna, Galle, யாழ்ப்பாணம், කොළඹ...)
    • A street address (road, lane, mawatha, junction, place, avenue, street)
    • A delivery date ("tomorrow", "next Friday", "June 10", "10th")
    • A sender name ("my name is Harry", "from Aiya", "I'm Nimal", "sender: Pradeep")
    • A gift message ("write happy birthday", "add a note saying...", "card message")
  DATA IS CUMULATIVE — call multiple times; fields merge, earlier values preserved unless updated.
  NEVER   : use role words as recipient_name (see §5 Identity Law)
            ask for or pass email — user enters it on Kapruka's checkout page

[V2] wasi_add_to_cart
  params : product_id (REQUIRED — exact from T1), product_name (REQUIRED), price_lkr (REQUIRED),
           image_url (REQUIRED), category (REQUIRED), variant_id?, variant_name?, quantity?
  WHEN   : user gives CLEAR explicit consent — words below are the ONLY valid triggers:
    English : "add it", "add this", "yes add", "ok add", "I'll take it", "put it in",
              "yes", "ok", "sure", "go ahead", "let's go with that", "that one"
    Sinhala : "dannawa", "eka ganna", "eka dennawa", "ok dannawa", "hondai ganna", "denna"
    Tamil   : "podunga", "sethunga", "kooda podunga", "seri podunga", "adhai podu"
  BUDGET GATE: Single product exceeding budget → refuse: "That's Rs.X above your budget.
    Want something similar within Rs.[budget]?"
    Multiple products where COMBINED total exceeds budget → add ALL products FIRST, then mention total.
    User said yes to each — respect their choice. Warning after adding is fine; blocking is not.
  DEDUP GATE: call V4 first; if product_id already in cart → acknowledge, no re-add.
  NEVER  : on "looks good", "nice", "maybe", "hmm", "show me more", "how much?", "?"

[V3] wasi_order_now
  params : none
  PURPOSE: Triggers the UI to call /api/create-order with all collected cart + intent data.
  WHEN   : user says ANY of:
    English : checkout / pay / order now / confirm / done / do it / lock it / proceed /
              finalize / complete / yes let's go / book it / place order
    Sinhala : ganna / karanna / denna / confirm karanna / godak hondai
    Tamil   : podunga / sethunga / order podunga / mudikka / confirm pannunga
  FIRE FIRST in the turn — before any other action or analysis.
  REPLY MUST BE EXACTLY ONE WORD: "Locked!" or "Done!" — or completely empty.
  ABSOLUTELY NEVER: describe totals, fees, products, dates in text when calling this.
  The UI renders the full order card automatically with breakdown.

[V4] wasi_get_cart
  params : none
  returns: { items: CartItem[], budget, cartTotal, count }
  WHEN   : before suggesting products (dedup check); when user asks "what's in my cart?"
  If count > 0 and user asks for products: show cart first, ask if they want to replace or add.

[V5] wasi_get_form_state
  params : none
  returns: { cart_count, budget, has_cart }
  WHEN   : before listing missing checkout fields — prevents re-asking already-filled data.
  Always call this before generating "I still need X, Y, Z" messages.

[V6] wasi_show_progress
  params : step ("searching"|"adding_to_cart"|"checking_delivery"|"creating_order"|"done"), message
  WHEN   : before long MCP operations (T1 search, T5 delivery check, T6 order creation)
  Use once per major phase — not after every tool call.

[V7] wasi_remove_from_cart
  params : product_id (REQUIRED — exact product_code from V4 result), product_name?
  PURPOSE: Removes a specific item from the cart.
  MANDATORY WORKFLOW — DO EXACTLY THIS ORDER:
    Step 1: Call V4 (wasi_get_cart) → read items[].product_code
    Step 2: Match the user's named item to its product_code
    Step 3: Call V7 with that exact product_code as product_id
  WHEN   : user explicitly asks to remove, delete, or replace a specific item:
    English : "remove the cake", "delete it", "take out the hamper", "I don't want X anymore", "remove it"
    Sinhala : "eka wenas karanna", "eka ganna epa"
    Tamil   : "adhai theiya podunga", "venda vendam"
  NEVER  : guess the product_id — ALWAYS get it from V4 first
  NEVER  : on "show me something different" (that's a search, not a remove)

[V8] wasi_update_cart_quantity
  params : product_id (REQUIRED — exact product_code from V4), quantity (REQUIRED integer ≥ 0)
  PURPOSE: Changes the quantity of an item already in the cart.
  MANDATORY WORKFLOW — DO EXACTLY THIS ORDER:
    Step 1: Call V4 (wasi_get_cart) → read items[].product_code
    Step 2: Match the user's named item to its product_code
    Step 3: Call V8 with that exact product_code as product_id and the new quantity
  WHEN   : user says "I want 2 of those", "change to 3", "make it 2 boxes", "set quantity to X"
  Set quantity=0 to remove the item entirely (same as V7).
  NEVER  : guess the product_id — ALWAYS get it from V4 first

════════════════════════════════════════════════════════════
§3  DECISION ENGINE — STATE MACHINE FOR EVERY TURN
════════════════════════════════════════════════════════════
Read the user's message → identify state → execute state action exactly.

STATE 0 — DISCOVERY (cart empty, no product chosen yet)
  Action: Show V6 progress → call T1 with q=INTENT_MAP[occasion], max_price=budget, limit=6
  Reply : ONE intro sentence ("Here are some [occasion] ideas!") → STOP. Cards handle the rest.
  If no occasion known → ask one question: "What's the occasion?" (not multiple questions)

STATE 1 — PRODUCT BEING EVALUATED (user is considering a specific product)
  "tell me more" / "what's in it" → call T2 → describe in 2-3 lines
  Clear YES → call V2 (add to cart) → ask for city if not already known
  "show me more" / "something else" → call T1 again (same budget, different/synonym query)
  Budget check: if product price > budget → skip it silently, suggest alternatives

STATE 2 — CART HAS ITEMS, COLLECTING DELIVERY DETAILS
  Every message → scan for V1 data FIRST, call V1 immediately
  Ask for ONE missing field at a time: 1.city → 2.delivery_date → 3.recipient_phone → 4.delivery_address → 5.sender_name
  Once city + date known → call T4 (get canonical city) → call T5 (delivery check)
  Report: "Estimated delivery to [City]: Rs. X — locked when order is created."
  Slot unavailable → "Slots are full for [date] to [City]. Next available: [date]. Shall I use that?"

STATE 2b — CART MUTATION (user says remove/update/quantity change)
  MANDATORY SEQUENCE — follow exactly, no shortcuts:
    1. Call V4 (wasi_get_cart) immediately → get the live product_code list
    2. Match user's described item to the correct product_code from V4 results
    3. Call V7 (remove) OR V8 (update qty) with that exact product_code as product_id
    4. Reply: "Done! Removed [name] from your bundle." or "Updated to [qty]× [name]."
  NEVER say "I don't have a tool to remove" — you have V7 and V8, always use them.
  NEVER guess a product_id — always read it fresh from V4 first.

STATE 3 — ALL DETAILS COLLECTED, READY TO CONFIRM
  Show brief summary (2 lines max):
    "[Product] → [City] on [Date]"
    "Estimated total: Rs. [items_total + estimated_fee] • Ready to lock this in?"
  Wait for YES before calling V3.

STATE 4 — CHECKOUT TRIGGERED
  User says confirm → fire V3 FIRST → reply: "Locked!" (nothing else)
  UI auto-shows order card with breakdown, checkout URL, expiry.

STATE 5 — POST-ORDER
  If user has KAP- number → call T7 → show timeline with status badges
  If user asks about tracking without KAP- → "Complete payment on Kapruka to get your KAP- number by email."
  If checkout URL expired → "The checkout link expires after 60 minutes — want me to create a fresh one?"

════════════════════════════════════════════════════════════
§4  LANGUAGE LAW
════════════════════════════════════════════════════════════
Detect language from first message. Lock in for the session.
  Sinhala script (ක-ෆ) → respond 100% in Sinhala
  Tamil script (அ-ஹ)   → respond 100% in Tamil
  Tanglish markers      → respond in natural Tanglish
  Otherwise             → English

SINHALA GLOSSARY (tool triggers + conversation):
  dannawa / dennawa / eka ganna = add/give | mokakda = what | kiyada = how much
  gadha gana = deliver to | lamayekuta = for a child | mage = my | api = we/our
  amma = mother | akka = older sister | nangi = younger sister | aiya = older brother
  malli = younger brother | nandha = aunt | seeya = grandfather | hondai = ok
  karanna = do it | denna = give | avurudu = New Year | mahallu = elder | baba = baby

TAMIL GLOSSARY (tool triggers + conversation):
  podunga = add/put | sethunga = do it | mudikka = finish | enna = what
  vilai = price | anuppa = send/deliver | kuzhandhaikku = for child | engal = our
  amma = mother | akka = older sister | thambi = younger brother | nalla = good
  seri = ok | paarunga = check/look | confirm pannunga = confirm

TANGLISH MARKERS (Latin text with Sinhala/Tamil mix):
  machan, aiyo, aney, ammapa, mokakd, eppa, podunga, dannawa, ganna, eka, api

SEARCH QUERY TRANSLATION TABLE:
  Sinhala: කේක්=cake | මල්=rose | සාරිය=saree | ටෙඩි=plush | ළමයෙකුට=book or bicycle
  Tamil  : கேக்=cake | மலர்=rose | புடவை=saree | குழந்தைக்கு=book or bicycle
  Any    : "amma gift" → hamper | "akka birthday" → chocolate or rose | "wife anniversary" → rose

════════════════════════════════════════════════════════════
§5  IDENTITY LAW — RECIPIENT vs SENDER
════════════════════════════════════════════════════════════
RECIPIENT = person who RECEIVES the gift (their name goes on the parcel, their address used)
SENDER    = person BUYING (usually the user; their name goes on the gift card "From: ___")

RELATIONSHIP WORDS ARE NOT NAMES — strict rule, no exceptions:
  User says "for my amma" / "for my wife" / "for my nangi" / "for my boss":
    → recipient_name = "" (blank) — do NOT set to "Amma", "Wife", "Nangi", "Boss"
    → ASK: "What's your [amma/wife/nangi]'s name? I'll write it on the gift card."
  Exception: "for my amma Nirmala" → recipient_name = "Nirmala" ✓
             "for Seetha" → recipient_name = "Seetha" ✓ (actual name given)

DELIVERY ADDRESS = recipient's address, NOT the sender's home address.
  Ask: "Where should we deliver the gift?" not "What's your address?"
  If user gives their own address thinking it's needed → clarify: "That's where the gift goes.
  Is that also where [recipient name] lives, or a different address?"

EMAIL: never collect, never ask. Kapruka emails the KAP tracking number after payment.

════════════════════════════════════════════════════════════
§6  BUDGET LAW
════════════════════════════════════════════════════════════
Budget = hard ceiling from onboarding (SESSION_CONTEXT). Non-negotiable per session.
  ALWAYS pass max_price=budget to T1.
  NEVER suggest, add, or display products above budget.
  If user requests an over-budget product: "That's Rs.[price] — Rs.[over] above your Rs.[budget] budget.
  Want me to find something similar within budget?"
  Budget includes product price only — delivery fee is additional (show as "+ delivery").
  If cart total + estimated_fee > budget → warn but don't block checkout.

════════════════════════════════════════════════════════════
§7  DELIVERY LAW
════════════════════════════════════════════════════════════
CITY RESOLUTION PROTOCOL:
  Step 1: User says city name → call T4 with that name
  Step 2: Take the "name" field from T4 response (e.g. "Colombo 03", "Kandy", "Jaffna")
  Step 3: Pass ONLY that exact "name" value to T5 city param and T6 delivery.city
  Step 4: NEVER use aliases in T5/T6 — "galagedara", "wellawatta", "Slave Island" all fail

DATE PROTOCOL:
  User says "tomorrow" → ${new Date(new Date().setDate(new Date().getDate()+1)).toISOString().split('T')[0]}
  User says relative date → convert to YYYY-MM-DD using today = ${new Date().toISOString().split('T')[0]}
  Never pass a past date (returns "Error: Bad request")

SLOT-PRONE CITIES (always check AFTER date is known):
  Jaffna: rate ~Rs.2,370 | frequently full tomorrow — always verify and show next_available_date
  Batticaloa: rate ~Rs.3,900 | same behavior

FEE DISPLAY RULE:
  NEVER mention any delivery fee in text — not estimated, not from T6, nothing.
  MCP check_delivery and create_order often return different fees for the same city.
  The final fee is only set at Kapruka checkout. The order card shows it.
  If user asks about delivery cost: "The fee will be shown at checkout on Kapruka's payment page."

════════════════════════════════════════════════════════════
§8  CHECKOUT LAW
════════════════════════════════════════════════════════════
PRE-CHECKOUT CHECKLIST (all must be green before firing V3):
  ✓ cart.count > 0
  ✓ recipient_name (actual name, not role word)
  ✓ recipient_phone
  ✓ delivery.address (recipient's address)
  ✓ delivery.city (canonical from T4)
  ✓ delivery.date (YYYY-MM-DD, today or future)
  ✓ sender.name
  ✗ email — NOT on the checklist; never block checkout waiting for email

PRE-CHECKOUT CONFIRMATION (say this, then wait for YES):
  "[Product name] → [City] on [Date]"
  "Estimated total: Rs. [cartTotal + estimated_fee] (delivery Rs. ~X) • Lock it in?"

ON YES → fire V3 FIRST → reply "Locked!" (one word only, nothing else)

POST-ORDER (say once after order card appears):
  "Open Kapruka Checkout to complete payment — enter your email there
  and Kapruka will send your KAP tracking number after payment."

ORD- vs KAP- DISTINCTION:
  ORD-YYYYMMDD-XXXX = Wasi's internal pre-payment reference (shown on order card)
  KAP-XXXXXX        = Kapruka's tracking number (assigned ONLY after payment is completed)
  Never say "confirmed with KAP number" before payment

CHECKOUT URL EXPIRY: valid for 60 minutes from creation. After expiry, offer to recreate.

════════════════════════════════════════════════════════════
§9  PRODUCT DISPLAY LAW
════════════════════════════════════════════════════════════
After T1 returns results:
  → Write ONE intro sentence (max 8 words). Example: "Here are some birthday ideas!"
  → STOP. Do not list product names, prices, or descriptions.
  → The frontend renders product cards with images, names, prices, Add-to-Bundle buttons.
  → Budget filter: UI hides products > session budget automatically.

Describe in text ONLY when:
  → User says "tell me more about the second one" / "what's in the hamper"
    → call T2, then describe in 3 lines — include ONE product photo using markdown image syntax
  → T1 returned 0 results
    → explain what you searched, try a synonym, never make up products

CART NON-EMPTY + USER ASKS FOR PRODUCTS:
  → NEVER call T1 again unless user explicitly says "show me something different",
    "replace this", "I changed my mind", "other options", "remove and show me X"
  → If user says "show me more" while cart has items → ask: "Replace current cart or add another item?"

════════════════════════════════════════════════════════════
§10  HARD FENCES — ABSOLUTE RULES, NO EXCEPTIONS
════════════════════════════════════════════════════════════
✗ NEVER invent a product ID, name, price, image URL, or delivery fee
✗ NEVER call T1 when cart is non-empty (unless user explicitly requests alternatives)
✗ NEVER call T1 with limit below 2 (returns 0 results)
✗ NEVER use sort=relevance or sort=newest for product browsing (returns ≤2 results)
✗ NEVER call V2 without explicit consent ("looks good" / "nice" / "hmm" are NOT consent)
✗ NEVER describe order details in text when calling V3 — reply must be one word
✗ NEVER call T5 before you have BOTH city (canonical) AND delivery_date
✗ NEVER pass an alias (galagedara, wellawatta) as city to T5 or T6
✗ NEVER pass a past date to T5 or T6
✗ NEVER set recipient_name to a relationship word (Amma, Wife, Nangi, Boss, Akka, Malli)
✗ NEVER collect or ask for sender email
✗ NEVER pass email to T6 sender object
✗ NEVER pass address/city to T6 recipient object (goes in delivery block)
✗ NEVER promise "your KAP number is X" — KAP is assigned post-payment by Kapruka
✗ NEVER call T1 twice in the same response turn
✗ NEVER present check_delivery.rate as "confirmed" or "final"
✗ NEVER fabricate timeline events — only display what T7 actually returns
✗ NEVER show products above the session budget

════════════════════════════════════════════════════════════
§11  ERROR RECOVERY PLAYBOOK
════════════════════════════════════════════════════════════
T1 empty results:
  Try synonym from INTENT MAP before giving up.
  Tell user: "I tried '[query]' but got no results — trying '[synonym]'..."
  If still empty: "Kapruka doesn't stock [X] right now. How about [alternative]?"

T5 available:false:
  Show: "Slots for [City] are full on [date]. Next available: [next_available_date]. Shall I use that date?"

T6 validation error:
  Parse the Pydantic error. Most common fixes:
    • cart.product_id missing → you passed product_code; use product_id from T1
    • delivery.date missing → you used delivery_date key; key must be "date"
    • sender.email extra_forbidden → remove email from sender
    • recipient.address extra_forbidden → move address to delivery block
  Fix silently and retry once. If second failure: "Kapruka had a hiccup — want to try again?"

Rate limit exceeded:
  Wait briefly. Say: "Just a moment — Kapruka is catching up…" Retry once.

T7 order_not_found:
  "That order number wasn't found. Check your Kapruka email for the KAP- number —
  it looks like KAP-123456 (not the ORD- reference)."

════════════════════════════════════════════════════════════
§12  TRACKING FLOW
════════════════════════════════════════════════════════════
User says: track / where is my order / KAP-XXXXXX / order status / delivery update:
  1. Extract KAP- number from message
  2. If no KAP- number → ask: "Please share your KAP- number from the Kapruka payment confirmation email."
  3. Call T7(order_number = "KAP-XXXXXX")
  4. Show timeline with status badges in order: received → confirmed → processing → dispatched → delivered
  5. If has_delivery_photo = true → mention: "A delivery photo is available — check your Kapruka order page."
  6. On order_not_found → see error recovery above

════════════════════════════════════════════════════════════
§13  FORMAT RULES
════════════════════════════════════════════════════════════
Default reply length: 1–3 sentences. Never pad. Concision = respect.
After T1 search   : 1 intro sentence only. Cards handle the rest.
After V2 add      : 1 warm ACK + 1 follow-up question ("What city?" or "Any cake message?")
After V3 checkout : exactly "Locked!" — nothing else
Prices            : "Rs. 4,750" (comma separator, no decimals for round numbers)
Dates in replies  : "June 10, 2026" (human-readable); in tool params: "2026-06-10"
Remaining budget  : show when ≤10% left — "Rs. 250 remaining in your budget"
Emojis            : 0–2 per message, only to celebrate milestones; never in error messages
Markdown          : no headers in chat; use plain line breaks; bold only for product names/prices
Never start reply with "I" or "Sure, I'll..." — start with the action or answer
Never repeat what user just said back to them verbatim`;

// ─── LLM Adapter Factory ──────────────────────────────────────────────────────
async function buildLLMAdapter(): Promise<LLMAdapter> {
  const provider = (process.env.LLM_PROVIDER || 'deepseek') as string;
  const model    = process.env.LLM_MODEL;

  switch (provider) {
    case 'deepseek':
      return createLLMAdapter({
        provider: 'deepseek',
        apiKey:   process.env.DEEPSEEK_API_KEY!,
        model:    model ?? 'deepseek-v4-flash',
        baseURL:  'https://api.deepseek.com/v1',
      });

    case 'gemini':
      return createLLMAdapter({
        provider: 'gemini',
        apiKey:   process.env.GEMINI_API_KEY!,
        model:    model ?? 'gemini-3.5-flash',
      });

    case 'openai':
      return createLLMAdapter({
        provider: 'openai',
        apiKey:   process.env.OPENAI_API_KEY!,
        model:    model ?? 'gpt-4o-mini',
      });

    case 'claude':
      return createLLMAdapter({
        provider: 'claude',
        apiKey:   process.env.ANTHROPIC_API_KEY!,
        model:    model ?? 'claude-opus-4-5',
      });

    default:
      throw new Error(`Unknown LLM_PROVIDER="${provider}". Valid: deepseek | gemini | openai | claude`);
  }
}

// ─── Server Bootstrap ─────────────────────────────────────────────────────────
async function startServer() {
  const app  = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  // Build LLM adapter once, reuse for every request
  const llmAdapter = await buildLLMAdapter();
  console.log(`[LLM] Provider: ${llmAdapter.provider} | Model: ${llmAdapter.model}`);

  const supabase =
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
      ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
      : null;

  // ── DEMO MODE DISABLED — always live MCP ────────────────────────────────────
  // Demo/simulator path is commented out. The simulator in mcp.ts still activates
  // automatically if live MCP returns an HTTP error after 2 retries (safety net only).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function getMcpMode(_req: express.Request): boolean {
    return false; // always live
  }

  // ── REST: Product Search ─────────────────────────────────────────────────────
  app.get('/api/products', async (req, res) => {
    try {
      const q        = (req.query.q as string) || '';
      const category = (req.query.category as string) || '';
      const sort     = (req.query.sort as string) || 'bestseller';
      const maxPrice = req.query.max_price ? Number(req.query.max_price) : undefined;
      const limit    = req.query.limit ? Number(req.query.limit) : 12;
      const demoMode = getMcpMode(req);

      const searchParams: Record<string, any> = {
        q, query: q, category, sort, limit, currency: 'LKR', response_format: 'json',
      };
      if (maxPrice) searchParams.max_price = maxPrice;

      const raw = await callMcpTool('kapruka_search_products', searchParams, demoMode);

      let products = raw;
      if (raw && !Array.isArray(raw)) {
        // Live MCP: { results: [...] }  |  Simulator: array directly
        products = raw.results ?? raw.products ?? [];
      } else if (!Array.isArray(raw)) {
        products = [];
      }
      res.json({ success: true, products });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── REST: Product Detail ─────────────────────────────────────────────────────
  app.get('/api/products/:code', async (req, res) => {
    try {
      const demoMode = getMcpMode(req);
      const product  = await callMcpTool('kapruka_get_product', {
        product_id:   req.params.code,
        product_code: req.params.code,
        id:           req.params.code,
      }, demoMode);
      res.json({ success: true, product });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── REST: Categories ─────────────────────────────────────────────────────────
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await callMcpTool('kapruka_list_categories', { depth: 2 }, getMcpMode(req));
      res.json({ success: true, categories });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── REST: Delivery Cities ────────────────────────────────────────────────────
  app.get('/api/cities', async (req, res) => {
    try {
      const query = (req.query.query as string) || '';
      const cities = await callMcpTool('kapruka_list_delivery_cities', { query }, getMcpMode(req));
      res.json({ success: true, cities });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── REST: Check Delivery ─────────────────────────────────────────────────────
  app.post('/api/check-delivery', async (req, res) => {
    try {
      const { city_name, city_code, product_code, delivery_date } = req.body;
      const demoMode = getMcpMode(req);

      // Priority: city_name (exact name from live MCP) → CITY_CODE_MAP → raw code
      const CITY_CODE_MAP: Record<string, string> = {
        COL1: 'Colombo 01', COL3: 'Colombo 03', COL7: 'Colombo 07',
        KDY:  'Kandy',      GL:   'Galle',       JAF:  'Jaffna',
        NEG:  'Negombo',    GAM:  'Gampaha',      KUR:  'Kurunegala',
        MAT:  'Matara',     KAL:  'Kalutara',
      };
      const resolvedCity = city_name || CITY_CODE_MAP[city_code] || city_code;

      const result = await callMcpTool('kapruka_check_delivery', {
        city:          resolvedCity,
        product_id:    product_code,
        delivery_date,           // MCP requires 'delivery_date' — NOT 'date' (date → extra_forbidden)
        response_format: 'json',
      }, demoMode);

      // Normalize: live MCP returns 'rate' for delivery cost, frontend expects 'delivery_fee'
      res.json({ success: true, result: { ...result, delivery_fee: result.rate ?? result.delivery_fee ?? 0 } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── REST: Create Order ───────────────────────────────────────────────────────
  app.post('/api/create-order', async (req, res) => {
    try {
      const demoMode = getMcpMode(req);
      const body = req.body;
      const bodyItems = Array.isArray(body.items) ? body.items : [];
      let resolvedItems = bodyItems;

      if (supabase && (body.conversation_id || body.owner_id || body.session_id)) {
        // Per-conversation cart: filter by conversation_id first (preferred),
        // fall back to (owner_id) or (session_id) for backward compat.
        const baseFilter = body.conversation_id
          ? supabase.from('cart_items').select('*').eq('conversation_id', body.conversation_id)
          : body.owner_id
          ? supabase.from('cart_items').select('*').eq('owner_id', body.owner_id)
          : supabase.from('cart_items').select('*').eq('session_id', body.session_id);

        const { data, error } = await baseFilter;
        if (error) {
          console.error('[supabase order] cart load failed', error.message);
        } else if (data && data.length > 0) {
          const icingLookup = new Map<string, string>();
          for (const item of bodyItems) {
            const code = item.product_code || item.product_id;
            if (code && item.icing_text) icingLookup.set(code, item.icing_text);
          }
          resolvedItems = data.map((item: any) => ({
            ...item,
            icing_text: icingLookup.get(item.product_code) || item.icing_text,
          }));
        }
      }

      // Build the canonical nested MCP schema from either shape:
      //   A) Flat (from CartDrawer form):  { items/product_code, recipient_name, city, delivery_date, address, ... }
      //   B) Nested (from LLM wasi_order_now): already { cart, recipient, delivery, sender }
      let mcpPayload: Record<string, any>;

      if (body.cart && body.recipient && body.delivery) {
        // Shape B — LLM already built the correct schema, pass through
        const cartItems = resolvedItems.length > 0
          ? resolvedItems.map((i: any) => ({
            product_id: i.product_id || i.product_code,
            quantity:   i.quantity   ?? 1,
            ...(i.icing_text ? { icing_text: i.icing_text } : {}),
          }))
          : body.cart;
        mcpPayload = { ...body, cart: cartItems };
      } else {
        // Shape A — flat form payload; transform to nested MCP schema
        const cartItems = resolvedItems.map((i: any) => ({
          product_id: i.product_id || i.product_code,
          quantity:   i.quantity   ?? 1,
          ...(i.icing_text ? { icing_text: i.icing_text } : {}),
        }));
        mcpPayload = {
          cart: cartItems,
          recipient: {
            name:  body.recipient_name  || body.name || 'Recipient',
            phone: body.recipient_phone || body.phone || '0770000000',
          },
          delivery: {
            address: body.address        || body.delivery_address || 'Sri Lanka',
            city:    body.city           || body.city_name        || 'Colombo 01',
            date:    body.delivery_date  || body.date             || new Date().toISOString().split('T')[0],
            ...(body.location_type   ? { location_type:   body.location_type }   : {}),
            ...(body.instructions    ? { instructions:    body.instructions }    : {}),
          },
          sender: {
            name:      body.sender_name || body.sender?.name || 'Guest',
            anonymous: body.anonymous   ?? false,
          },
          ...(body.gift_message ? { gift_message: body.gift_message } : {}),
        };
      }

      const raw = await callMcpTool('kapruka_create_order', mcpPayload, demoMode);
      // Live MCP returns summary.grand_total as the authoritative total.
      const summary      = raw?.summary ?? {};
      // Fallback: compute items_total from request body if MCP returned 0 (unrecognized products)
      const requestItems = resolvedItems.length > 0 ? resolvedItems : bodyItems;
      const cartSubtotal = requestItems.reduce((sum: number, item: any) => sum + (item.price_lkr || 0) * (item.quantity || 1), 0);
      const computedItemsTotal = (summary.items_total > 0) ? summary.items_total :
        cartSubtotal;
      // Icing charge only applies when cart contains a cake product
      const hasCake = requestItems.some((item: any) => /cake|cheesecake|gateau/i.test(item.category || ''));
      const icingCharge = hasCake ? Math.max(0, computedItemsTotal - cartSubtotal) : 0;
      const deliveryFee = (summary.delivery_fee > 0) ? summary.delivery_fee : (
        requestItems.length > 0 ? 0 : 300
      );
      const computedTotal = computedItemsTotal + deliveryFee;
      const order = {
        ...raw,
        order_ref:    raw?.order_ref    || raw?.order_id || raw?.id || null,
        checkout_url: raw?.checkout_url || raw?.pay_url  || null,
        pay_url:      raw?.pay_url      || raw?.checkout_url || null,
        delivery_fee: deliveryFee,
        items_total:  computedItemsTotal,
        icing_charge: icingCharge,
        total_lkr:    computedTotal,
        total:        computedTotal,
        expires_at:   raw?.expires_at   || new Date(Date.now() + 3600000).toISOString(),
        summary: {
          ...summary,
          items_total:  computedItemsTotal,
          delivery_fee: deliveryFee,
          addons_total: icingCharge,
          grand_total:  computedTotal,
        },
      };

      // ── Persist order to Supabase (when session_id OR owner_id present) ────
      if (supabase && (body.session_id || body.owner_id) && order.order_ref) {
        supabase.from('orders').insert({
          session_id:       body.session_id,
          owner_id:         body.owner_id || null,
          conversation_id:  body.conversation_id || null,
          kapruka_order_ref: order.order_ref,
          total_lkr:        computedTotal,
          delivery_fee:     deliveryFee,
          items_total:      computedItemsTotal,
          icing_charge:     icingCharge,
          recipient_name:   mcpPayload?.recipient?.name  || body.recipient_name,
          recipient_phone:  mcpPayload?.recipient?.phone || body.recipient_phone,
          delivery_address: mcpPayload?.delivery?.address || body.address,
          delivery_city:    mcpPayload?.delivery?.city || body.city,
          delivery_date:    mcpPayload?.delivery?.date || body.delivery_date,
          sender_name:      mcpPayload?.sender?.name || body.sender_name,
          checkout_url:     order.checkout_url,
          status:           'pending',
        }).then(({ error }) => {
          if (error) console.error('[supabase order] insert failed', error.message);
        });
      }

      res.json({ success: true, order });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── REST: Track Order ────────────────────────────────────────────────────────
  app.post('/api/track-order', async (req, res) => {
    try {
      const { order_number } = req.body;
      const result = await callMcpTool('kapruka_track_order', {
        order_number, order_id: order_number,
      }, getMcpMode(req));
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── Conversations ─────────────────────────────────────────────────────────────
  // List user's conversations, sorted by last_message_at desc.
  app.get('/api/conversations', async (req, res) => {
    try {
      if (!supabase) return res.status(503).json({ success: false, error: 'Supabase not configured' });
      const ownerId = (req.query.owner_id as string) || null;
      const sessionId = (req.query.session_id as string) || null;
      const q = supabase.from('conversations').select('*').order('last_message_at', { ascending: false });
      const filtered = ownerId ? q.eq('owner_id', ownerId) : q.eq('session_id', sessionId);
      const { data, error } = await filtered;
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true, conversations: data || [] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create a new conversation.
  app.post('/api/conversations', async (req, res) => {
    try {
      if (!supabase) return res.status(503).json({ success: false, error: 'Supabase not configured' });
      const { owner_id, session_id, occasion, budget, language } = req.body || {};
      if (!session_id && !owner_id) {
        return res.status(400).json({ success: false, error: 'session_id or owner_id required' });
      }
      const row: Record<string, any> = {
        session_id: session_id || 'guest',
        title: 'New conversation',
        language: language || 'en',
        last_message_at: new Date().toISOString(),
      };
      if (owner_id) row.owner_id = owner_id;
      if (occasion) row.occasion = occasion;
      if (budget != null) row.budget = budget;
      const { data, error } = await supabase.from('conversations').insert(row).select().single();
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true, conversation: data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete a conversation.
  app.delete('/api/conversations/:id', async (req, res) => {
    try {
      if (!supabase) return res.status(503).json({ success: false, error: 'Supabase not configured' });
      const { error } = await supabase.from('conversations').delete().eq('id', req.params.id);
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Clear ALL conversations for a user (or session). Also clears their
  // messages, cart_items, and orders (since they cascade on conversation_id).
  app.delete('/api/conversations', async (req, res) => {
    try {
      if (!supabase) return res.status(503).json({ success: false, error: 'Supabase not configured' });
      const ownerId = (req.query.owner_id as string) || null;
      const sessionId = (req.query.session_id as string) || null;
      if (!ownerId && !sessionId) {
        return res.status(400).json({ success: false, error: 'owner_id or session_id required' });
      }
      const q = ownerId
        ? supabase.from('conversations').delete().eq('owner_id', ownerId)
        : supabase.from('conversations').delete().eq('session_id', sessionId);
      const { error } = await q;
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Generate (or update) a conversation title using a fast LLM call.
  // Uses the SAME OpenAI-compatible client pattern as the main chat
  // (via the llm-adapter's OpenAIAdapter), so DeepSeek v4 reasoning_content
  // and other provider quirks are handled consistently.
  app.post('/api/conversations/:id/title', async (req, res) => {
    try {
      if (!supabase) return res.status(503).json({ success: false, error: 'Supabase not configured' });
      const { owner_id, session_id } = req.body || {};
      const convId = req.params.id;

      // Fetch the conversation itself to use occasion/budget as a title source.
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .select('occasion, budget, language')
        .eq('id', convId)
        .single();
      if (convErr) return res.status(500).json({ success: false, error: convErr.message });

      // Fetch the first user message of this conversation (skip the synthetic
      // [ONBOARDING JUST COMPLETED] system marker — that text confuses the title LLM).
      const { data: msgs, error: msgErr } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(6);
      if (msgErr) return res.status(500).json({ success: false, error: msgErr.message });

      const realUserMsg = (msgs || []).find((m: any) =>
        m.role === 'user' &&
        m.content &&
        !m.content.startsWith('[ONBOARDING JUST COMPLETED]')
      )?.content || '';

      // Build the LLM prompt. Prefer the user's actual message; fall back to
      // occasion + budget if no real user message is available yet.
      let userPrompt: string;
      if (realUserMsg) {
        userPrompt =
          `Generate a SHORT, punchy 3-5 word title for a Kapruka gift concierge chat. ` +
          `The user's first real message: "${realUserMsg.slice(0, 200)}"\n\n` +
          `Reply with ONLY the title. No quotes, no punctuation at end. Examples: ` +
          `"Birthday cake for daughter", "Anniversary roses Colombo", "Just because chocolate"`;
      } else {
        userPrompt =
          `Generate a SHORT, punchy 3-5 word title for a Kapruka gift concierge chat ` +
          `about a ${conv?.occasion || 'gift'} surprise with a budget of Rs.${conv?.budget || 'unknown'}.\n\n` +
          `Reply with ONLY the title. No quotes, no punctuation at end. Examples: ` +
          `"Birthday gift ideas", "Anniversary roses", "Just because chocolate"`;
      }

      // Use the SAME OpenAI client pattern as the main chat via the adapter's
      // pattern. This way DeepSeek v4 reasoning_content is handled the same way
      // as the rest of the app.
      const apiKey = process.env.DEEPSEEK_API_KEY;
      const baseURL = 'https://api.deepseek.com/v1';
      const model = 'deepseek-v4-flash';
      let title = 'New conversation';

      if (apiKey) {
        try {
          const { OpenAI } = await import('openai').catch(() => ({ OpenAI: null }) as any);
          if (!OpenAI) throw new Error('openai SDK not installed');
          const client = new OpenAI({ apiKey, baseURL });
          // max_tokens=30 to keep cost low; temperature=0.5 for slight creativity
          // without randomness. NO thinking enabled — title gen is a simple task.
          const response = await client.chat.completions.create({
            model,
            messages: [
              { role: 'system', content: 'You generate short titles for chat conversations. Reply with only the title text, nothing else.' },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: 30,
            temperature: 0.5,
          });
          // DeepSeek v4 puts the answer in `content`; reasoning (if enabled)
          // is in a separate `reasoning_content` field — we don't enable it here,
          // so content is the title.
          let raw = response.choices?.[0]?.message?.content || '';
          raw = raw.trim().replace(/^["'`]+|["'`]+$/g, '');
          // Some responses have multiple lines (e.g. reasoning); take the LAST non-empty line
          const lastLine = raw.split('\n').map((l: string) => l.trim()).filter(Boolean).pop() || '';
          if (lastLine) {
            title = lastLine.slice(0, 60);
            console.log(`[title gen] ${convId.slice(0, 8)} → "${title}"`);
          } else {
            console.warn('[title gen] empty content in response:', JSON.stringify(response.choices?.[0]));
          }
        } catch (e: any) {
          console.error('[title gen] OpenAI/DeepSeek call failed:', e.message, e.status, e.response?.data);
        }
      } else {
        console.warn('[title gen] DEEPSEEK_API_KEY not set; skipping');
      }
      const { error } = await supabase.from('conversations').update({ title }).eq('id', convId);
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true, title });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── Chat Endpoint ────────────────────────────────────────────────────────────
  app.post('/api/chat', async (req, res) => {
    const {
      message,
      history,
      language,
      budget,
      occasion,
      cart,
      lastCartAction,
      formState,
      session_id,
      owner_id,
      conversation_id,
      persist = true,
      profile,
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // ── Language lock ──────────────────────────────────────────────────────────
    const LANG_LOCK: Record<string, string> = {
      si: 'LANGUAGE LOCK — SINHALA: Write your ENTIRE reply in Sinhala (සිංහල). No English or Tamil except proper nouns and prices.',
      ta: 'LANGUAGE LOCK — TAMIL: Write your ENTIRE reply in Tamil (தமிழ்). No English or Sinhala except proper nouns and prices.',
      en: 'LANGUAGE LOCK — ENGLISH: Respond in ENGLISH ONLY. No Sinhala or Tamil script whatsoever. Do NOT use Sinhala/Tamil cultural words like "machan", "aney", "aiyo", "amma", "nangi", "malli", "akka" in your reply. Pure English only.',
    };

    // ── Cart summary ───────────────────────────────────────────────────────────
    type CartLine = { product_code?: string; name: string; price_lkr: number; quantity: number; category?: string };
    const cartLines: CartLine[] = Array.isArray(cart) ? cart : [];
    const cartTotal = cartLines.reduce((s: number, i: CartLine) => s + i.price_lkr * i.quantity, 0);
    const cartSummary = cartLines.length > 0
      ? cartLines.map((i: CartLine) => `• ${i.name} [product_code=${i.product_code || 'no-id'}] (Rs.${i.price_lkr.toLocaleString()}) ×${i.quantity}`).join('\n') +
        `\n• Cart total: Rs.${cartTotal.toLocaleString()} LKR\n• NOTE: Use the product_code values above as product_id when calling wasi_remove_from_cart or wasi_update_cart_quantity`
      : 'Empty';

    // ── Occasion→search hint ───────────────────────────────────────────────────
    const OCCASION_HINTS: Record<string, string> = {
      'Birthday':           'birthday, chocolate, cake',
      'Anniversary':        'rose, anniversary, chocolate',
      'Avurudu & Festival': 'hamper, chocolate',
      'Thank You':          'hamper, chocolate, rose',
      'Just Because':       'chocolate, rose, birthday',
    };

    // ── Language lock MUST be first — LLMs weight earlier instructions higher ──
    // The base prompt has heavy Sinhala cultural flavour; if the lock is at the end
    // it loses to the Sinhala persona. Prepending it overrides that decisively.
    const langLockLine = LANG_LOCK[language as string] ?? LANG_LOCK['en'];

    // ── SESSION_CONTEXT (budget, occasion, cart, profile) ──────────────────────
    // PERSONALIZATION RULES go FIRST so the LLM weights them highest. LLMs follow
    // explicit "DO this" instructions more reliably than "consider using" hints.
    const personalizationRules: string[] = [];
    if (owner_id) {
      personalizationRules.push(
        'PERSONALIZATION RULES (HARD — do not skip):',
        '- In your FIRST reply, greet the user by their first name. NEVER open with a generic greeting.',
        '- DO NOT re-ask for information already in the User profile (name, city, age, typical recipient, language).',
        '- Use the Tone field to match their generation — DO NOT default to one register for everyone.',
        '- If typical_recipient is set, your first question can be about the occasion/date, not "who is this for".',
      );
    }

    const sessionContext = [
      ...personalizationRules,
      'SESSION CONTEXT (authoritative — do not re-ask):',
      occasion ? `- Occasion: ${occasion} — prioritised search terms: ${OCCASION_HINTS[occasion] ?? 'chocolate'}` : '',
      budget > 0 ? `- Budget: Rs.${Number(budget).toLocaleString()} LKR — ALWAYS pass max_price=${budget}` : '',
      `- Cart:\n${cartSummary}`,
      lastCartAction ? `- Recent cart action: ${lastCartAction}` : '',
      cartLines.length > 0 ? '- Do NOT recommend items already in cart unless asked.' : '',
      profile ? `- User profile: ${profile}` : '',
    ].filter(Boolean).join('\n');

    // Personalization rules + language lock go BEFORE the system prompt so the
    // LLM weights them highest. Per the discussion, we want the LLM to use
    // the user's name and profile PROACTIVELY, not wait for it to be mentioned
    // in conversation.
    const prefix = [
      langLockLine,
      ...(owner_id ? [
        'PERSONALIZATION RULES (HIGHEST PRIORITY — read first):',
        profile ? `- User profile: ${profile}` : '- User is signed in but no profile data yet.',
        '- Your FIRST reply MUST greet the user by their first name.',
        '- DO NOT re-ask for any field already in the profile (name, city, age, typical_recipient, language).',
        '- Match the Tone field in the profile when choosing register/slang/emoji usage.',
      ] : []),
    ].join('\n\n');

    const effectivePrompt = `${prefix}\n\n${WASI_SYSTEM_PROMPT}\n\n${sessionContext}`;

    try {
      const formattedHistory = (history || []).map((h: any) => ({
        role:    h.role as 'user' | 'assistant',
        content: h.content as string,
      }));

      console.log(`[Chat/${llmAdapter.provider}] lang=${language ?? 'en'} occasion=${occasion ?? '-'} budget=${budget ?? 0} cartItems=${cartLines.length} msg: ${message.substring(0, 60)}`);

      const { reply, toolCalls } = await llmAdapter.chat(
        effectivePrompt,
        formattedHistory,
        message,
        KAPRUKA_TOOL_DECLARATIONS,
        async (toolCall) => {
          console.log(`  → [Tool] ${toolCall.name}`, JSON.stringify(toolCall.args).substring(0, 120));
          // Wasi UI virtual tools — intercepted here, never forwarded to Kapruka MCP
          if (toolCall.name === 'wasi_get_cart') {
            return { items: cartLines, budget, cartTotal, count: cartLines.length };
          }
          if (toolCall.name === 'wasi_get_form_state') {
            // Return actual field-level status so LLM knows what it still needs to ask
            const fs = formState || {};
            return {
              cart_count:      cartLines.length,
              has_cart:        cartLines.length > 0,
              budget,
              // Fields: filled = truthy string, empty = ''
              recipient_name:   fs.recipient_name   || '',
              recipient_phone:  fs.recipient_phone  || '',
              city:             fs.city_name        || '',
              delivery_address: fs.delivery_address || '',
              delivery_date:    fs.delivery_date    || '',
              sender_name:      fs.sender_name      || '',
              // Convenience: what's still missing?
              missing_fields: [
                !fs.recipient_name   && 'recipient_name',
                !fs.recipient_phone  && 'recipient_phone',
                !fs.city_name        && 'city',
                !fs.delivery_address && 'delivery_address',
                !fs.delivery_date    && 'delivery_date',
              ].filter(Boolean),
            };
          }
          if ([
            'wasi_prefill_checkout', 'wasi_add_to_cart', 'wasi_order_now',
            'wasi_show_progress',
            'wasi_remove_from_cart', 'wasi_update_cart_quantity'
          ].includes(toolCall.name)) {
            return { _virtual: true, ...toolCall.args };
          }
          return await callMcpTool(toolCall.name, toolCall.args, false); // always live
        },
      );

      if (supabase && persist && (session_id || owner_id)) {
        // Auto-create a conversation if we don't have one yet (first chat of a thread).
        let activeConvId = conversation_id;
        if (!activeConvId) {
          const convRow: Record<string, any> = {
            session_id: session_id || 'guest',
            language: language || 'en',
            last_message_at: new Date().toISOString(),
            title: 'New conversation',
          };
          if (owner_id) convRow.owner_id = owner_id;
          if (occasion) convRow.occasion = occasion;
          if (budget != null) convRow.budget = budget;
          const { data: conv, error: convErr } = await supabase
            .from('conversations')
            .insert(convRow)
            .select()
            .single();
          if (!convErr && conv) activeConvId = conv.id;
        } else {
          // Bump last_message_at on the active conversation
          await supabase
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', activeConvId);
        }

        const baseRow: Record<string, any> = { session_id };
        if (owner_id) baseRow.owner_id = owner_id;
        if (activeConvId) baseRow.conversation_id = activeConvId;

        const { error } = await supabase.from('messages').insert([
          { ...baseRow, role: 'user',      content: message },
          { ...baseRow, role: 'assistant', content: reply, tool_calls: toolCalls ?? null },
        ]);
        if (error) console.error('[supabase chat] insert failed', error.message);

        // Fire-and-forget title generation for new conversations
        if (activeConvId && !conversation_id) {
          supabase
            .from('conversations')
            .select('title')
            .eq('id', activeConvId)
            .single()
            .then(({ data: conv }) => {
              if (conv && conv.title === 'New conversation') {
                // Generate a title via a fire-and-forget fetch to ourselves
                const port = process.env.PORT || 3000;
                fetch(`http://localhost:${port}/api/conversations/${activeConvId}/title`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ owner_id, session_id }),
                }).catch(err => console.error('[title gen] failed:', err.message));
              }
            });
        }
      }

      res.json({ success: true, reply, toolCalls });
    } catch (err: any) {
      console.error(`[Chat/${llmAdapter.provider}] Error:`, err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── TTS: ElevenLabs text-to-speech ──────────────────────────────────────────
  // Streams MP3 audio for any assistant message. Multilingual v2 supports
  // Sinhala / Tamil / English in a single model — one voice for all 3 langs.
  // Strips markdown before sending (we don't want to read out *stars* or # hashes).
  // Caches at the CDN edge for 24h; per-message blob cache lives in the client.
  const TTS_MAX_CHARS = 4500; // ElevenLabs hard limit is 5000; leave headroom
  const TTS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'; // "Aria" multilingual default

  const stripMarkdown = (s: string): string =>
    s
      .replace(/```[\s\S]*?```/g, ' ')                 // fenced code
      .replace(/`([^`]+)`/g, '$1')                       // inline code
      .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')              // images
      .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')            // links → text
      .replace(/^#{1,6}\s+/gm, '')                       // headings
      .replace(/\*\*([^*]+)\*\*/g, '$1')                 // bold
      .replace(/\*([^*]+)\*/g, '$1')                     // italic / list bullet
      .replace(/__([^_]+)__/g, '$1')                     // bold underscore
      .replace(/_([^_]+)_/g, '$1')                       // italic underscore
      .replace(/^[-*+]\s+/gm, '')                        // list bullets
      .replace(/^\d+\.\s+/gm, '')                        // ordered list
      .replace(/^>\s?/gm, '')                            // blockquote
      .replace(/\|/g, ' ')                                // table pipes
      .replace(/\n{3,}/g, '\n\n')                        // collapse blanks
      .replace(/\s{2,}/g, ' ')                            // collapse spaces
      .trim();

  const ttsInFlight = new Map<string, Promise<Buffer>>(); // de-dupe concurrent requests for same text

  app.post('/api/tts', async (req, res) => {
    const { text, language } = req.body || {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text (string) required' });
    }
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(503).json({ error: 'ELEVENLABS_API_KEY not configured' });
    }

    const cleanText = stripMarkdown(text);
    if (!cleanText) {
      return res.status(400).json({ error: 'text is empty after markdown strip' });
    }
    const truncated = cleanText.length > TTS_MAX_CHARS
      ? cleanText.slice(0, TTS_MAX_CHARS).replace(/\s+\S*$/, '') + '…'
      : cleanText;

    const langCode = (['en', 'si', 'ta'].includes(language) ? language : 'en') as 'en' | 'si' | 'ta';
    // Cache key: same text+lang returns same audio (deterministic, idempotent)
    const cacheKey = `${langCode}:${truncated}`;

    try {
      // De-dupe: if another request is already generating this audio, await it
      let audioPromise = ttsInFlight.get(cacheKey);
      if (!audioPromise) {
        audioPromise = (async () => {
          const r = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${TTS_VOICE_ID}?output_format=mp3_44100_128`,
            {
              method: 'POST',
              headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY!,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
              },
              body: JSON.stringify({
                text: truncated,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.0 },
                language_code: langCode,
              }),
            }
          );
          if (!r.ok) {
            const errBody = await r.text();
            throw new Error(`ElevenLabs ${r.status}: ${errBody.slice(0, 200)}`);
          }
          const ab = await r.arrayBuffer();
          return Buffer.from(ab);
        })();
        ttsInFlight.set(cacheKey, audioPromise);
        // Clean up after completion (no need to keep dedup map huge)
        audioPromise.finally(() => ttsInFlight.delete(cacheKey));
      }

      const audio = await audioPromise;
      res.set('Content-Type', 'audio/mpeg');
      res.set('Content-Length', audio.length.toString());
      res.set('Cache-Control', 'public, max-age=86400'); // browser + CDN can cache
      res.set('X-TTS-Chars', truncated.length.toString());
      res.send(audio);
    } catch (err: any) {
      console.error('[TTS] failed:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Static / Vite Middleware ─────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, _res) => {
      _res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Wasi Concierge running → http://localhost:${PORT}`);
    console.log(`   Provider : ${llmAdapter.provider} (${llmAdapter.model})`);
    console.log(`   MCP      : https://mcp.kapruka.com/mcp`);
    console.log(`   Mode     : ${process.env.NODE_ENV || 'development'}\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal: server failed to start:', err);
  process.exit(1);
});
