// Node.js 18+ has native fetch — no import needed

const MCP_ENDPOINT = 'https://mcp.kapruka.com/mcp';

// Fallback high-quality product catalogue
export const FALLBACK_PRODUCTS = [
  {
    product_code: 'EF_PC_CHOC0V571POD00076',
    name: 'Glitter Hearts Chocolate Box',
    price_lkr: 3500,
    price: 3500,
    category: 'Chocolates',
    image_url: 'https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/https://partnercentral.kapruka.com/kapruka-pc/assets/images/product/pc00334/choc0v571p00076/choc0v571p00076_1.jpg',
    description: 'specialGifts - Chocolate, Valentine, Kpc, Kpcondemand, Chocolates Chocolates The Glitter Hearts Chocolate Box Is A Delightful Treat Filled With Barry Callebaut Glitter Heart Chocolates, Perfect For...',
    stock_level: 'low',
    rating: null,
    url: 'https://www.kapruka.com/buyonline/glitter-hearts-chocolate-box/kid/ef_pc_choc0v571pod00076',
    variants: [
      { id: 'EF_PC_CHOC0V571POD00076_default', name: 'Default', price_lkr: 3500, stock_level: 'low' }
    ]
  },
  {
    product_code: 'CAKE00KA001678',
    name: 'Ocean Fantasy Kid`s Happy Birthday Ribbon Cake For Girl',
    price_lkr: 9500,
    price: 9500,
    category: 'Cakes',
    image_url: 'https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/productImages/zoom/1720413442381_dsc_8763.jpg',
    description: 'cakes - Kaprukacakes, Birthdaycharacters, Birthdaycharacters Kapruka Cakes Dive Into A Magical Underwater Adventure With The Ocean Fantasy Kid s Happy Birthday Ribbon Cake For Girls, Available At K...',
    stock_level: 'low',
    rating: null,
    url: 'https://www.kapruka.com/buyonline/ocean-fantasy-kid-s-happy-birt/kid/cake00ka001678',
    variants: [
      { id: 'CAKE00KA001678_default', name: 'Default', price_lkr: 9500, stock_level: 'low' }
    ]
  },
  {
    product_code: 'FLOWERS00T2075',
    name: '6 Red Rose Bouquet With Elegant Wrapping',
    price_lkr: 5210,
    price: 5210,
    category: 'Flowers',
    image_url: 'https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/flowershop/flowerImages/zooms/1770460761093_00987.jpg',
    description: 'flowers - Bouquet, Redroses Elevate Your Romantic Gestures With The 6 Red Rose Bouquet With Elegant Wrapping, A Quintessential Floral Arrangement Designed To Express Deep Emotions. Perfect For Vale...',
    stock_level: 'low',
    rating: null,
    url: 'https://www.kapruka.com/buyonline/6-red-rose-bouquet-with-elegan/kid/flowers00t2075',
    variants: [
      { id: 'FLOWERS00T2075_default', name: 'Default', price_lkr: 5210, stock_level: 'low' }
    ]
  },
  {
    product_code: 'EF_PC_HAMP0V18POD00018P',
    name: 'Healthy And Energy Booster Fitness Hamper',
    price_lkr: 8450,
    price: 8450,
    category: 'Hampers',
    image_url: 'https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/https://partnercentral.kapruka.com/kapruka-pc/assets/images/product/pc00006/hamp0v18p00018/hamp0v18p00018_1.jpg',
    description: 'specialGifts - Healthyandenergypack, Fitnesshampersrilanka, Energyboosterhamper, Kpc, Kpcondemand, Hampers Hampers Elevate Your Fitness Routine With The Healthy And Energy Booster Fitness Hamper, A...',
    stock_level: 'low',
    rating: null,
    url: 'https://www.kapruka.com/buyonline/healthy-and-energy-booster-fit/kid/ef_pc_hamp0v18pod00018p',
    variants: [
      { id: 'EF_PC_HAMP0V18POD00018P_default', name: 'Default', price_lkr: 8450, stock_level: 'low' }
    ]
  },
  {
    product_code: 'CPHAMPER0268',
    name: 'Family Hygienic Needs Hamper Box - Top Selling Hampers In Sri La',
    price_lkr: 6500,
    price: 6500,
    category: 'Hampers',
    image_url: 'https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/specialGifts/productImages/1700113039650_1.jpg',
    description: 'specialGifts - Corphampers, Corphampers, Supermarket corphampers The Family Hygienic Needs Hamper Box Is A Thoughtful Gift To Keep Your Home Safe And Healthy. This Supermarket Hamper, Available At ...',
    stock_level: 'low',
    rating: null,
    url: 'https://www.kapruka.com/buyonline/family-hygienic-needs-hamper-b/kid/cphamper0268',
    variants: [
      { id: 'CPHAMPER0268_default', name: 'Default', price_lkr: 6500, stock_level: 'low' }
    ]
  },
  {
    product_code: 'CAKE00KA001460',
    name: 'Forever You Anniversary Ribbon Cake',
    price_lkr: 3800,
    price: 3800,
    category: 'Cakes',
    image_url: 'https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/productImages/zoom/1678941166921_dsc_0027_m.jpg',
    description: 'cakes - Kaprukacakes, Loveandromance, Loveandromance Kapruka Cakes Celebrate Love With The Forever You Anniversary Ribbon Cake, Available At Kapruka In Sri Lanka. This Cake Is Perfect For A Wedding...',
    stock_level: 'low',
    rating: null,
    url: 'https://www.kapruka.com/buyonline/forever-you-anniversary-ribbon/kid/cake00ka001460',
    variants: [
      { id: 'CAKE00KA001460_default', name: 'Default', price_lkr: 3800, stock_level: 'low' }
    ]
  },
  {
    product_code: 'SOFTTOY001150',
    name: 'Mink Fur Stitch Plush Toy - 17 Inches',
    price_lkr: 7000,
    price: 7000,
    category: 'Toys',
    image_url: 'https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/specialGifts/productImages/1761298914844_dsc01332_.jpg',
    description: 'specialGifts - Softtoy, Cartooncharacters, Disneycharacters Softtoy Meet Your New Favorite Cuddle Buddy, The Mink Fur Stitch Plush Toy. This Disney Characters Plush Brings The Charming Alien, Stitc...',
    stock_level: 'low',
    rating: null,
    url: 'https://www.kapruka.com/buyonline/mink-fur-stitch-plush-toy-17-i/kid/softtoy001150',
    variants: [
      { id: 'SOFTTOY001150_default', name: 'Default', price_lkr: 7000, stock_level: 'low' }
    ]
  },
  {
    product_code: 'EF_PC_PERF0V1385P00024',
    name: 'Denver Imperial -165ml - None - Men`s Perfumes',
    price_lkr: 1350,
    price: 1350,
    category: 'Perfumes',
    image_url: 'https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/https://partnercentral.kapruka.com/kapruka-pc/assets/images/product/pc00500/perf0v1385p00024/perf0v1385p00024_1.jpg',
    description: 'specialGifts - Kpc, Perfumes/fragrances, Men`sperfumes, Eaudeperfume PERFUMES/FRAGRANCES Denver Imperial Eau De Perfume Offers A High-end Fragrance Experience To Boost Your Confidence Every Day. Pe...',
    stock_level: 'low',
    rating: null,
    url: 'https://www.kapruka.com/buyonline/denver-imperial-165ml-none-men/kid/ef_pc_perf0v1385p00024',
    variants: [
      { id: 'EF_PC_PERF0V1385P00024_default', name: 'Default', price_lkr: 1350, stock_level: 'low' }
    ]
  },
  {
    product_code: 'EF_PC_LIQU0V713POD00021',
    name: 'HALMILLA OLD ARRACK 33 ABV 750ml',
    price_lkr: 6700,
    price: 6700,
    category: 'Liquor',
    image_url: 'https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/https://partnercentral.kapruka.com/kapruka-pc/assets/images/product/pc00405/liqu0v713p00021/liqu0v713p00021_1.jpg',
    description: 'specialGifts - Halmilla, Kpc, Kpcondemand, Liquor, Localliquor LIQUOR Discover The Rich And Smooth Taste Of Halmilla Old Arrack, A Premium LOCAL LIQUOR From Sri Lanka. Perfect For Those Who Appreci...',
    stock_level: 'low',
    rating: null,
    url: 'https://www.kapruka.com/buyonline/halmilla-old-arrack-33-abv-750/kid/ef_pc_liqu0v713pod00021',
    variants: [
      { id: 'EF_PC_LIQU0V713POD00021_default', name: 'Default', price_lkr: 6700, stock_level: 'low' }
    ]
  },
  {
    product_code: 'FRUITS00100',
    name: 'Pineapple-sri Lankan Fruits',
    price_lkr: 490,
    price: 490,
    category: 'Fruits',
    image_url: 'https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/specialGifts/productImages/1215060026015_pineapple.jpg',
    description: 'specialGifts - Fruits, Fruits Fruits Experience The Exotic Taste Of Sri Lankan Pineapple, Famous For Its Golden Color And Sweet, Tangy Flavor. Perfect For A Refreshing Snack Or A Tropical Addition ...',
    stock_level: 'low',
    rating: null,
    url: 'https://www.kapruka.com/buyonline/pineapple-sri-lankan-fruits/kid/fruits00100',
    variants: [
      { id: 'FRUITS00100_default', name: 'Default', price_lkr: 490, stock_level: 'low' }
    ]
  },
  {
    product_code: 'CAKE00KA002132',
    name: 'Lavender Love For Mum Chocolate Cake',
    price_lkr: 8470,
    price: 8470,
    category: 'Cakes',
    image_url: 'https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/shops/cakes/productImages/zoom/1774843545798_dsc08616.jpg',
    description: 'cakes - Tomother, Bestseller, Momtobe, Kaprukacakes, Chocolate, Chocolate Kapruka Cakes A Beautifully Crafted Purple-shaded Mother`s Day Cake, Designed To Celebrate Mum With Elegance And Love. This...',
    stock_level: 'low',
    rating: null,
    url: 'https://www.kapruka.com/buyonline/lavender-love-for-mum-chocolat/kid/cake00ka002132',
    variants: [
      { id: 'CAKE00KA002132_default', name: 'Default', price_lkr: 8470, stock_level: 'low' }
    ]
  },
  {
    product_code: 'cake00KA002034',
    name: 'Blueberry Bliss Bento Cheesecake',
    price_lkr: 4200,
    price: 4200,
    category: 'Cakes',
    image_url: 'https://www.kapruka.com/shops/cakes/productImages/zoom/1763114612717_dsc04266.jpg',
    description: 'CAKE00KA002034 Weight: 1.11 Lbs (0.5 KG)     Kapruka Cakes Cakes     Indulge in the delicious Blueberry Bliss Bento Cheesecake, available at Kapruka in Sri Lanka. This creamy and fruity delight is perfect for any occasion.       Weight:  1.11 Lbs (0.5 KG)        Kapruka Cakes    ',
    stock_level: 'low',
    rating: null,
    url: 'https://www.kapruka.com/buyonline/blueberry-bliss-bento-cheeseca/kid/cake00ka002034',
    variants: [
      { id: 'cake00KA002034_default', name: 'Default', price_lkr: 4200, stock_level: 'low' }
    ]
  }
];

export const FALLBACK_CITIES = [
  { name: 'Colombo 01', aliases: ['Colombo1', 'Colombo', 'Kolomba', 'කොළඹ', 'கொழும்பு'] },
  { name: 'Colombo 02', aliases: ['Slave', 'Colombo2'] },
  { name: 'Colombo 03', aliases: ['Kolpity', 'colpity', 'colombo3', 'Kollupitiya', 'Kollupittiya', 'කොල්ලුපිටිය'] },
  { name: 'Colombo 04', aliases: ['bambala', 'colombo4'] },
  { name: 'Colombo 05', aliases: ['thimbirigasyaya', 'kirulapona', 'narahenpita', 'thibirigas'] },
  { name: 'Colombo 06', aliases: ['wellawatta', 'walawtha', 'wellawatha', 'colombo6', 'welawathth'] },
  { name: 'Colombo 07', aliases: ['Colombo7'] },
  { name: 'Colombo 08', aliases: ['borella', 'boralla', 'colombo8'] },
  { name: 'Colombo 09', aliases: ['Colombo9', 'dematagoda'] },
  { name: 'Colombo 10', aliases: ['maradana'] },
  { name: 'Colombo 11', aliases: ['peta'] },
  { name: 'Colombo 12', aliases: [] },
  { name: 'Colombo 13', aliases: ['Kotahena'] },
  { name: 'Colombo 14', aliases: ['grandpass'] },
  { name: 'Colombo 15', aliases: ['matakuliya', 'modara', 'mutwal'] },
  { name: 'Kandy', aliases: ['galagedara', 'Mahanuwara', 'මහනුවර', 'கண்டி'] },
  { name: 'Galle', aliases: ['gale', 'galla', 'Karandeniya', 'karapitiya', 'milidduwa', 'habara', 'Gale Main Area', 'Habaraduuwa', 'Talpe', 'Koggala', 'ගාල්ල', 'காலி'] },
  { name: 'Jaffna', aliases: ['jafna', 'maniyarpathi', 'kankasan', 'point pedro', 'Omantai', 'Palamadduikulam', 'Puliyankulam', 'Kanakarayankulam', 'Mankulam', 'Kokkavil', 'Iranamadu', 'Paranthan', 'Soranpattu', 'Pallai', 'Mirusuvil', 'Kodikamam', 'Meesalai', 'Kaitadi', 'Nuvatkuti', 'Kokkuvil', 'Jaffna City', 'Yapanaya', 'යාපනය', 'யாழ்ப்பாணம்'] },
  { name: 'Negombo', aliases: ['negambo', 'Meegamuwa', 'මීගමුව', 'நீர்கொழும்பு'] },
  { name: 'Matara', aliases: ['mathara', 'mtara', 'Dickwella', 'dikwella', 'miriswatta', 'Matara City', 'Kamburugamuwa', 'Kamburupitiya', 'Hakmana', 'Makandura', 'මාතර', 'மாத்தறை'] },
  { name: 'Batticaloa', aliases: ['batical', 'kattankudy', 'Valaichenai', 'pasikuda', 'Paddiruppu', 'Kaluwanchikudi', 'Talankuda', 'Kattankudi', 'Eravur', 'Sittandikudi', 'Thoduvilcholai', 'Chenkaladi', 'Rukam', 'Karadiyanaru', 'Periyapullumalai', 'Aittiyanalai', 'Mahilavaddavan', 'Korukkapuliyuttu', 'Vavunativu', 'Batticaloa City'] },
  { name: 'Anuradhapura', aliases: ['anuradapura', 'galenbindunuwewa', 'anuradhapue', 'Anuradhapura City', 'Galkulama', 'Madathugama', 'Maradankadawala', 'Nochiyagama', 'Pahalahalmillewa', 'Ratmale', 'Singharagama', 'Talawa', 'Tirapana', 'Vijithpura'] },
  { name: 'Rathnapura', aliases: ['Ratnapura', 'ratnapure', 'Rathnapura City', 'Kahangama'] },
  { name: 'Badulla', aliases: ['badula', 'Bhadulla', 'Badulla City', 'Beragala', 'Haputale', 'Koslanda', 'Ella', 'Hali Ela', 'Passara'] },
  { name: 'Trincomalee', aliases: ['kinniya', 'Potankadu', 'Vannatidal', 'Tamaraivilu', 'Uppuveli', 'Sampaltivu', 'Kannyai', 'Pankulam', 'Kambakkoddai', 'Gomarankadawela', 'Nilaveli', 'Irrakkakandi', 'Trincomalee Town'] },
  { name: 'Nugegoda', aliases: ['Nugehgoda', 'Nuegoda'] },
  { name: 'Maharagama', aliases: ['nawina'] },
  { name: 'Dehiwala', aliases: ['dehivala', 'dehiwela', 'dehivela'] },
  { name: 'Gampaha', aliases: ['Gampaha', 'ගම්පහ', 'கம்பஹா'] },
  { name: 'Kurunegala', aliases: ['Kurunegala', 'කුරුණෑගල', 'குருணாகல்'] },
  // NOTE: MCP canonical spelling is 'Kaluthara' (with h) — confirmed via list_delivery_cities
  { name: 'Kaluthara', aliases: ['Kalutara', 'kaluthara', 'කළුතර', 'களுத்துறை'] },
  // Cities discovered via mcp-max-probe.mjs — live list_delivery_cities data
  { name: 'Kegalle', aliases: ['kegalle', 'kegalla'] },
  { name: 'Thangalle', aliases: ['tangalle', 'thangalla'] },
  { name: 'Makandura Matara', aliases: ['makandura'] },
  { name: 'Nuwara Eliya', aliases: ['nuwara', 'nuwaraeliya', 'hill country'] },
  { name: 'Medamahanuwara', aliases: [] },
  { name: 'Serunuwara', aliases: [] },
  { name: 'Welikanda Polonnaruwa', aliases: [] },
  { name: 'Kilinochchiya', aliases: ['kilinochchi', 'killinochchi'] },
  // NOTE: MCP canonical spelling is 'Hambanthota' (with h) — confirmed via list_delivery_cities
  { name: 'Hambanthota', aliases: ['Hambantota', 'hambantota', 'hambanthota'] },
  // NOTE: MCP canonical spelling is 'Rathnapura' — confirmed via list_delivery_cities
  { name: 'Rathnapura', aliases: ['Ratnapura', 'ratnapura'] },
  { name: 'Ampara', aliases: ['amparai'] },
  { name: 'Monaragala', aliases: [] },
  { name: 'Vavuniya', aliases: [] },
  { name: 'Mannar', aliases: [] },
];

export interface CreateOrderPayload {
  items: Array<{ product_code: string; variant_id?: string; quantity: number }>;
  recipient_name: string;
  recipient_phone: string;
  city_code: string;
  delivery_date: string;
  address: string;
  gift_message?: string;
  currency?: string;
}

export type OrderTrackingResponse = {
  status: 'received' | 'confirmed' | 'processing' | 'dispatched' | 'delivered' | 'cancelled';
  recipient: { name: string; city: string };
  items: Array<{ product_code: string; name: string; quantity: number }>;
  timeline: Array<{ event: string; timestamp: string }>;
  has_delivery_photo: boolean;
  has_delivery_video: boolean;
};

let cachedSessionId: string | null = null;

export async function getOrEstablishSession(forceRefresh: boolean = false): Promise<string> {
  if (cachedSessionId && !forceRefresh) {
    return cachedSessionId;
  }

  console.log('[MCP] Establishing new session with Kapruka...');
  const initPayload = {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'wasi-client', version: '1.0' }
    },
    id: Math.floor(Math.random() * 1000 + 1)
  };

  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WasiConcierge/1.0'
    },
    body: JSON.stringify(initPayload)
  });

  if (!res.ok) {
    throw new Error(`MCP handshake failed with status ${res.status}`);
  }

  const sessionId = res.headers.get('mcp-session-id');
  if (!sessionId) {
    throw new Error('MCP handshake response did not contain mcp-session-id header');
  }

  cachedSessionId = sessionId;
  console.log(`[MCP] Session established successfully: ${cachedSessionId}`);
  return cachedSessionId;
}

// Main function to query the JSON-RPC interface of the live Kapruka MCP
// ── Client-side TTL cache ──────────────────────────────────────────────────────
// Mirrors the Kapruka MCP server's own per-endpoint cache TTLs (verified from
// .mcp-kapruka/src/api/client.py) so repeat reads never burn the 60 req/min
// rate limit. check_delivery (real-time clock) and create_order (mutation)
// are intentionally uncached.
const MCP_TTL_MS: Record<string, number> = {
  kapruka_list_categories:      30 * 60_000,       // server: 30 min
  kapruka_get_product:          10 * 60_000,       // server: 10 min
  kapruka_search_products:       5 * 60_000,       // server: 5 min
  kapruka_list_delivery_cities: 24 * 60 * 60_000,  // server: 24 h
  kapruka_track_order:               30_000,       // server: 30 s
};
const MCP_CACHE_MAX = 500;
const mcpCache = new Map<string, { expires: number; value: any }>();

/**
 * The MCP replied successfully but with a domain error (e.g. product_not_found,
 * city_not_found). The service is healthy — these must never be retried,
 * simulated, or counted against the circuit breaker.
 */
export class McpBusinessError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'McpBusinessError';
    this.code = code;
  }
}

export async function callMcpTool(toolName: string, args: any, forceDemo: boolean = false): Promise<any> {
  const ttl = MCP_TTL_MS[toolName];
  if (!ttl || forceDemo) return callMcpToolUncached(toolName, args, forceDemo);

  // Same raw args → same sanitization → same result, so raw args are a valid key.
  const key = `${toolName}:${JSON.stringify(args)}`;
  const hit = mcpCache.get(key);
  if (hit && hit.expires > Date.now()) {
    console.log(`[MCP cache] hit ${toolName}`);
    return structuredClone(hit.value);
  }

  const value = await callMcpToolUncached(toolName, args, forceDemo);
  if (mcpCache.size >= MCP_CACHE_MAX) {
    const oldest = mcpCache.keys().next().value;
    if (oldest) mcpCache.delete(oldest);
  }
  mcpCache.set(key, { expires: Date.now() + ttl, value });
  return structuredClone(value);
}

// ── Circuit Breaker ──────────────────────────────────────────────────────────
// After 3 consecutive failures, stop calling MCP for 30 seconds.
// 429 (rate limit) failures use a longer cooldown (60s) since the MCP needs time.
// This prevents cascading failures and reduces load on a struggling backend.
const circuitBreaker = {
  failures: 0,
  openUntil: 0,
  threshold: 3,
  cooldownMs: 30_000,
  rateLimitCooldownMs: 60_000,
  recordSuccess() { this.failures = 0; },
  recordFailure(isRateLimit: boolean = false) {
    this.failures++;
    if (this.failures >= this.threshold) {
      const cooldown = isRateLimit ? this.rateLimitCooldownMs : this.cooldownMs;
      this.openUntil = Date.now() + cooldown;
      console.warn(`[MCP] Circuit OPEN — ${this.failures} consecutive failures. Pausing for ${cooldown / 1000}s.`);
    }
  },
  isOpen(): boolean {
    if (Date.now() < this.openUntil) return true;
    if (this.failures >= this.threshold) {
      // Cooldown expired — half-open state, allow one attempt
      this.failures = 0;
    }
    return false;
  },
};

// ── Raw MCP HTTP Call (for fallback) ─────────────────────────────────────────
// Lightweight JSON-RPC call used exclusively by the category-filter fallback.
// Has its own 15s timeout and rate-limit awareness so a broken category filter
// never cascades into a hung request or exhausted quota.
async function mcpRawHttpCall(toolName: string, params: Record<string, any>): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const sessionId = await getOrEstablishSession(false);
    const res = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WasiConcierge/1.0'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: toolName, arguments: { params } },
        id: Math.floor(Math.random() * 1000 + 1)
      }),
    });
    if (res.status === 429) {
      console.warn('[MCP] Fallback hit rate limit (429). Aborting fallback to preserve quota.');
      throw new Error('Rate limit exceeded during category fallback');
    }
    if (!res.ok) throw new Error(`MCP fallback HTTP ${res.status}`);
    const text = await res.text();
    let jsonPayload: any;
    if (text.includes('data:')) {
      const dataParts = text.split('\n')
        .filter(l => l.trim().startsWith('data:'))
        .map(l => l.trim().substring(5).trim());
      jsonPayload = dataParts.length > 0 ? JSON.parse(dataParts.join('\n')) : JSON.parse(text);
    } else {
      jsonPayload = JSON.parse(text);
    }
    return jsonPayload?.result;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Category-filter fallback helper ─────────────────────────────────────────
// Shared logic for retrying a search without the broken category filter.
// Returns normalized results on success, or null if fallback also produced nothing.
async function categoryFilterFallback(
  toolName: string,
  params: Record<string, any>,
): Promise<{ results: any[]; next_cursor: string | null } | null> {
  const fallbackParams = { ...params };
  delete fallbackParams.category;
  try {
    const fallbackResult = await mcpRawHttpCall(toolName, fallbackParams);
    const fbText = fallbackResult?.content?.find((c: any) => c.type === 'text')?.text;
    if (!fbText || fbText.startsWith('Error') || fbText.startsWith('No products')) return null;
    const fbParsed = JSON.parse(fbText);
    const items = Array.isArray(fbParsed) ? fbParsed
      : Array.isArray(fbParsed?.results) ? fbParsed.results : [];
    if (items.length === 0) return null;
    const normalized = normalizeLiveResults(toolName, items, params?.currency);
    return { results: normalized, next_cursor: fbParsed?.next_cursor ?? null };
  } catch (fbErr) {
    console.warn(`[MCP] Category fallback failed: ${(fbErr as any).message}`);
    return null;
  }
}

// ── Response Shape Validator ─────────────────────────────────────────────────
// Validates that MCP responses have the expected shape based on real API responses.
// Returns null if valid, or an error message if invalid.
function validateMcpResponse(toolName: string, data: any): string | null {
  if (!data || typeof data !== 'object') return `${toolName}: response is not an object`;

  switch (toolName) {
    case 'kapruka_search_products':
      if (!Array.isArray(data.results)) return `${toolName}: missing 'results' array`;
      for (const p of data.results) {
        if (!p.id && !p.product_code) return `${toolName}: product missing 'id'`;
        if (!p.name) return `${toolName}: product ${p.id || '?'} missing 'name'`;
      }
      break;
    case 'kapruka_get_product':
      if (!data.id && !data.product_code) return `${toolName}: product missing 'id'`;
      if (!data.name) return `${toolName}: product missing 'name'`;
      break;
    case 'kapruka_list_categories':
      if (!Array.isArray(data.categories)) return `${toolName}: missing 'categories' array`;
      break;
    case 'kapruka_list_delivery_cities':
      if (!Array.isArray(data.cities)) return `${toolName}: missing 'cities' array`;
      break;
  }
  return null; // valid
}

async function callMcpToolUncached(toolName: string, args: any, forceDemo: boolean = false): Promise<any> {
  if (forceDemo) {
    console.log(`[MCP FORCED DEMO] Calling simulator for tool: ${toolName}`);
    return simulateMcpTool(toolName, args);
  }

  // Circuit breaker — skip MCP if it's been failing
  if (circuitBreaker.isOpen()) {
    console.log(`[MCP] Circuit open — falling back to simulator for '${toolName}'`);
    return simulateMcpTool(toolName, args);
  }

  // 1. Extract raw parameters from 'params' if present, otherwise use args directly
  let rawParams = (args && typeof args === 'object' && 'params' in args) ? args.params : args;
  if (!rawParams || typeof rawParams !== 'object') {
    rawParams = {};
  }

  // 2. Perform schema normalization & mapping to fit live Kapruka Pydantic rules
  let sanitizedParams: any = {};

  switch (toolName) {
    case 'kapruka_list_categories': {
      sanitizedParams = {
        depth: typeof rawParams.depth === 'number' ? rawParams.depth : 1,
        response_format: rawParams.response_format || 'json'
      };
      break;
    }
    case 'kapruka_search_products': {
      // MCP accepts 'q' as the query field. Force JSON response for structured parsing.
      sanitizedParams = {
        q: rawParams.q || rawParams.query || '',
        response_format: 'json'
      };
      if (rawParams.category) sanitizedParams.category = rawParams.category;
      if (typeof rawParams.limit === 'number') sanitizedParams.limit = rawParams.limit;
      if (rawParams.cursor) sanitizedParams.cursor = rawParams.cursor;
      if (rawParams.currency) sanitizedParams.currency = rawParams.currency;
      if (typeof rawParams.min_price === 'number') sanitizedParams.min_price = rawParams.min_price;
      if (typeof rawParams.max_price === 'number') sanitizedParams.max_price = rawParams.max_price;
      if (typeof rawParams.in_stock_only === 'boolean') sanitizedParams.in_stock_only = rawParams.in_stock_only;
      if (rawParams.sort) sanitizedParams.sort = rawParams.sort;
      if (typeof rawParams.include_stubs === 'boolean') sanitizedParams.include_stubs = rawParams.include_stubs;
      break;
    }
    case 'kapruka_get_product': {
      // Live MCP Pydantic schema: field is 'product_id' ONLY. 'product_code' is rejected.
      sanitizedParams = {
        product_id: rawParams.product_id || rawParams.product_code || rawParams.id || '',
        response_format: 'json'
      };
      if (rawParams.currency) sanitizedParams.currency = rawParams.currency;
      if (rawParams.type) sanitizedParams.type = rawParams.type;
      break;
    }
    case 'kapruka_list_delivery_cities': {
      // Force JSON so we get structured city objects back.
      sanitizedParams = {
        response_format: 'json'
      };
      if (rawParams.query || rawParams.q) sanitizedParams.query = rawParams.query || rawParams.q;
      if (typeof rawParams.limit === 'number') sanitizedParams.limit = rawParams.limit;
      break;
    }
    case 'kapruka_check_delivery': {
      // Live MCP Pydantic schema: uses 'city' NOT 'city_code', and 'product_id' NOT 'product_code'.
      sanitizedParams = {
        city: rawParams.city || rawParams.city_code || '',
        response_format: 'json'
      };
      const deliveryDate = rawParams.delivery_date || rawParams.date;
      if (deliveryDate) sanitizedParams.delivery_date = deliveryDate;
      // Map any alias to the canonical 'product_id' field
      const productId = rawParams.product_id || rawParams.product_code || rawParams.id;
      if (productId) sanitizedParams.product_id = productId;
      break;
    }
    case 'kapruka_create_order': {
      // Handle Cart / items list
      let rawCart = rawParams.cart || rawParams.items || [];
      if (!Array.isArray(rawCart) && typeof rawCart === 'object') {
        rawCart = [rawCart];
      }
      if (rawCart.length === 0 && (rawParams.product_id || rawParams.product_code)) {
        rawCart = [{
          product_id: rawParams.product_id || rawParams.product_code || rawParams.id,
          quantity: rawParams.quantity || 1,
          icing_text: rawParams.icing_text
        }];
      }

      const cart = rawCart.map((item: any) => {
        const cartItem: any = {
          product_id: item.product_id || item.product_code || item.id || ''
        };
        if (typeof item.quantity === 'number') {
          cartItem.quantity = item.quantity;
        } else {
          cartItem.quantity = 1;
        }
        const icing = item.icing_text || rawParams.icing_text;
        if (icing) {
          cartItem.icing_text = icing;
        }
        return cartItem;
      });

      // Recipient mapping
      let recipient: any = {};
      if (rawParams.recipient && typeof rawParams.recipient === 'object') {
        recipient = {
          name: rawParams.recipient.name || rawParams.recipient_name || 'Guest',
          phone: rawParams.recipient.phone || rawParams.recipient_phone || '0771234567'
        };
      } else {
        recipient = {
          name: rawParams.recipient_name || 'Guest',
          phone: rawParams.recipient_phone || '0771234567'
        };
      }

      // Delivery mapping
      let delivery: any = {};
      if (rawParams.delivery && typeof rawParams.delivery === 'object') {
        delivery = {
          address: rawParams.delivery.address || rawParams.address || 'No Address Provided',
          city: rawParams.delivery.city || rawParams.city || rawParams.city_code || 'Colombo 01',
          date: rawParams.delivery.date || rawParams.delivery_date || rawParams.date || new Date(Date.now() + 86400000).toISOString().split('T')[0]
        };
        const locType = rawParams.delivery.location_type || rawParams.location_type || 'house';
        if (locType) delivery.location_type = locType;
        const inst = rawParams.delivery.instructions || rawParams.instructions;
        if (inst) delivery.instructions = inst;
      } else {
        delivery = {
          address: rawParams.address || 'No Address Provided',
          city: rawParams.city || rawParams.city_code || 'Colombo 01',
          date: rawParams.delivery_date || rawParams.date || new Date(Date.now() + 86400000).toISOString().split('T')[0]
        };
        const locType = rawParams.location_type || 'house';
        if (locType) delivery.location_type = locType;
        const inst = rawParams.instructions;
        if (inst) delivery.instructions = inst;
      }

      // Sender mapping
      let sender: any = {};
      if (rawParams.sender && typeof rawParams.sender === 'object') {
        sender = {
          name: rawParams.sender.name || rawParams.sender_name || 'Guest'
        };
        if (rawParams.sender.anonymous !== undefined) {
          sender.anonymous = !!rawParams.sender.anonymous;
        } else if (rawParams.anonymous !== undefined) {
          sender.anonymous = !!rawParams.anonymous;
        } else {
          sender.anonymous = false;
        }
      } else {
        sender = {
            name: rawParams.sender_name || 'Guest',
            anonymous: rawParams.anonymous !== undefined ? !!rawParams.anonymous : false
          };
      }

      sanitizedParams = {
        cart,
        recipient,
        delivery,
        sender,
        response_format: rawParams.response_format || 'json'
      };

      if (rawParams.gift_message || rawParams.message) {
        sanitizedParams.gift_message = rawParams.gift_message || rawParams.message;
      }
      if (rawParams.currency) {
        sanitizedParams.currency = rawParams.currency;
      }
      break;
    }
    case 'kapruka_track_order': {
      sanitizedParams = {
        order_number: rawParams.order_number || rawParams.order_id || '',
        response_format: rawParams.response_format || 'json'
      };
      break;
    }
    default: {
      sanitizedParams = rawParams;
      break;
    }
  }

  const isProd = process.env.NODE_ENV === 'production';
  
  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      const sessionId = await getOrEstablishSession(attempts > 1);
      
      const mcpStart = Date.now();
      const res = await fetch(MCP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'mcp-session-id': sessionId,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WasiConcierge/1.0'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: { params: sanitizedParams },
          },
          id: Math.floor(Math.random() * 1000 + 1)
        }),
      });

      if (res.status === 406 || res.status === 401 || res.status === 403) {
        console.warn(`[MCP] Tool call returned status ${res.status}. Session may have expired. Retrying with fresh session.`);
        cachedSessionId = null;
        if (attempts < 2) continue; // retry loop
      }

      if (res.status === 429) {
        // Rate limited — don't invalidate session, just wait and retry
        const retryAfter = res.headers.get('retry-after');
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
        console.warn(`[MCP] Rate limited (429). Waiting ${waitMs}ms before retry.`);
        await new Promise(r => setTimeout(r, waitMs));
        if (attempts < 2) continue;
      }

      if (!res.ok) {
        const isRateLimit = res.status === 429;
        if (isRateLimit) {
          const retryAfter = res.headers.get('retry-after');
          console.warn(`[MCP] Rate limited (429). Retry-After: ${retryAfter || 'not set'}`);
        }
        circuitBreaker.recordFailure(isRateLimit);
        throw new Error(`MCP returned HTTP status ${res.status}`);
      }

      // Adaptive rate-limit awareness — the MCP returns RateLimit-* headers on
      // every response (60 req/min free tier). Warn loudly when running hot so
      // we can see pressure in the logs before hitting 429s.
      const rlRemaining = res.headers.get('ratelimit-remaining');
      if (rlRemaining !== null && Number(rlRemaining) <= 10) {
        console.warn(`[MCP] rate-limit pressure: ${rlRemaining} requests left this minute (resets in ${res.headers.get('ratelimit-reset') ?? '?'}s`);
      }

      const mcpLatency = Date.now() - mcpStart;
      console.log(`[MCP] ${toolName} → ${res.status} in ${mcpLatency}ms`);

      const text = await res.text();
      let jsonPayload: any;

      if (text.includes('data:')) {
        const lines = text.split('\n');
        const dataParts: string[] = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            dataParts.push(trimmed.substring(5).trim());
          }
        }
        if (dataParts.length > 0) {
          jsonPayload = JSON.parse(dataParts.join('\n'));
        } else {
          jsonPayload = JSON.parse(text);
        }
      } else {
        jsonPayload = JSON.parse(text);
      }

      if (jsonPayload.error) {
        const errMsg = jsonPayload.error.message || '';
        if (attempts < 2 && (errMsg.toLowerCase().includes('session') || errMsg.toLowerCase().includes('initialize'))) {
          console.warn(`[MCP] Tool call returned JSON-RPC error: ${errMsg}. Retrying with fresh session.`);
          cachedSessionId = null;
          continue;
        }
        console.warn(`Kapruka MCP tool returned error: ${errMsg}. Falling back to simulation if necessary.`);
        throw new Error(errMsg);
      }

      const content = jsonPayload.result?.content;
      const textBlock = content?.find((c: any) => c.type === 'text')?.text;
      
      if (textBlock) {
        // MCP encodes errors as strings starting with "Error" even when HTTP 200.
        if (typeof textBlock === 'string' && textBlock.startsWith('Error')) {
          // "Error (product_not_found): ..." — a domain error, not an outage.
          const business = textBlock.match(/^Error \((\w+)\)/);
          if (business) {
            circuitBreaker.recordSuccess();
            throw new McpBusinessError(business[1], textBlock);
          }
          console.warn(`[MCP] Tool '${toolName}' returned error string: ${textBlock.substring(0, 120)}`);
          // Fall through to simulator on last attempt
          if (attempts >= 2) return simulateMcpTool(toolName, args);
          throw new Error(textBlock);
        }

        // ── "No products found" plain text handling ──────────────────────────
        // When the MCP's category filter is broken (or genuinely no results), the
        // response is plain text like "No products found for 'X' in category 'Y'".
        // Detect this and treat as empty results — then the category fallback below
        // can retry without the broken filter.
        const isNoResults = typeof textBlock === 'string' &&
          textBlock.startsWith('No products found');
        if (isNoResults && toolName === 'kapruka_search_products' && sanitizedParams?.category) {
          console.warn(`[MCP] Category fallback: '${sanitizedParams.q}' + category='${sanitizedParams.category}' → 0 results. Retrying without category filter.`);
          circuitBreaker.recordSuccess();
          const fb = await categoryFilterFallback(toolName, sanitizedParams);
          if (fb) return { ...fb, _category_fallback: true };
          return { results: [], next_cursor: null };
        }
        if (isNoResults) {
          circuitBreaker.recordSuccess();
          return { results: [], next_cursor: null };
        }

        try {
          const parsed = JSON.parse(textBlock);
          // Validate response shape against known MCP wire format
          const validationError = validateMcpResponse(toolName, parsed);
          if (validationError) {
            console.warn(`[MCP] Response validation failed: ${validationError}. Falling back to simulator.`);
            circuitBreaker.recordFailure();
            return simulateMcpTool(toolName, args);
          }
          circuitBreaker.recordSuccess();
          // Normalize live MCP shapes to our internal format
          const buildSearchResult = (items: any[], nextCursor?: string | null) => {
            const normalized = normalizeLiveResults(toolName, items, sanitizedParams?.currency);
            return { results: normalized, next_cursor: nextCursor ?? null };
          };
          if (Array.isArray(parsed)) {
            return toolName === 'kapruka_search_products' ? buildSearchResult(parsed) : parsed;
          }
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.results)) {
              // ── Category-filter fallback for JSON responses ───────────────
              if (toolName === 'kapruka_search_products' && sanitizedParams?.category && parsed.results.length === 0) {
                console.warn(`[MCP] Category fallback (JSON): '${sanitizedParams.q}' + category='${sanitizedParams.category}' → 0 results. Retrying without category filter.`);
                const fb = await categoryFilterFallback(toolName, sanitizedParams);
                if (fb) return { ...fb, _category_fallback: true };
                return { results: [], next_cursor: null };
              }
              return toolName === 'kapruka_search_products'
                ? buildSearchResult(parsed.results, parsed.next_cursor)
                : normalizeLiveResults(toolName, parsed.results, sanitizedParams?.currency);
            }
            if (Array.isArray(parsed.products)) return normalizeLiveResults(toolName, parsed.products, sanitizedParams?.currency);
            if (Array.isArray(parsed.cities)) return parsed.cities;
            if (Array.isArray(parsed.categories)) return parsed.categories;
          }
          return parsed;
        } catch (_) {
          return textBlock;
        }
      }
      return jsonPayload.result;

    } catch (error) {
      if (error instanceof McpBusinessError) throw error;
      console.warn(`Mcp query of '${toolName}' failed: ${(error as any).message}. Utilizing bulletproof simulated fallback.`);
      circuitBreaker.recordFailure((error as any).message?.includes('429'));
      if (attempts >= 2) {
        return simulateMcpTool(toolName, args);
      }
    }
  }
  
  return simulateMcpTool(toolName, args);
}

// Normalize live MCP product items to match our internal FALLBACK_PRODUCTS shape
// so the frontend renders identically whether data is live or simulated.
function inferCategory(id: string, name: string, rawCat: string): string {
  const lid = (id || '').toLowerCase();
  const lname = (name || '').toLowerCase();
  const lcat = (rawCat || '').toLowerCase();
  // If MCP already gives a meaningful category, use it
  if (lcat && lcat !== 'general' && lcat !== '') return rawCat;
  // Otherwise infer from ID and name
  if (lid.includes('cake') || lname.includes('cake') || lname.includes('ribbon') || lname.includes('gateau') || lname.includes('cheesecake')) return 'Cakes';
  if (lid.includes('flower') || lname.includes('rose') || lname.includes('bouquet') || lname.includes('orchid') || lname.includes('lily')) return 'Flowers';
  if (lid.includes('choc') || lname.includes('chocolate')) return 'Chocolates';
  if (lid.includes('hamper') || lname.includes('hamper') || lname.includes('basket')) return 'Hampers';
  if (lid.includes('perfume') || lname.includes('perfume') || lname.includes('cologne')) return 'Perfumes';
  if (lid.includes('toy') || lname.includes('plush') || lname.includes('stitch')) return 'Toys';
  if (lid.includes('balloon') || lname.includes('balloon')) return 'Party';
  if (lid.includes('fruit')) return 'Fruits';
  if (lid.includes('liquor') || lname.includes('arrack') || lname.includes('wine')) return 'Liquor';
  if (lid.includes('gift') && lname.includes('gift set')) return 'Gift Sets';
  if (lid.includes('card') && lname.includes('card')) return 'Cards';
  return rawCat || 'Gifts';
}

function normalizeLiveResults(toolName: string, items: any[], currency?: string): any[] {
  if (toolName !== 'kapruka_search_products') return items;
  return items.map((p: any) => {
    const rawCat = p.category?.name || p.category || '';
    const detectedCurrency = p.price?.currency || currency || 'LKR';
    return {
      product_code: p.id || p.product_code || p.product_id || '',
      name: p.name || '',
      price_lkr: p.price?.amount ?? p.price_lkr ?? p.price ?? 0,
      price: p.price?.amount ?? p.price_lkr ?? p.price ?? 0,
      currency: detectedCurrency,
      category: inferCategory(p.id || p.product_code, p.name, rawCat),
      image_url: p.image_url || p.image || '',
      description: p.summary || p.description || '',
      stock_level: p.stock_level || (p.in_stock ? 'high' : 'low'),
      rating: p.rating ?? null,
      url: p.url || null,
      variants: (p.variants || []).map((v: any) => ({
        ...v,
        price_lkr: v.price?.amount ?? v.price_lkr ?? v.price ?? 0,
        price: v.price?.amount ?? v.price_lkr ?? v.price ?? 0,
        currency: v.price?.currency || detectedCurrency,
      })),
    };
  });
}

// Delivery fee matrix for simulator fallback only (LKR).
// SOURCE HIERARCHY (most authoritative first):
//   1. create_order.summary.delivery_fee  — authoritative per-order fee
//   2. check_delivery.rate                — estimate; can differ from (1) by up to 130 LKR
//   3. This map                           — simulator fallback only
// WARNING: Kapruka checkout total can differ from create_order.summary.grand_total by ~5 LKR.
// Never promise the user a final total; always say "Kapruka will confirm at checkout".
//
// CORRECTIONS vs previous doc (verified: mcp-max-probe.mjs + actual Kapruka checkout 2026-06-04):
//   jaffna: 2500→2370 (checkout ground truth: 7120−4750=2370)
//   matara: 1090→1370, anuradhapura: 1400→1950, badulla: 1500→3140
//   trincomalee: 2800→2980, kurunegala: 950→1290
//
// SENDER EMAIL: MCP rejects sender.email with extra_forbidden.
// Email is not sent to MCP — Kapruka collects it at checkout for tracking.
const DELIVERY_FEES: Record<string, number> = {
  // Greater Colombo — flat rate
  'colombo 01': 300, 'colombo 02': 300, 'colombo 03': 300, 'colombo 04': 300,
  'colombo 05': 300, 'colombo 06': 300, 'colombo 07': 300, 'colombo 08': 300,
  'colombo 09': 300, 'colombo 10': 300, 'colombo 11': 300, 'colombo 12': 300,
  'colombo 13': 300, 'colombo 14': 300, 'colombo 15': 300,
  'nugegoda': 300, 'dehiwala': 300, 'maharagama': 350,
  // Western Province
  'negombo': 960, 'gampaha': 450, 'kaluthara': 500, 'kalutara': 500,
  // Central
  'kandy': 1075, 'nuwara eliya': 1500, 'badulla': 3140, 'matale': 1200,
  // Southern
  'galle': 1090, 'matara': 1370, 'hambanthota': 1800, 'hambantota': 1800,
  'thangalle': 1500,
  // North Western
  'kurunegala': 1290, 'kegalle': 1200,
  // North Central
  'anuradhapura': 1950, 'polonnaruwa': 2200,
  // Sabaragamuwa
  'rathnapura': 1200, 'ratnapura': 1200,
  // Eastern
  'batticaloa': 3900, 'trincomalee': 2980, 'ampara': 2500,
  // Northern — slot-prone cities
  'jaffna': 2370,    // confirmed from actual Kapruka checkout 2026-06-04 (7120−4750)
  'vavuniya': 2800, 'mannar': 3000, 'kilinochchiya': 3200, 'kilinochchi': 3200,
  // Uva
  'monaragala': 2800,
};

// Built-in intelligent Simulation to ensure 100% uptime, fast speed, and Sinhala capability.
// All response shapes match raw MCP wire format from exhaustive live testing.
function simulateMcpTool(toolName: string, args: any): any {
  console.log(`[MCP SIMULATOR] ${toolName} with args:`, args);
  const now = new Date();
  const nowSriLanka = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  const todayStr = now.toISOString().split('T')[0];

  switch (toolName) {
    // Product search and lookup are NOT simulated — a hardcoded product list
    // only covers a handful of categories and causes the LLM to silently lie
    // ("nothing found") for everything else (groceries, clothing, electronics…).
    // Return a clear service-unavailable payload so the LLM can give an honest
    // response and the caller can tell degraded mode from a real empty result.
    case 'kapruka_search_products': {
      console.warn('[MCP SIMULATOR] kapruka_search_products: returning unavailable — live MCP unreachable');
      return {
        results: [],
        next_cursor: null,
        _simulated: true,
        _unavailable: true,
        error: 'Product catalog temporarily unavailable — please try again in a moment.',
      };
    }

    case 'kapruka_get_product': {
      console.warn('[MCP SIMULATOR] kapruka_get_product: returning unavailable — live MCP unreachable');
      throw new Error('Product catalog temporarily unavailable — please try again in a moment.');
    }

    case 'kapruka_list_categories': {
      return {
        categories: [
          { name: 'Automobile', url: 'https://www.kapruka.com/online/automobile', children: [] },
          { name: 'Ayurvedic', url: 'https://www.kapruka.com/online/ayurvedic', children: [] },
          { name: 'Bicycle', url: 'https://www.kapruka.com/online/bicycle', children: [] },
          { name: 'Books', url: 'https://www.kapruka.com/online/books', children: [] },
          { name: 'Chocolates', url: 'https://www.kapruka.com/online/chocolates', children: [] },
          { name: 'Clothing', url: 'https://www.kapruka.com/online/clothing', children: [] },
          { name: 'cakes', url: 'https://www.kapruka.com/online/cakes', children: [] },
          { name: 'flowers', url: 'https://www.kapruka.com/online/flowers', children: [] },
          { name: 'Grocery', url: 'https://www.kapruka.com/online/grocery', children: [] },
          { name: 'Jewellery', url: 'https://www.kapruka.com/online/jewellery', children: [] }
        ],
        _simulated: true,
      };
    }

    case 'kapruka_list_delivery_cities': {
      const query = (args.query || '').toLowerCase().trim();
      let filtered = FALLBACK_CITIES;
      if (query) {
        filtered = FALLBACK_CITIES.filter(c =>
          c.name.toLowerCase().includes(query) ||
          c.aliases.some((alias: string) => alias.toLowerCase().includes(query))
        );
      }
      return {
        cities: filtered.map(c => ({ name: c.name, aliases: c.aliases })),
        total_matched: filtered.length,
        showing: filtered.length,
        _simulated: true,
      };
    }

    case 'kapruka_check_delivery': {
      const cityInput = args.city || args.city_code || '';
      const dateString = args.delivery_date || args.date || todayStr;
      const prodId = args.product_id || args.product_code || '';

      const matchedCity = FALLBACK_CITIES.find(c =>
        c.name.toLowerCase() === cityInput.toLowerCase() ||
        c.aliases.some((a: string) => a.toLowerCase() === cityInput.toLowerCase())
      ) || FALLBACK_CITIES[0];

      const cityName = matchedCity.name;
      const fee = DELIVERY_FEES[cityName.toLowerCase()] ?? 300;

      // Perishables check (case-insensitive)
      const product = FALLBACK_PRODUCTS.find(p => p.product_code.toLowerCase() === prodId.toLowerCase());
      const pcode = (product?.product_code || '').toLowerCase();
      const isPerishable = pcode.includes('cake') || pcode.includes('flower') || pcode.includes('fruit');

      const deliveryDate = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Jaffna and Batticaloa slots often full
      const slotsFull = cityName.toLowerCase() === 'jaffna' || cityName.toLowerCase() === 'batticaloa';
      const available = !slotsFull && !(isPerishable && diffDays > 1);

      const checkedDate = dateString;
      const nowIso = nowSriLanka.toISOString().replace('Z', '+05:30');

      if (!available) {
        const nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + 1);
        const nextAvailableDate = nextDay.toISOString().split('T')[0];
        return {
          city: cityName,
          now: nowIso,
          checked_date: checkedDate,
          available: false,
          reason: slotsFull
            ? `We've scheduled your delivery for ${nextAvailableDate}. Slots for ${checkedDate} to ${cityName} are currently full.`
            : 'Perishable item is restricted to today and tomorrow delivery only.',
          next_available_date: nextAvailableDate,
          rate: fee,
          currency: 'LKR',
          perishable_warning: isPerishable ? null : null
        };
      }

      return {
        city: cityName,
        now: nowIso,
        checked_date: checkedDate,
        available: true,
        rate: fee,
        currency: 'LKR',
        perishable_warning: null
      };
    }

    case 'kapruka_create_order': {
      const datePart = todayStr.replace(/-/g, '');
      const numPart = Math.floor(1000 + Math.random() * 9000);
      const orderRef = `ORD-${datePart}-${numPart}`;

      // Calculate totals from cart
      let itemsTotal = 0;
      const rawCart = args.cart || args.items || [];
      const requestItems = Array.isArray(rawCart) ? rawCart : [rawCart];
      for (const item of requestItems) {
        const prod = FALLBACK_PRODUCTS.find(p =>
          p.product_code.toLowerCase() === (item.product_code || item.product_id || '').toLowerCase()
        );
        if (prod) {
          const variant = (prod.variants || []).find((v: any) => v.id === item.variant_id);
          const price = variant ? variant.price_lkr : prod.price_lkr;
          itemsTotal += (price || 0) * (item.quantity || 1);
        } else if (item.price_lkr) {
          // Fallback: use price from request for products not in local catalog
          itemsTotal += (item.price_lkr || 0) * (item.quantity || 1);
        }
      }

      // Determine delivery fee from args
      const deliveryCity = args.delivery?.city || args.city || args.city_code || 'Colombo 01';
      const deliveryFee = DELIVERY_FEES[deliveryCity.toLowerCase()] ?? 300;
      const grandTotal = itemsTotal + deliveryFee;

      // Calculate expiry: 1 hour from now in Sri Lanka time (+05:30), matching live MCP format
      const expiresUTC = new Date(now.getTime() + 60 * 60 * 1000);
      const expiresDisplay = new Date(expiresUTC.getTime() + (5.5 * 60 * 60 * 1000));
      const expiresStr = expiresDisplay.toISOString().replace('Z', '+05:30');

      return {
        summary: {
          items_total: itemsTotal,
          delivery_fee: deliveryFee,
          addons_total: 0,
          currency: 'LKR',
          grand_total: grandTotal
        },
        checkout_url: `https://www.kapruka.com/tools/continue_order.jsp?id=${orderRef}`,
        expires_at: expiresStr,
        order_ref: orderRef
      };
    }

    case 'kapruka_track_order': {
      const todayString = new Date().toISOString().split('T')[0];
      return {
        status: 'dispatched',
        recipient: {
          name: 'Amma Perera',
          city: 'Kandy'
        },
        items: [
          { product_code: 'CAKE00KA002034', name: 'Blueberry Bliss Bento Cheesecake', quantity: 1 }
        ],
        timeline: [
          { event: 'Order Created', timestamp: `${todayString} 08:30 AM` },
          { event: 'Payment Confirmed', timestamp: `${todayString} 08:35 AM` },
          { event: 'Gift Freshly Prepared & Quality Checked', timestamp: `${todayString} 11:20 AM` },
          { event: 'Dispatched from Colombo GPO Hub', timestamp: `${todayString} 01:15 PM` }
        ],
        has_delivery_photo: true,
        has_delivery_video: false
      };
    }

    default:
      console.warn(`Simulator fallback triggered for unknown toolName: ${toolName}`);
      return {};
  }
}

// Build a full 16-field get_product response shape from a fallback product
function buildFullProductShape(p: any) {
  const variant = p.variants?.[0];
  return {
    id: p.product_code,
    name: p.name,
    description: p.description,
    description_format: 'plain',
    summary: p.description.substring(0, 200),
    price: { amount: p.price_lkr, currency: 'LKR' },
    compare_at_price: null,
    in_stock: p.stock_level !== 'out',
    stock_level: p.stock_level,
    category: { id: `cat_${p.category.toLowerCase()}`, name: p.category.toLowerCase(), slug: p.category.toLowerCase(), path: p.category.toLowerCase() },
    variants: p.variants.map((v: any) => ({
      id: v.id,
      name: v.name,
      sku: p.product_code,
      price: { amount: v.price_lkr, currency: 'LKR' },
      in_stock: v.stock_level !== 'out',
      stock_level: v.stock_level,
      attributes: { weight: '1.0' }
    })),
    images: p.images && p.images.length > 0 ? p.images : [p.image_url],
    attributes: { type: p.category.toLowerCase(), subtype: p.category, weight: '1.0', vendor: 'Kapruka' },
    shipping: { ships_from: 'LK', ships_internationally: true, restricted_countries: [] },
    rating: p.rating,
    url: p.url,
    _simulated: true,
  };
}
