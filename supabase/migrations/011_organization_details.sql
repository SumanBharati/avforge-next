-- ============================================================
-- AVForge: Organization Details, Billing Address, Currency,
-- Tax Preferences & QuickBooks Integration
-- ============================================================
-- app/org/settings/page.tsx has selected/updated these columns
-- since it was written, but no migration ever created them —
-- the settings form silently failed to load (Postgrest errors
-- on unknown columns) and appeared blank.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS website  text,
  ADD COLUMN IF NOT EXISTS phone    text,
  ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '+1',
  ADD COLUMN IF NOT EXISTS country  text DEFAULT 'United States',
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT '(GMT-05:00) Eastern Time (US & Canada)',

  ADD COLUMN IF NOT EXISTS street_address text,
  ADD COLUMN IF NOT EXISTS city           text,
  ADD COLUMN IF NOT EXISTS state          text,
  ADD COLUMN IF NOT EXISTS zip            text,

  ADD COLUMN IF NOT EXISTS shipping_address         text,
  ADD COLUMN IF NOT EXISTS shipping_city            text,
  ADD COLUMN IF NOT EXISTS shipping_state           text,
  ADD COLUMN IF NOT EXISTS shipping_zip             text,
  ADD COLUMN IF NOT EXISTS shipping_same_as_primary boolean DEFAULT false,

  ADD COLUMN IF NOT EXISTS project_coord_rate numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS project_coord_cost numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_rate_labels jsonb DEFAULT '{"engineering":"Engineering","installation":"Installation","project_mgmt":"Project Mgmt","project_coord":"Project Coord","programming":"Programming","field_engineering":"Field Engineering"}'::jsonb,

  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',

  ADD COLUMN IF NOT EXISTS tax_equipment           boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_shipping            boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_set_default_rates   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_independent_rates   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_name                text DEFAULT 'Tax',

  ADD COLUMN IF NOT EXISTS qb_connected     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS qb_company_name  text,
  ADD COLUMN IF NOT EXISTS qb_access_token  text,
  ADD COLUMN IF NOT EXISTS qb_refresh_token text,
  ADD COLUMN IF NOT EXISTS qb_realm_id      text;
