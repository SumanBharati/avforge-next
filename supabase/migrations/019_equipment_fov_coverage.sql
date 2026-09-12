-- Camera field-of-view and mic/speaker coverage-pattern fields, on both
-- equipment tables (org library + AV Forge library), so Room Designer can
-- draw a real FOV cone / coverage circle / coverage rectangle for actual
-- catalog equipment instead of only its handful of hardcoded demo devices.
--
-- Diameter (not radius) for circular coverage matches how manufacturers
-- publish ceiling mic/speaker specs, and Room Designer's own existing
-- covDiameter convention.

ALTER TABLE equipment_library
  ADD COLUMN IF NOT EXISTS hfov_deg NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS vfov_deg NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS coverage_pattern TEXT CHECK (coverage_pattern IN ('circular', 'rectangular')),
  ADD COLUMN IF NOT EXISTS coverage_diameter_ft NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS coverage_angle_deg NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS coverage_width_ft NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS coverage_depth_ft NUMERIC(6,2);

ALTER TABLE av_products
  ADD COLUMN IF NOT EXISTS hfov_deg NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS vfov_deg NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS coverage_pattern TEXT CHECK (coverage_pattern IN ('circular', 'rectangular')),
  ADD COLUMN IF NOT EXISTS coverage_diameter_ft NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS coverage_angle_deg NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS coverage_width_ft NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS coverage_depth_ft NUMERIC(6,2);
