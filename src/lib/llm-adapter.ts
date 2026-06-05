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
    executeTool: (call: ToolCall) => Promise<any>
  ): Promise<{ reply: string; toolCalls: Array<{ toolName: string; args: any; result: any }> }>;
}

// ─── Kapruka MCP Tool Declarations ───────────────────────────────────────────
// These are the CANONICAL tool definitions verified against the live
// Kapruka MCP Pydantic schemas (see MCP_REAL_FINDINGS.md).
// All adapters receive these and convert to their provider's format internally.

export const KAPRUKA_TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: 'kapruka_search_products',
    description: 'Search the Kapruka catalog. Use simple English terms: "chocolate", "birthday cake", "rose", "hamper". Returns product list with ids, names, prices in LKR.',
    parameters: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search query in English (e.g. "chocolate", "birthday", "rose")' },
        category: { type: 'string', description: 'Optional category filter: Cakes, Flowers, Chocolates, Hampers' },
        limit: { type: 'integer', description: 'Max results to return (default 6, max 50)' },
        max_price: { type: 'number', description: 'Maximum price in LKR — ALWAYS set this to the user\'s stated budget' }
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
        product_id: { type: 'string', description: 'Product id from kapruka_search_products results (e.g. "CAKE00KA002034")' }
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
    description: 'Check delivery availability and ESTIMATED cost. Always call kapruka_list_delivery_cities first for the exact city name. IMPORTANT: the rate returned here is an estimate — the authoritative delivery fee is in create_order.summary.delivery_fee. For Jaffna and Batticaloa (slot-prone), only call AFTER you have the delivery date.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Exact city name from kapruka_list_delivery_cities (e.g. "Colombo 01", "Kandy", "Jaffna")' },
        product_id: { type: 'string', description: 'Product id from search results' },
        date: { type: 'string', description: 'Delivery date YYYY-MM-DD (must be tomorrow or later — past dates return an error)' }
      },
      required: ['city', 'product_id', 'date']
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
            location_type: { type: 'string', description: 'house | apartment | office (optional)' },
            instructions: { type: 'string', description: 'Special delivery instructions (optional)' }
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
        gift_message: { type: 'string', description: 'Optional gift card message' }
      },
      required: ['cart', 'recipient', 'delivery', 'sender']

    }
  },
  {
    name: 'kapruka_track_order',
    description: 'Track an existing Kapruka order by its KAP number (found in post-payment email). Note: ORD- references are pre-payment only.',
    parameters: {
      type: 'object',
      properties: {
        order_number: { type: 'string', description: 'Order number starting with KAP- (e.g. KAP-123456)' }
      },
      required: ['order_number']
    }
  },
  {
    name: 'wasi_prefill_checkout',
    description: 'WASI UI TOOL — Pre-fill checkout form. Call on EVERY user message containing name/city/phone/address/date. CRITICAL: recipient_name = ACTUAL person name (Nirmala, Kumari), NOT role (Amma, Wife).\n\nTriggers: city, phone (077*/076*), address, date, proper names, sender name. Do NOT ask for email — user enters it at Kapruka checkout to receive KAP tracking number.',
    parameters: {
      type: 'object',
      properties: {
        recipient_name: { type: 'string', description: 'ACTUAL name: Nirmala, Kumari. NOT Amma/Wife/Akka/Nangi.' },
        recipient_phone: { type: 'string', description: 'SL phone: 077*, 076*, 071*, 070*' },
        city_name: { type: 'string', description: 'City: Kandy, Colombo, Jaffna, Batticaloa, මහනුවර' },
        delivery_address: { type: 'string', description: "Recipient's street address (where gift is delivered)" },
        gift_message: { type: 'string', description: 'Card message' },
        delivery_date: { type: 'string', description: 'YYYY-MM-DD if mentioned' },
        occasion: { type: 'string', description: 'Birthday, Anniversary, Avurudu' },
        sender_name: { type: 'string', description: 'Buyer name for "From: ___" on gift card' }
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
        price_lkr: { type: 'number', description: 'Price in LKR' },
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
    description: 'WASI UI TOOL — Show a visual progress step in the chat interface. Call between major operations (searching, adding to cart, checking delivery, creating order) so the user sees what\'s happening. Use sparingly — once per major phase is enough.',
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
  }
];

// ─── Gemini 3.5 Flash Adapter ─────────────────────────────────────────────────

class GeminiAdapter implements LLMAdapter {
  readonly provider = 'gemini';
  readonly model: string;
  private ai: any;
  private _Type: any;

  constructor(model = 'gemini-3.5-flash') {
    this.model = model;
  }

  async init(apiKey: string) {
    // Dynamic import to keep this file portable even without @google/genai installed
    const { GoogleGenAI, Type } = await import('@google/genai').catch(() => { throw new Error('Install @google/genai'); });
    this.ai = new GoogleGenAI({ apiKey });
    this._Type = Type;
  }

  /** Convert our canonical ToolDeclaration to Gemini's functionDeclaration format. */
  private toGeminiDecl(tool: ToolDeclaration) {
    const mapType = (t: string) => {
      const m: Record<string, any> = { string: this._Type.STRING, integer: this._Type.NUMBER, number: this._Type.NUMBER, boolean: this._Type.BOOLEAN, array: this._Type.ARRAY, object: this._Type.OBJECT };
      return m[t] ?? this._Type.STRING;
    };
    const mapProps = (props: Record<string, any>) => Object.fromEntries(
      Object.entries(props).map(([k, v]) => [k, {
        type: mapType(v.type),
        description: v.description,
        ...(v.enum ? { enum: v.enum } : {}),
        ...(v.items ? { items: { type: mapType(v.items.type) } } : {})
      }])
    );
    return {
      name: tool.name,
      description: tool.description,
      parameters: { type: this._Type.OBJECT, properties: mapProps(tool.parameters.properties), required: tool.parameters.required }
    };
  }

  async chat(systemPrompt: string, history: ChatMessage[], userMessage: string, tools: ToolDeclaration[], executeTool: (call: ToolCall) => Promise<any>) {
    const toolCallsLog: any[] = [];
    const contents: any[] = [
      ...history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })),
      { role: 'user', parts: [{ text: userMessage }] }
    ];
    const config = {
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: tools.map(t => this.toGeminiDecl(t)) }]
    };

    let response = await this.ai.models.generateContent({ model: this.model, contents, config });
    let safetyLoops = 0;

    while (response.functionCalls?.length > 0 && safetyLoops < 8) {
      safetyLoops++;
      contents.push(response.candidates[0].content);
      const responseParts: any[] = [];

      for (const call of response.functionCalls) {
        const toolCall: ToolCall = { id: call.id, name: call.name, args: call.args };
        let result: any;
        try { result = await executeTool(toolCall); } catch (e: any) { result = { error: e.message }; }
        toolCallsLog.push({ toolName: call.name, args: call.args, result });
        // Gemini 3 REQUIRES matching id in functionResponse
        responseParts.push({ functionResponse: { id: call.id, name: call.name, response: { result } } });
      }

      contents.push({ role: 'user', parts: responseParts });
      response = await this.ai.models.generateContent({ model: this.model, contents, config });
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

  async chat(systemPrompt: string, history: ChatMessage[], userMessage: string, tools: ToolDeclaration[], executeTool: (call: ToolCall) => Promise<any>) {
    const toolCallsLog: any[] = [];
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userMessage }
    ];

    let safetyLoops = 0;
    while (safetyLoops < 8) {
      safetyLoops++;
      const completionParams: any = {
        model: this.model,
        messages,
        tools: tools.map(t => this.toOpenAITool(t)),
        tool_choice: 'auto',
      };
      if (this.isDeepSeek) {
        completionParams.thinking = { type: 'enabled' };
        completionParams.reasoning_effort = 'high';
      }
      const response = await this.client.chat.completions.create(completionParams);

      const msg = response.choices[0].message;
      messages.push(msg);

      if (!msg.tool_calls?.length) {
        return { reply: msg.content ?? 'Done!', toolCalls: toolCallsLog };
      }

      // Execute all tool calls in this turn (parallel)
      const toolResults: any[] = [];
      for (const call of msg.tool_calls) {
        const toolCall: ToolCall = { id: call.id, name: call.function.name, args: JSON.parse(call.function.arguments) };
        let result: any;
        try { result = await executeTool(toolCall); } catch (e: any) { result = { error: (e as Error).message }; }
        toolCallsLog.push({ toolName: call.function.name, args: toolCall.args, result });
        toolResults.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
      messages.push(...toolResults);
    }
    return { reply: 'Max iterations reached.', toolCalls: toolCallsLog };
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

  async chat(systemPrompt: string, history: ChatMessage[], userMessage: string, tools: ToolDeclaration[], executeTool: (call: ToolCall) => Promise<any>) {
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
      const adapter = new GeminiAdapter(config.model ?? 'gemini-3.5-flash');
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
