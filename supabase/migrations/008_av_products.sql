-- AV Product Library: central catalog for Signal Flow Builder, Design Engineering, and Proposals
CREATE TABLE IF NOT EXISTS av_products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT NOT NULL,
  model_name   TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'Other',
  type         TEXT NOT NULL,
  price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  color        TEXT NOT NULL DEFAULT '#64748b',
  ports        JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Power & electrical
  amp_draw     NUMERIC(8,3),
  voltage      NUMERIC(8,1),
  power_watts  NUMERIC(8,2),
  btu_hr       NUMERIC(8,2),

  -- Physical / rack
  rack_mounted BOOLEAN NOT NULL DEFAULT false,
  rack_units   NUMERIC(4,1),
  width_in     NUMERIC(6,3),
  height_in    NUMERIC(6,3),
  depth_in     NUMERIC(6,3),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (manufacturer, model_name)
);

ALTER TABLE av_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "av_products_select" ON av_products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "av_products_insert" ON av_products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "av_products_update" ON av_products
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "av_products_delete" ON av_products
  FOR DELETE USING (auth.role() = 'authenticated');

-- Full-text search index
CREATE INDEX IF NOT EXISTS av_products_fts_idx ON av_products
  USING gin(to_tsvector('english',
    coalesce(manufacturer, '') || ' ' ||
    coalesce(model_name, '') || ' ' ||
    coalesce(type, '') || ' ' ||
    coalesce(category, '')
  ));

CREATE INDEX IF NOT EXISTS av_products_category_idx ON av_products (category);
CREATE INDEX IF NOT EXISTS av_products_manufacturer_idx ON av_products (manufacturer);
CREATE INDEX IF NOT EXISTS av_products_rack_idx ON av_products (rack_mounted);
