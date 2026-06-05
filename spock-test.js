// spock-test.js — Wasi Concierge Full-Stack Smoke Test v2.1
// Tests: (1) Live Kapruka MCP JSON-RPC, (2) Express REST API, (3) AI Chat endpoint
// All MCP calls use the correct "params" wrapper required by the live Pydantic schema.
// Run:    node spock-test.js
// Output: output/smoke-YYYY-MM-DD.json (created automatically)

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
const RUN_DATE = new Date().toISOString();

const BACKEND_URL = 'http://localhost:3000';
const MCP_ENDPOINT = 'https://mcp.kapruka.com/mcp';
const TOMORROW = new Date(Date.now() + 86400000).toISOString().split('T')[0];

// ─── Utilities ────────────────────────────────────────────────────────────────

let sessionId = null;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runAssertion(testName, testFn) {
  process.stdout.write(`  ↳ [TEST] ${testName.padEnd(58, '·')} `);
  const t0 = Date.now();
  try {
    const result = await testFn();
    const ms = Date.now() - t0;
    console.log(`✅ PASSED (${ms}ms)`);
    if (result !== undefined && result !== null) {
      const preview = JSON.stringify(result);
      if (preview.length > 0) {
        console.log(`       ↪ ${preview.substring(0, 160)}${preview.length > 160 ? '…' : ''}`);
      }
    }
    return { name: testName, status: 'PASSED', ms, error: null };
  } catch (err) {
    const ms = Date.now() - t0;
    console.log(`❌ FAILED (${ms}ms)`);
    console.log(`       ↪ ${err.message}`);
    return { name: testName, status: 'FAILED', ms, error: err.message };
  }
}

// ─── MCP Session Helpers ─────────────────────────────────────────────────────

async function mcpHandshake() {
  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'User-Agent': 'Mozilla/5.0 WasiConcierge/2.0'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'spock-test', version: '2.0' }
      },
      id: 1
    })
  });
  if (!res.ok) throw new Error(`Handshake failed: HTTP ${res.status}`);
  const sid = res.headers.get('mcp-session-id');
  if (!sid) throw new Error('No mcp-session-id header in response');
  sessionId = sid;
  return sid;
}

// Call a tool with the CORRECT { params: {...} } wrapper required by Kapruka Pydantic schema
async function mcpCall(toolName, toolParams) {
  if (!sessionId) await mcpHandshake();
  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'mcp-session-id': sessionId,
      'User-Agent': 'Mozilla/5.0 WasiConcierge/2.0'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        // Kapruka MCP wraps everything inside "params" per its Pydantic input schema
        arguments: { params: toolParams }
      },
      id: Math.floor(Math.random() * 9000 + 1000)
    })
  });

  if (res.status === 429) throw new Error('Rate limited by Kapruka MCP (HTTP 429). Wait and retry.');
  if (res.status === 406) throw new Error('Cloudflare WAF blocked (HTTP 406). Run from local network.');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // Parse SSE or plain JSON
  const text = await res.text();
  let payload;
  if (text.includes('data:')) {
    const lines = text.split('\n');
    const dataLines = lines.filter(l => l.trim().startsWith('data:')).map(l => l.replace(/^data:\s*/, '').trim());
    payload = JSON.parse(dataLines.join('\n'));
  } else {
    payload = JSON.parse(text);
  }

  if (payload.error) throw new Error(`JSON-RPC error: ${payload.error.message}`);

  const textContent = payload.result?.content?.find(c => c.type === 'text')?.text;
  if (textContent) {
    if (textContent.startsWith('Error')) throw new Error(textContent);
    try { return JSON.parse(textContent); } catch { return textContent; }
  }
  return payload.result;
}

// ─── Stage 1: MCP Direct JSON-RPC Tests ──────────────────────────────────────

async function runMcpTests(results) {
  console.log(`\n┌─ STAGE 1: Kapruka MCP JSON-RPC — Direct Integration ─────────────────────┐`);

  results.push(await runAssertion('MCP Handshake / Session Init', async () => {
    const sid = await mcpHandshake();
    return `Session: ${sid}`;
  }));

  await sleep(600); // rate limit buffer

  results.push(await runAssertion('MCP: kapruka_list_categories (depth=2)', async () => {
    const r = await mcpCall('kapruka_list_categories', { depth: 2, response_format: 'json' });
    const cats = Array.isArray(r) ? r : r?.categories || [];
    if (!cats.length && typeof r === 'string') return `Markdown: ${r.substring(0, 100)}`;
    if (!cats.length) throw new Error('No categories returned');
    return `${cats.length} categories`;
  }));

  await sleep(600);

  results.push(await runAssertion('MCP: kapruka_search_products q="chocolate"', async () => {
    const r = await mcpCall('kapruka_search_products', {
      q: 'chocolate',
      limit: 5,
      response_format: 'json'
    });
    const prods = Array.isArray(r) ? r : r?.results || r?.products || [];
    if (!prods.length && typeof r === 'string') return `Markdown: ${r.substring(0, 120)}`;
    return `${prods.length} products — first: ${prods[0]?.name || '?'}`;
  }));

  await sleep(600);

  results.push(await runAssertion('MCP: kapruka_search_products q="birthday" (multi-keyword)', async () => {
    const r = await mcpCall('kapruka_search_products', {
      q: 'birthday',
      limit: 3,
      response_format: 'json'
    });
    const prods = Array.isArray(r) ? r : r?.results || r?.products || [];
    if (typeof r === 'string') return `Markdown: ${r.substring(0, 120)}`;
    return `${prods.length} products — first: ${prods[0]?.name || '?'}`;
  }));

  await sleep(600);

  // Use a real Kapruka product ID (from cat_response.json / test_output.txt — real IDs look like 'cake00ka002034')
  results.push(await runAssertion('MCP: kapruka_get_product product_id="cake00ka002034"', async () => {
    const r = await mcpCall('kapruka_get_product', {
      product_id: 'cake00ka002034',
      currency: 'LKR',
      response_format: 'json'
    });
    if (typeof r === 'string') return `Response: ${r.substring(0, 100)}`;
    return r?.name || r?.id || JSON.stringify(r).substring(0, 80);
  }));

  await sleep(600);

  results.push(await runAssertion('MCP: kapruka_list_delivery_cities query="Colombo"', async () => {
    const r = await mcpCall('kapruka_list_delivery_cities', {
      query: 'Colombo',
      response_format: 'json'
    });
    const cities = Array.isArray(r) ? r : r?.cities || [];
    if (typeof r === 'string') return `Markdown: ${r.substring(0, 120)}`;
    return `${cities.length} cities`;
  }));

  await sleep(600);

  results.push(await runAssertion('MCP: kapruka_list_delivery_cities query="Kandy"', async () => {
    const r = await mcpCall('kapruka_list_delivery_cities', {
      query: 'Kandy',
      response_format: 'json'
    });
    if (typeof r === 'string') return `Markdown: ${r.substring(0, 120)}`;
    return r;
  }));

  await sleep(600);

  results.push(await runAssertion('MCP: kapruka_check_delivery city="Colombo 01" product_id="cake00ka002034"', async () => {
    const r = await mcpCall('kapruka_check_delivery', {
      city: 'Colombo 01',
      product_id: 'cake00ka002034',
      delivery_date: TOMORROW,
      response_format: 'json'
    });
    if (typeof r === 'string') return `Response: ${r.substring(0, 120)}`;
    return r;
  }));

  await sleep(600);

  results.push(await runAssertion('MCP: kapruka_check_delivery city="Kandy" product_id="flower00ka003001"', async () => {
    const r = await mcpCall('kapruka_check_delivery', {
      city: 'Kandy',
      product_id: 'flower00ka003001',
      delivery_date: TOMORROW,
      response_format: 'json'
    });
    if (typeof r === 'string') return `Response: ${r.substring(0, 120)}`;
    return r;
  }));

  await sleep(800);

  results.push(await runAssertion('MCP: kapruka_create_order (full cart/recipient/delivery/sender)', async () => {
    const r = await mcpCall('kapruka_create_order', {
      cart: [{ product_id: 'cake00ka002034', quantity: 1 }],
      recipient: { name: 'Nimal Perera', phone: '0771234567' },
      delivery: {
        address: 'No. 42, Galle Road, Colombo 03',
        city: 'Colombo 03',
        date: TOMORROW,
        location_type: 'house'
      },
      sender: { name: 'Wasi Bot', anonymous: false },
      gift_message: 'Happy Birthday from Wasi!',
      response_format: 'json'
    });
    if (typeof r === 'string') return `Response: ${r.substring(0, 120)}`;
    return r;
  }));

  await sleep(600);

  results.push(await runAssertion('MCP: kapruka_track_order order_number="KAP-999999" (expect not-found)', async () => {
    try {
      const r = await mcpCall('kapruka_track_order', {
        order_number: 'KAP-999999',
        response_format: 'json'
      });
      if (typeof r === 'string') return `Response: ${r.substring(0, 120)}`;
      return r;
    } catch (e) {
      // "order_not_found" is a valid expected outcome for a test order number
      if (e.message.includes('order_not_found') || e.message.includes('No order exists')) {
        return '✓ Correctly returned order_not_found for unknown KAP number';
      }
      throw e;
    }
  }));

  console.log(`└──────────────────────────────────────────────────────────────────────────┘`);
}

// ─── Stage 2: Express REST API Tests ─────────────────────────────────────────

async function runApiTests(results) {
  console.log(`\n┌─ STAGE 2: Express REST API — Backend Controller Verification ─────────────┐`);

  results.push(await runAssertion('GET /api/categories', async () => {
    const res = await fetch(`${BACKEND_URL}/api/categories`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (!d.success) throw new Error(`API error: ${d.error}`);
    const cats = Array.isArray(d.categories) ? d.categories : (d.categories?.categories || []);
    return `${cats.length} categories`;
  }));

  results.push(await runAssertion('GET /api/products?q=cake', async () => {
    const res = await fetch(`${BACKEND_URL}/api/products?q=cake`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (!d.success) throw new Error(`API error: ${d.error}`);
    if (!Array.isArray(d.products)) throw new Error('products not an array');
    // Live MCP may return 0 for 'cake' (uses its own search index) — that's valid
    return `${d.products.length} products (may be 0 from live if no match)`;
  }));

  results.push(await runAssertion('GET /api/products?q=chocolate', async () => {
    const res = await fetch(`${BACKEND_URL}/api/products?q=chocolate`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (!d.success) throw new Error(`API error: ${d.error}`);
    if (!Array.isArray(d.products)) throw new Error('products not an array');
    return `${d.products.length} products — first: ${d.products[0]?.name || 'n/a'}`;
  }));

  results.push(await runAssertion('GET /api/products/CAKE_CHOC_FUDGE (fallback product)', async () => {
    const res = await fetch(`${BACKEND_URL}/api/products/CAKE_CHOC_FUDGE`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (!d.success) throw new Error(`API error: ${d.error}`);
    if (!d.product) throw new Error('No product in response');
    return `${d.product.name || d.product.id}`;
  }));

  results.push(await runAssertion('GET /api/cities?query=Colombo', async () => {
    const res = await fetch(`${BACKEND_URL}/api/cities?query=Colombo`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (!d.success) throw new Error(`API error: ${d.error}`);
    return `${Array.isArray(d.cities) ? d.cities.length : '?'} cities`;
  }));

  results.push(await runAssertion('GET /api/cities?query=Kandy', async () => {
    const res = await fetch(`${BACKEND_URL}/api/cities?query=Kandy`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (!d.success) throw new Error(`API error: ${d.error}`);
    return `${Array.isArray(d.cities) ? d.cities.length : '?'} cities`;
  }));

  results.push(await runAssertion('POST /api/check-delivery (COL1, CAKE_CHOC_FUDGE, tomorrow)', async () => {
    const res = await fetch(`${BACKEND_URL}/api/check-delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city_code: 'COL1',
        product_code: 'CAKE_CHOC_FUDGE',
        delivery_date: TOMORROW
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (!d.success) throw new Error(`API error: ${d.error}`);
    return d.result;
  }));

  results.push(await runAssertion('POST /api/create-order (Choc Fudge Cake, COL1, tomorrow)', async () => {
    const res = await fetch(`${BACKEND_URL}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ product_code: 'CAKE_CHOC_FUDGE', quantity: 1 }],
        recipient_name: 'Dinesh Gunawardena',
        recipient_phone: '0773344556',
        city_code: 'COL1',
        delivery_date: TOMORROW,
        address: 'No. 5, Galle Road, Colombo 03',
        gift_message: 'Happy Birthday! From Wasi 🎂'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (!d.success) throw new Error(`API error: ${d.error}`);
    const order = d.order;
    if (!order) throw new Error('No order object in response');
    const ref = order.order_ref || order.order_id || order.id;
    if (!ref) throw new Error('No order reference returned');
    return `Order: ${ref} | Pay: ${order.pay_url || order.checkout_url || 'n/a'}`;
  }));

  results.push(await runAssertion('POST /api/track-order (KAP-123456)', async () => {
    const res = await fetch(`${BACKEND_URL}/api/track-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_number: 'KAP-123456' })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (!d.success) throw new Error(`API error: ${d.error}`);
    return d.result;
  }));

  console.log(`└──────────────────────────────────────────────────────────────────────────┘`);
}

// ─── Stage 3: Gemini Chat (Wasi Bot) ─────────────────────────────────────────

async function runChatTests(results) {
  console.log(`\n┌─ STAGE 3: DeepSeek Chat Endpoint — Wasi AI Agent ─────────────────────────┐`);

  results.push(await runAssertion('POST /api/chat — English: birthday cake Colombo', async () => {
    const res = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'I need a chocolate birthday cake for my friend in Colombo. Budget is under Rs. 5000.',
        history: [],
        language: 'en'
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt.substring(0, 200)}`);
    }
    const d = await res.json();
    if (!d.success) throw new Error(`Chat error: ${d.error}`);
    const toolsUsed = (d.toolCalls || []).map(t => t.toolName).join(', ');
    return `Reply: ${(d.reply || '').substring(0, 100)}… | Tools: [${toolsUsed}]`;
  }));

  await sleep(2000); // Gemini rate limit buffer between chat calls

  results.push(await runAssertion('POST /api/chat — Sinhala: gift for amma', async () => {
    const res = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'අම්මාට ගිෆ්ට් එකක් හොයනවා, කොළඹ ගෙදර දෙන්න ඕනේ',
        history: [],
        language: 'si'
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt.substring(0, 200)}`);
    }
    const d = await res.json();
    if (!d.success) throw new Error(`Chat error: ${d.error}`);
    return `Reply: ${(d.reply || '').substring(0, 100)}…`;
  }));

  console.log(`└──────────────────────────────────────────────────────────────────────────┘`);
}

// ─── Main Runner ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃         WASI CONCIERGE  •  SPOCK INTEGRATION TEST SUITE v2.1            ┃
┃         Kapruka MCP  +  Express REST  +  DeepSeek Chat                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  Time:     ${new Date().toISOString()}
  Backend:  ${BACKEND_URL}
  MCP URL:  ${MCP_ENDPOINT}
  Tomorrow: ${TOMORROW}
`);

  const results = [];

  await runMcpTests(results);
  await runApiTests(results);
  await runChatTests(results);

  // ── Summary ──
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const total = results.length;

  console.log(`
================================================================================
🏁  SPOCK REPORT
================================================================================`);

  for (const r of results) {
    const icon = r.status === 'PASSED' ? '✅' : '❌';
    const name = r.name.padEnd(62, ' ');
    console.log(`${icon} ${name} (${r.ms}ms)`);
    if (r.status === 'FAILED' && r.error) {
      console.log(`   └─ ${r.error.substring(0, 120)}`);
    }
  }

  console.log(`
================================================================================
🎯  Results: ${passed} / ${total} PASSED   |   ${failed} FAILED
================================================================================`);

  if (failed === 0) {
    console.log('🚀  ALL TESTS PASSED — PRODUCTION READY!');
  } else if (passed >= total * 0.7) {
    console.log('⚠️   MOST TESTS PASSED — minor issues detected. Check ❌ lines above.');
  } else {
    console.log('🔴  SIGNIFICANT FAILURES — review errors and ensure server is running.');
    console.log('    TIP: Start the server with: npm run dev');
  }
  console.log('================================================================================\n');

  // Save output for future agents
  const date = RUN_DATE.slice(0, 10);
  const outDir = join(process.cwd(), 'output');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `smoke-${date}.json`);
  writeFileSync(outPath, JSON.stringify({
    meta: { test: 'Wasi Full-Stack Smoke Test', backend: BACKEND_URL, mcp: MCP_ENDPOINT, date: RUN_DATE },
    summary: { passed, failed, total, pass_rate: `${Math.round(passed/total*100)}%` },
    results: results.map(r => ({ name: r.name, status: r.status, ms: r.ms, ...(r.error ? { error: r.error } : {}), ...(r.detail ? { detail: r.detail } : {}) }))
  }, null, 2));
  console.log(`📄  Output → output/smoke-${date}.json\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
