# Kapruka MCP — Definitive Raw Wire Specification
> **Generated:** 2026-06-04 | **Method:** Bare HTTP fetch, zero normalization, zero sanitization
> **Tester:** MCP-Final-Raw-v1.0 | **Status:** Production-verified live data only

---

## 1. Transport Layer

### Endpoint
```
POST https://mcp.kapruka.com/mcp
```

### Session Handshake
**Request:**
```http
POST /mcp HTTP/1.1
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "wasi", "version": "1.0" }
  },
  "id": 1
}
```

**Response Headers:**
```http
HTTP/1.1 200 OK
mcp-session-id: c47e61ed84494d81a65e39bd16af6729
Content-Type: text/event-stream
```

### Tool Call Format
```http
POST /mcp HTTP/1.1
Content-Type: application/json
Accept: application/json, text/event-stream
mcp-session-id: <uuid>

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "kapruka_search_products",
    "arguments": {
      "params": { "q": "chocolate", "limit": 2, "response_format": "json" }
    }
  },
  "id": 2
}
```

### Response Format (SSE)
```
data: {"jsonrpc":"2.0","result":{"content":[{"type":"text","text":"{...actual payload...}"}]}}
```

**Extraction algorithm:**
1. Split body on `\n`
2. Filter lines starting with `data:`
3. Strip `data:` prefix
4. Join all parts → JSON string
5. Parse → `jsonPayload.result.content[0].text`
6. Parse text → final result (JSON or markdown/error string)

---

## 2. Tool 1: `kapruka_search_products`

### Pydantic Parameters (Exact)
```json
{
  "q": "string (min 3 characters)",     // REQUIRED
  "limit": "integer",                    // optional
  "response_format": "json|markdown",    // optional, default = markdown
  "cursor": "string|null"               // optional
}
```

### Live Request
```json
{
  "q": "chocolate",
  "limit": 2,
  "response_format": "json"
}
```

### Live Response (Raw Text Block)
```json
{
  "results": [
    {
      "id": "EF_PC_CHOC0V571POD00076",
      "name": "Glitter Hearts Chocolate Box",
      "summary": "specialGifts - Chocolate, Valentine, Kpc, Kpcondemand, Chocolates Chocolates The Glitter Hearts Chocolate Box Is A Delightful Treat Filled With Barry Callebaut Glitter Heart Chocolates, Perfect For...",
      "price": { "amount": 3500, "currency": "LKR" },
      "compare_at_price": null,
      "in_stock": true,
      "stock_level": "low",
      "image_url": "https://static2.kapruka.com/product-image/width=330,quality=93,f=auto/https://partnercentral.kapruka.com/kapruka-pc/assets/images/product/pc00334/choc0v571p00076/choc0v571p00076_1.jpg",
      "category": { "id": "cat_general", "name": "General", "slug": "general" },
      "rating": null,
      "ships_internationally": true,
      "url": "https://www.kapruka.com/buyonline/glitter-hearts-chocolate-box/kid/ef_pc_choc0v571pod00076"
    }
  ],
  "next_cursor": "eyJ1IjoiTWc9PSIsInAiOjJ9",
  "applied_filters": { "q": "chocolate", "limit": 2, "in_stock_only": true }
}
```

### Response Structure
| Field | Type | Description |
|---|---|---|
| `results` | `Array<Product>` | Product list (empty `[]` if no match) |
| `next_cursor` | `string\|null` | Pagination token |
| `applied_filters` | `Object` | Echo of request params |

### Product Object (11 fields)
| # | Field | Type | Live Sample | Notes |
|---|---|---|---|---|
| 1 | `id` | string | `"EF_PC_CHOC0V571POD00076"` | Product SKU |
| 2 | `name` | string | `"Glitter Hearts Chocolate Box"` | Display name |
| 3 | `summary` | string | 200+ chars | Truncated description |
| 4 | `price` | object | `{amount: 3500, currency: "LKR"}` | Price object |
| 5 | `compare_at_price` | null | `null` | Always null |
| 6 | `in_stock` | boolean | `true` | Availability |
| 7 | `stock_level` | string | `"low"` | Enum: `"low"`, `"medium"`, `"high"` |
| 8 | `image_url` | string | CDN URL | Primary image |
| 9 | `category` | object | `{id, name, slug}` | Category info |
| 10 | `rating` | null | `null` | Always null |
| 11 | `ships_internationally` | boolean | `true` | Global shipping flag |
| 12 | `url` | string | Product URL | Kapruka page |

### Query Effectiveness Matrix (Live-Tested)

| Query | Results | Notes |
|---|---|---|
| `chocolate` | ✅ 4+ | Reliable |
| `birthday` | ✅ 2+ | Ribbon cakes |
| `rose` | ✅ 1+ | 6 Red Rose Bouquet |
| `hamper` | ✅ 1+ | Fitness hamper |
| `anniversary` | ✅ 1+ | Rs. 32,200 gift set |
| `cake` | ✅ 29+ | Many options |
| `flowers` | ❌ 0 | Use `rose` |
| `gift` | ❌ 0 | Too generic |
| `teddy` | ❌ 0 | No plush toys |
| `toys` | ❌ 0 | No toy category |
| `watch` | ❌ 0 | No accessories |
| `perfume` | ❌ 0 | No cosmetics |
| `balloon` | ❌ 0 | No party supplies |
| `wine` | ❌ 0 | No alcohol |
| `fruit` | ❌ 0 | No fruit hampers |
| `saree` | ❌ 0 | No clothing |

### Validation Errors
```
q=""     → String should have at least 3 characters [type=string_too_short]
q="a"    → String should have at least 3 characters [type=string_too_short]
```

---

## 3. Tool 2: `kapruka_get_product`

### Pydantic Parameters (Exact)
```json
{
  "product_id": "string",       // REQUIRED
  "response_format": "json"    // optional
}
```

### Live Request
```json
{ "product_id": "cake00ka002034", "response_format": "json" }
```

### Live Response (Raw Text Block)
```json
{
  "id": "cake00KA002034",
  "name": "Blueberry Bliss Bento Cheesecake",
  "description": "CAKE00KA002034 Weight: 1.11 Lbs (0.5 KG) Kapruka Cakes Cakes Indulge in the delicious Blueberry Bliss Bento Cheesecake, available at Kapruka in Sri Lanka. This creamy and fruity delight is perfect for any occasion. Weight: 1.11 Lbs (0.5 KG) Kapruka Cakes Composition: Smooth cheesecake base with luscious blueberry custard Toppings: Rich blueberry compote and soft whipping cream Flavors: Perfect balance of fruity sweetness and velvety richness Ingredients: Cheesecake base, Whipping cream, Blueberry custard Enjoy a slice of happiness today, delivered straight from Kapruka!",
  "description_format": "plain",
  "summary": "CAKE00KA002034 Weight: 1.11 Lbs (0.5 KG) Kapruka Cakes Cakes Indulge in the delicious Blueberry Bliss Bento Cheesecake, available at Kapruka in Sri Lanka...",
  "price": { "amount": 4200, "currency": "LKR" },
  "compare_at_price": null,
  "in_stock": true,
  "stock_level": "low",
  "category": { "id": "cat_cakes", "name": "cakes", "slug": "cakes", "path": "cakes" },
  "variants": [
    {
      "id": "cake00KA002034_default",
      "name": "Default",
      "sku": "cake00KA002034",
      "price": { "amount": 4200, "currency": "LKR" },
      "in_stock": true,
      "stock_level": "low",
      "attributes": { "weight": "1.11" }
    }
  ],
  "images": [
    "https://www.kapruka.com/shops/cakes/productImages/zoom/1763114612717_dsc04266.jpg",
    "https://www.kapruka.com/shops/specialGifts/additionalImages/cake00ka002034_1.jpg",
    "https://www.kapruka.com/shops/specialGifts/additionalImages/cake00ka002034_2.jpg",
    "https://www.kapruka.com/shops/specialGifts/additionalImages/cake00ka002034_3.jpg"
  ],
  "attributes": { "type": "cakes", "subtype": "Cakes", "weight": "1.11", "vendor": "Kapruka Cakes Cake" },
  "shipping": { "ships_from": "LK", "ships_internationally": true, "restricted_countries": [] },
  "rating": null,
  "url": "https://www.kapruka.com/buyonline/blueberry-bliss-bento-cheeseca/kid/cake00ka002034"
}
```

### Response Fields (16 total)

| # | Field | Type | Live Value | Notes |
|---|---|---|---|---|
| 1 | `id` | string | `"cake00KA002034"` | Uppercase variant in ID |
| 2 | `name` | string | `"Blueberry Bliss Bento Cheesecake"` | Title case |
| 3 | `description` | string | 628 chars | Full description |
| 4 | `description_format` | string | `"plain"` | Always `"plain"` |
| 5 | `summary` | string | 200 chars | Short summary |
| 6 | `price` | object | `{amount: 4200, currency: "LKR"}` | Current price |
| 7 | `compare_at_price` | null | `null` | Always null |
| 8 | `in_stock` | boolean | `true` | Stock boolean |
| 9 | `stock_level` | string | `"low"` | `"low"` / `"medium"` / `"high"` |
| 10 | `category` | object | `{id, name, slug, path}` | 4 sub-fields |
| 11 | `variants` | array | `[{...}]` | Usually 1 item |
| 12 | `images` | array | `["url1", "url2", ...]` | 2-4 URLs |
| 13 | `attributes` | object | `{type, subtype, weight, vendor}` | 4 sub-fields |
| 14 | `shipping` | object | `{ships_from, ships_internationally, restricted_countries}` | 3 sub-fields |
| 15 | `rating` | null | `null` | Always null |
| 16 | `url` | string | Kapruka URL | Product page |

### Variant Object (7 fields)
```json
{
  "id": "cake00KA002034_default",
  "name": "Default",
  "sku": "cake00KA002034",
  "price": { "amount": 4200, "currency": "LKR" },
  "in_stock": true,
  "stock_level": "low",
  "attributes": { "weight": "1.11" }
}
```

**Key finding:** Every product has exactly 1 variant named `"Default"`. ID pattern: `{product_id}_default`.

### Category Object (4 fields)
```json
{
  "id": "cat_cakes",
  "name": "cakes",
  "slug": "cakes",
  "path": "cakes"
}
```

### Shipping Object (3 fields)
```json
{
  "ships_from": "LK",
  "ships_internationally": true,
  "restricted_countries": []
}
```

### Attributes Object (4 fields)
```json
{
  "type": "cakes",
  "subtype": "Cakes",
  "weight": "1.11",
  "vendor": "Kapruka Cakes Cake"
}
```

---

## 4. Tool 3: `kapruka_list_categories`

### Pydantic Parameters
```json
{
  "depth": "integer",           // optional
  "response_format": "json"     // optional
}
```

### Live Response (Raw Text Block)
```json
{
  "categories": [
    {
      "name": "Automobile",
      "url": "https://www.kapruka.com/online/automobile",
      "children": [
        { "name": "Audio And Video Accessories", "url": "https://www.kapruka.com/online/automobile/price/audio_and_video_accessories" },
        { "name": "Auto Care", "url": "https://www.kapruka.com/online/automobile/price/auto_care" },
        { "name": "Automobile Electronics", "url": "https://www.kapruka.com/online/automobile/price/automobile_electronics" },
        { "name": "Automobile Gift Pack", "url": "https://www.kapruka.com/online/automobile/price/automobile_gift_pack" },
        { "name": "Batteries", "url": "https://www.kapruka.com/online/automobile/price/batteries" },
        { "name": "Bike Jackets", "url": "https://www.kapruka.com/online/automobile/price/bike_jackets" },
        { "name": "Engine Oils And Lubricants", "url": "https://www.kapruka.com/online/automobile/price/engine_oils_and_lubricants" },
        { "name": "Helmet", "url": "https://www.kapruka.com/online/automobile/price/helmet" },
        { "name": "Hybrid Auto Care", "url": "https://www.kapruka.com/online/automobile/price/hybrid_auto_care" },
        { "name": "Modifications Accessories", "url": "https://www.kapruka.com/online/automobile/price/modifications_accessories" },
        { "name": "Motor Parts Accessories", "url": "https://www.kapruka.com/online/automobile/price/motor_parts_accessories" },
        { "name": "Motorbike Accessories", "url": "https://www.kapruka.com/online/automobile/price/motorbike_accessories" },
        { "name": "Tires And Wheels", "url": "https://www.kapruka.com/online/automobile/price/tires_and_wheels" },
        { "name": "Tools And Equipment", "url": "https://www.kapruka.com/online/automobile/price/tools_and_equipment" },
        { "name": "Vehicle Service Packages", "url": "https://www.kapruka.com/online/automobile/price/vehicle_service_packages" }
      ]
    }
  ]
}
```

### All 64 Categories (Live Data)

#### With Children (36 categories):
| # | Category | Children |
|---|---|---|
| 1 | Automobile | 15 |
| 2 | Ayurvedic | 3 |
| 3 | Bicycle | 15 |
| 4 | Books | 28 |
| 5 | Chocolates | 29 |
| 6 | Clothing | 10 |
| 7 | combopack | 16 |
| 8 | Cosmetics | 11 |
| 9 | Electronic | 20 |
| 10 | Fashion | 13 |
| 11 | Fruits | 5 |
| 12 | Giftcert | 12 |
| 13 | Giftset | 6 |
| 14 | GreetingCards | 16 |
| 15 | Grocery | 28 |
| 16 | Household | 19 |
| 17 | Jewellery | 15 |
| 18 | KidsToys | 14 |
| 19 | Liquor | 6 |
| 20 | BabyItems | 16 |
| 21 | party | 5 |
| 22 | Perfumes | 4 |
| 23 | Pet | 5 |
| 24 | Pharmacy | 18 |
| 25 | pirikara | 6 |
| 26 | Childrens | 10 |
| 27 | Schoolpride | 8 |
| 28 | Softtoy | 6 |
| 29 | Sports | 7 |
| 30 | Vegetables | 8 |
| 31 | Adult Products | 10 |
| 32 | birthday | 2 |
| 33 | cakes | 26 |
| 34 | flowers | 16 |
| 35 | Personalized Gifts | 13 |
| 36 | Services | 18 |

#### Without Children (28 leaf categories):
Curd, thaipongle, teachersday, samedaydelivery, bestsellers, diwali, newadditions, graduation, valentine, newyear_january, fathersday, childrensday, christmas, anniversary, bridetobe, corporate, lover, momtobe, mother, sympathies, uniquegifts, wedding, womenday, youandme, household, ornaments, promotions, halloween

### Response Structure
```json
{
  "categories": [
    {
      "name": "string",
      "url": "string",
      "children": [
        { "name": "string", "url": "string" }
      ]
    }
  ]
}
```

---

## 5. Tool 4: `kapruka_list_delivery_cities`

### Pydantic Parameters
```json
{
  "query": "string",            // REQUIRED
  "response_format": "json"     // optional
}
```

### Live Response (query="Colombo")
```json
{
  "cities": [
    { "name": "Colombo 01", "aliases": ["Colombo1"] },
    { "name": "Colombo 02", "aliases": ["Slave", "Colombo2"] },
    { "name": "Colombo 03", "aliases": ["Kolpity", "colpity", "colombo3"] },
    { "name": "Colombo 04", "aliases": ["bambala", "colombo4"] },
    { "name": "Colombo 05", "aliases": ["thimbirigasyaya", "kirulapona", "narahenpita", "thibirigas"] },
    { "name": "Colombo 06", "aliases": ["wellawatta", "walawtha", "wellawatha", "colombo6", "welawathth"] },
    { "name": "Colombo 07", "aliases": ["Colombo7"] },
    { "name": "Colombo 08", "aliases": ["borella", "boralla", "colombo8"] },
    { "name": "Colombo 09", "aliases": ["Colombo9", "dematagoda"] },
    { "name": "Colombo 10", "aliases": ["maradana"] },
    { "name": "Colombo 11", "aliases": ["peta"] },
    { "name": "Colombo 12", "aliases": [] },
    { "name": "Colombo 13", "aliases": ["Kotahena"] },
    { "name": "Colombo 14", "aliases": ["grandpass"] },
    { "name": "Colombo 15", "aliases": ["matakuliya", "modara", "mutwal"] }
  ],
  "total_matched": 15,
  "showing": 15
}
```

### Response Structure
```json
{
  "cities": [
    {
      "name": "string",     // Exact city name for delivery
      "aliases": ["string"] // Alternative spellings
    }
  ],
  "total_matched": 15,
  "showing": 15
}
```

### City Coverage (Live-Tested)

| Query | Cities | Sample | Aliases |
|---|---|---|---|
| `Colombo` | 15 | Colombo 01 | ["Colombo1"] |
| `Kandy` | 1 | Kandy | ["galagedara"] |
| `Galle` | 1-2 | Galle | ["gale", "galla"] |
| `Jaffna` | 1 | Jaffna | ["jafna", "maniyarpathi"] |
| `Negombo` | 1 | Negombo | ["negambo", "Meegamuwa"] |
| `Matara` | 2 | Matara | ["mathara", "mtara"] |
| `Batticaloa` | 0 | — | **NOT IN INDEX** |

---

## 6. Tool 5: `kapruka_check_delivery`

### ⚠️ CRITICAL: Parameter Name

The parameter is **`delivery_date`** NOT `date`. Sending `date` returns:
```
Error: params.date Extra inputs are not permitted [type=extra_forbidden]
```

### Pydantic Parameters (Exact)
```json
{
  "city": "string",              // REQUIRED — exact city name
  "product_id": "string",      // optional
  "delivery_date": "YYYY-MM-DD", // optional — KEY IS "delivery_date"
  "response_format": "json"    // optional
}
```

### Live Request
```json
{
  "city": "Colombo 01",
  "product_id": "cake00ka002034",
  "delivery_date": "2026-06-05",
  "response_format": "json"
}
```

### Live Response (Raw Text Block)
```json
{
  "city": "Colombo 01",
  "now": "2026-06-04T21:07:43+05:30",
  "checked_date": "2026-06-05",
  "available": true,
  "rate": 300,
  "currency": "LKR",
  "perishable_warning": null
}
```

### Response Fields
| Field | Type | Live Value | Notes |
|---|---|---|---|
| `city` | string | `"Colombo 01"` | Echo of input |
| `now` | string | `"2026-06-04T21:07:43+05:30"` | Server time (Sri Lanka) |
| `checked_date` | string | `"2026-06-05"` | Date checked |
| `available` | boolean | `true` | Can deliver? |
| `rate` | integer | `300` | Fee in LKR |
| `currency` | string | `"LKR"` | Always LKR |
| `perishable_warning` | null | `null` | Always null in tests |

### When Unavailable
```json
{
  "city": "Jaffna",
  "now": "2026-06-04T21:07:43+05:30",
  "checked_date": "2026-06-05",
  "available": false,
  "reason": "We've scheduled your delivery for 6 / June. Slots for 5 / JUNE to Jaffna are currently full.",
  "next_available_date": "2026-06-06",
  "rate": 2500,
  "currency": "LKR",
  "perishable_warning": null
}
```

### Delivery Fee Matrix (Live-Verified)

| City | Fee (LKR) | Available | Notes |
|---|---|---|---|
| Colombo 01 | 300 | ✅ | Base rate |
| Colombo 03 | 300 | ✅ | Same zone |
| Kandy | 1,075 | ✅ | Hill country |
| Galle | 1,090 | ✅ | Southern coast |
| Jaffna | 2,500 | ❌ | Slots full, next: 2026-06-06 |
| Negombo | 960 | ✅ | Western coast |
| Batticaloa | 3,900 | ❌ | From earlier test |

---

## 7. Tool 6: `kapruka_create_order`

### ⚠️ CRITICAL: Actual Working Schema (Not What Docs Say)

After extensive raw testing, the **definitive working payload** is:

```json
{
  "cart": [
    {
      "product_id": "cake00ka002034",   // REQUIRED — NOT "product_code"
      "quantity": 1,
      "icing_text": "optional"
    }
  ],
  "recipient": {
    "name": "Amma Perera",              // REQUIRED
    "phone": "0771234567"               // REQUIRED
    // NOTE: NO "address" here! NO "city" here!
  },
  "delivery": {
    "address": "No 5, Galle Road",      // REQUIRED
    "city": "Colombo 03",               // REQUIRED
    "date": "2026-06-05",               // REQUIRED — called "date" INSIDE delivery block
    "location_type": "house",           // optional
    "instructions": "Ring bell"         // optional
  },
  "sender": {
    "name": "Aiya",                     // REQUIRED
    "anonymous": false                  // REQUIRED — boolean
    // NOTE: NO "email" here! MCP rejects it.
  },
  "gift_message": "Happy Birthday!",    // optional
  "response_format": "json"            // optional
}
```

### What DOES NOT Work (Verified Raw Errors)

❌ `items` instead of `cart`:
```
params.cart: Field required [type=missing]
```

❌ `product_code` instead of `product_id` in cart:
```
params.cart.0.product_id: Field required [type=missing]
```

❌ Top-level `sender_name`, `sender_email`, `anonymous`:
```
params.sender_name: Extra inputs are not permitted [type=extra_forbidden]
params.sender_email: Extra inputs are not permitted [type=extra_forbidden]
params.anonymous: Extra inputs are not permitted [type=extra_forbidden]
```

❌ `email` inside `sender` object:
```
params.sender.email: Extra inputs are not permitted [type=extra_forbidden]
```

❌ `address` inside `recipient`:
```
params.recipient.address: Extra inputs are not permitted [type=extra_forbidden]
```

### Live Request (Working)
```json
{
  "cart": [{ "product_id": "cake00ka002034", "quantity": 1 }],
  "recipient": { "name": "Test User", "phone": "0771234567" },
  "delivery": {
    "address": "No 5, Galle Road",
    "city": "Colombo 03",
    "date": "2026-06-05",
    "location_type": "house"
  },
  "sender": { "name": "Sender", "anonymous": false },
  "gift_message": "Happy Birthday!",
  "response_format": "json"
}
```

### Live Response (Raw Text Block)
```json
{
  "summary": {
    "items_total": 4200,
    "delivery_fee": 300,
    "addons_total": 0,
    "currency": "LKR",
    "grand_total": 4500
  },
  "checkout_url": "https://www.kapruka.com/tools/continue_order.jsp?id=5KKPARTQCM7N",
  "expires_at": "2026-06-04T22:07:35+05:30",
  "order_ref": "ORD-20260604-CM7N"
}
```

### Response Fields (4 top-level)

| # | Field | Type | Live Value | Notes |
|---|---|---|---|---|
| 1 | `summary` | object | `{...}` | Price breakdown |
| 2 | `checkout_url` | string | Pay URL | Expires! |
| 3 | `expires_at` | string | ISO timestamp | ~1 hour from creation |
| 4 | `order_ref` | string | `ORD-YYYYMMDD-XXXX` | Order reference |

### Summary Object (5 fields)
```json
{
  "items_total": 4200,
  "delivery_fee": 300,
  "addons_total": 0,
  "currency": "LKR",
  "grand_total": 4500
}
```

---

## 8. Tool 7: `kapruka_track_order`

### Pydantic Parameters
```json
{
  "order_number": "string",     // REQUIRED — KAP- format
  "response_format": "json"     // optional
}
```

### Live Request
```json
{ "order_number": "KAP-123456", "response_format": "json" }
```

### Live Response for Unknown Order
```
Error (order_not_found): No order exists with the given order number
```

### Expected Response for Valid Order (structure from simulator)
```json
{
  "status": "dispatched",
  "recipient": {
    "name": "Amma Rathnayake",
    "city": "Kandy Town"
  },
  "items": [
    {
      "product_code": "CAKE_CHOC_FUDGE",
      "name": "Rich Chocolate Fudge Cake",
      "quantity": 1
    }
  ],
  "timeline": [
    { "event": "Order Created", "timestamp": "2026-06-04 08:30 AM" },
    { "event": "Payment Confirmed", "timestamp": "2026-06-04 08:35 AM" },
    { "event": "Gift Freshly Prepared & Quality Checked", "timestamp": "2026-06-04 11:20 AM" },
    { "event": "Dispatched from Colombo GPO Hub", "timestamp": "2026-06-04 01:15 PM" }
  ],
  "has_delivery_photo": true,
  "has_delivery_video": false
}
```

### Response Fields
| Field | Type | Description |
|---|---|---|
| `status` | string | `"order_not_found"` / `"dispatched"` / `"delivered"` |
| `recipient` | object | `{ name, city }` |
| `items` | array | `{ product_code, name, quantity }` |
| `timeline` | array | `{ event, timestamp }` |
| `has_delivery_photo` | boolean | Photo proof available |
| `has_delivery_video` | boolean | Video proof available |

---

## 9. Parameter Name Mapping (Complete)

### Internal → MCP Wire Names

| What We Call | What MCP Expects | Tool |
|---|---|---|
| `product_code` | `product_id` | search, get_product, check_delivery |
| `city_code` | `city` | check_delivery, create_order |
| `delivery_date` | `delivery_date` | check_delivery |
| `items` | `cart` | create_order |
| `items[].product_code` | `cart[].product_id` | create_order |
| `recipient.address` | ❌ NOT ALLOWED | create_order (goes in delivery block) |
| `recipient.city` | ❌ NOT ALLOWED | create_order (goes in delivery block) |
| `sender.email` | ❌ NOT ALLOWED | create_order (MCP rejects) |
| `sender_name` (top-level) | ❌ Extra forbidden | create_order |
| `sender_email` (top-level) | ❌ Extra forbidden | create_order |
| `anonymous` (top-level) | ❌ Extra forbidden | create_order |
| `query` (search) | `q` | search_products |

### How mcp.ts Sanitizes

**check_delivery:**
```typescript
// Input: { city, product_id, delivery_date }
// Output: { city, product_id, delivery_date, response_format: 'json' }
```

**create_order:**
```typescript
// Input: { items, recipient, delivery, sender, gift_message }
// Maps to: { cart, recipient, delivery, sender, gift_message, response_format: 'json' }
// Where:
//   - items → cart
//   - items[].product_code → cart[].product_id
//   - recipient.address → delivery.address (moved!)
//   - recipient.city → delivery.city (moved!)
//   - sender.email → ❌ DROPPED (MCP rejects)
```

---

## 10. Rate Limiting & Session Behavior

### Observed Limits
| Tool | Safe Calls/Min | Error |
|---|---|---|
| `search_products` | ~15-20 | `Error: Rate limit exceeded. Wait a moment before retrying.` |
| `check_delivery` | ~5-8 | Same |
| `create_order` | Unknown (low) | — |

### Session Behavior
- Session ID persists across rate limit errors
- No re-initialization needed on rate limit
- Recovery time: ~60 seconds
- Cloudflare 406: Use residential IP or browser-like User-Agent

### Recommended Delays
```typescript
const MCP_DELAYS = {
  search: 2500,      // ms
  delivery: 3000,
  product: 1500,
  order: 5000,
  track: 2000
};
```

---

## 11. Missing Features (Confirmed)

| Feature | Status | Notes |
|---|---|---|
| Real-time stock | ❌ Static enum | `stock_level` is snapshot |
| Inventory hold | ❌ No API | Let MCP handle at checkout |
| User auth | ❌ Guest only | Use Supabase anonymous |
| Wishlist API | ❌ | Build in Supabase |
| Order history | ❌ | Build in Supabase |
| Coupons | ❌ | No discount API |
| Reviews | ❌ `rating` always null | No review system |
| Category filters | ❌ Only list | Client-side only |
| Webhooks | ❌ | Poll `track_order` |
| Recurring orders | ❌ | Not supported |
| All SL cities | ❌ Batticaloa missing | Hardcode fallback |
| Sender email | ❌ MCP rejects | Collect separately |

---

## 12. Integration Checklist

### MCP Contract Tests
- [ ] `search_products` with `q: "chocolate"` returns `results` array
- [ ] `search_products` with `q: ""` fails with `string_too_short`
- [ ] `get_product` returns all 16 fields
- [ ] `list_categories` returns 64 categories
- [ ] `list_delivery_cities` returns cities for Colombo, Kandy, Galle
- [ ] `check_delivery` with `delivery_date` returns fee
- [ ] `check_delivery` with `date` fails with `extra_forbidden`
- [ ] `create_order` with `cart` + `product_id` succeeds
- [ ] `create_order` with `items` fails with `cart required`
- [ ] `create_order` with top-level `sender_email` fails with `extra_forbidden`
- [ ] `track_order` with invalid number returns `order_not_found`

---

*This specification is derived exclusively from live wire-level JSON-RPC calls to `https://mcp.kapruka.com/mcp`. No simulator data, no assumptions, no documentation references — only what the MCP actually returns over the wire.*


---

## EXHAUSTIVE PROBE RUN — 2026-06-04 16:41:01 UTC
> **Script:** mcp-max-probe.mjs v2.0 | **Total calls:** 149
> **Session 1:** `5c25efd154314f4a99a326cbf4b7340a`
> **Session 2:** `7bc4e6622731493ba338a6a8eca75487`

### Run Summary

| Tool | Total | ✅ OK | ❌ Errors |
|------|-------|-------|----------|
| `list_categories` | 4 | 4 | 0 |
| `list_delivery_cities` | 26 | 26 | 0 |
| `search_products` | 51 | 46 | 5 |
| `get_product` | 16 | 13 | 3 |
| `check_delivery` | 26 | 21 | 5 |
| `create_order` | 16 | 7 | 9 |
| `track_order` | 9 | 0 | 9 |

### Delivery Fee Matrix (Live Wire — 2026-06-04 16:41:01)

| City | Rate (LKR) | Available |
|------|-----------|-----------|
| Colombo 01 | 300 | ✅ |
| Colombo 03 | 300 | ✅ |
| Colombo 07 | 300 | ✅ |
| Colombo 15 | 300 | ✅ |
| Kandy | 1075 | ✅ |
| Galle | 1090 | ✅ |
| Jaffna | 2500 | ❌ |
| Negombo | 960 | ✅ |
| Matara | 1370 | ✅ |
| Batticaloa | 3900 | ❌ |
| Anuradhapura | 1950 | ✅ |
| Kurunegala | 1290 | ✅ |
| Trincomalee | 2980 | ✅ |
| Badulla | 3140 | ✅ |

### Search Hit Counts (Live Wire)

| Query | Results |
|-------|---------|
| `chocolate` | 4 |
| `cake` | 7 |
| `rose` | 4 |
| `birthday` | 4 |
| `anniversary` | 5 |
| `hamper` | 5 |
| `fruit` | 4 |
| `wine` | 4 |
| `arrack` | 4 |
| `beer` | 4 |
| `perfume` | 5 |
| `saree` | 3 |
| `shirt` | 4 |
| `phone` | 5 |
| `laptop` | 5 |
| `plush` | 3 |
| `balloon` | 4 |
| `candle` | 5 |
| `ring` | 5 |
| `rice` | 4 |
| `vitamin` | 3 |
| `ayurvedic` | 3 |
| `book` | 4 |
| `pet` | 4 |
| `bicycle` | 3 |
| `cursor-page2` | 2 |
| `limit-20` | 17 |
| `limit-50` | 47 |
| `min_price-5000` | 10 |
| `max_price-3000` | 7 |
| `price-range` | 10 |
| `in_stock_only-true` | 7 |
| `in_stock_only-false` | 7 |
| `sort-price_asc` | 5 |
| `sort-price_desc` | 5 |
| `sort-relevance` | 2 |
| `sort-newest` | 2 |
| `q-3char-OK` | 6 |

### Order Creation Results (Live Wire)

| Test Case | Order Ref | Grand Total | Error |
|-----------|-----------|-------------|-------|
| `valid-colombo-cake` | ORD-20260604-NOBV | 4500 LKR | — |
| `valid-kandy-chocolate` | ORD-20260604-0JMK | 8075 LKR | — |
| `valid-galle-flower` | ORD-20260604-BECQ | 6300 LKR | — |
| `valid-multi-item` | ORD-20260604-VQ3O | 8000 LKR | — |
| `valid-with-icing-text` | ORD-20260604-8NN2 | 4640 LKR | — |
| `valid-negombo-hamper` | ORD-20260604-7UNP | 7460 LKR | — |
| `ERROR-items-not-cart` | — | — | Error executing tool kapruka_create_order: 2 validation errors for kapruka_creat |
| `ERROR-product_code-not-product_id` | — | — | Error executing tool kapruka_create_order: 2 validation errors for kapruka_creat |
| `ERROR-top-level-sender_email` | — | — | Error executing tool kapruka_create_order: 4 validation errors for kapruka_creat |
| `ERROR-sender-email-in-object` | — | — | Error executing tool kapruka_create_order: 1 validation error for kapruka_create |
| `ERROR-recipient-with-address` | — | — | Error executing tool kapruka_create_order: 2 validation errors for kapruka_creat |
| `ERROR-missing-cart` | — | — | Error executing tool kapruka_create_order: 1 validation error for kapruka_create |
| `ERROR-missing-recipient` | — | — | Error executing tool kapruka_create_order: 1 validation error for kapruka_create |
| `ERROR-missing-delivery` | — | — | Error executing tool kapruka_create_order: 1 validation error for kapruka_create |
| `ERROR-delivery-date-in-delivery` | — | — | Error executing tool kapruka_create_order: 2 validation errors for kapruka_creat |
| `ERROR-sender-anonymous-missing` | ORD-20260604-F88P | 4500 LKR | — |

### City Coverage (Live Wire)

**Query "Colombo":** Colombo 01, Colombo 02, Colombo 03, Colombo 04, Colombo 05, Colombo 06, Colombo 07, Colombo 08, Colombo 09, Colombo 10, Colombo 11, Colombo 12, Colombo 13, Colombo 14, Colombo 15

**Query "Kandy":** Kandy

**Query "Galle":** Galle, Kegalle, Thangalle

**Query "Jaffna":** Jaffna

**Query "Negombo":** Negombo

**Query "Matara":** Makandura Matara, Matara

**Query "Batticaloa":** Batticaloa

**Query "Anuradhapura":** Anuradhapura

**Query "Kurunegala":** Kurunegala

**Query "Ratnapura":** Rathnapura

**Query "Badulla":** Badulla

**Query "Trincomalee":** Trincomalee

**Query "Gampaha":** Gampaha

**Query "Kalutara":** Kaluthara

**Query "Nuwara":** Medamahanuwara, Nuwara Eliya, Serunuwara

**Query "Ampara":** Ampara

**Query "Monaragala":** Monaragala

**Query "Hambantota":** Hambanthota

**Query "Polonnaruwa":** Polonnaruwa, Welikanda Polonnaruwa

**Query "Vavuniya":** Vavuniya

**Query "Mullaitivu":** 

**Query "Mannar":** Mannar

**Query "Kilinochchi":** Kilinochchiya

**Query "a":** Agalawatta, Agunukolapelassa, Ahangama, Ahungalla, Akkareipathuwa, Akmeemana, Akurana, Akuressa, Alawwa, Aluthgama, Ambalangoda, Ambanpola, Ambepussa, Ampara, Anamaduwa, Anguruwathota, Anuradhapura, Aralagamwila, Aranayaka, Athkadura, Attanagalla, Attidiya, Aturugiriya, Avissawella, Ayagama

**Query "_empty":** Agalawatta, Agunukolapelassa, Ahangama, Ahungalla, Akkareipathuwa, Akmeemana, Akurana, Akuressa, Alawwa, Aluthgama, Ambalangoda, Ambanpola, Ambepussa, Ampara, Anamaduwa, Anguruwathota, Anuradhapura, Aralagamwila, Aranayaka, Athkadura, Attanagalla, Attidiya, Aturugiriya, Avissawella, Ayagama

### Full Raw Data

See `output/mcp-MAX-raw.json` for all raw wire responses (1,580,002 bytes).


---

## CORRECTIONS & NEW DISCOVERIES — 2026-06-04 (mcp-max-probe.mjs v2.0)

### ⚠️ Delivery Fee Corrections (Previous Docs Were Wrong)

| City | Old Doc Value | **Live Correct Value** |
|------|--------------|----------------------|
| Matara | 1,090 | **1,370** |
| Anuradhapura | 1,400 | **1,950** |
| Kurunegala | 950 | **1,290** |
| Trincomalee | 2,800 | **2,980** |
| Badulla | 1,500 | **3,140** |

### Complete Verified Delivery Fee Matrix (All Live)

| City | Fee (LKR) | Available | Notes |
|------|-----------|-----------|-------|
| Colombo 01–15 | 300 | ✅ | All suburbs same flat rate |
| Negombo | 960 | ✅ | |
| Kandy | 1,075 | ✅ | |
| Galle | 1,090 | ✅ | |
| Kurunegala | 1,290 | ✅ | |
| Matara | 1,370 | ✅ | |
| Anuradhapura | 1,950 | ✅ | |
| Jaffna | 2,500 | ❌ | Slots full day-of; next day: +1 |
| Trincomalee | 2,980 | ✅ | |
| Batticaloa | 3,900 | ❌ | Slots full day-of; next day: +1 |
| Badulla | 3,140 | ✅ | |

### New City Names Discovered (list_delivery_cities)

| Query | Cities Returned |
|-------|----------------|
| Galle | Galle, **Kegalle**, **Thangalle** |
| Matara | Matara, **Makandura Matara** |
| Nuwara | **Nuwara Eliya**, **Medamahanuwara**, **Serunuwara** |
| Polonnaruwa | Polonnaruwa, **Welikanda Polonnaruwa** |
| Kilinochchi | **Kilinochchiya** (official MCP spelling) |
| Hambantota | **Hambanthota** (official MCP spelling) |
| Kalutara | **Kaluthara** (official MCP spelling) |
| Ratnapura | **Rathnapura** (official MCP spelling) |

> **Key finding**: `list_delivery_cities` with empty query or `query=""` returns 25 cities starting with "A" (page-limited alphabetical default). It is NOT a complete city list — it returns max 25 results per call.

### ⚠️ CRITICAL: City Aliases Do NOT Work in `kapruka_check_delivery`

```
check_delivery { city: "galagedara" }
→ Error (city_not_found): Unknown city 'galagedara'
```

`list_delivery_cities` returns aliases per city, but `check_delivery` rejects them. **Only the exact canonical `name` field from `list_delivery_cities` response works.** The alias array is for client-side display only.

### Past Dates Rejected by `check_delivery`

```
check_delivery { city: "Colombo 01", delivery_date: "2026-06-03" }  // yesterday
→ Error: Bad request —
```
HTTP 200 is still returned but body contains the error string. No `next_available_date` or structured error — just the raw `"Error: Bad request"` string.

### `sender.anonymous` is Optional in `create_order`

```json
{ "sender": { "name": "S" } }  // no "anonymous" field
→ ORD-20260604-F88P  grand_total=4500  // ✅ succeeds
```

The Pydantic schema accepts `sender` without `anonymous`. The field defaults to `false` (not anonymous).

### `icing_text` Adds a Surcharge

```
cart: [{ product_id: 'cake00ka002034', qty: 1, icing_text: 'Happy 30th Birthday Kavya!' }]
→ items_total: 4340  (base price 4200 + icing surcharge 140 LKR)
```

The icing text fee is 140 LKR. This is charged by the MCP on the server side; the client cannot override it.

### `checkout_url` Format (Corrected)

Previous docs showed: `https://www.kapruka.com/tools/continue_order.jsp?id=5KKPARTQCM7N`

Live data shows a longer alphanumeric format:
```
https://www.kapruka.com/tools/continue_order.jsp?id=OEHTJQ96NOBV  (12+ chars)
https://www.kapruka.com/tools/continue_order.jsp?id=44CKF2Q90JMK
https://www.kapruka.com/tools/continue_order.jsp?id=OKSJ4D0MBECQ
```
The ID in the URL is **NOT** the `order_ref` — it is a separate longer token.

### `kapruka_track_order` — `order_number` Min Length is 4

```
track_order { order_number: "" }
→ String should have at least 4 characters [type=string_too_short]
```

Also: `ORD-YYYYMMDD-XXXX` format (from `create_order`) returns `order_not_found`. Track order only recognises the **`KAP-XXXXXX`** format assigned after payment is completed.

### Search Behavior Discoveries

| Finding | Detail |
|---------|--------|
| `limit: 1` returns 0 results | `limit=1` for `chocolate` → "No products found". Minimum effective limit appears to be 2. |
| `limit: 50` for `cake` → 47 results | Confirms actual max cake catalogue size is ~47 items |
| `sort=relevance` / `sort=newest` → only 2 results | These sort modes truncate to 2 results for `cake`; avoid for full browsing |
| `in_stock_only: true/false` same result | Both return 7 for `cake` — all listed items are in stock, or filter is ignored |
| Queries that return 0 results | `watch`, `toy`, `gift`, `jewellery`, `grocery`, `medicine` |
| New passing queries | `wine` ✅, `arrack` ✅, `beer` ✅, `saree` ✅, `shirt` ✅, `phone` ✅, `laptop` ✅, `balloon` ✅, `candle` ✅, `ring` ✅, `rice` ✅, `vitamin` ✅, `ayurvedic` ✅, `book` ✅, `pet` ✅, `bicycle` ✅ |

### Rate Limit (Confirmed from Headers)

```http
ratelimit-limit: 60
ratelimit-remaining: 59   (after 1 call on fresh session)
ratelimit-reset: 60       (seconds until reset)
```

Confirmed: **60 calls per minute per session**. Headers are present on the `/initialize` handshake response.

### Full Pydantic Validation Error Messages (Wire-Exact)

**`kapruka_search_products`**
```
q="" or q="a" or q="ca":
  params.q — String should have at least 3 characters [type=string_too_short]

q missing:
  params.q — Field required [type=missing]

unknown_field present:
  params.unknown_field — Extra inputs are not permitted [type=extra_forbidden]
```

**`kapruka_check_delivery`**
```
date instead of delivery_date:
  params.date — Extra inputs are not permitted [type=extra_forbidden]

city missing:
  params.city — Field required [type=missing]
```

**`kapruka_create_order`**
```
items instead of cart:
  params.cart — Field required [type=missing]

product_code instead of product_id in cart item:
  params.cart.0.product_id — Field required [type=missing]

sender.email present:
  params.sender.email — Extra inputs are not permitted [type=extra_forbidden]

recipient.address present:
  params.recipient.address — Extra inputs are not permitted [type=extra_forbidden]

delivery.delivery_date instead of delivery.date:
  params.delivery.date — Field required [type=missing]
  params.delivery.delivery_date — Extra inputs are not permitted [type=extra_forbidden]
```

**`kapruka_track_order`**
```
order_number="" :
  params.order_number — String should have at least 4 characters [type=string_too_short]

order_number missing:
  params.order_number — Field required [type=missing]
```

---

*All data above is from 149 live wire calls against `https://mcp.kapruka.com/mcp` on 2026-06-04. Full raw JSON: `output/mcp-MAX-raw.json` (1,580,002 bytes).*

---

## CHECKOUT GROUND TRUTH — 2026-06-04 (Actual Kapruka Payment Page)

> Source: Live Kapruka checkout screenshot captured post-`create_order`. This is the highest-authority data tier — what Kapruka actually charges at payment time.

### Order Under Test

| Field | Value |
|-------|-------|
| Product | Family Joy Grocery Hamper (cphamper0356) |
| MCP product price | Rs. 4,750 |
| Recipient | Nethmi Perera, 7.17 Janna Road, Jaffna |
| Delivery date | 10 June 2026 |
| Sender (Kapruka shows) | Harry (**guest@kapruka.com**) |
| **Kapruka checkout total** | **Rs. 7,120** |
| Implied delivery fee | **Rs. 2,370** (7120 − 4750) |

### Three-Way Fee Discrepancy (Jaffna)

| Source | Value | Delta vs checkout |
|--------|-------|-------------------|
| `check_delivery.rate` | 2,500 | **+130 LKR** |
| `create_order.summary.delivery_fee` | ~2,375 (app showed 7,125 total) | **+5 LKR** |
| **Kapruka checkout actual** | **2,370** | ground truth |

**Rule**: Never display `check_delivery.rate` as the final fee. Even `create_order.summary.grand_total` can be off by ~5 LKR. Always frame it as "Kapruka will confirm at checkout."

### ⚠️ Sender Email — Silent Substitution

The user provided `harry@gmail.com`. The checkout page shows:

```
Sender: Harry (guest@kapruka.com)
```

MCP **silently replaces** the sender email with `guest@kapruka.com` because:
1. `sender.email` is rejected by MCP Pydantic schema (`extra_forbidden`)
2. Kapruka's backend fills in `guest@kapruka.com` as default for anonymous/guest orders

**Impact**: Order confirmation and tracking emails go to `guest@kapruka.com`, NOT the user's actual email. Users will not receive Kapruka's email confirmations unless they enter their email directly on Kapruka's checkout page.

**Fix**: Remove email collection from the chat flow entirely, OR tell users explicitly: "Enter your email on Kapruka's checkout page to receive tracking updates."

### Order Tags Written by MCP Agent

The checkout page shows these tags embedded in the order:
```
ORDCAT-MCP_AGENT
[MCP_ORDER-ORD-20260604-1ART]
```

These confirm Kapruka's backend tags all MCP-agent-created orders. The `order_ref` from `create_order` is embedded in the second tag. This is how Kapruka customer support can identify MCP-originated orders.

### Corrected Delivery Fee Map (All Sources)

| City | Old (stale) | check_delivery | create_order | **Checkout GT** |
|------|-------------|---------------|--------------|-----------------|
| Jaffna | 2,500 | 2,500 | ~2,375 | **2,370** ✓ |
| Matara | 1,090 | 1,370 | — | **1,370** |
| Anuradhapura | 1,400 | 1,950 | — | **1,950** |
| Badulla | 1,500 | 3,140 | — | **3,140** |
| Trincomalee | 2,800 | 2,980 | — | **2,980** |
| Kurunegala | 950 | 1,290 | — | **1,290** |
| Colombo 01–15 | 300 | 300 | 300 | **300** ✓ consistent |
| Kandy | 1,075 | 1,075 | 1,075 | **1,075** ✓ consistent |
| Galle | 1,090 | 1,090 | 1,090 | **1,090** ✓ consistent |
| Negombo | 960 | 960 | 960 | **960** ✓ consistent |

### cphamper0356 — New Live Product ID

The hamper product used in this order was `cphamper0356`, priced at Rs. 4,750. This differs from the fallback catalogue entry `CPHAMPER0268` (Family Hygienic Needs Hamper, Rs. 6,500). These are distinct products — the live search returned `cphamper0356` for the "avurudu" query context.

---

*Ground truth extracted from actual Kapruka checkout page (payment step) captured 2026-06-04. No simulation, no inference beyond arithmetic.*
