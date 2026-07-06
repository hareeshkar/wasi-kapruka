-- Wasi Multi-Currency Migration — paste into Supabase SQL Editor → Run
-- Adds currency support to cart_items + user_profiles.
-- Safe to run multiple times (IF NOT EXISTS).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. cart_items: add currency column (default LKR for existing rows)
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'cart_items'
    AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.cart_items ADD COLUMN currency text NOT NULL DEFAULT 'LKR';
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. user_profiles: add preferred_currency column
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS preferred_currency text
  CHECK (preferred_currency IN ('LKR','USD','GBP','AUD','EUR'));

COMMENT ON COLUMN public.user_profiles.preferred_currency IS
  'User''s preferred display currency. NULL = use LKR (Sri Lankan Rupee). Supported: LKR, USD, GBP, AUD, EUR.';
