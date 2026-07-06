export interface ProductAttributes {
  type?: string;
  subtype?: string;
  weight?: string;
  vendor?: string;
}

export interface ProductShipping {
  ships_from?: string;
  ships_internationally?: boolean;
  restricted_countries?: string[];
}

export interface Product {
  product_code: string;        // MCP field: `id`
  name: string;
  price_lkr: number;           // MCP field: `price.amount`
  compare_at_price?: number;   // MCP field: `compare_at_price.amount` — original before sale
  category: string;            // MCP field: `category.name`
  image_url: string;
  description?: string;        // MCP field: `description` (T2) or `summary` (T1)
  summary?: string;            // MCP field: `summary` — shorter preview text
  stock_level?: string;        // "low" | "medium" | "high"
  in_stock?: boolean;          // MCP field: `in_stock`
  variants?: Array<ProductVariant>;
  url?: string;                // MCP field: `url` — direct Kapruka product page link
  images?: string[];           // MCP field: `images[]` (T2) — 2-4 CDN URLs for gallery
  attributes?: ProductAttributes;  // MCP field: `attributes` (T2) — weight, vendor, type
  shipping?: ProductShipping;      // MCP field: `shipping` (T2) — ships_from, international
  currency?: string;           // MCP currency parameter — LKR, USD, GBP, AUD, EUR
  rating?: number | null;      // MCP field: `rating`
}

export interface ProductVariant {
  id: string;
  name: string;
  price_lkr: number;
  currency?: string;
  stock_level?: string;
  sku?: string;
  in_stock?: boolean;
  attributes?: { weight?: string };
}

export interface CartItem {
  product_code: string;
  name: string;
  price_lkr: number;
  currency?: string;
  image_url: string;
  quantity: number;
  category?: string;
  variant_id?: string;
  variant_name?: string;
}

export interface City {
  name: string;
  code?: string;
  aliases?: string[];
  url?: string;
}

export interface DeliveryCheckResult {
  available: boolean;
  rate: number;                  // MCP field name — always LKR
  delivery_fee?: number;         // server-patched alias (rate → delivery_fee)
  currency: string;              // MCP returns "LKR"
  perishable_warning: boolean | null;
  notes?: string;                // not returned by MCP, optional
  next_available_date?: string;
}

export interface Order {
  order_ref: string;
  order_id: string;
  pay_url: string;
  total_lkr: number;
  expires_at: string;
  summary?: {
    items_total: number;
    delivery_fee: number;
    addons_total: number;
    currency: string;
    grand_total: number;
  };
}

export interface OrderIntent {
  recipient_name?: string;
  recipient_phone?: string;
  city_name?: string;
  city_code?: string;
  delivery_address?: string;
  gift_message?: string;
  delivery_date?: string;
  occasion?: string;
  sender_name?: string;
  // sender_email omitted: MCP rejects it; Kapruka collects email at checkout
  location_type?: 'house' | 'apartment' | 'office' | 'other';
  delivery_instructions?: string;  // max 250 chars; gate codes, buzzer, access notes
  anonymous?: boolean;             // hide sender name on Kapruka gift card
  currency?: 'LKR' | 'USD' | 'GBP' | 'AUD' | 'EUR';
  order_mode?: 'gift' | 'self';    // "it's a gift" (default) vs "it's for me"
}

export interface Category {
  name: string;
  url?: string;
  children?: Array<{ name: string; url?: string }>;
}

export interface TrackingProgressStep {
  step?: string;
  event?: string;
  timestamp: string;
}

export interface TrackingRecipient {
  name?: string;
  city?: string;
  phone?: string;
  address?: string;
}

export interface OrderTrackingData {
  order_number?: string;
  status?: string;
  status_display?: string;
  comments?: string;
  progress?: TrackingProgressStep[];
  timeline?: TrackingProgressStep[];
  recipient?: TrackingRecipient;
  amount?: { value: string | number; currency: string };
  items?: Array<{ product_code?: string; name: string; quantity?: number }>;
  order_date?: string;
  delivery_date?: string;
  shipped_date?: string;
  greeting_message?: string;
  special_instructions?: string;
  has_delivery_photo?: boolean;
  has_delivery_video?: boolean;
  live_tracking_available?: boolean;
  pnref?: string;
  payment_method?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  products?: Product[];
  city_suggest?: City[];
  checking_delivery?: boolean;
  delivery_checked?: DeliveryCheckResult;
  order_created?: Order;
  tracking_result?: OrderTrackingData;
  order_intent?: OrderIntent;
  /** Pagination state from the last product search — lets "show me more"
   *  continue from page 2 instead of repeating page 1. */
  search_cursor?: { q: string; cursor: string } | null;
  /** Products selected for side-by-side comparison. */
  compare_products?: Product[];
  /** Category tree from kapruka_list_categories. */
  categories?: Category[];
  /** If set, renders as subcategory list view. */
  parentCategory?: string;
  /** Product detail for inline display (triggered by LLM). */
  product_detail?: Product;
  /** Images uploaded with this message (Gemini vision). */
  uploaded_images?: Array<{ data: string; mimeType: string }>;
  /** Voice message audio (base64-encoded). */
  audio_data?: string;
  /** MIME type of the audio (e.g. 'audio/webm'). */
  audio_mime_type?: string;
  /** Transcription text shown below voice bubble (display only). */
  transcription?: string;
  /** Error state for failed messages — enables Retry button. */
  error?: {
    message: string;
    category: string;
    isRetryable: boolean;
    retryAfterMs?: number;
  };
  /** Flag to indicate this message is being retried. */
  isRetrying?: boolean;
}
