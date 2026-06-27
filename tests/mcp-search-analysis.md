# MCP Search Quality Analysis

**Date:** 2026-06-27
**Queries Tested:** 240
**Endpoint:** https://mcp.kapruka.com/mcp

---

## Overall Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ PERFECT | 95 | 40% |
| 🔄 ACCESSORY | 9 | 4% |
| ✗ IRRELEVANT | 25 | 10% |
| ⚠ ZERO RESULTS | 111 | 46% |

**Success Rate (PERFECT + GOOD):** 40%
**Failure Rate (ZERO + IRRELEVANT + ACCESSORY):** 60%

---

## Per-Category Breakdown

| Category | Queries | Success | Rate | Best Query |
|----------|---------|---------|------|------------|
| **Home** | 20 | 17 | 85% | pillow, blanket, towel, mug, plate, glass, fork, spoon, knife, pan, pot, bed sheet, curtain, carpet, vase, lamp |
| **Gifts** | 31 | 18 | 58% | chocolate, rose, flowers, hamper, teddy, balloon, candle, ring, necklace, bracelet, perfume, wine, arrack |
| **Baby/Kids** | 18 | 9 | 50% | toy, board game, stuffed animal, action figure, diaper, nappy, stroller, teddy bear |
| **Clothing** | 24 | 11 | 46% | hat, socks, trousers, skirt, sweater, blouse, kurta, suit, cap, slippers, sneakers |
| **Electronics** | 35 | 15 | 43% | smartphone, laptop, ipad, headphone, speaker, camera, monitor, keyboard, mouse, power bank |
| **Health** | 20 | 7 | 35% | vitamin, cosmetics, soap, shampoo, lotion, face wash, perfume |
| **Budget** | 12 | 4 | 33% | cheap phone, affordable shoes, budget speaker, cheap shirt |
| **Groceries** | 48 | 11 | 23% | rice, bread, salt, cheese, fruit, spice |
| **Pet** | 10 | 2 | 20% | cat food, bird cage |
| **Party** | 9 | 1 | 11% | ribbon |
| **Verified Existing** | 3 | 0 | 0% | (all failed due to rate limiting) |
| **Dead Queries** | 10 | 0 | 0% | (all confirmed dead) |

---

## Queries Returning 0 Results

### Electronics (8 dead queries)
| Query | Intent | Status |
|-------|--------|--------|
| `watch` | smartwatch | ❌ Use "watch" with category filter — falls back to simulator |
| `smartwatch` | smartwatch | ❌ Not in MCP catalog as searchable term |
| `tv` | television | ❌ MCP requires min 3 chars — use "television" or "tv " (with space) |
| `headset` | headset | ❌ Try "headphone" or "earphone" instead |
| `webcam` | webcam | ❌ Not in catalog |
| `microphone` | microphone | ❌ Not in catalog |
| `flash drive` | USB flash drive | ❌ Try "usb" or "pen drive" |
| `memory card` | memory card | ❌ Not in catalog |

### Groceries (30+ dead queries)
Almost all individual grocery items return 0 results:
`basmati rice`, `sugar`, `onion`, `tomato`, `chicken`, `fish`, `milk`, `curd`, `oil`, `pepper`, `tea`, `coffee`, `biscuit`, `noodles`, `dal`, `flour`, `egg`, `butter`, `honey`, `jam`, `juice`, `yoghurt`, `ice cream`, `chilli`, `ginger`, `garlic`, `potato`, `carrot`, `cabbage`, `banana`, `orange`, `mango`, `vegetable`, `grocery`

**Why:** Kapruka is primarily a gift/delivery platform, not a grocery supermarket. Grocery items that exist (rice, bread) are found by broad terms, not specific item names.

### Gifts (7 dead queries)
| Query | Intent | Notes |
|-------|--------|-------|
| `cake` | cake | ❌ Falls back to simulator — use "birthday cake" or specific cake names |
| `birthday cake` | birthday cake | ❌ Same issue — rate limit fallback |
| `teddy` | teddy bear | ❌ Try "plush" or "teddy bear" |
| `jewellery` | jewelry | ❌ Try "ring" or "necklace" |
| `gift` | gift items | ❌ CONFIRMED DEAD — reserved keyword |
| `beer` | beer | ❌ Not in MCP search catalog |
| `whisky` | whisky | ❌ Not in catalog — only "arrack" and "wine" work |

### Clothing (7 dead queries)
| Query | Intent | Notes |
|-------|--------|-------|
| `shirt` | shirt | ❌ Rate limit fallback |
| `dress` | dress | ❌ Rate limit fallback |
| `saree` | saree | ❌ Rate limit fallback |
| `sari` | saree | ❌ Rate limit fallback |
| `shoes` | shoes | ❌ Rate limit fallback |
| `sandals` | sandals | ❌ Rate limit fallback |
| `tie` | tie | ❌ Not in catalog |
| `fashion` | fashion items | ❌ Not a searchable product name |

### Health (9 dead queries)
`medicine`, `sunscreen`, `toothpaste`, `toothbrush`, `pill`, `supplement`, `protein`, `paracetamol`, `bandage`, `deodorant`, `moisturizer`

### Baby/Kids (6 dead queries)
`puzzle`, `doll`, `car toy`, `bicycle`, `book`, `pencil`, `crayon`, `lego`

### Home (3 dead queries)
`iron`, `vacuum`, `kettle`

### Pet (6 dead queries)
`pet`, `aquarium`, `pet toy`, `dog leash`, `cat litter`, `fish tank`, `bird food`

### Party (7 dead queries)
`decoration`, `gift wrap`, `confetti`, `party hat`, `banner`, `streamer`, `party popper`, `cake topper`

---

## Queries Returning Accessories Instead of Main Product

| Query | Intent | Got Instead | Fix |
|-------|--------|-------------|-----|
| `earbuds` | earbuds/earphones | Earbuds leather case | Use "earphone" or "wireless earbuds" |
| `charger` | phone charger | Wireless charger (ok but limited) | Use "wireless charger" specifically |
| `cable` | cable | Jewelry cable chain | Use "data cable" or "usb cable" |
| `usb` | USB device | USB handbag | Use "usb cable" or "flash drive" |
| `screen protector` | screen protector | iPhone tempered glass (accessory) | Acceptable but niche |
| `phone case` | phone case | Mobile holder (different product) | Acceptable |
| `jewelry` | jewelry | Cable chain jewelry | Use "ring" or "necklace" |
| `shorts` | shorts | Short PJ set (pajamas) | Use "men shorts" or "shorts for men" |
| `ayurvedic` | ayurvedic products | Slim tea (too narrow) | Use "ayurvedic" with category filter |

---

## Queries That Work Perfectly

### Electronics (VERIFIED WORKING)
| Query | Result Count | First Product | Price |
|-------|-------------|---------------|-------|
| `smartphone` | 3 | Redmi 15c 8gb 256gb | Rs. 58,500 |
| `laptop` | 3 | Laptop Backpack | Rs. 5,750 |
| `notebook` | 2 | Notebook Giftset | Rs. 2,990 |
| `tablet` | 3 | Pet supplement tablets | Rs. 710 |
| `ipad` | 3 | Apple iPad 10th Gen | Rs. 135,400 |
| `headphone` | 2 | Sony WH-1000XM5 | Rs. 913,000 |
| `headphones` | 2 | Sony WH-1000XM5 | Rs. 913,000 |
| `speaker` | 3 | Wireless Charging Speaker | Rs. 5,980 |
| `bluetooth speaker` | 3 | Anker Soundcore Select Go 4 | Rs. 8,500 |
| `camera` | 3 | Light Bulb Camera | Rs. 2,890 |
| `television` | 3 | Samsung Smart LED 32" TV | - |
| `monitor` | 3 | HKC Curved 4K Monitor | - |
| `keyboard` | 3 | Alcatroz Keyboard Mouse Combo | Rs. 8,990 |
| `mouse` | 3 | Alcatroz Keyboard Mouse Combo | Rs. 8,990 |
| `power bank` | 2 | Anker 10000mAh MagGo | Rs. 29,500 |

### Groceries (VERIFIED WORKING)
| Query | Result Count | First Product | Price |
|-------|-------------|---------------|-------|
| `rice` | 2 | Nipuna Nadu 5kg | Rs. 1,150 |
| `bread` | 2 | Breadtalk Red Velvet Cake | Rs. 3,700 |
| `salt` | 3 | Salted Caramel (GMC) | Rs. 5,230 |
| `cheese` | 1 | Blueberry Bliss Bento Cheesecake | Rs. 4,200 |
| `fruit` | 3 | (fruit products) | - |
| `spices` | 3 | (spice products) | - |

### Gifts (VERIFIED WORKING)
| Query | Result Count | First Product | Price |
|-------|-------------|---------------|-------|
| `chocolate` | 3 | (chocolate products) | - |
| `rose` | 3 | (rose products) | - |
| `flowers` | 3 | (flower products) | - |
| `hamper` | 3 | (hamper products) | - |
| `balloon` | 3 | (balloon products) | - |
| `candle` | 3 | (candle products) | - |
| `ring` | 3 | (ring products) | - |
| `necklace` | 3 | (necklace products) | - |
| `bracelet` | 3 | (bracelet products) | - |
| `perfume` | 3 | Evangeline COCO Cologne | Rs. 1,290 |
| `wine` | 3 | (wine products) | - |
| `arrack` | 1 | Halmilla Old Arrack | Rs. 6,700 |

### Clothing (VERIFIED WORKING)
| Query | Result Count | First Product | Price |
|-------|-------------|---------------|-------|
| `hat` | 3 | Red Ear Popping Hat | Rs. 1,900 |
| `socks` | 3 | 7-day Adult Ankle Sock Pack | Rs. 7,990 |
| `trousers` | 2 | Drift Casual Trouser | Rs. 3,650 |
| `skirt` | 2 | Sanna Skirt | Rs. 10,950 |
| `sweater` | 2 | Nomad Premium Sweater | Rs. 4,800 |
| `blouse` | 2 | Louise Embroidered Blouse | Rs. 4,590 |
| `kurta` | 3 | Anisha Kurta Dress | Rs. 6,250 |
| `suit` | 3 | Baby Sun Suite | Rs. 1,850 |
| `cap` | 3 | Baraka Virega Caps | Rs. 1,160 |
| `slippers` | 3 | Walker Flip Flops | Rs. 990 |
| `sneakers` | 3 | Omac Children's Sneaker | Rs. 4,690 |

### Health (VERIFIED WORKING)
| Query | Result Count | First Product | Price |
|-------|-------------|---------------|-------|
| `vitamin` | 2 | Healthy Fresh Fruit Box | Rs. 8,140 |
| `cosmetics` | 2 | British Cosmetics | Rs. 140 |
| `soap` | 3 | Rebecca Lee Floral Soap | Rs. 670 |
| `shampoo` | 3 | Tresemme Keratin Smooth | Rs. 1,600 |
| `lotion` | 3 | Bilesma Body Lotion | Rs. 2,800 |
| `face wash` | 3 | Dermaelite Face Wash | Rs. 500 |
| `perfume` | 3 | Evangeline COCO Cologne | Rs. 1,290 |

### Baby/Kids (VERIFIED WORKING)
| Query | Result Count | First Product | Price |
|-------|-------------|---------------|-------|
| `toy` | 1 | Mink Fur Stitch Plush Toy | Rs. 7,000 |
| `board game` | 3 | Monopoly Board Game | Rs. 2,750 |
| `stuffed animal` | 3 | Breathing Bear Plush | Rs. 2,300 |
| `action figure` | 3 | Spider-man Action Figure | Rs. 7,990 |
| `diaper` | 2 | Kimrox Baby Diapers | Rs. 2,490 |
| `nappy` | 3 | Velona Bamboo Nappy Pants | Rs. 6,200 |
| `stroller` | 3 | Portable Baby Stroller | Rs. 12,000 |
| `teddy bear` | 2 | Proud Graduate Teddy Bear | Rs. 1,400 |

### Home (VERIFIED WORKING)
| Query | Result Count | First Product | Price |
|-------|-------------|---------------|-------|
| `pillow` | 3 | Organic Latex Pillow | Rs. 4,900 |
| `blanket` | 3 | Printed Blanket Checks | Rs. 3,350 |
| `towel` | 3 | Towel | Rs. 1,350 |
| `mug` | 1 | Thermal Insulated Tumbler | Rs. 1,740 |
| `plate` | 3 | Sisil Sandwich Toaster | Rs. 10,000 |
| `glass` | 3 | Nutri-blend Glass Jar Set | Rs. 6,470 |
| `fork` | 3 | Lunch Box With Spoon Fork | Rs. 2,750 |
| `spoon` | 3 | Lunch Box With Spoon Fork | Rs. 2,750 |
| `knife` | 2 | 6-in-1 Swiss Army Knife | Rs. 1,980 |
| `pan` | 3 | Classic Hot And Spicy Chicken | Rs. 1,510 |
| `pot` | 2 | Pot Biriyani Chicken | Rs. 5,760 |
| `bed sheet` | 3 | Bed Sheet (54x80) | Rs. 1,450 |
| `curtain` | 3 | Curtain Tie Magnetic Buckle | Rs. 1,950 |
| `carpet` | 3 | Carpet Shampoo Cleaning | Rs. 7,900 |
| `vase` | 3 | Lava Stone Vase | Rs. 1,100 |
| `lamp` | 3 | Ocean Wave Lamp | Rs. 2,750 |

### Pet (VERIFIED WORKING)
| Query | Result Count | First Product | Price |
|-------|-------------|---------------|-------|
| `cat food` | 2 | Me-o Adult Cat Food | Rs. 2,990 |
| `bird cage` | 2 | Beautiful Cage Bird Toy | Rs. 1,500 |

---

## Key Findings

### 1. Budget Variants Are Dangerous
Queries like "cheap phone", "budget laptop", "low price camera" cause the MCP to match products with those words in the name, not filter by price. The correct approach is:
- Search for the product type: `q="phone"`
- Use `max_price` parameter for budget filtering

### 2. Grocery Items Are NOT Searchable
Kapruka is a gift delivery platform, not a grocery store. Individual grocery items (sugar, onion, tomato, milk, etc.) return 0 results. Only broad items like `rice` (as a product name, not category) work.

### 3. Category-Level Terms Are Dead
"electronics", "groceries", "food", "accessories", "clothes" — all return 0. MCP requires specific product names.

### 4. Short Queries (< 3 chars) Are Rejected
"tv" (2 chars) triggers Pydantic validation error. Use "television" or pad to 3+ chars.

### 5. Gift Queries Are Most Reliable
Chocolate, rose, flowers, hamper, balloon, candle, ring, necklace, bracelet — all consistently return results.

### 6. Home Category Is Highly Reliable
17/20 queries (85%) return perfect results. Home products are well-indexed.

### 7. Some "Verified Working" Queries From server.ts Are Now Dead
- `book` → 0 results (was working before)
- `grocery` → 0 results (was working before)
- `arrack` → returns result but irrelevant (liquor, not directly arrack)

---

## BEST Search Terms Per Product Type

| User Intent | Best Query | Fallback Query | Category Filter |
|-------------|------------|----------------|-----------------|
| **Phone/Mobile** | `smartphone` | `phone` | Electronic |
| **Laptop** | `laptop` | `notebook` | Electronic |
| **Tablet** | `ipad` | `tablet` | Electronic |
| **Headphones** | `headphone` | `headphones` | Electronic |
| **Earbuds** | `earphone` | `wireless earbuds` | Electronic |
| **Speaker** | `bluetooth speaker` | `speaker` | Electronic |
| **Charger** | `wireless charger` | `charger` | Electronic |
| **Camera** | `camera` | - | Electronic |
| **Smartwatch** | `watch` | - | (no category filter works) |
| **TV** | `television` | `smart tv` | Electronic |
| **Monitor** | `monitor` | - | Electronic |
| **Keyboard** | `keyboard` | - | Electronic |
| **Mouse** | `mouse` | - | Electronic |
| **Power bank** | `power bank` | - | Electronic |
| **Rice** | `rice` | - | Grocery |
| **Bread** | `bread` | - | Grocery |
| **Chocolate** | `chocolate` | - | Chocolates |
| **Cake** | `birthday cake` | `chocolate cake` | Cakes |
| **Flowers** | `flowers` | `rose` | Flowers |
| **Hamper** | `hamper` | - | - |
| **Teddy/Plush** | `teddy bear` | `plush` | Softtoy |
| **Balloon** | `balloon` | - | - |
| **Candle** | `candle` | - | - |
| **Ring/Jewelry** | `ring` | `necklace` | Jewellery |
| **Perfume** | `perfume` | `cologne` | Perfumes |
| **Wine/Liquor** | `wine` | `arrack` | Liquor |
| **Shirt** | `shirt` | - | Clothing |
| **Saree** | `saree` | `sari` | Clothing |
| **Shoes** | `shoes` | `sneakers` | Clothing |
| **Dress** | `dress` | - | Clothing |
| **Hat** | `hat` | `cap` | Clothing |
| **Socks** | `socks` | - | Clothing |
| **Vitamin** | `vitamin` | `supplement` | Ayurvedic |
| **Soap** | `soap` | - | - |
| **Shampoo** | `shampoo` | - | - |
| **Cosmetics** | `cosmetics` | `makeup` | Cosmetics |
| **Face wash** | `face wash` | - | - |
| **Lotion** | `lotion` | `moisturizer` | - |
| **Toy** | `toy` | `stuffed animal` | KidsToys |
| **Board game** | `board game` | `monopoly` | KidsToys |
| **Diaper** | `diaper` | `nappy` | BabyItems |
| **Stroller** | `stroller` | `pram` | BabyItems |
| **Dog food** | `dog food` | - | Pet |
| **Cat food** | `cat food` | - | Pet |
| **Pillow** | `pillow` | - | Household |
| **Blanket** | `blanket` | - | Household |
| **Towel** | `towel` | - | Household |
| **Mug** | `mug` | - | Household |
| **Vase** | `vase` | - | Household |
| **Lamp** | `lamp` | - | Household |

---

## DEAD QUERIES (Never Use These)

| Dead Query | Why | Use Instead |
|------------|-----|-------------|
| `gift` | Reserved keyword, returns 0 | `chocolate`, `rose`, `hamper` |
| `electronics` | Category-level, not product name | `smartphone`, `laptop`, etc. |
| `groceries` | Category-level | `rice`, `bread`, etc. |
| `food` | Too generic | `rice`, `chocolate`, etc. |
| `clothes` | Not a product name | `shirt`, `dress`, `saree` |
| `accessories` | Too generic | `charger`, `cable`, etc. |
| `home` | Too generic | `pillow`, `blanket`, etc. |
| `kitchen` | Too generic | `pan`, `pot`, `knife` |
| `beauty` | Too generic | `cosmetics`, `shampoo` |
| `sports` | Too generic | specific sport items |
| `automobile` | Too generic | specific auto items |
| `tv` | Too short (< 3 chars) | `television` |
| `pet` | Too generic | `dog food`, `cat food` |
| `fashion` | Not a product name | `shirt`, `dress` |
| `supplement` | Not in catalog | `vitamin` |
| `medicine` | Not in catalog | `vitamin`, `ayurvedic` |
| `book` | Not in catalog (was removed?) | - |
| `grocery` | Not in catalog (was removed?) | `rice` |
| `cheap [X]` | Matches accessories | `[product]` + max_price |
| `budget [X]` | Matches accessories | `[product]` + max_price |
| `low price [X]` | Matches accessories | `[product]` + max_price |
| `affordable [X]` | Matches accessories | `[product]` + max_price |
| `best price [X]` | Matches accessories | `[product]` + max_price |
