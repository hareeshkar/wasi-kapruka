-- Migration: Add preferred_currency to user_profiles
-- Safe to run multiple times (IF NOT EXISTS)

-- 1. Add preferred_currency column
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS preferred_currency text
  CHECK (preferred_currency IN ('LKR','USD','GBP','AUD','EUR'));

-- 2. Backfill existing rows with NULL (no default — NULL means "unset, use LKR")
-- This is safe: existing queries already fall back to LKR via COALESCE / ?? 'LKR'

-- 3. Add a comment for documentation
COMMENT ON COLUMN public.user_profiles.preferred_currency IS
  'User''s preferred display currency. NULL = use LKR (Sri Lankan Rupee). Supported: LKR, USD, GBP, AUD, EUR.';
