#!/usr/bin/env npx tsx
/**
 * MCP Search Quality Test — Kapruka Product Search
 *
 * Tests 200+ realistic user queries against the live MCP to determine
 * which queries return relevant results, which return 0, and which
 * return irrelevant results (accessories instead of main products).
 *
 * Output: tests/mcp-search-report.csv
 *
 * Run: npx tsx tests/mcp-search-sim.ts
 */

import { callMcpTool } from '../src/lib/mcp.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CSV_PATH = join(ROOT, 'tests', 'mcp-search-report.csv');
const RATE_LIMIT_MS = 500;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Query Categories ────────────────────────────────────────────────────────

type QueryCategory =
  | 'electronics'
  | 'groceries'
  | 'gifts'
  | 'clothing'
  | 'health'
  | 'baby_kids'
  | 'home'
  | 'pet'
  | 'party'
  | 'budget_variants'
  | 'verified_existing'
  | 'dead_queries';

interface TestQuery {
  query: string;
  category: QueryCategory;
  intent: string; // what the user actually wants
}

const QUERIES: TestQuery[] = [
  // ═══════ ELECTRONICS ═══════
  { query: 'phone', category: 'electronics', intent: 'smartphone' },
  { query: 'smartphone', category: 'electronics', intent: 'smartphone' },
  { query: 'mobile', category: 'electronics', intent: 'smartphone' },
  { query: 'laptop', category: 'electronics', intent: 'laptop computer' },
  { query: 'notebook', category: 'electronics', intent: 'laptop computer' },
  { query: 'tablet', category: 'electronics', intent: 'tablet device' },
  { query: 'ipad', category: 'electronics', intent: 'tablet device' },
  { query: 'headphone', category: 'electronics', intent: 'headphones' },
  { query: 'headphones', category: 'electronics', intent: 'headphones' },
  { query: 'earbuds', category: 'electronics', intent: 'earbuds/earphones' },
  { query: 'earphone', category: 'electronics', intent: 'earbuds/earphones' },
  { query: 'speaker', category: 'electronics', intent: 'speaker' },
  { query: 'bluetooth speaker', category: 'electronics', intent: 'bluetooth speaker' },
  { query: 'charger', category: 'electronics', intent: 'phone charger' },
  { query: 'charging cable', category: 'electronics', intent: 'charging cable' },
  { query: 'cable', category: 'electronics', intent: 'cable' },
  { query: 'camera', category: 'electronics', intent: 'camera' },
  { query: 'watch', category: 'electronics', intent: 'smartwatch' },
  { query: 'smartwatch', category: 'electronics', intent: 'smartwatch' },
  { query: 'tv', category: 'electronics', intent: 'television' },
  { query: 'television', category: 'electronics', intent: 'television' },
  { query: 'monitor', category: 'electronics', intent: 'computer monitor' },
  { query: 'keyboard', category: 'electronics', intent: 'keyboard' },
  { query: 'mouse', category: 'electronics', intent: 'computer mouse' },
  { query: 'printer', category: 'electronics', intent: 'printer' },
  { query: 'power bank', category: 'electronics', intent: 'power bank' },
  { query: 'usb', category: 'electronics', intent: 'USB device' },
  { query: 'mouse pad', category: 'electronics', intent: 'mouse pad' },
  { query: 'screen protector', category: 'electronics', intent: 'screen protector' },
  { query: 'phone case', category: 'electronics', intent: 'phone case' },
  { query: 'headset', category: 'electronics', intent: 'headset' },
  { query: 'webcam', category: 'electronics', intent: 'webcam' },
  { query: 'microphone', category: 'electronics', intent: 'microphone' },
  { query: 'flash drive', category: 'electronics', intent: 'USB flash drive' },
  { query: 'memory card', category: 'electronics', intent: 'memory card' },

  // ═══════ GROCERIES ═══════
  { query: 'rice', category: 'groceries', intent: 'rice' },
  { query: 'basmati rice', category: 'groceries', intent: 'basmati rice' },
  { query: 'sugar', category: 'groceries', intent: 'sugar' },
  { query: 'onion', category: 'groceries', intent: 'onion' },
  { query: 'tomato', category: 'groceries', intent: 'tomato' },
  { query: 'chicken', category: 'groceries', intent: 'chicken' },
  { query: 'fish', category: 'groceries', intent: 'fish' },
  { query: 'milk', category: 'groceries', intent: 'milk' },
  { query: 'curd', category: 'groceries', intent: 'curd/yogurt' },
  { query: 'bread', category: 'groceries', intent: 'bread' },
  { query: 'oil', category: 'groceries', intent: 'cooking oil' },
  { query: 'coconut oil', category: 'groceries', intent: 'coconut oil' },
  { query: 'salt', category: 'groceries', intent: 'salt' },
  { query: 'pepper', category: 'groceries', intent: 'pepper' },
  { query: 'tea', category: 'groceries', intent: 'tea' },
  { query: 'coffee', category: 'groceries', intent: 'coffee' },
  { query: 'biscuit', category: 'groceries', intent: 'biscuit/cookies' },
  { query: 'noodles', category: 'groceries', intent: 'noodles' },
  { query: 'dal', category: 'groceries', intent: 'dal/lentils' },
  { query: 'flour', category: 'groceries', intent: 'flour' },
  { query: 'egg', category: 'groceries', intent: 'eggs' },
  { query: 'cheese', category: 'groceries', intent: 'cheese' },
  { query: 'butter', category: 'groceries', intent: 'butter' },
  { query: 'honey', category: 'groceries', intent: 'honey' },
  { query: 'jam', category: 'groceries', intent: 'jam' },
  { query: 'juice', category: 'groceries', intent: 'juice' },
  { query: 'water', category: 'groceries', intent: 'bottled water' },
  { query: 'yoghurt', category: 'groceries', intent: 'yoghurt' },
  { query: 'ice cream', category: 'groceries', intent: 'ice cream' },
  { query: 'chilli', category: 'groceries', intent: 'chilli' },
  { query: 'ginger', category: 'groceries', intent: 'ginger' },
  { query: 'garlic', category: 'groceries', intent: 'garlic' },
  { query: 'potato', category: 'groceries', intent: 'potato' },
  { query: 'carrot', category: 'groceries', intent: 'carrot' },
  { query: 'cabbage', category: 'groceries', intent: 'cabbage' },
  { query: 'banana', category: 'groceries', intent: 'banana' },
  { query: 'apple', category: 'groceries', intent: 'apple' },
  { query: 'orange', category: 'groceries', intent: 'orange' },
  { query: 'mango', category: 'groceries', intent: 'mango' },
  { query: 'fruit', category: 'groceries', intent: 'fruits' },
  { query: 'vegetable', category: 'groceries', intent: 'vegetables' },
  { query: 'grocery', category: 'groceries', intent: 'grocery items' },
  { query: 'supermarket', category: 'groceries', intent: 'grocery items' },
  { query: 'spices', category: 'groceries', intent: 'spices' },
  { query: 'masala', category: 'groceries', intent: 'masala spices' },
  { query: 'sauce', category: 'groceries', intent: 'sauce' },
  { query: 'ketchup', category: 'groceries', intent: 'ketchup' },
  { query: 'vinegar', category: 'groceries', intent: 'vinegar' },

  // ═══════ GIFTS ═══════
  { query: 'chocolate', category: 'gifts', intent: 'chocolates' },
  { query: 'cake', category: 'gifts', intent: 'cake' },
  { query: 'birthday cake', category: 'gifts', intent: 'birthday cake' },
  { query: 'rose', category: 'gifts', intent: 'roses/flowers' },
  { query: 'flowers', category: 'gifts', intent: 'flowers' },
  { query: 'bouquet', category: 'gifts', intent: 'flower bouquet' },
  { query: 'hamper', category: 'gifts', intent: 'gift hamper' },
  { query: 'teddy', category: 'gifts', intent: 'teddy bear' },
  { query: 'plush', category: 'gifts', intent: 'plush toy' },
  { query: 'balloon', category: 'gifts', intent: 'balloons' },
  { query: 'candle', category: 'gifts', intent: 'candles' },
  { query: 'ring', category: 'gifts', intent: 'ring/jewelry' },
  { query: 'necklace', category: 'gifts', intent: 'necklace' },
  { query: 'bracelet', category: 'gifts', intent: 'bracelet' },
  { query: 'perfume', category: 'gifts', intent: 'perfume' },
  { query: 'cologne', category: 'gifts', intent: 'cologne' },
  { query: 'jewellery', category: 'gifts', intent: 'jewelry' },
  { query: 'jewelry', category: 'gifts', intent: 'jewelry' },
  { query: 'gift', category: 'gifts', intent: 'gift items' },
  { query: 'greeting card', category: 'gifts', intent: 'greeting card' },
  { query: 'card', category: 'gifts', intent: 'greeting card' },
  { query: 'wine', category: 'gifts', intent: 'wine' },
  { query: 'beer', category: 'gifts', intent: 'beer' },
  { query: 'arrack', category: 'gifts', intent: 'arrack' },
  { query: 'whisky', category: 'gifts', intent: 'whisky' },
  { query: 'fruit basket', category: 'gifts', intent: 'fruit basket' },
  { query: 'gift set', category: 'gifts', intent: 'gift set' },
  { query: 'surprise', category: 'gifts', intent: 'surprise gift' },
  { query: 'anniversary', category: 'gifts', intent: 'anniversary gift' },
  { query: 'valentine', category: 'gifts', intent: 'valentine gift' },
  { query: 'personalized', category: 'gifts', intent: 'personalized gift' },

  // ═══════ CLOTHING ═══════
  { query: 'shirt', category: 'clothing', intent: 'shirt' },
  { query: 'dress', category: 'clothing', intent: 'dress' },
  { query: 'saree', category: 'clothing', intent: 'saree' },
  { query: 'sari', category: 'clothing', intent: 'saree' },
  { query: 'shoes', category: 'clothing', intent: 'shoes' },
  { query: 'sandals', category: 'clothing', intent: 'sandals' },
  { query: 'tshirt', category: 'clothing', intent: 't-shirt' },
  { query: 't-shirt', category: 'clothing', intent: 't-shirt' },
  { query: 'jeans', category: 'clothing', intent: 'jeans' },
  { query: 'jacket', category: 'clothing', intent: 'jacket' },
  { query: 'hat', category: 'clothing', intent: 'hat' },
  { query: 'socks', category: 'clothing', intent: 'socks' },
  { query: 'trousers', category: 'clothing', intent: 'trousers' },
  { query: 'shorts', category: 'clothing', intent: 'shorts' },
  { query: 'skirt', category: 'clothing', intent: 'skirt' },
  { query: 'sweater', category: 'clothing', intent: 'sweater' },
  { query: 'blouse', category: 'clothing', intent: 'blouse' },
  { query: 'kurta', category: 'clothing', intent: 'kurta' },
  { query: 'suit', category: 'clothing', intent: 'suit' },
  { query: 'tie', category: 'clothing', intent: 'tie' },
  { query: 'cap', category: 'clothing', intent: 'cap' },
  { query: 'slippers', category: 'clothing', intent: 'slippers' },
  { query: 'sneakers', category: 'clothing', intent: 'sneakers' },
  { query: 'fashion', category: 'clothing', intent: 'fashion items' },

  // ═══════ HEALTH ═══════
  { query: 'vitamin', category: 'health', intent: 'vitamin supplements' },
  { query: 'medicine', category: 'health', intent: 'medicine' },
  { query: 'ayurvedic', category: 'health', intent: 'ayurvedic products' },
  { query: 'cosmetics', category: 'health', intent: 'cosmetics' },
  { query: 'soap', category: 'health', intent: 'soap' },
  { query: 'shampoo', category: 'health', intent: 'shampoo' },
  { query: 'cream', category: 'health', intent: 'skin cream' },
  { query: 'lotion', category: 'health', intent: 'body lotion' },
  { query: 'face wash', category: 'health', intent: 'face wash' },
  { query: 'sunscreen', category: 'health', intent: 'sunscreen' },
  { query: 'toothpaste', category: 'health', intent: 'toothpaste' },
  { query: 'toothbrush', category: 'health', intent: 'toothbrush' },
  { query: 'pill', category: 'health', intent: 'pills/tablets' },
  { query: 'supplement', category: 'health', intent: 'supplements' },
  { query: 'protein', category: 'health', intent: 'protein powder' },
  { query: 'paracetamol', category: 'health', intent: 'paracetamol' },
  { query: 'bandage', category: 'health', intent: 'bandage' },
  { query: 'perfume', category: 'health', intent: 'perfume' },
  { query: 'deodorant', category: 'health', intent: 'deodorant' },
  { query: 'moisturizer', category: 'health', intent: 'moisturizer' },

  // ═══════ BABY / KIDS ═══════
  { query: 'toy', category: 'baby_kids', intent: 'toys' },
  { query: 'puzzle', category: 'baby_kids', intent: 'puzzle' },
  { query: 'doll', category: 'baby_kids', intent: 'doll' },
  { query: 'car toy', category: 'baby_kids', intent: 'toy car' },
  { query: 'bicycle', category: 'baby_kids', intent: 'bicycle' },
  { query: 'book', category: 'baby_kids', intent: 'books' },
  { query: 'pencil', category: 'baby_kids', intent: 'pencils' },
  { query: 'crayon', category: 'baby_kids', intent: 'crayons' },
  { query: 'lego', category: 'baby_kids', intent: 'lego' },
  { query: 'board game', category: 'baby_kids', intent: 'board game' },
  { query: 'stuffed animal', category: 'baby_kids', intent: 'stuffed animal' },
  { query: 'action figure', category: 'baby_kids', intent: 'action figure' },
  { query: 'baby', category: 'baby_kids', intent: 'baby products' },
  { query: 'diaper', category: 'baby_kids', intent: 'diapers' },
  { query: 'nappy', category: 'baby_kids', intent: 'nappies' },
  { query: 'stroller', category: 'baby_kids', intent: 'stroller' },
  { query: 'baby bottle', category: 'baby_kids', intent: 'baby bottle' },
  { query: 'teddy bear', category: 'baby_kids', intent: 'teddy bear' },

  // ═══════ HOME ═══════
  { query: 'pillow', category: 'home', intent: 'pillow' },
  { query: 'blanket', category: 'home', intent: 'blanket' },
  { query: 'towel', category: 'home', intent: 'towel' },
  { query: 'mug', category: 'home', intent: 'mug' },
  { query: 'plate', category: 'home', intent: 'plate' },
  { query: 'glass', category: 'home', intent: 'drinking glass' },
  { query: 'fork', category: 'home', intent: 'fork' },
  { query: 'spoon', category: 'home', intent: 'spoon' },
  { query: 'knife', category: 'home', intent: 'knife' },
  { query: 'pan', category: 'home', intent: 'cooking pan' },
  { query: 'pot', category: 'home', intent: 'cooking pot' },
  { query: 'bed sheet', category: 'home', intent: 'bed sheets' },
  { query: 'curtain', category: 'home', intent: 'curtain' },
  { query: 'carpet', category: 'home', intent: 'carpet' },
  { query: 'vase', category: 'home', intent: 'vase' },
  { query: 'lamp', category: 'home', intent: 'lamp' },
  { query: 'fan', category: 'home', intent: 'fan' },
  { query: 'iron', category: 'home', intent: 'iron/ironing' },
  { query: 'vacuum', category: 'home', intent: 'vacuum cleaner' },
  { query: 'kettle', category: 'home', intent: 'kettle' },

  // ═══════ PET ═══════
  { query: 'dog food', category: 'pet', intent: 'dog food' },
  { query: 'cat food', category: 'pet', intent: 'cat food' },
  { query: 'pet', category: 'pet', intent: 'pet supplies' },
  { query: 'bird cage', category: 'pet', intent: 'bird cage' },
  { query: 'aquarium', category: 'pet', intent: 'aquarium' },
  { query: 'pet toy', category: 'pet', intent: 'pet toy' },
  { query: 'dog leash', category: 'pet', intent: 'dog leash' },
  { query: 'cat litter', category: 'pet', intent: 'cat litter' },
  { query: 'fish tank', category: 'pet', intent: 'fish tank' },
  { query: 'bird food', category: 'pet', intent: 'bird food' },

  // ═══════ PARTY ═══════
  { query: 'decoration', category: 'party', intent: 'party decorations' },
  { query: 'gift wrap', category: 'party', intent: 'gift wrapping' },
  { query: 'ribbon', category: 'party', intent: 'ribbon' },
  { query: 'confetti', category: 'party', intent: 'confetti' },
  { query: 'party hat', category: 'party', intent: 'party hat' },
  { query: 'banner', category: 'party', intent: 'banner' },
  { query: 'streamer', category: 'party', intent: 'streamers' },
  { query: 'party popper', category: 'party', intent: 'party poppers' },
  { query: 'cake topper', category: 'party', intent: 'cake topper' },

  // ═══════ BUDGET VARIANTS (price adjectives — should NOT be in query) ═══════
  { query: 'cheap phone', category: 'budget_variants', intent: 'affordable phone' },
  { query: 'budget laptop', category: 'budget_variants', intent: 'affordable laptop' },
  { query: 'affordable shoes', category: 'budget_variants', intent: 'affordable shoes' },
  { query: 'low price camera', category: 'budget_variants', intent: 'affordable camera' },
  { query: 'best price tv', category: 'budget_variants', intent: 'affordable TV' },
  { query: 'cheap headphones', category: 'budget_variants', intent: 'affordable headphones' },
  { query: 'budget speaker', category: 'budget_variants', intent: 'affordable speaker' },
  { query: 'affordable ring', category: 'budget_variants', intent: 'affordable ring' },
  { query: 'cheap perfume', category: 'budget_variants', intent: 'affordable perfume' },
  { query: 'low price saree', category: 'budget_variants', intent: 'affordable saree' },
  { query: 'cheap shirt', category: 'budget_variants', intent: 'affordable shirt' },
  { query: 'budget watch', category: 'budget_variants', intent: 'affordable watch' },

  // ═══════ VERIFIED EXISTING (from server.ts line 101) ═══════
  { query: 'arrack', category: 'verified_existing', intent: 'arrack liquor' },
  { query: 'book', category: 'verified_existing', intent: 'books' },
  { query: 'grocery', category: 'verified_existing', intent: 'grocery' },

  // ═══════ DEAD QUERIES (known to fail) ═══════
  { query: 'electronics', category: 'dead_queries', intent: 'electronics (category-level)' },
  { query: 'groceries', category: 'dead_queries', intent: 'groceries (category-level)' },
  { query: 'clothes', category: 'dead_queries', intent: 'clothes' },
  { query: 'food', category: 'dead_queries', intent: 'food' },
  { query: 'accessories', category: 'dead_queries', intent: 'accessories' },
  { query: 'home', category: 'dead_queries', intent: 'home items' },
  { query: 'kitchen', category: 'dead_queries', intent: 'kitchen items' },
  { query: 'beauty', category: 'dead_queries', intent: 'beauty products' },
  { query: 'sports', category: 'dead_queries', intent: 'sports equipment' },
  { query: 'automobile', category: 'dead_queries', intent: 'automobile parts' },
];

// ─── Relevance Rules ─────────────────────────────────────────────────────────
// Determines if a returned product name is relevant to the search intent.

function isRelevant(productName: string, intent: string): boolean {
  const name = productName.toLowerCase();
  const intentLower = intent.toLowerCase();

  // Direct substring match
  if (name.includes(intentLower)) return true;

  // Intent-to-product keyword mapping for relevance checks
  const RELEVANCE_MAP: Record<string, string[]> = {
    'smartphone': ['phone', 'mobile', 'smartphone', 'android', 'iphone', 'galaxy', 'redmi', 'samsung', 'oppo', 'vivo', 'realme', 'xiaomi', 'nokia', 'oneplus'],
    'laptop computer': ['laptop', 'notebook', 'chromebook', 'macbook', 'thinkpad'],
    'tablet device': ['tablet', 'ipad', 'tab'],
    'headphones': ['headphone', 'headset', 'over-ear', 'on-ear'],
    'earbuds/earphones': ['earphone', 'earbud', 'tws', 'wireless ear'],
    'speaker': ['speaker', 'soundbar', 'subwoofer'],
    'bluetooth speaker': ['bluetooth speaker', 'portable speaker', 'wireless speaker'],
    'phone charger': ['charger', 'charging', 'power adapter'],
    'charging cable': ['cable', 'charging cable', 'usb cable', 'lightning', 'type-c', 'micro usb'],
    'cable': ['cable', 'wire', 'cord', 'hdmi', 'usb'],
    'camera': ['camera', 'gopro', 'canon', 'nikon', 'sony alpha', 'dslr', 'mirrorless'],
    'smartwatch': ['smartwatch', 'smart watch', 'fitness band', 'fitness tracker', 'mi band'],
    'television': ['tv', 'television', 'smart tv', 'led tv', 'android tv'],
    'computer monitor': ['monitor', 'display', 'screen'],
    'keyboard': ['keyboard', 'mechanical keyboard', 'wireless keyboard'],
    'computer mouse': ['mouse', 'gaming mouse', 'wireless mouse', 'optical mouse'],
    'printer': ['printer', 'inkjet', 'laser printer', 'all-in-one'],
    'power bank': ['power bank', 'portable charger', 'powerbank'],
    'USB device': ['usb', 'flash drive', 'thumb drive'],
    'mouse pad': ['mouse pad', 'mousepad', 'desk mat'],
    'screen protector': ['screen protector', 'tempered glass', 'screen guard'],
    'phone case': ['phone case', 'case', 'cover', 'back cover'],
    'headset': ['headset', 'headphone', 'earphone', 'gaming headset'],
    'webcam': ['webcam', 'web camera', 'usb camera'],
    'microphone': ['microphone', 'mic', 'condenser mic', 'lapel mic'],
    'USB flash drive': ['flash drive', 'usb drive', 'pen drive', 'thumb drive'],
    'memory card': ['memory card', 'sd card', 'microsd', 'tf card'],

    'rice': ['rice', 'basmati', 'samba', 'keeri', ' Nadu', 'white rice'],
    'basmati rice': ['basmati'],
    'sugar': ['sugar', 'white sugar', 'brown sugar'],
    'onion': ['onion', 'lounu', 'red onion'],
    'tomato': ['tomato'],
    'chicken': ['chicken'],
    'fish': ['fish', 'tuna', 'salmon', 'prawn', 'shrimp'],
    'milk': ['milk', 'fresh milk', 'full cream'],
    'curd/yogurt': ['curd', 'yogurt', 'yoghurt'],
    'bread': ['bread', 'toast', 'bun', 'roll'],
    'cooking oil': ['oil', 'coconut oil', 'sunflower oil', 'olive oil', 'vegetable oil'],
    'coconut oil': ['coconut oil'],
    'salt': ['salt', 'sea salt'],
    'pepper': ['pepper', 'black pepper', 'white pepper'],
    'tea': ['tea', 'green tea', 'black tea', 'cinnamon tea', 'herbal tea'],
    'coffee': ['coffee', 'instant coffee', 'coffee powder'],
    'biscuit/cookies': ['biscuit', 'cookie', 'cookies', 'cracker'],
    'noodles': ['noodle', 'noodles', 'instant noodle', 'pasta'],
    'dal/lentils': ['dal', 'lentil', 'dhal', 'parippu'],
    'flour': ['flour', 'atta', 'maida'],
    'eggs': ['egg', 'eggs'],
    'cheese': ['cheese', 'cheddar', 'mozzarella'],
    'butter': ['butter'],
    'honey': ['honey'],
    'jam': ['jam', 'marmalade', 'spread'],
    'juice': ['juice', 'fruit juice', 'squash'],
    'bottled water': ['water', 'mineral water', 'drinking water'],
    'yoghurt': ['yoghurt', 'yogurt', 'curd'],
    'ice cream': ['ice cream', 'icecream', 'gelato'],
    'chilli': ['chilli', 'chili', 'pepper'],
    'ginger': ['ginger'],
    'garlic': ['garlic'],
    'potato': ['potato'],
    'carrot': ['carrot'],
    'cabbage': ['cabbage'],
    'banana': ['banana'],
    'apple': ['apple'],
    'orange': ['orange'],
    'mango': ['mango'],
    'fruits': ['fruit', 'fruits', 'apple', 'banana', 'orange', 'mango', 'papaya', 'pineapple'],
    'vegetables': ['vegetable', 'vegetables', 'onion', 'tomato', 'potato', 'carrot'],
    'grocery items': ['grocery', 'groceries', 'food', 'supermarket'],
    'spices': ['spice', 'spices', 'turmeric', 'cinnamon', 'cardamom'],
    'masala spices': ['masala', 'curry powder', 'spice'],
    'sauce': ['sauce', 'soy sauce', 'chilli sauce'],
    'ketchup': ['ketchup', 'tomato sauce'],
    'vinegar': ['vinegar'],

    'chocolates': ['chocolate', 'choc', 'truffle', 'praline'],
    'cake': ['cake', 'cupcake', 'cheesecake', 'gateau', 'bento cake'],
    'birthday cake': ['birthday cake', 'cake'],
    'roses/flowers': ['rose', 'roses', 'flower', 'bouquet', 'lily', 'orchid'],
    'flowers': ['flower', 'flowers', 'rose', 'lily', 'orchid', 'bouquet'],
    'flower bouquet': ['bouquet', 'flower', 'arrangement'],
    'gift hamper': ['hamper', 'basket', 'gift set'],
    'teddy bear': ['teddy', 'bear', 'stuffed', 'plush'],
    'plush toy': ['plush', 'stuffed', 'soft toy', 'plushie'],
    'balloons': ['balloon', 'balloons'],
    'candles': ['candle', 'candles', 'scented candle', 'birthday candle'],
    'ring/jewelry': ['ring', 'band', 'jewel'],
    'necklace': ['necklace', 'pendant', 'chain'],
    'bracelet': ['bracelet', 'bangle', 'wrist band'],
    'perfume': ['perfume', 'eau de', 'fragrance', 'cologne', 'deodorant'],
    'cologne': ['cologne', 'eau de', 'fragrance'],
    'jewelry': ['jewel', 'jewellery', 'jewelry', 'gold', 'silver', 'diamond'],
    'gift items': ['gift', 'present', 'hamper'],
    'greeting card': ['card', 'greeting', 'birthday card'],
    'wine': ['wine', 'red wine', 'white wine'],
    'beer': ['beer', 'lager', 'stout', 'pilsner'],
    'arrack': ['arrack', 'arrak'],
    'whisky': ['whisky', 'whiskey', 'scotch'],
    'fruit basket': ['fruit basket', 'fruit hamper'],
    'gift set': ['gift set', 'gift box', 'combo'],
    'surprise gift': ['surprise', 'mystery', 'random'],
    'anniversary gift': ['anniversary'],
    'valentine gift': ['valentine', 'heart', 'love'],
    'personalized gift': ['personalized', 'custom', 'engraved', 'name'],

    'shirt': ['shirt', 'formal shirt', 'casual shirt', 'polo shirt'],
    'dress': ['dress', 'gown', 'maxi', 'midi'],
    'saree': ['saree', 'sari'],
    'shoes': ['shoe', 'shoes', 'sneaker', 'formal shoe', 'sandal'],
    'sandals': ['sandal', 'sandals', 'slipper'],
    't-shirt': ['t-shirt', 'tshirt', 'tee'],
    'jeans': ['jeans', 'denim'],
    'jacket': ['jacket', 'coat', 'blazer'],
    'hat': ['hat', 'cap', 'beret'],
    'socks': ['sock', 'socks'],
    'trousers': ['trouser', 'trousers', 'pant', 'pants'],
    'shorts': ['short', 'shorts'],
    'skirt': ['skirt'],
    'sweater': ['sweater', 'pullover', 'hoodie'],
    'blouse': ['blouse'],
    'kurta': ['kurta', 'kurti'],
    'suit': ['suit', 'blazer'],
    'tie': ['tie', 'necktie', 'bow tie'],
    'cap': ['cap', 'baseball cap'],
    'slippers': ['slipper', 'slippers', 'flip flop'],
    'sneakers': ['sneaker', 'sneakers', 'running shoe'],
    'fashion items': ['fashion', 'clothing', 'apparel', 'wear'],

    'vitamin supplements': ['vitamin', 'vitamins', 'supplement'],
    'medicine': ['medicine', 'medication', 'tablet', 'syrup'],
    'ayurvedic products': ['ayurvedic', 'ayurveda', 'herbal'],
    'cosmetics': ['cosmetic', 'cosmetics', 'makeup', 'make-up'],
    'soap': ['soap', 'bath soap', 'body wash'],
    'shampoo': ['shampoo', 'hair wash'],
    'skin cream': ['cream', 'moisturizing cream', 'face cream'],
    'body lotion': ['lotion', 'body lotion', 'moisturizer'],
    'face wash': ['face wash', 'facial cleanser'],
    'sunscreen': ['sunscreen', 'sun block', 'spf'],
    'toothpaste': ['toothpaste', 'dental cream'],
    'toothbrush': ['toothbrush', 'electric toothbrush'],
    'pills/tablets': ['pill', 'tablet', 'capsule'],
    'supplements': ['supplement', 'multivitamin', 'protein'],
    'protein powder': ['protein', 'whey', 'protein powder'],
    'paracetamol': ['paracetamol', 'panadol', 'acetaminophen'],
    'bandage': ['bandage', 'plaster', 'gauze'],
    'deodorant': ['deodorant', 'deodarant'],
    'moisturizer': ['moisturizer', 'moisturiser', 'cream'],

    'toys': ['toy', 'toys', 'play'],
    'puzzle': ['puzzle', 'jigsaw'],
    'doll': ['doll', 'barbie'],
    'toy car': ['car', 'toy car', 'model car', 'remote control car'],
    'bicycle': ['bicycle', 'bike', 'cycle'],
    'books': ['book', 'books', 'novel', 'textbook'],
    'pencils': ['pencil', 'pencils', 'colour pencil'],
    'crayons': ['crayon', 'crayons', 'wax crayon'],
    'lego': ['lego', 'building blocks'],
    'board game': ['board game', 'chess', 'monopoly'],
    'stuffed animal': ['stuffed', 'plush', 'soft toy'],
    'action figure': ['action figure', 'figurine'],
    'baby products': ['baby', 'infant', 'toddler'],
    'diapers': ['diaper', 'nappy'],
    'nappies': ['nappy', 'nappies', 'diaper'],
    'stroller': ['stroller', 'pram', 'pushchair'],
    'baby bottle': ['baby bottle', 'feeding bottle'],

    'pillow': ['pillow', 'cushion'],
    'blanket': ['blanket', 'quilt', 'throw'],
    'towel': ['towel', 'bath towel', 'hand towel'],
    'mug': ['mug', 'coffee mug', 'teacup'],
    'plate': ['plate', 'dish', 'dinner plate'],
    'drinking glass': ['glass', 'tumbler', 'drinking glass'],
    'fork': ['fork', 'dining fork'],
    'spoon': ['spoon', 'teaspoon', 'tablespoon'],
    'knife': ['knife', 'kitchen knife', 'butter knife'],
    'cooking pan': ['pan', 'frying pan', 'skillet', 'wok'],
    'cooking pot': ['pot', 'cooking pot', 'pressure cooker'],
    'bed sheets': ['bed sheet', 'bedsheet', 'sheet'],
    'curtain': ['curtain', 'drapes'],
    'carpet': ['carpet', 'rug', 'mat'],
    'vase': ['vase', 'flower vase'],
    'lamp': ['lamp', 'lantern', 'desk lamp'],
    'fan': ['fan', 'ceiling fan', 'table fan'],
    'iron/ironing': ['iron', 'steam iron', 'iron box'],
    'vacuum cleaner': ['vacuum', 'cleaner', 'sweeper'],
    'kettle': ['kettle', 'electric kettle'],

    'dog food': ['dog food', 'dog feed', 'canine'],
    'cat food': ['cat food', 'cat feed', 'feline'],
    'pet supplies': ['pet', 'animal', 'dog', 'cat', 'fish', 'bird'],
    'bird cage': ['bird cage', 'cage', 'aviary'],
    'aquarium': ['aquarium', 'fish tank'],
    'pet toy': ['pet toy', 'dog toy', 'cat toy'],
    'dog leash': ['leash', 'lead', 'dog lead'],
    'cat litter': ['cat litter', 'litter'],
    'fish tank': ['fish tank', 'aquarium'],
    'bird food': ['bird food', 'bird seed', 'bird feed'],

    'party decorations': ['decoration', 'decor', 'decorative', 'party'],
    'gift wrapping': ['gift wrap', 'wrapping', 'wrapping paper'],
    'ribbon': ['ribbon', 'bow', 'ribbon bow'],
    'confetti': ['confetti'],
    'party hat': ['party hat', 'birthday hat'],
    'banner': ['banner', 'bunting'],
    'streamers': ['streamer', 'streamers'],
    'party poppers': ['party popper', 'popper'],
    'cake topper': ['cake topper', 'topper'],

    'affordable phone': ['phone', 'mobile', 'smartphone'],
    'affordable laptop': ['laptop', 'notebook'],
    'affordable shoes': ['shoe', 'shoes', 'sandal'],
    'affordable camera': ['camera'],
    'affordable TV': ['tv', 'television'],
    'affordable headphones': ['headphone', 'earphone', 'headset'],
    'affordable speaker': ['speaker'],
    'affordable ring': ['ring', 'band'],
    'affordable perfume': ['perfume', 'fragrance', 'cologne'],
    'affordable saree': ['saree', 'sari'],
    'affordable shirt': ['shirt'],
    'affordable watch': ['watch', 'smartwatch'],
  };

  const keywords = RELEVANCE_MAP[intentLower] || [intentLower];
  return keywords.some(kw => name.includes(kw));
}

// Accessory patterns — products that look like the query keyword but are accessories
const ACCESSORY_PATTERNS = [
  /case/i, /cover/i, /holder/i, /pouch/i, /bag/i, /sleeve/i,
  /charger/i, /cable/i, /adapter/i, /cord/i,
  /sticker/i, /skin/i, /film/i, /protector/i,
  /stand/i, /mount/i, /bracket/i,
  /cleaner/i, /wipes/i,
];

function isAccessory(productName: string): boolean {
  return ACCESSORY_PATTERNS.some(pat => pat.test(productName));
}

// ─── Main Test Runner ────────────────────────────────────────────────────────

interface SearchResult {
  query: string;
  category: string;
  intent: string;
  resultCount: number;
  firstProductName: string;
  firstProductPrice: number;
  firstProductCategory: string;
  secondProductName: string;
  thirdProductName: string;
  isRelevant: boolean;
  isAccessory: boolean;
  status: 'PERFECT' | 'GOOD' | 'ACCESSORY' | 'IRRELEVANT' | 'ZERO_RESULTS' | 'ERROR';
  error?: string;
}

async function testQuery(testQuery: TestQuery): Promise<SearchResult> {
  const defaultResult: SearchResult = {
    query: testQuery.query,
    category: testQuery.category,
    intent: testQuery.intent,
    resultCount: 0,
    firstProductName: '',
    firstProductPrice: 0,
    firstProductCategory: '',
    secondProductName: '',
    thirdProductName: '',
    isRelevant: false,
    isAccessory: false,
    status: 'ERROR',
  };

  try {
    const result = await callMcpTool('kapruka_search_products', {
      q: testQuery.query,
      limit: 3,
      in_stock_only: true,
      response_format: 'json',
    });

    // Handle both array and { results: [...] } shapes
    let items: any[] = [];
    if (Array.isArray(result)) {
      items = result;
    } else if (result && typeof result === 'object') {
      items = result.results || result.products || [];
    }

    const count = items.length;
    const first = items[0] || {};
    const second = items[1] || {};
    const third = items[2] || {};

    const firstProduct = first.name || '';
    const firstPrice = first.price?.amount ?? first.price_lkr ?? first.price ?? 0;
    const firstCategory = first.category?.name || first.category || '';

    const relevant = count > 0 && isRelevant(firstProduct, testQuery.intent);
    const accessory = count > 0 && isAccessory(firstProduct);

    let status: SearchResult['status'] = 'ZERO_RESULTS';
    if (count === 0) {
      status = 'ZERO_RESULTS';
    } else if (relevant && !accessory) {
      status = 'PERFECT';
    } else if (relevant && accessory) {
      status = 'ACCESSORY';
    } else if (accessory) {
      status = 'ACCESSORY';
    } else {
      status = 'IRRELEVANT';
    }

    return {
      ...defaultResult,
      resultCount: count,
      firstProductName: firstProduct,
      firstProductPrice: firstPrice,
      firstProductCategory: firstCategory,
      secondProductName: second.name || '',
      thirdProductName: third.name || '',
      isRelevant: relevant,
      isAccessory: accessory,
      status,
    };
  } catch (err: any) {
    return {
      ...defaultResult,
      status: 'ERROR',
      error: err.message?.substring(0, 100) || 'unknown',
    };
  }
}

function escapeCsv(val: string | number): string {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  MCP SEARCH QUALITY TEST — Kapruka Product Search          ║`);
  console.log(`║  Queries: ${QUERIES.length.toString().padEnd(4)}                                        ║`);
  console.log(`║  Rate limit: ${RATE_LIMIT_MS}ms between requests                     ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

  const results: SearchResult[] = [];
  let completed = 0;

  for (const query of QUERIES) {
    completed++;
    const pct = Math.round((completed / QUERIES.length) * 100);
    process.stdout.write(`\r  [${pct.toString().padStart(3)}%] Testing "${query.query}" (${completed}/${QUERIES.length})...`);

    const result = await testQuery(query);
    results.push(result);

    // Log notable results
    if (result.status === 'ZERO_RESULTS') {
      console.log(`\n    ⚠  "${query.query}" → 0 results (${query.intent})`);
    } else if (result.status === 'ACCESSORY') {
      console.log(`\n    🔄 "${query.query}" → ACCESSORY: "${result.firstProductName}" (${query.intent})`);
    } else if (result.status === 'IRRELEVANT') {
      console.log(`\n    ✗  "${query.query}" → IRRELEVANT: "${result.firstProductName}" (${query.intent})`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log('\n');

  // ─── Write CSV ─────────────────────────────────────────────────────────────
  const header = [
    'query', 'category', 'intent', 'result_count',
    'first_product_name', 'first_product_price', 'first_product_category',
    'second_product_name', 'third_product_name',
    'is_relevant', 'is_accessory', 'status', 'error'
  ].join(',');

  const rows = results.map(r => [
    escapeCsv(r.query),
    escapeCsv(r.category),
    escapeCsv(r.intent),
    r.resultCount,
    escapeCsv(r.firstProductName),
    r.firstProductPrice,
    escapeCsv(r.firstProductCategory),
    escapeCsv(r.secondProductName),
    escapeCsv(r.thirdProductName),
    r.isRelevant,
    r.isAccessory,
    r.status,
    escapeCsv(r.error || ''),
  ].join(','));

  mkdirSync(dirname(CSV_PATH), { recursive: true });
  writeFileSync(CSV_PATH, [header, ...rows].join('\n'));

  // ─── Print Summary ─────────────────────────────────────────────────────────
  const perfect = results.filter(r => r.status === 'PERFECT');
  const good = results.filter(r => r.status === 'GOOD');
  const accessory = results.filter(r => r.status === 'ACCESSORY');
  const irrelevant = results.filter(r => r.status === 'IRRELEVANT');
  const zeroResults = results.filter(r => r.status === 'ZERO_RESULTS');
  const errors = results.filter(r => r.status === 'ERROR');

  console.log('═'.repeat(70));
  console.log('  MCP SEARCH QUALITY TEST — SUMMARY');
  console.log('═'.repeat(70));
  console.log(`  Total queries tested:  ${results.length}`);
  console.log(`  ✅ PERFECT:            ${perfect.length} (${Math.round(perfect.length / results.length * 100)}%)`);
  console.log(`  🔄 ACCESSORY:          ${accessory.length} (${Math.round(accessory.length / results.length * 100)}%)`);
  console.log(`  ✗  IRRELEVANT:         ${irrelevant.length} (${Math.round(irrelevant.length / results.length * 100)}%)`);
  console.log(`  ⚠  ZERO RESULTS:       ${zeroResults.length} (${Math.round(zeroResults.length / results.length * 100)}%)`);
  if (errors.length > 0) {
    console.log(`  ❌ ERROR:              ${errors.length} (${Math.round(errors.length / results.length * 100)}%)`);
  }
  console.log('═'.repeat(70));

  // Per-category breakdown
  const categories = [...new Set(results.map(r => r.category))];
  console.log('\n  Per-Category Success Rate:');
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catPerfect = catResults.filter(r => r.status === 'PERFECT').length;
    const catOk = catResults.filter(r => ['PERFECT', 'GOOD'].includes(r.status)).length;
    const bar = '█'.repeat(Math.round(catOk / catResults.length * 20));
    const pad = '░'.repeat(20 - bar.length);
    console.log(`    ${cat.padEnd(20)} ${bar}${pad} ${catOk}/${catResults.length} (${Math.round(catOk / catResults.length * 100)}%)`);
  }

  // Dead queries
  if (zeroResults.length > 0) {
    console.log('\n  Queries returning 0 results:');
    for (const r of zeroResults) {
      console.log(`    ⚠  "${r.query}" → intended: ${r.intent}`);
    }
  }

  // Accessory results
  if (accessory.length > 0) {
    console.log('\n  Queries returning accessories instead of main product:');
    for (const r of accessory) {
      console.log(`    🔄 "${r.query}" → got: "${r.firstProductName}"`);
    }
  }

  console.log(`\n📄 CSV report → ${CSV_PATH}\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
