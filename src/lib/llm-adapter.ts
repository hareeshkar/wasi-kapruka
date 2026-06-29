/**
 * src/lib/llm-adapter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Model-Agnostic LLM Adapter for Wasi Concierge
 *
 * PURPOSE:
 *   Swap AI providers (Gemini, Claude, OpenAI, DeepSeek) by changing ONE line
 *   in server.ts without touching any MCP integration or business logic.
 *
 * USAGE:
 *   import { createLLMAdapter, KAPRUKA_TOOL_DECLARATIONS } from './llm-adapter.js';
 *   const adapter = createLLMAdapter('gemini');   // or 'claude', 'openai', 'deepseek'
 *   const reply = await adapter.chat(systemPrompt, history, message, tools);
 *
 * ADDING A NEW PROVIDER:
 *   1. Implement the `LLMAdapter` interface below.
 *   2. Add a case to `createLLMAdapter()`.
 *   3. That's it — no other files need to change.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Shared Types ─────────────────────────────────────────────────────────────

/** A single turn in the conversation. */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: Array<{ data: string; mimeType: string }>;
}

/** A tool call requested by the model. */
export interface ToolCall {
  id: string;          // Unique call id — MUST be echoed in ToolResult
  name: string;        // Tool function name
  args: Record<string, any>; // Arguments as parsed JSON object
}

/** The result of executing a tool call. */
export interface ToolResult {
  id: string;          // MUST match ToolCall.id (Gemini 3 / Claude requirement)
  name: string;
  result: any;         // Any JSON-serialisable value
}

// ─── Error Types & Retry Logic ───────────────────────────────────────────────

export type ErrorCategory = 
  | 'auth'           // 401, 403 — invalid API key
  | 'rate_limit'     // 429 — too many requests
  | 'quota'          // 402 — quota exceeded
  | 'network'        // Timeout, connection reset, DNS
  | 'server'         // 500, 502, 503, 504 — server errors
  | 'validation'     // 400, 422 — bad request
  | 'not_found'      // 404
  | 'unknown';

export interface LLMError {
  message: string;
  category: ErrorCategory;
  statusCode?: number;
  isRetryable: boolean;
  retryAfterMs?: number;  // From Retry-After header
  originalError?: any;
}

/** Classify an error by HTTP status code or error type. */
export function classifyError(err: any): LLMError {
  const statusCode = err?.status || err?.statusCode || err?.response?.status;
  const message = err?.message || String(err);
  
  // Rate limiting (429)
  if (statusCode === 429) {
    const retryAfter = err?.headers?.['retry-after'] || err?.response?.headers?.['retry-after'];
    const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : undefined;
    return {
      message: 'Rate limit exceeded — too many requests',
      category: 'rate_limit',
      statusCode: 429,
      isRetryable: true,
      retryAfterMs,
      originalError: err,
    };
  }

  // Auth errors (401, 403)
  if (statusCode === 401 || statusCode === 403) {
    return {
      message: 'Invalid API key — check your credentials',
      category: 'auth',
      statusCode,
      isRetryable: false,
      originalError: err,
    };
  }

  // Quota exceeded (402)
  if (statusCode === 402) {
    return {
      message: 'Quota exceeded — billing issue or plan limit reached',
      category: 'quota',
      statusCode: 402,
      isRetryable: false,
      originalError: err,
    };
  }

  // Server errors (5xx)
  if (statusCode >= 500 && statusCode < 600) {
    return {
      message: `Server error (${statusCode}) — service temporarily unavailable`,
      category: 'server',
      statusCode,
      isRetryable: true,
      originalError: err,
    };
  }

  // Network errors
  if (message.includes('ECONNRESET') || message.includes('ETIMEDOUT') || 
      message.includes('ENOTFOUND') || message.includes('fetch failed') ||
      message.includes('network') || message.includes('timeout')) {
    return {
      message: 'Network error — connection failed or timed out',
      category: 'network',
      isRetryable: true,
      originalError: err,
    };
  }

  // Validation errors (400, 422)
  if (statusCode === 400 || statusCode === 422) {
    return {
      message: 'Invalid request — check message format',
      category: 'validation',
      statusCode,
      isRetryable: false,
      originalError: err,
    };
  }

  // Not found (404)
  if (statusCode === 404) {
    return {
      message: 'Resource not found',
      category: 'not_found',
      statusCode: 404,
      isRetryable: false,
      originalError: err,
    };
  }

  // Unknown — assume retryable for transient issues
  return {
    message: message || 'An unexpected error occurred',
    category: 'unknown',
    isRetryable: true,
    originalError: err,
  };
}

/** Retry wrapper with exponential backoff. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    retryableCategories?: ErrorCategory[];
    onRetry?: (attempt: number, err: LLMError) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    retryableCategories = ['rate_limit', 'network', 'server', 'unknown'],
    onRetry,
  } = options;

  let lastError: LLMError | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = classifyError(err);
      
      // Don't retry if not retryable or max retries reached
      if (!lastError.isRetryable || !retryableCategories.includes(lastError.category) || attempt >= maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff + jitter
      let delayMs = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      
      // Add jitter (±25%)
      const jitter = delayMs * 0.25 * (Math.random() * 2 - 1);
      delayMs = Math.round(delayMs + jitter);

      // Use Retry-After header if available
      if (lastError.retryAfterMs) {
        delayMs = lastError.retryAfterMs;
      }

      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms: ${lastError.message}`);
      
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/** Provider-agnostic tool declaration (superset of all providers). */
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

/** The complete response from one adapter.chat() turn. */
export interface AdapterResponse {
  text: string | null;       // Final text reply (null if more tool calls follow)
  toolCalls: ToolCall[];     // Empty when model gives a text reply
  raw?: any;                 // Raw provider response for debugging
}

/** The unified interface every adapter must implement. */
export interface LLMAdapter {
  readonly provider: string;
  readonly model: string;

  /**
   * Single agentic turn.
   * The adapter handles the full tool-calling loop internally and returns
   * only when the model produces a final text reply (or max iterations hit).
   *
   * @param systemPrompt  Wasi persona / instructions
   * @param history       Prior conversation turns
   * @param userMessage   Latest user message
   * @param tools         Tool declarations to offer the model
   * @param executeTool   Callback: given a ToolCall, returns the result
   * @returns             Final text reply + log of all tool calls executed
   */
  chat(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string,
    tools: ToolDeclaration[],
    executeTool: (call: ToolCall) => Promise<any>,
    images?: Array<{ data: string; mimeType: string }>
  ): Promise<{ reply: string; toolCalls: Array<{ toolName: string; args: any; result: any }> }>;

  /**
   * Transcribe audio to text (Gemini-native only).
   * Lightweight single-turn generateContent call — no tools, no history.
   * Returns the raw transcript string. Throws on error.
   * @param language BCP-47 code hint ('en' | 'si' | 'ta') to guide multilingual recognition.
   */
  transcribeAudio?(audio: { data: string; mimeType: string }, language?: string): Promise<string>;
}

// ─── Kapruka MCP Tool Declarations ───────────────────────────────────────────
// These are the CANONICAL tool definitions verified against the live
// Kapruka MCP Pydantic schemas (see MCP_REAL_FINDINGS.md).
// All adapters receive these and convert to their provider's format internally.

export const KAPRUKA_TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: 'kapruka_search_products',
    description: 'Search the Kapruka catalog (120,000+ products). Use simple English terms: "chocolate", "birthday cake", "rose", "hamper", "rice", "phone". Returns product list with ids, names, prices in LKR.',
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
        currency: { type: 'string', description: 'Price currency: LKR (default) | USD | GBP | AUD | CAD | EUR — use when the buyer is abroad / mentions foreign currency' }
      },
      required: ['q']
    }
  },
  {
    name: 'kapruka_get_product',
    description: 'Get full details of a product: variants, images, full description. Pass the product id from search results.',
    parameters: {
      type: 'object',
      properties: {
        // LIVE MCP PYDANTIC PARAM: product_id (NOT product_code)
        product_id: { type: 'string', description: 'Product id from kapruka_search_products results (e.g. "CAKE00KA002034")' },
        currency: { type: 'string', description: 'Price currency: LKR (default) | USD | GBP | AUD | CAD | EUR' }
      },
      required: ['product_id']
    }
  },
  {
    name: 'kapruka_list_categories',
    description: 'Get the full Kapruka category tree. Use to show browsable categories or map user intent to a category.',
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
    description: 'Fuzzy-search Sri Lankan delivery cities. Call this before check_delivery to get the exact city name. Accepts English, Sinhala, or Tamil.',
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
    description: 'Check delivery availability and ESTIMATED fee to a Sri Lankan city on a specific date. Always call kapruka_list_delivery_cities first to get the canonical city name. The rate returned is an ESTIMATE — the authoritative fee is in kapruka_create_order.summary.delivery_fee. For Jaffna and Batticaloa (frequently full), only call after you have both city and delivery date confirmed. Pass product_id for cakes, flowers, or combos to trigger a freshness warning if delivery is > 1 day out.',
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
    description: 'Create a guest checkout order on Kapruka. Returns checkout_url (pay link, 60-min expiry), order_ref (ORD- pre-payment ref), and summary with the AUTHORITATIVE delivery_fee and grand_total. Always read fees from this result, not from check_delivery.',
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
        currency: { type: 'string', description: 'LKR (default) | USD | GBP | AUD | CAD | EUR' }
      },
      required: ['cart', 'recipient', 'delivery', 'sender']
    }
  },
  {
    name: 'kapruka_track_order',
    description: 'Track an existing Kapruka order. The order number is sent to the customer by email after payment is completed — it is an alphanumeric code like "VIMP34456CB2" (4-40 chars, letters + digits). This is different from the ORD-YYYYMMDD-XXXX pre-payment reference Wasi generates — T7 only works with the post-payment Kapruka number.',
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
    description: 'WASI UI TOOL — Pre-fill checkout form. Call on EVERY user message containing name/city/phone/address/date/mode. CRITICAL: recipient_name = ACTUAL person name (Nirmala, Kumari), NOT role (Amma, Wife).\n\nTriggers: city, phone (077*/076*), address, date, proper names, sender name, order mode (for me / gift), location type.\n\nDo NOT ask for email — user enters it at Kapruka checkout to receive KAP tracking number.',
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
        currency: { type: 'string', description: 'Display currency: LKR (default) | USD | GBP | AUD | CAD | EUR — use when the buyer is abroad' }
      },
      required: []
    }
  },
  {
    name: 'wasi_add_to_cart',
    description: 'WASI UI TOOL — Add product to the visual bundle. Call ONLY on explicit user consent.\n\nEnglish triggers: "add it", "add to cart", "add to bundle", "yes add", "ok add", "put it in", "I\'ll take it". Sinhala: "dannawa", "eka ganna", "eka dannawa", "ok dannawa". Tamil: "podunga", "sethunga", "kooda podunga".\n\nDo NOT call on: "looks good", "nice", "show me more", question marks, or product comparison. Only call when user clearly wants to proceed.',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'Product id from kapruka_search_products result' },
        product_name: { type: 'string', description: 'Product name for on-screen confirmation' },
        price_lkr: { type: 'number', description: 'Product price (in the currency the user is viewing)' },
        currency: { type: 'string', description: 'Price currency: LKR (default) | USD | GBP | AUD | CAD | EUR — match the currency the user is viewing' },
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
    description: 'MANDATORY CHECKOUT — YOU MUST CALL THIS TO CREATE AN ORDER. User says: "checkout"/"pay"/"order now"/"confirm"/"do it"/"lock it"/"proceed"/"finalize"/"complete"/"yes checkout"/"ok done". Sinhala: "ganna"/"karanna"/"denna". Tamil: "podunga"/"sethunga"/"mudikka".\n\nDescribing checkout in text DOES NOTHING. Only calling this tool creates an order. Always fire this tool FIRST, then reply briefly.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'wasi_get_cart',
    description: 'WASI UI TOOL — Check what is currently in the cart. Returns the list of items, quantities, and total. Call when you need to verify cart state before making decisions (e.g. before offering checkout, or when user asks "what do I have in my cart?").',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'wasi_get_form_state',
    description: 'WASI UI TOOL — Get current checkout form state: which fields are filled and which are missing. Returns the recipient_name, recipient_phone, city, address, email, and delivery_date status. Call BEFORE offering checkout to know exactly what info is still missing.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'wasi_show_progress',
    description: 'WASI UI TOOL — Show a visual progress step in the chat interface. Call BEFORE long operations (searching, checking delivery, creating order). HARD RULE: Call EXACTLY ONCE per user turn, BEFORE the tool calls — never during or after. When firing parallel searches, call this once then both searches in the same turn. Duplicate progress messages break the UI.',
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
    description: 'WASI UI TOOL — Remove a specific product from the cart. Call ONLY when user explicitly asks to remove, delete, or replace a specific item they name.\n\nTriggers (must name the item): "remove the cake", "delete the chocolate box", "take out the hamper", "I don\'t want the cake anymore", "remove it", "take it off".\nSinhala: "eka wenas karanna", "eka ganna epa"\nTamil: "adhai theiya podunga", "venda vendam"\n\nDo NOT call on: "change my mind", "show me something different" (that is a new search, not a remove).',
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
    description: 'WASI UI TOOL — Change the quantity of an item already in the cart. Call when user explicitly says "change to 2", "I want 3 of those", "make it 2 boxes".\n\nTriggers: "change quantity", "I want 2", "make it X", "update to X pieces".\nSet quantity=0 to remove the item (equivalent to wasi_remove_from_cart).',
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
    name: 'wasi_show_product_detail',
    description: 'WASI UI TOOL — MANDATORY when user shows interest in a specific product. Shows rich product detail card INLINE in the chat with image, full description, variants, shipping, and add-to-cart. You MUST call this tool whenever: (1) user asks "tell me more", "show details", "describe it", "full details", "more info", "what does it look like", "what are the variants", "show me that product", (2) you are describing a specific product to the user — ALWAYS pair your description with this tool call so the user can see the full card. If you mention a product by name, call this tool. NEVER just describe a product in text without calling this tool — the user needs to see the image, price, and add-to-cart button.\n\nTriggers: "tell me more", "show details", "describe it", "full details", "more info", "what is this product", "show me", "tell me about [product name]".\nSinhala: "wistarawa", "kohomada", "para wistara", "kiyanna".\nTamil: "vilakkamaga", "eppadi irukku", "vistaramaaga", "solluga".',
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
    description: 'WASI UI TOOL — MANDATORY when user wants to compare products. Shows inline comparison with LLM-generated insights highlighting key differences. Call when user says "compare these", "what\'s the difference", "which one is better", "help me choose between", "side by side", "which should I get", "vs", "or". Always pick the most relevant 2-3 products from search results. After calling this tool, your text response MUST include a brief comparison summary mentioning 2-3 key differences (price, quality, occasion fit) so the user can decide.\n\nSinhala: "me deka salakanna", "mokada differens", "ecken nada".\nTamil: "idhu rendaiyum compare pannu", "ethu nallathu", "edhu better".',
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
    description: 'WASI UI TOOL — Show the store category menu as a visual grid. Call when user asks "what categories do you have", "browse by category", "what can you order", "show me what you sell", "what do you have", or wants to explore without a specific product in mind.\n\nSinhala: "mokakda thiyenne", "categories bala".\nTamil: "enna categories irukku", "enna vendaam".',
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
    description: 'WASI UI TOOL — Start a brand new order. Clears the cart and resets the conversation. ALWAYS call this tool when user wants a new order — never just reply with text.\n\nTriggers: "new order", "new chat", "start fresh", "fresh start", "clear cart", "empty cart", "clear everything", "begin again", "start over", "reset", "try again", "new gift", "start new", "new search", "find something else".\n\nSinhala: "aluth order ekak", "meka adinna", "puna balamu".\nTamil: "pudhiya order", "mudiyattum", "therinhu aarambikalam".\n\nAfter calling this tool, greet the user warmly and ask what they\'d like to order.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// ─── Gemini 3.1 Flash-Lite Adapter ────────────────────────────────────────────
// Primary LLM adapter — vision, function calling, thinking, structured output.
// Model: gemini-3.1-flash-lite (GA, 1M input / 65K output, cost-efficient)
// Uses @google/genai v2.8+ — parametersJsonSchema, thinkingLevel, parallel FC

class GeminiAdapter implements LLMAdapter {
  readonly provider = 'gemini';
  readonly model: string;
  private ai: any;

  constructor(model = 'gemini-3.1-flash-lite') {
    this.model = model;
  }

  async init(apiKey: string) {
    const { GoogleGenAI } = await import('@google/genai').catch(() => { throw new Error('Install @google/genai'); });
    this.ai = new GoogleGenAI({ apiKey });
  }

  /** Convert canonical ToolDeclaration → Gemini format using raw JSON Schema. */
  private toGeminiDecl(tool: ToolDeclaration) {
    return {
      name: tool.name,
      description: tool.description,
      parametersJsonSchema: tool.parameters,
    };
  }

  /** Generate content with retry logic for transient errors. */
  private async generateContent(contents: any[], config: any): Promise<any> {
    return withRetry(
      () => this.ai.models.generateContent({ model: this.model, contents, config }),
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry: (attempt, err) => {
          console.log(`[Gemini] Retry ${attempt}: ${err.message}`);
        },
      }
    );
  }

  /**
   * Transcribe audio to text using Gemini native inline audio.
   * Context7 docs: ai.models.generateContent with inlineData parts.
   * Fast single-turn call — no tools, no thinking, no history.
   * Supports multilingual: English, Sinhala (සිංහල), Tamil (தமிழ்).
   */
  async transcribeAudio(audio: { data: string; mimeType: string }, language?: string): Promise<string> {
    // Always accept all three languages + code-switching, use language as primary hint.
    // Users freely mix English, Sinhala (සිංහල), and Tamil (தமிழ்) mid-sentence.
    const primaryLang = language === 'si' ? 'Sinhala (සිංහල)'
      : language === 'ta' ? 'Tamil (தமிழ்)'
      : 'English';
    const sttPrompt = `Transcribe this audio exactly as spoken. The speaker is Sri Lankan and may speak in ${primaryLang}, English, Sinhala (සිංහල), Tamil (தமிழ்), or freely mix languages mid-sentence (code-switching). Preserve each word in its original language and script: Sinhala words in Sinhala script, Tamil words in Tamil script, English words in English. Do NOT translate. Return only the raw transcription text — no labels, no prefixes, no explanations.`;

    const contents = [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: audio.mimeType, data: audio.data } },
        { text: sttPrompt },
      ],
    }];
    const response = await this.generateContent(contents, {
      thinkingConfig: { thinkingLevel: 'low', includeThoughts: false },
    });
    return response.text?.trim() ?? '';
  }

  async chat(systemPrompt: string, history: ChatMessage[], userMessage: string, tools: ToolDeclaration[], executeTool: (call: ToolCall) => Promise<any>, images?: Array<{ data: string; mimeType: string }>) {
    const toolCallsLog: any[] = [];

    const contents: any[] = [
      ...history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })),
    ];

    const userParts: any[] = [];
    if (images?.length) {
      for (const img of images) {
        userParts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
      }
    }
    userParts.push({ text: userMessage });
    contents.push({ role: 'user', parts: userParts });

    const config: any = {
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: tools.map(t => this.toGeminiDecl(t)) }],
      // AUTO lets the model decide when to call tools vs. reply in text —
      // most reliable mode for open-ended agentic turns.
      toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
      thinkingConfig: { thinkingLevel: 'low', includeThoughts: false },
    };

    let response = await this.generateContent(contents, config);
    let safetyLoops = 0;

    while (response.functionCalls?.length > 0 && safetyLoops < 8) {
      safetyLoops++;

      // Push the FULL model content — Gemini requires all parts including
      // thoughtSignature back in history, or the next call returns 400.
      if (response.candidates?.[0]?.content) {
        contents.push(response.candidates[0].content);
      }

      const calls = response.functionCalls;
      const deduped = new Map<string, any>();
      for (const call of calls) {
        const key = `${call.name}:${JSON.stringify(call.args)}`;
        if (!deduped.has(key)) deduped.set(key, call);
      }

      const results = await Promise.all(
        [...deduped.values()].map(async (call: any) => {
          const toolCall: ToolCall = { id: call.id ?? call.name, name: call.name, args: call.args };
          let result: any;
          try { result = await executeTool(toolCall); } catch (e: any) { result = { error: e.message }; }
          toolCallsLog.push({ toolName: call.name, args: call.args, result });
          return { call, result };
        })
      );

      // Gemini requires a functionResponse part for EVERY functionCall it emitted.
      // id must match the call's id exactly (or be omitted if call has no id).
      // response must be Record<string,unknown> — wrap arrays/primitives in {output:...}.
      const resultByKey = new Map<string, any>();
      for (const { call, result } of results) {
        resultByKey.set(`${call.name}:${JSON.stringify(call.args)}`, result);
      }
      const responseParts: any[] = [];
      for (const call of calls) {
        const key = `${call.name}:${JSON.stringify(call.args)}`;
        const rawResult = resultByKey.get(key)!;
        // Ensure response is Record<string,unknown> — Gemini rejects arrays/primitives
        const safeResponse: Record<string, unknown> =
          rawResult && typeof rawResult === 'object' && !Array.isArray(rawResult)
            ? rawResult
            : { output: rawResult };
        const frPart: any = { functionResponse: { name: call.name, response: safeResponse } };
        // Only include id if the model provided one — don't generate fake IDs
        if (call.id) frPart.functionResponse.id = call.id;
        responseParts.push(frPart);
      }

      contents.push({ role: 'user', parts: responseParts });
      response = await this.generateContent(contents, config);
    }

    // Loop budget exhausted — if the last response had pending function calls,
    // execute them once so the user gets results, not a silent "Done!".
    if (response.functionCalls?.length > 0) {
      console.warn(`[Gemini] Loop budget exhausted with ${response.functionCalls.length} pending calls — executing final batch`);
      for (const call of response.functionCalls) {
        const toolCall: ToolCall = { id: call.id, name: call.name, args: call.args };
        let result: any;
        try { result = await executeTool(toolCall); } catch (e: any) { result = { error: e.message }; }
        toolCallsLog.push({ toolName: call.name, args: call.args, result });
      }
    }

    return { reply: response.text ?? 'Done! Check the updated results.', toolCalls: toolCallsLog };
  }
}

// ─── OpenAI / DeepSeek Adapter ────────────────────────────────────────────────
// OpenAI and DeepSeek share the same API format (chat completions + tool_calls).
// DeepSeek: just change baseURL to 'https://api.deepseek.com/v1'

class OpenAIAdapter implements LLMAdapter {
  readonly provider: string;
  readonly model: string;
  private client: any;

  private readonly isDeepSeek: boolean;

  constructor(model = 'gpt-4o-mini', provider = 'openai') {
    this.model = model;
    this.provider = provider;
    this.isDeepSeek = provider === 'deepseek';
  }

  async init(apiKey: string, baseURL?: string) {
    // Works for OpenAI, DeepSeek, any OpenAI-compatible endpoint
    const { OpenAI } = await import('openai').catch(() => { throw new Error('Install openai'); });
    this.client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  }

  /** Convert canonical ToolDeclaration → OpenAI function tool format. */
  private toOpenAITool(tool: ToolDeclaration) {
    return { type: 'function' as const, function: { name: tool.name, description: tool.description, parameters: tool.parameters } };
  }

  /** Compact a tool result for the MODEL's context only — the frontend still
   *  receives the full result via toolCallsLog. Search results carry image
   *  URLs + long descriptions the model never needs; trimming them cuts
   *  per-turn tokens dramatically (faster + cheaper + less distraction). */
  private compactForModel(name: string, result: any): any {
    try {
      if (name === 'kapruka_search_products') {
        // Pass through service-unavailable payloads unchanged so the LLM
        // sees the error field and responds with "try again" rather than "nothing found".
        if (result?._unavailable || result?.error) {
          return { results: [], error: result.error ?? 'Product catalog temporarily unavailable.' };
        }
        const arr = Array.isArray(result) ? result : result?.results;
        if (Array.isArray(arr)) {
          const compactItems = arr.map((p: any) => ({
            product_id: p.product_code ?? p.id,
            name: p.name,
            price_lkr: p.price_lkr ?? p.price?.amount,
            category: p.category,
            stock_level: p.stock_level,
            ...(p.compare_at_price ? { compare_at_price: p.compare_at_price } : {}),
          }));
          // Keep the cursor visible to the model so "show me more" can paginate
          const cursor = !Array.isArray(result) ? result?.next_cursor : null;
          return cursor ? { results: compactItems, next_cursor: cursor } : compactItems;
        }
      }
      if (name === 'kapruka_get_product' && result && typeof result === 'object' && !Array.isArray(result)) {
        const { images, description, ...rest } = result;
        return {
          ...rest,
          description: typeof description === 'string' ? description.slice(0, 400) : description,
          images: Array.isArray(images) ? images.slice(0, 1) : images, // keep 1 for markdown image
        };
      }
    } catch { /* fall through — never let compaction break the loop */ }
    return result;
  }

  async chat(systemPrompt: string, history: ChatMessage[], userMessage: string, tools: ToolDeclaration[], executeTool: (call: ToolCall) => Promise<any>, _images?: Array<{ data: string; mimeType: string }>) {
    const toolCallsLog: any[] = [];
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userMessage }
    ];

    let safetyLoops = 0;
    while (safetyLoops < 10) {
      safetyLoops++;
      const completionParams: any = {
        model: this.model,
        messages,
        tools: tools.map(t => this.toOpenAITool(t)),
        tool_choice: 'auto',
        // Warmer, more human register — personality matters more than determinism here.
        temperature: 0.75,
      };
      if (this.isDeepSeek) {
        // Low effort: keeps the planning benefit for tool sequencing but cuts
        // multi-second thinking delays. Speed is a judged criterion.
        completionParams.thinking = { type: 'enabled' };
        completionParams.reasoning_effort = 'low';
      }
      
      // Use retry logic for transient errors
      const response: any = await withRetry(
        () => this.client.chat.completions.create(completionParams),
        {
          maxRetries: 3,
          baseDelayMs: 1000,
          onRetry: (attempt, err) => {
            console.log(`[${this.provider}] Retry ${attempt}: ${err.message}`);
          },
        }
      );

      const msg = response.choices[0].message;
      messages.push(msg);

      if (!msg.tool_calls?.length) {
        return { reply: msg.content ?? 'Done!', toolCalls: toolCallsLog };
      }

      // Execute ALL tool calls of this turn truly in parallel — the curated-mix
      // discovery fires 2 searches at once; serial execution doubled the latency.
      // Identical duplicate calls in the same round (model quirk: same search
      // twice) execute ONCE and share the result.
      const inFlight = new Map<string, Promise<any>>();
      const settled = await Promise.all(
        msg.tool_calls.map(async (call: any) => {
          const toolCall: ToolCall = { id: call.id, name: call.function.name, args: JSON.parse(call.function.arguments) };
          const dedupeKey = `${toolCall.name}:${call.function.arguments}`;
          let p = inFlight.get(dedupeKey);
          if (!p) {
            p = executeTool(toolCall).catch((e: any) => ({ error: (e as Error).message }));
            inFlight.set(dedupeKey, p);
          }
          const result = await p;
          return { call, toolCall, result };
        })
      );
      for (const { call, toolCall, result } of settled) {
        toolCallsLog.push({ toolName: call.function.name, args: toolCall.args, result });
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(this.compactForModel(call.function.name, result)) });
      }
    }

    // Loop budget exhausted mid-task — force a clean closing message instead of
    // leaking "Max iterations reached." to the customer. One last call with
    // tools disabled makes the model summarise where things stand.
    try {
      messages.push({
        role: 'user',
        content: '[SYSTEM: Tool budget for this turn is exhausted. Summarise for the customer in 1-2 warm sentences exactly what was completed and what single thing they should confirm or do next. Do not mention tools, budgets, or system limits.]',
      });
      const finalParams: any = { model: this.model, messages, temperature: 0.75 };
      if (this.isDeepSeek) {
        finalParams.thinking = { type: 'enabled' };
        finalParams.reasoning_effort = 'low';
      }
      const finalResp = await this.client.chat.completions.create(finalParams);
      const text = finalResp.choices[0]?.message?.content;
      if (text) return { reply: text, toolCalls: toolCallsLog };
    } catch { /* fall through to static fallback */ }
    return { reply: 'Almost there! Could you confirm the last detail so I can finish up? 😊', toolCalls: toolCallsLog };
  }
}

// ─── Anthropic Claude Adapter ─────────────────────────────────────────────────

class ClaudeAdapter implements LLMAdapter {
  readonly provider = 'claude';
  readonly model: string;
  private client: any;

  constructor(model = 'claude-opus-4-5') {
    this.model = model;
  }

  async init(apiKey: string) {
    const Anthropic = await (import('@anthropic-ai/sdk' as any) as Promise<any>).catch(() => { throw new Error('Install @anthropic-ai/sdk: npm i @anthropic-ai/sdk'); });
    this.client = new Anthropic.default({ apiKey });
  }

  /** Convert canonical ToolDeclaration → Anthropic tool format. */
  private toClaudeTool(tool: ToolDeclaration) {
    return { name: tool.name, description: tool.description, input_schema: tool.parameters };
  }

  async chat(systemPrompt: string, history: ChatMessage[], userMessage: string, tools: ToolDeclaration[], executeTool: (call: ToolCall) => Promise<any>, _images?: Array<{ data: string; mimeType: string }>) {
    const toolCallsLog: any[] = [];
    const messages: any[] = [
      ...history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: userMessage }
    ];

    let safetyLoops = 0;
    while (safetyLoops < 8) {
      safetyLoops++;
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: tools.map(t => this.toClaudeTool(t))
      });

      if (response.stop_reason === 'end_turn') {
        const text = response.content.find((b: any) => b.type === 'text')?.text ?? 'Done!';
        return { reply: text, toolCalls: toolCallsLog };
      }

      // Append assistant's response (may contain tool_use blocks)
      messages.push({ role: 'assistant', content: response.content });

      // Execute all tool_use blocks
      const toolResults: any[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const toolCall: ToolCall = { id: block.id, name: block.name, args: block.input };
        let result: any;
        try { result = await executeTool(toolCall); } catch (e: any) { result = { error: (e as Error).message }; }
        toolCallsLog.push({ toolName: block.name, args: block.input, result });
        // Claude requires tool_result content block with matching tool_use_id
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      }
      messages.push({ role: 'user', content: toolResults });
    }
    return { reply: 'Max iterations reached.', toolCalls: toolCallsLog };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export type ProviderName = 'gemini' | 'openai' | 'claude' | 'deepseek';

export interface AdapterConfig {
  provider: ProviderName;
  apiKey: string;
  model?: string;       // Override default model for provider
  baseURL?: string;     // For OpenAI-compatible endpoints (DeepSeek, local Ollama, etc.)
}

/**
 * createLLMAdapter — the single swap point.
 *
 * Examples:
 *   createLLMAdapter({ provider: 'gemini',   apiKey: process.env.GEMINI_API_KEY! })
 *   createLLMAdapter({ provider: 'openai',   apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o' })
 *   createLLMAdapter({ provider: 'claude',   apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-opus-4-5' })
 *   createLLMAdapter({ provider: 'deepseek', apiKey: process.env.DEEPSEEK_API_KEY!, baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' })
 */
export async function createLLMAdapter(config: AdapterConfig): Promise<LLMAdapter> {
  switch (config.provider) {
    case 'gemini': {
      const adapter = new GeminiAdapter(config.model ?? 'gemini-3.1-flash-lite');
      await adapter.init(config.apiKey);
      return adapter;
    }
    case 'openai': {
      const adapter = new OpenAIAdapter(config.model ?? 'gpt-4o-mini', 'openai');
      await adapter.init(config.apiKey, config.baseURL);
      return adapter;
    }
    case 'deepseek': {
      const adapter = new OpenAIAdapter(
        config.model ?? 'deepseek-v4-flash',
        'deepseek'
      );
      await adapter.init(config.apiKey, config.baseURL ?? 'https://api.deepseek.com/v1');
      return adapter;
    }
    case 'claude': {
      const adapter = new ClaudeAdapter(config.model ?? 'claude-opus-4-5');
      await adapter.init(config.apiKey);
      return adapter;
    }
    default:
      throw new Error(`Unknown provider: ${(config as any).provider}. Valid: gemini, openai, claude, deepseek`);
  }
}
