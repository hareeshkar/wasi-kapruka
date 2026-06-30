# AGENTS.md

## Cursor Cloud specific instructions

Wasi is a single Node service: an Express server (`server.ts`, run with `tsx`) that
also mounts Vite middleware in development, so the API and the React/Vite frontend are
served together from **one process on port 3000**. There is no separate frontend dev server.

### Run / lint / build (see `package.json` scripts)
- Dev: `npm run dev` (`tsx server.ts`) → http://localhost:3000 (API + Vite SPA in one process).
- Lint / typecheck: `npm run lint` (`tsc --noEmit`).
- Prod build: `npm run build` (Vite build + esbuild bundles the server to `dist/server.cjs`); `npm start` runs the bundle.

### Non-obvious caveats
- **The server starts fine with no API keys.** Missing `GEMINI_API_KEY` only prints
  `API key should be set when using the Gemini API.` at boot — it does NOT crash. `/health`
  and the catalog REST endpoints still work.
- **The conversational chat needs an LLM key.** `POST /api/chat` (and the whole UI flow,
  since the landing-page category cards and input box all route through `/api/chat`) fails
  without a provider key. Default provider is Gemini (`LLM_PROVIDER=gemini`), so set
  `GEMINI_API_KEY` to exercise the concierge. Alternatives: `LLM_PROVIDER=deepseek|openai|claude`
  with the matching `DEEPSEEK_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`.
- **The core commerce engine needs NO keys.** The catalog/orders run against the public live
  Kapruka MCP (`https://mcp.kapruka.com/mcp`) and work out of the box from the VM. You can
  test the full flow with plain HTTP:
  `GET /api/products?q=...`, `GET /api/products/:code`, `GET /api/categories`,
  `GET /api/cities?query=...`, `POST /api/check-delivery`, `POST /api/create-order`.
  `create-order` returns a real `checkout_url` on kapruka.com.
- If the live MCP is unreachable, `src/lib/mcp.ts` has a circuit breaker + simulator fallback,
  so catalog calls degrade rather than error (search returns a "temporarily unavailable" payload).
- **Supabase is optional.** Auth, saved carts, and conversation history need
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (client) and `SUPABASE_URL` +
  `SUPABASE_SERVICE_KEY` (server). Without them the app runs as a guest with in-memory state;
  the client just logs a `[supabase] Missing env vars` warning.
- Env vars are loaded from a local `.env` (gitignored) via `dotenv`; `render.yaml` lists the
  full set used in production.
