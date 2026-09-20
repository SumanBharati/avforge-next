-- Physical diameter (inches) of a round unit — a ceiling speaker, a table mic.
-- The AVGenix library (av_products) already has diameter_in (migration 010);
-- this gives the organization equipment library the same column so the shared
-- Edit Equipment window can save "Dia" wherever it opens.
ALTER TABLE equipment_library
  ADD COLUMN IF NOT EXISTS diameter_in NUMERIC(8,3);
