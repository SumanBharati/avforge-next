-- av_products.updated_at has had a DEFAULT now() since migration 008, but
-- nothing ever bumped it on UPDATE, so it silently stayed pinned at
-- created_at forever. Add a trigger so it actually reflects the last edit,
-- for the Library table's "Last Updated on" column.
CREATE OR REPLACE FUNCTION set_av_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS av_products_set_updated_at ON av_products;
CREATE TRIGGER av_products_set_updated_at
  BEFORE UPDATE ON av_products
  FOR EACH ROW
  EXECUTE FUNCTION set_av_products_updated_at();
