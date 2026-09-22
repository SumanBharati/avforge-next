-- "Kit" products: an AVGenix Library entry that's actually a bundle sold
-- under one SKU (e.g. Logitech 939-001950) made of separate physical parts
-- (a Tap, a Cat5e kit, a Cat5e-to-USB adapter), each with its own ports and
-- specs. kit_items lists those component products by id + quantity; an
-- empty array (the default) means "not a kit," an ordinary product.
--
-- Component ids reference av_products.id but aren't a DB foreign key — a kit
-- is just a named list of other library entries. Deleting a component
-- product shouldn't cascade-delete or block deleting kits that reference it;
-- the app treats a missing component id as "removed from the library" and
-- skips it when expanding the kit.
ALTER TABLE av_products
  ADD COLUMN IF NOT EXISTS kit_items JSONB NOT NULL DEFAULT '[]'::jsonb;
