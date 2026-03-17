-- Backfill `row_index` for existing rows grouped by import_batch
-- This sets row_index starting at 0 per import_batch, ordering by `id` as proxy for existing insertion order.

WITH numbered AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (PARTITION BY import_batch ORDER BY id) - 1) AS rn
  FROM evaluators
)
UPDATE evaluators
SET row_index = numbered.rn
FROM numbered
WHERE evaluators.id = numbered.id;

-- Run this in Supabase SQL editor or psql as a privileged user.
