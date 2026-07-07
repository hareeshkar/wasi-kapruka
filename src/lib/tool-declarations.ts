/**
 * src/lib/tool-declarations.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical Kapruka MCP tool schemas + Gemini function-declaration conversion.
 *
 * Extracted from llm-adapter.ts into its own dependency-free module because
 * it needs to be imported CLIENT-SIDE too (by useGeminiLive.ts, for the Live
 * voice session's tool declarations) — llm-adapter.ts itself references
 * server-only packages (@anthropic-ai/sdk, openai) via dynamic import(),
 * which breaks Vite's static import analysis if the whole file is pulled
 * into the browser bundle. This module has zero external dependencies.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      // For array-type params: schema of each array element
      items?: { type: string; properties?: Record<string, any>; required?: string[] };
      // For object-type params: nested property schema
      properties?: Record<string, { type: string; description: string; enum?: string[] }>;
      required?: string[];
    }>;
    required: string[];
  };
}

// ─── Kapruka MCP Tool Declarations ───────────────────────────────────────────
// These are the CANONICAL tool definitions verified against the live
// Kapruka MCP Pydantic schemas (see MCP_REAL_FINDINGS.md).
// All adapters receive these and convert to their provider's format internally.

export const KAPRUKA_TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: 'kapruka_search_products',
    description: 'Search the Kapruka catalog (120,000+ products). Use simple English terms, even if the user spoke Sinhala/Tamil/Tanglish — translate their intent to an English query first: "cake ekak ganna" → q="cake", "pathi rosa poo" → q="rose", "mokada chocolate thiyenne" → q="chocolate". Good queries: "chocolate", "birthday cake", "rose bouquet", "grocery hamper", "smartphone". Bad queries: single ambiguous words with no product meaning ("nice", "something"), or full sentences — strip filler words out first. For vague requests ("something nice for my mom"), infer a category from context (occasion + relationship) rather than asking a clarifying question first — search, THEN narrow down based on results. Returns product list with ids, names, prices in LKR.',
    parameters: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search query in English, min 3 chars (e.g. "chocolate", "birthday", "rose")' },
        category: { type: 'string', description: 'Optional category filter — product (Cakes, Flowers, Chocolates, Jewellery, Grocery, Electronic…) or occasion (birthday, anniversary, valentine, mother, wedding…). Case-insensitive.' },
        limit: { type: 'integer', description: 'Max results to return (default 6, max 50)' },
        max_price: { type: 'number', description: 'Maximum price in LKR — ALWAYS set this to the user\'s stated budget' },
        min_price: { type: 'number', description: 'Minimum price in LKR — use 25% of budget when budget ≥ 5000 so premium shoppers skip trinkets' },
        in_stock_only: { type: 'boolean', description: 'ALWAYS pass true — filters out unavailable items' },
        sort: { type: 'string', description: '"bestseller" (default for browsing) | "price_asc" | "price_desc" when user asks by price' },
        cursor: { type: 'string', description: 'Pagination token from a previous search\'s next_cursor — max 3 pages, then refine the query instead' },
        currency: { type: 'string', description: 'Price currency: LKR (default) | USD | GBP | AUD | EUR — use when the buyer is abroad / mentions foreign currency' }
      },
      required: ['q']
    }
  },
  {
    name: 'kapruka_get_product',
    description: 'MCP data fetch — gets full raw details of ONE product (variants, images, full description, live price) by id. This is the backend lookup, not the UI card: use it when YOU (Wasi) need the data to reason with (e.g. checking a variant price before adding to cart, or refreshing a foreign-currency price). When the USER wants to visually SEE a product\'s details on screen, call wasi_show_product_detail instead — that one renders the card; this one just returns JSON to you. Pass the product id from kapruka_search_products results (e.g. "CAKE00KA002034").',
    parameters: {
      type: 'object',
      properties: {
        // LIVE MCP PYDANTIC PARAM: product_id (NOT product_code)
        product_id: { type: 'string', description: 'Product id from kapruka_search_products results (e.g. "CAKE00KA002034")' },
        currency: { type: 'string', description: 'Price currency: LKR (default) | USD | GBP | AUD | EUR' }
      },
      required: ['product_id']
    }
  },
  {
    name: 'kapruka_list_categories',
    description: 'MCP data fetch — gets the full Kapruka category tree (JSON) so YOU can map user intent to an exact category name before searching or showing wasi_show_categories/wasi_browse_subcategories. Example: user says "what do you have for groceries" → call this, find the "Grocery" node, then either search within it or call wasi_browse_subcategories("Grocery") to show its children visually.',
    parameters: {
      type: 'object',
      properties: {
        depth: { type: 'integer', description: 'Category depth to return (1 = top-level, 2 = with sub-categories)' }
      },
      required: []
    }
  },
  {
    name: 'kapruka_list_delivery_cities',
    description: 'Fuzzy-search Sri Lankan delivery cities. ALWAYS call this before kapruka_check_delivery — never guess or pass a raw user-spoken city name straight to check_delivery, aliases and neighborhood names fail there. Accepts English, Sinhala, or Tamil, and common neighborhood aliases: "Wellawatte"/"Wellawatta" → resolves toward a Colombo postal zone, "Nugegoda", "Kalubowila" both fall under Colombo suburbs, "Kaluwanchikudi"/"Kallady" are Batticaloa-area names. Pass whatever the user said verbatim (even misspelled or code-switched) — this tool does the fuzzy matching, you don\'t need to normalize it yourself. Take the exact "name" field from the result and use ONLY that for kapruka_check_delivery and kapruka_create_order — never re-use the user\'s original phrasing after this call.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'City name or partial name (e.g. "Colombo", "Kandy", "මහනුවර")' }
      },
      required: ['query']
    }
  },
  {
    name: 'kapruka_check_delivery',
    description: 'Check delivery availability and ESTIMATED fee to a Sri Lankan city on a specific date. Always call kapruka_list_delivery_cities first to get the canonical city name — passing a raw alias or misspelling here returns an error, not a fuzzy match. The rate returned is an ESTIMATE — the authoritative fee is in kapruka_create_order.summary.delivery_fee. For Jaffna and Batticaloa (frequently full — verify EVERY time, don\'t assume from a past check), only call after you have both city and delivery date confirmed; if it returns full, immediately relay next_available_date to the user rather than silently retrying. Pass product_id for cakes, flowers, or combos to trigger a freshness warning if delivery is > 1 day out. Example: user wants a cake delivered to "Jaffna" tomorrow → kapruka_list_delivery_cities("Jaffna") → check_delivery(city="Jaffna", delivery_date=<tomorrow>, product_id=<cake id>).',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Exact canonical city name from kapruka_list_delivery_cities (e.g. "Colombo 01", "Kandy", "Jaffna"). Do NOT use aliases.' },
        delivery_date: { type: 'string', description: 'Delivery date in YYYY-MM-DD format. Must be today or a future date — past dates return an error.' },
        product_id: { type: 'string', description: 'Optional: product id from search results. Pass only for cakes, flowers, or perishable combos to get a freshness warning.' }
      },
      required: ['city', 'delivery_date']
    }
  },
  {
    name: 'kapruka_create_order',
    description: 'Create a guest checkout order on Kapruka — this does NOT charge the customer, it only creates a PENDING order and a payment link the user still has to open and pay. Only call once cart, recipient, and delivery are all confirmed (use wasi_get_form_state / wasi_get_cart to verify first if unsure — never guess a missing field). Common mistakes to avoid: putting address/city inside "recipient" (they belong in "delivery"), using "items" instead of "cart" as the key, including an email field anywhere (MCP rejects it — Kapruka collects email at its own checkout page). Returns checkout_url (pay link, 60-min expiry), order_ref (ORD- pre-payment ref), and summary with the AUTHORITATIVE delivery_fee and grand_total — always read fees from this result, never from check_delivery\'s estimate. Example shape: {cart:[{product_id:"CAKE001",quantity:1}], recipient:{name:"Nirmala",phone:"0771234567"}, delivery:{address:"12 Galle Rd",city:"Colombo 03",date:"2026-07-10"}, sender:{name:"Kamal"}}.',
    parameters: {
      type: 'object',
      properties: {
        cart: {
          type: 'array',
          description: 'Products to order. Key MUST be "cart" (not "items"). Use product_id from search results.',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string', description: 'Product id (from kapruka_search_products)' },
              quantity: { type: 'integer', description: 'Quantity (default 1)' },
              icing_text: { type: 'string', description: 'For cakes only: text to write on the cake' }
            },
            required: ['product_id', 'quantity']
          }
        },
        recipient: {
          type: 'object',
          description: 'Who receives the gift. ONLY name and phone — address and city go in delivery block.',
          properties: {
            name: { type: 'string', description: 'Recipient full name' },
            phone: { type: 'string', description: 'Sri Lankan mobile e.g. 0771234567' }
          },
          required: ['name', 'phone']
        },
        delivery: {
          type: 'object',
          description: 'Where and when. Address and city MUST be here (not in recipient).',
          properties: {
            address: { type: 'string', description: "Recipient's street address" },
            city: { type: 'string', description: 'Exact city name from kapruka_list_delivery_cities' },
            date: { type: 'string', description: 'Delivery date YYYY-MM-DD' },
            location_type: { type: 'string', description: 'house | apartment | office | other (default: house)' },
            instructions: { type: 'string', description: 'Gate code, buzzer, or access notes (optional, max 250 chars)' }
          },
          required: ['address', 'city', 'date']
        },
        sender: {
          type: 'object',
          description: "Who is placing the order. Name only — NO email field (MCP rejects it). Kapruka will ask for email at checkout.",
          properties: {
            name: { type: 'string', description: 'Buyer name for "From: ___" on gift card' },
            anonymous: { type: 'boolean', description: 'true = anonymous gift (default false)' }
          },
          required: ['name']
        },
        gift_message: { type: 'string', description: 'Optional gift card message (max 300 chars)' },
        currency: { type: 'string', description: 'LKR (default) | USD | GBP | AUD | EUR' }
      },
      required: ['cart', 'recipient', 'delivery', 'sender']
    }
  },
  {
    name: 'kapruka_track_order',
    description: 'Track an existing Kapruka order. The order number is sent to the customer by email after payment is completed — it is an alphanumeric code like "VIMP34456CB2" (4-40 chars, letters + digits). This is different from the ORD-YYYYMMDD-XXXX pre-payment reference Wasi generates — this tool only works with the post-payment Kapruka number. If the user gives you an ORD- reference instead and asks to "track" it, that order hasn\'t been paid for yet — tell them so and offer the pay link again rather than calling this tool with the wrong code.',
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'string', description: 'Post-payment Kapruka order number from the customer\'s confirmation email (e.g. "VIMP34456CB2"). NOT the ORD- pre-payment reference.' }
      },
      required: ['order_number']
    }
  },
  {
    name: 'wasi_prefill_checkout',
    description: 'WASI UI TOOL — Pre-fill checkout form. Call on EVERY user message containing name/city/phone/address/date/mode, one field at a time as they mention it — don\'t wait to batch multiple fields into one call. CRITICAL: recipient_name = ACTUAL person name (Nirmala, Kumari), NOT role (Amma, Wife, Akka, Boss). If the user only gives a role ("send it to my wife"), ask for the actual name — don\'t pass the role string as recipient_name.\n\nTriggers: city ("Kandy", "Colombo 5", "Jaffna"), phone (077*/076*/071*/070*), address ("12 Galle Road", "near the temple"), date ("tomorrow", "this Friday", "avurudu day"), proper names, sender name ("it\'s from Kamal"), order mode ("for me" → self, "it\'s a gift" → gift), location type ("it\'s an apartment", "office address"). Sinhala: "eeka Kandy walata", "mage nama Kamal". Tamil: "adhu enakku", "en peyar Kamal".\n\nDo NOT ask for email — user enters it at Kapruka checkout to receive the KAP tracking number.',
    parameters: {
      type: 'object',
      properties: {
        recipient_name: { type: 'string', description: 'ACTUAL name: Nirmala, Kumari. NOT Amma/Wife/Akka/Nangi.' },
        recipient_phone: { type: 'string', description: 'SL phone: 077*, 076*, 071*, 070*' },
        city_name: { type: 'string', description: 'City: Kandy, Colombo, Jaffna, Batticaloa, මහනුවර' },
        delivery_address: { type: 'string', description: "Recipient's street address (where gift is delivered)" },
        gift_message: { type: 'string', description: 'Card message (max 300 chars)' },
        delivery_date: { type: 'string', description: 'YYYY-MM-DD if mentioned' },
        occasion: { type: 'string', description: 'Birthday, Anniversary, Avurudu' },
        sender_name: { type: 'string', description: 'Buyer name for "From: ___" on gift card' },
        location_type: { type: 'string', description: 'house | apartment | office | other — set when user mentions building type' },
        delivery_instructions: { type: 'string', description: 'Gate code, buzzer, access notes (max 250 chars)' },
        anonymous: { type: 'boolean', description: 'true if user says "anonymous", "surprise", "don\'t show my name"' },
        order_mode: { type: 'string', description: 'gift (default) | self — set to self when user says "it\'s for me", "my own gift", "I\'m the recipient"' },
        currency: { type: 'string', description: 'Display currency: LKR (default) | USD | GBP | AUD | EUR — use when the buyer is abroad' }
      },
      required: []
    }
  },
  {
    name: 'wasi_add_to_cart',
    description: 'WASI UI TOOL — Add product to the visual bundle. Call ONLY on explicit user consent, and only for a SPECIFIC product you\'ve already shown/discussed (from search results or a detail card) — never invent a product_id.\n\nEnglish triggers: "add it", "add to cart", "add to bundle", "yes add", "ok add", "put it in", "I\'ll take it", "get me that one". Sinhala: "dannawa", "eka ganna", "eka dannawa", "ok dannawa". Tamil: "podunga", "sethunga", "kooda podunga".\n\nDo NOT call on: "looks good", "nice", "show me more", question marks, price questions, or when comparing products ("which is cheaper" is not consent to add). If the user says "add both" after a comparison, call this tool twice, once per product. Example: user says "yeah add the chocolate cake" after you showed it → wasi_add_to_cart(product_id="CAKE00123", product_name="Chocolate Truffle Cake", price_lkr=3500, image_url=..., category="Cakes").',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product id from kapruka_search_products result' },
        product_name: { type: 'string', description: 'Product name for on-screen confirmation' },
        price_lkr: { type: 'number', description: 'Product price (in the currency the user is viewing)' },
        currency: { type: 'string', description: 'Price currency: LKR (default) | USD | GBP | AUD | EUR — match the currency the user is viewing' },
        image_url: { type: 'string', description: 'Product image URL' },
        category: { type: 'string', description: 'Product category (Cakes, Flowers, Chocolates, Hampers etc)' },
        variant_id: { type: 'string', description: 'Variant id if user picked variant' },
        variant_name: { type: 'string', description: 'Variant name for display' },
        quantity: { type: 'integer', description: 'Quantity (default 1)' }
      },
      required: ['product_id', 'product_name', 'price_lkr', 'image_url', 'category']
    }
  },
  {
    name: 'wasi_order_now',
    description: 'MANDATORY CHECKOUT — YOU MUST CALL THIS TO CREATE AN ORDER. User says: "checkout"/"pay"/"order now"/"confirm"/"do it"/"lock it"/"proceed"/"finalize"/"complete"/"yes checkout"/"ok done"/"place the order"/"that\'s all, order it". Sinhala: "ganna"/"karanna"/"denna". Tamil: "podunga"/"sethunga"/"mudikka".\n\nDescribing checkout in text DOES NOTHING — saying "Alright, placing your order now!" without calling this tool creates NO order and the user gets nothing. Only calling this tool creates an order. Before calling, make sure cart is non-empty and required checkout fields are filled (use wasi_get_cart / wasi_get_form_state if unsure) — if fields are missing, ask for them or show wasi_show_checkout_wizard instead of calling this prematurely. Always fire this tool FIRST, then reply briefly once you have the result (pay link).',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'wasi_get_cart',
    description: 'WASI UI TOOL — Check what is currently in the cart. Returns the list of items (with product_code, name, price, quantity) and total. Call when: the user asks "what\'s in my cart" / "what did I add" / "how much so far", before calling wasi_order_now or kapruka_create_order to confirm the cart isn\'t empty, or before wasi_remove_from_cart/wasi_update_cart_quantity if you need the exact product_code and don\'t already have it from this conversation. Sinhala: "mata mokakda thiyenne cart eke". Tamil: "en cart-la enna irukku".',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'wasi_get_form_state',
    description: 'WASI UI TOOL — Get current checkout form state: which fields are filled and which are missing (returns missing_fields array directly — read that instead of re-deriving it yourself). Call BEFORE offering checkout, and BEFORE calling wasi_order_now or kapruka_create_order, to know exactly what info is still missing rather than guessing or re-asking for something already filled. Also call right after wasi_show_checkout_wizard appears, since the user may fill it in directly without speaking — this is how you\'d notice.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'wasi_show_progress',
    description: 'WASI UI TOOL — Show a visual progress step in the chat interface. Call BEFORE long operations (searching, checking delivery, creating order). HARD RULE: Call EXACTLY ONCE per user turn, BEFORE the tool calls — never during or after. When firing parallel searches, call this once then both searches in the same turn. Duplicate progress messages break the UI. Example steps: step="searching", message="Searching Kapruka for birthday cakes..."; step="checking_delivery", message="Checking if we can deliver to Jaffna tomorrow..."; step="creating_order", message="Placing your order...".',
    parameters: {
      type: 'object',
      properties: {
        step: { type: 'string', description: 'Step name (e.g. "searching", "adding_to_cart", "checking_delivery", "creating_order", "done")' },
        message: { type: 'string', description: 'Short progress message (e.g. "Searching Kapruka for birthday gifts...")' }
      },
      required: ['step', 'message']
    }
  },
  {
    name: 'wasi_remove_from_cart',
    description: 'WASI UI TOOL — Remove a specific product from the cart. Call ONLY when user explicitly asks to remove, delete, or replace a specific item they name. If you don\'t already know its product_id from this conversation, call wasi_get_cart first to look it up — never guess an id.\n\nTriggers (must name the item): "remove the cake", "delete the chocolate box", "take out the hamper", "I don\'t want the cake anymore", "remove it", "take it off".\nSinhala: "eka wenas karanna", "eka ganna epa"\nTamil: "adhai theiya podunga", "venda vendam"\n\nDo NOT call on: "change my mind", "show me something different" (that is a new search, not a remove).',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'The product_code/id of the item to remove. Get this from wasi_get_cart results.' },
        product_name: { type: 'string', description: 'Human-readable name for confirmation message (e.g. "Forever You Anniversary Cake")' }
      },
      required: ['product_id']
    }
  },
  {
    name: 'wasi_update_cart_quantity',
    description: 'WASI UI TOOL — Change the quantity of an item already in the cart. Call when user explicitly says "change to 2", "I want 3 of those", "make it 2 boxes". If you don\'t already know its product_id from this conversation, call wasi_get_cart first to look it up.\n\nTriggers: "change quantity", "I want 2", "make it X", "update to X pieces", "one more", "just one is enough".\nSet quantity=0 to remove the item (equivalent to wasi_remove_from_cart).',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'The product_code/id of the item to update.' },
        quantity: { type: 'integer', description: 'New quantity. Set to 0 to remove the item entirely.' }
      },
      required: ['product_id', 'quantity']
    }
  },
  {
    name: 'wasi_show_checkout_wizard',
    description: 'WASI UI TOOL — MANDATORY the moment the user wants to check out ("checkout", "place order", "buy now", "let\'s order", "confirm", "I\'m ready to pay") and delivery/recipient details haven\'t been given yet. Call this FIRST, before asking for name/phone/city/address/date in text or by voice — this shows an interactive multi-step form INLINE in the chat instead of you extracting details from freeform speech/text, which is faster and far less error-prone (especially by voice, where names/phone numbers/addresses are easy to mishear). The wizard collects: recipient name, phone, city, address, delivery date, location type, gift message, and sender name — each as a validated step. Skip this only if the user has ALREADY given most details in freeform text/speech (then use wasi_prefill_checkout instead) or if a wizard is already visible (check for "[UI: checkout wizard card is visible...]" in context — don\'t re-call).',
    parameters: {
      type: 'object',
      properties: {
        order_mode: { type: 'string', description: 'gift (default) | self — pre-select the gift/self toggle in the wizard' }
      },
      required: []
    }
  },
  {
    name: 'wasi_show_product_detail',
    description: 'WASI UI TOOL — MANDATORY when user shows interest in a specific product, INCLUDING one already in their cart (e.g. "show me the details of that pen", "what does the cake I added look like") — this applies just as much to cart items as to fresh search results; use the product_id from CURRENT CART context or your own earlier tool calls in this session. Shows rich product detail card INLINE in the chat with image, full description, variants, shipping, and add-to-cart. You MUST call this tool whenever: (1) user asks "tell me more", "show details", "describe it", "full details", "more info", "what does it look like", "what are the variants", "show me that product", "show me that pen/cake/etc", (2) you are describing a specific product to the user — ALWAYS pair your description with this tool call so the user can see the full card. If you mention a product by name, call this tool. NEVER just describe a product in text without calling this tool — the user needs to see the image, price, and add-to-cart button, and a spoken description alone is not enough.\n\nTriggers: "tell me more", "show details", "describe it", "full details", "more info", "what is this product", "show me", "tell me about [product name]", "show me that [item] again".\nSinhala: "wistarawa", "kohomada", "para wistara", "kiyanna".\nTamil: "vilakkamaga", "eppadi irukku", "vistaramaaga", "solluga".',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product id from kapruka_search_products results' }
      },
      required: ['product_id']
    }
  },
  {
    name: 'wasi_compare_products',
    description: 'WASI UI TOOL — MANDATORY when user wants to compare products. Shows inline comparison with LLM-generated insights highlighting key differences. Call when user says "compare these", "what\'s the difference", "which one is better", "help me choose between", "side by side", "which should I get", "this one or that one". Note: a bare "or" in a sentence isn\'t always comparison intent ("cake or flowers, either works" is just flexibility, not a request to compare) — only call when the user is clearly asking you to help them decide between specific items you\'ve shown. Always pick the most relevant 2-3 products from search results. After calling this tool, your text response MUST include a brief comparison summary mentioning 2-3 key differences (price, quality, occasion fit) so the user can decide.\n\nSinhala: "me deka salakanna", "mokada differens", "ecken nada".\nTamil: "idhu rendaiyum compare pannu", "ethu nallathu", "edhu better".',
    parameters: {
      type: 'object',
      properties: {
        product_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of 2-3 product IDs from search results to compare'
        }
      },
      required: ['product_ids']
    }
  },
  {
    name: 'wasi_show_categories',
    description: 'WASI UI TOOL — MANDATORY when the user wants to browse without a specific product in mind. Call when user asks "what categories do you have", "browse by category", "what can you order", "show me what you sell", "what do you have", just "browse" / "categories" on their own, or after wasi_new_order when they haven\'t said what they want yet. Show the visual grid — don\'t just list category names in speech/text.\n\nSinhala: "mokakda thiyenne", "categories bala".\nTamil: "enna categories irukku", "enna vendaam".',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'wasi_browse_subcategories',
    description: 'WASI UI TOOL — MANDATORY when user asks about types within a category (e.g. "what kinds of cakes", "types of electronics", "show me clothing options", "what subcategories in groceries", "what veggies do you have"). Also call when user clicks a category from the grid.\n\nTriggers: "what types of X", "subcategories in X", "what\'s in X category", "show me X options", "browse X".\n\nAlways call wasi_show_categories FIRST if the user hasn\'t picked a category yet. After showing subcategories, search for the user\'s pick with T1.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'The category name to browse (e.g. "Automobile", "Chocolates", "Electronic", "Grocery")' }
      },
      required: ['category']
    }
  },
  {
    name: 'wasi_new_order',
    description: 'WASI UI TOOL — Start a brand new order. Clears the ENTIRE cart and resets checkout state. ALWAYS call this tool when user wants a new order — never just reply with text. This is different from wasi_remove_from_cart (removes ONE named item) — only use this one when the user means "start over completely", not "take that one thing out".\n\nTriggers: "new order", "new chat", "start fresh", "fresh start", "clear cart", "empty cart", "clear everything", "begin again", "start over", "reset", "try again", "new gift", "start new", "new search", "find something else", "scrap this and start again".\n\nSinhala: "aluth order ekak", "meka adinna", "puna balamu".\nTamil: "pudhiya order", "mudiyattum", "therinhu aarambikalam".\n\nAfter calling this tool, greet the user warmly and ask what they\'d like to order.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'wasi_convert_currency',
    description: `WASI UI TOOL — Convert cart item prices to a foreign currency using Kapruka's live exchange rates. Call when:
(1) User mentions a foreign currency: "in dollars", "in pounds", "how much in USD", "show me prices in EUR", "报价换成美元"
(2) User is abroad (diaspora mode): "I'm in London", "from Australia", "sending home from Dubai"
(3) You need to quote an accurate foreign-currency total in your response (STATE 3 confirmation)
(4) User asks "how much is this in [currency]?"

IMPORTANT: This tool converts the ENTIRE cart to the target currency. The MCP returns live-converted prices using Kapruka's current exchange rates. You will receive converted item prices and a total. Use these EXACT values when quoting prices to the user — do NOT manually convert or guess exchange rates.

Supported currencies: USD, GBP, AUD, EUR.

The tool returns:
- items: each cart item with converted_price in the target currency
- total: sum of all converted item prices
- currency: the target currency code
- rates: approximate exchange rates for transparency

After calling this tool, quote the converted total to the user. Example: "That's about $85 USD for everything — want to lock it in?"

Sinhala: "meka dollar walata convert karanawa", "paraya kiyada"
Tamil: "idhu dollar-la evlo", "maara vilai"`,
    parameters: {
      type: 'object',
      properties: {
        currency: {
          type: 'string',
          description: 'Target currency code: USD | GBP | AUD | EUR'
        }
      },
      required: ['currency']
    }
  }
];

/** Convert canonical ToolDeclaration → Gemini function-declaration format using raw JSON Schema. */
export function toGeminiFunctionDeclaration(tool: ToolDeclaration) {
  return {
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: tool.parameters,
  };
}

// Tools exposed to the Gemini Live voice session — full parity with the
// text-chat tool set (KAPRUKA_TOOL_DECLARATIONS), so voice can search,
// manage the cart, show product/comparison/category cards, and check out,
// same as typed chat. This array is duplicated field-for-field between
// server.ts's ephemeral-token liveConnectConstraints.config and the
// client's ai.live.connect() config — see server.ts's /api/live-token
// route and useGeminiLive.ts's connect() — so any change here must be
// made once, in this shared module, not independently on each side.
export const LIVE_VOICE_TOOL_DECLARATIONS: ToolDeclaration[] = KAPRUKA_TOOL_DECLARATIONS;
