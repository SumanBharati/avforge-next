-- Adds Margin % / Markup % to the Organization Equipment Library, matching
-- the same fields already present on av_products (010_av_product_extended_specs.sql).
-- Used by the Edit Equipment modal's Cost/Margin %/Markup %/Price calculator.
ALTER TABLE equipment_library
  ADD COLUMN IF NOT EXISTS margin NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS markup NUMERIC(6,2);
