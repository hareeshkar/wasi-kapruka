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

// Tool schemas live in their own dependency-free module (tool-declarations.ts)
// so useGeminiLive.ts can import them client-side without pulling in this
// file's server-only provider SDKs. Imported (for local use below) and
// re-exported (for backward compatibility with existing
// `import { KAPRUKA_TOOL_DECLARATIONS } from './llm-adapter.js'` call sites,
// e.g. server.ts's text-chat route).
import type { ToolDeclaration } from './tool-declarations.js';
import {
  KAPRUKA_TOOL_DECLARATIONS,
  toGeminiFunctionDeclaration,
  LIVE_VOICE_TOOL_NAMES,
  LIVE_VOICE_TOOL_DECLARATIONS,
} from './tool-declarations.js';
export type { ToolDeclaration };
export { KAPRUKA_TOOL_DECLARATIONS, toGeminiFunctionDeclaration, LIVE_VOICE_TOOL_NAMES, LIVE_VOICE_TOOL_DECLARATIONS };

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

    // Join text parts ourselves — the SDK's .text getter concatenates multiple
    // text parts with no separator, fusing words across part boundaries
    // (e.g. "…didn't bring up any" + "baked beans?" → "anybaked beans?").
    const textParts = (response.candidates?.[0]?.content?.parts ?? [])
      .filter((p: any) => typeof p.text === 'string' && !p.thought)
      .map((p: any) => p.text.trim())
      .filter(Boolean);
    const reply = textParts.length ? textParts.join(' ') : (response.text ?? 'Done! Check the updated results.');
    return { reply, toolCalls: toolCallsLog };
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
