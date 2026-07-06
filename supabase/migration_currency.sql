-- Wasi Currency Migration — paste into Supabase SQL Editor → Run
-- Adds currency column to cart_items table for multi-currency support.

-- Add currency column (default LKR for existing rows)
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
