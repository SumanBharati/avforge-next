-- Widen the "already in the AVGenix Library" duplicate rule from
-- (manufacturer, model_name) to (manufacturer, model_name, part_number), so
-- two entries with the same manufacturer/model but a different part number
-- (a regional SKU, a hardware revision) can both exist, while an exact match
-- on all three still counts as a duplicate — case-insensitively: "Extron
-- DTP" and "extron dtp" are the same product.
--
-- Case-insensitive comparison needs lower(...) on each column, but a plain
-- UNIQUE constraint can't express that, and PostgREST's upsert (used by the
-- bulk product importers) resolves ON CONFLICT by literal column name — it
-- can't target an expression like lower(manufacturer) directly. So the
-- lowercased/trimmed values are stored in generated columns and the
-- constraint (and importer upserts) target those instead. Coalescing
-- part_number to '' in its generated column also closes the gap a plain
-- UNIQUE constraint would otherwise leave: Postgres treats NULL as distinct
-- from any other NULL, so without this, two rows sharing a manufacturer and
-- model but both with no part number would not be caught as duplicates.
ALTER TABLE av_products
  DROP CONSTRAINT IF EXISTS av_products_manufacturer_model_name_key;

ALTER TABLE av_products
  ADD COLUMN IF NOT EXISTS manufacturer_key TEXT GENERATED ALWAYS AS (lower(btrim(manufacturer))) STORED,
  ADD COLUMN IF NOT EXISTS model_name_key   TEXT GENERATED ALWAYS AS (lower(btrim(model_name))) STORED,
  ADD COLUMN IF NOT EXISTS part_number_key  TEXT GENERATED ALWAYS AS (lower(btrim(coalesce(part_number, '')))) STORED;

ALTER TABLE av_products
  ADD CONSTRAINT av_products_manufacturer_model_part_ci_key
  UNIQUE (manufacturer_key, model_name_key, part_number_key);
