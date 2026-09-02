-- Bring the Organization Equipment Library's schema up to parity with av_products
-- so items added to an org's library (whether copied from the AV Forge Library or
-- created from scratch) can carry and independently edit full technical specs.
-- Existing columns and consumers (proposal page, BOM, etc.) remain unchanged.
ALTER TABLE equipment_library
  ADD COLUMN IF NOT EXISTS part_number TEXT,
  ADD COLUMN IF NOT EXISTS msrp NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS ports JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS amp_draw NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS voltage NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS power_watts NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS btu_hr NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS rack_mounted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rack_units NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS width_in NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS height_in NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS depth_in NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS weight_lb NUMERIC(8,3);
