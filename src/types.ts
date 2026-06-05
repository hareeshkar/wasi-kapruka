export interface Product {
  product_code: string;
  name: string;
  price_lkr: number;
  category: string;
  image_url: string;
  description?: string;
  stock_level?: string;
  variants?: Array<ProductVariant>;
}

export interface ProductVariant {
  id: string;
  name: string;
  price_lkr: number;
  stock_level?: string;
}

export interface CartItem {
  product_code: string;
  name: string;
  price_lkr: number;
  image_url: string;
  quantity: number;
  category?: string;
  variant_id?: string;
  variant_name?: string;
}

export interface City {
  name: string;
  code: string;
  aliases: string[];
}

export interface DeliveryCheckResult {
  available: boolean;
  delivery_fee: number;
  perishable_warning: boolean;
  notes: string;
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
  tracking_result?: any;
  order_intent?: OrderIntent;
}
