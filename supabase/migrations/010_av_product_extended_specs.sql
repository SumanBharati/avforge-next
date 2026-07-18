-- Extended product-library fields used by the new manufacturer workbook format.
-- Existing columns and consumers remain unchanged for backward compatibility.
ALTER TABLE av_products
  ADD COLUMN IF NOT EXISTS part_number TEXT,
  ADD COLUMN IF NOT EXISTS msrp NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS margin NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS markup NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS diameter_in NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS weight_lb NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS rack_mountable_detail TEXT,
  ADD COLUMN IF NOT EXISTS rack_ear_included BOOLEAN,
  ADD COLUMN IF NOT EXISTS rack_ear_detail TEXT,
  ADD COLUMN IF NOT EXISTS shelf_required BOOLEAN,
  ADD COLUMN IF NOT EXISTS shelf_requirement TEXT,
  ADD COLUMN IF NOT EXISTS voltage_detail TEXT,
  ADD COLUMN IF NOT EXISTS current_detail TEXT,
  ADD COLUMN IF NOT EXISTS power_supply_type TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS av_products_part_number_idx ON av_products(part_number);
