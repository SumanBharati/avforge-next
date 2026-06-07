-- Room Designer physical properties for av_products
ALTER TABLE av_products
  ADD COLUMN IF NOT EXISTS rd_type       TEXT,        -- display | camera | mic | speaker | control
  ADD COLUMN IF NOT EXISTS rd_wall       TEXT,        -- front | ceiling | floor | table | side
  ADD COLUMN IF NOT EXISTS rd_width_ft   NUMERIC(6,3), -- physical width in feet (floor-plan scale)
  ADD COLUMN IF NOT EXISTS rd_height_ft  NUMERIC(6,3), -- physical height/depth in feet
  ADD COLUMN IF NOT EXISTS rd_icon       TEXT;         -- monitor | confbar | soundbar | 🎙 | 🔊 | 📱

-- Seed the built-in Room Designer catalog items so they appear in search
-- (manufacturer = 'Generic', model_name = product label; unique constraint prevents duplicates)
INSERT INTO av_products
  (manufacturer, model_name, category, type, price, color, ports,
   rd_type, rd_wall, rd_width_ft, rd_height_ft, rd_icon)
VALUES
  -- Displays
  ('Generic', '43" Display',         'Displays', '43" Display',         0, '#3b82f6', '[]', 'display', 'front',   3.12, 1.77, 'monitor'),
  ('Generic', '55" Display',         'Displays', '55" Display',         0, '#3b82f6', '[]', 'display', 'front',   4.00, 2.26, 'monitor'),
  ('Generic', '65" Display',         'Displays', '65" Display',         0, '#3b82f6', '[]', 'display', 'front',   4.76, 2.69, 'monitor'),
  ('Generic', '75" Display',         'Displays', '75" Display',         0, '#3b82f6', '[]', 'display', 'front',   5.45, 3.08, 'monitor'),
  ('Generic', '86" Display',         'Displays', '86" Display',         0, '#3b82f6', '[]', 'display', 'front',   6.27, 3.54, 'monitor'),
  ('Generic', '98" Display',         'Displays', '98" Display',         0, '#3b82f6', '[]', 'display', 'front',   7.12, 4.00, 'monitor'),
  ('Generic', '110" Display',        'Displays', '110" Display',        0, '#3b82f6', '[]', 'display', 'front',   7.97, 4.49, 'monitor'),
  ('Generic', 'Projection Screen',   'Displays', 'Projection Screen',   0, '#8b5cf6', '[]', 'display', 'front',   7.87, 4.92, 'presentation'),
  ('Generic', 'LED Video Wall',      'Displays', 'LED Video Wall',      0, '#06b6d4', '[]', 'display', 'front',   9.84, 5.58, 'tv'),
  -- Cameras
  ('Generic', 'PTZ Camera',          'Cameras',  'PTZ Camera',          0, '#22c55e', '[]', 'camera',  'front',   0.49, 0.39, 'confbar'),
  ('Generic', 'Conference Bar',      'Cameras',  'Conference Bar',      0, '#22c55e', '[]', 'camera',  'front',   2.30, 0.39, 'soundbar'),
  ('Generic', 'Ceiling Camera',      'Cameras',  'Ceiling Camera',      0, '#22c55e', '[]', 'camera',  'ceiling', 0.66, 0.66, 'confbar'),
  -- Audio
  ('Generic', 'Ceiling Mic Array',   'Audio',    'Ceiling Mic Array',   0, '#f59e0b', '[]', 'mic',     'ceiling', 2.00, 2.00, '🎙'),
  ('Generic', 'Table Mic',           'Audio',    'Table Mic',           0, '#f59e0b', '[]', 'mic',     'table',   0.44, 0.44, '🎙'),
  ('Generic', 'Ceiling Speaker',     'Audio',    'Ceiling Speaker',     0, '#ef4444', '[]', 'speaker', 'ceiling', 0.67, 0.67, '🔊'),
  ('Generic', 'Wall Speaker',        'Audio',    'Wall Speaker',        0, '#ef4444', '[]', 'speaker', 'front',   1.04, 1.67, '🔊'),
  -- Control
  ('Generic', 'Touch Panel (Wall)',  'Control',  'Touch Panel (Wall)',  0, '#a855f7', '[]', 'control', 'side',    0.92, 0.59, '📱'),
  ('Generic', 'Touch Panel (Table)', 'Control',  'Touch Panel (Table)', 0, '#a855f7', '[]', 'control', 'table',   0.86, 0.43, '📱'),
  ('Generic', 'Cable Cubby',         'Control',  'Cable Cubby',         0, '#a855f7', '[]', 'control', 'table',   0.98, 0.49, '🔌')
ON CONFLICT (manufacturer, model_name) DO UPDATE SET
  rd_type      = EXCLUDED.rd_type,
  rd_wall      = EXCLUDED.rd_wall,
  rd_width_ft  = EXCLUDED.rd_width_ft,
  rd_height_ft = EXCLUDED.rd_height_ft,
  rd_icon      = EXCLUDED.rd_icon,
  updated_at   = now();
