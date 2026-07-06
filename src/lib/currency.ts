/**
 * src/lib/currency.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Currency-Aware Price Formatting for Wasi Concierge
 *
 * Kapruka MCP supports 5 currencies: LKR, USD, GBP, AUD, EUR.
 * The MCP handles conversion server-side — pass currency param to search/detail
 * and the amount comes back converted. This utility formats the display.
 *
 * Verified via live MCP calls (2026-07-06):
 *   - currency=USD → price = 12.96 USD
 *   - currency=GBP → price = 9.66 GBP
 *   - currency=EUR → price = 11.17 EUR
 *   - currency=AUD → price = 18.27 AUD
 *   - currency=CAD → ERROR: invalid_currency (NOT supported)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Currency = 'LKR' | 'USD' | 'GBP' | 'AUD' | 'EUR';

export const SUPPORTED_CURRENCIES: Currency[] = ['LKR', 'USD', 'GBP', 'AUD', 'EUR'];

const CURRENCY_CONFIG: Record<Currency, { symbol: string; prefix: boolean; locale: string; name: string }> = {
  LKR: { symbol: 'Rs.', prefix: true, locale: 'en-LK', name: 'Sri Lankan Rupee' },
  USD: { symbol: '$', prefix: true, locale: 'en-US', name: 'US Dollar' },
  GBP: { symbol: '£', prefix: true, locale: 'en-GB', name: 'British Pound' },
  AUD: { symbol: 'A$', prefix: true, locale: 'en-AU', name: 'Australian Dollar' },
  EUR: { symbol: '€', prefix: true, locale: 'de-DE', name: 'Euro' },
};

/**
 * Format a price with the correct currency symbol and locale formatting.
 *
 * @param amount - The numeric price amount
 * @param currency - The currency code (LKR, USD, GBP, etc.)
 * @param options - Optional formatting options
 * @returns Formatted price string (e.g. "£3.45", "Rs. 1,250")
 *
 * @example
 * formatPrice(3.45, 'GBP')   // "£3.45"
 * formatPrice(1250, 'LKR')   // "Rs. 1,250"
 * formatPrice(4.99, 'USD')   // "$4.99"
 */
export function formatPrice(amount: number, currency: Currency = 'LKR', options?: { compact?: boolean }): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.LKR;

  // Determine decimal places: LKR typically has no decimals, others do
  const decimals = currency === 'LKR' ? 0 : 2;

  // Format the number with locale-specific thousands separator
  const formatted = amount.toLocaleString(config.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (config.prefix) {
    return `${config.symbol}${formatted}`;
  }
  return `${formatted} ${config.symbol}`;
}

/**
 * Get the currency symbol for a given currency code.
 *
 * @example
 * getCurrencySymbol('GBP')  // "£"
 * getCurrencySymbol('LKR')  // "Rs."
 */
export function getCurrencySymbol(currency: Currency = 'LKR'): string {
  return CURRENCY_CONFIG[currency]?.symbol ?? 'Rs.';
}

/**
 * Get the currency display name.
 *
 * @example
 * getCurrencyName('GBP')  // "British Pound"
 */
export function getCurrencyName(currency: Currency = 'LKR'): string {
  return CURRENCY_CONFIG[currency]?.name ?? 'Sri Lankan Rupee';
}

/**
 * Detect currency from a product or price object.
 * Priority: explicit currency field > passed currency > default LKR.
 *
 * @param obj - Object that may contain a currency field
 * @param fallback - Fallback currency if not found
 */
export function detectCurrency(obj: any, fallback: Currency = 'LKR'): Currency {
  const raw = obj?.currency || obj?.price?.currency || fallback;
  return (SUPPORTED_CURRENCIES.includes(raw) ? raw : fallback) as Currency;
}
