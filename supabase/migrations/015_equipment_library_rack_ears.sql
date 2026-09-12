-- Adds "rack ears included" to the Organization Equipment Library, matching
-- the same field already present on av_products (010_av_product_extended_specs.sql)
-- so it can be tracked consistently whether an item was copied from the AV Forge
-- Library or created from scratch in an org's own library.
ALTER TABLE equipment_library
  ADD COLUMN IF NOT EXISTS rack_ear_included BOOLEAN;
