-- Migration: 004_add_expires_at.sql
-- Add an optional expiration timestamp to form_submissions so responses can be rejected after that date.
-- Target DB: PostgreSQL (Supabase)

-- ===== UP =====
BEGIN;

-- Add column if it doesn't exist
ALTER TABLE public.form_submissions
ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

-- Optional index to speed up queries that filter by expires_at (e.g. find expired rows)
CREATE INDEX IF NOT EXISTS idx_form_submissions_expires_at ON public.form_submissions (expires_at);

COMMIT;

-- ===== Examples / Notes =====
-- Backfill example: set expiration 30 days after creation for existing pending submissions
-- UPDATE public.form_submissions
-- SET expires_at = created_at + interval '30 days'
-- WHERE status = 'pending' AND expires_at IS NULL;

-- If you prefer explicit timestamps for a subset, run an UPDATE with specific tokens or conditions.

-- ===== DOWN / ROLLBACK =====
-- To rollback this migration:
-- BEGIN;
-- DROP INDEX IF EXISTS idx_form_submissions_expires_at;
-- ALTER TABLE public.form_submissions DROP COLUMN IF EXISTS expires_at;
-- COMMIT;
