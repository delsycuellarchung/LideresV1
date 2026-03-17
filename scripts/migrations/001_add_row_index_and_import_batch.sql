-- Add columns to preserve upload order for evaluators
ALTER TABLE IF EXISTS evaluators
  ADD COLUMN IF NOT EXISTS row_index integer;

ALTER TABLE IF EXISTS evaluators
  ADD COLUMN IF NOT EXISTS import_batch text;

-- Optional index to speed up ordered queries
CREATE INDEX IF NOT EXISTS idx_evaluators_import_batch_row_index ON evaluators (import_batch, row_index);

-- NOTE: Run this migration with a DB user that has ALTER privileges (service role / admin).
