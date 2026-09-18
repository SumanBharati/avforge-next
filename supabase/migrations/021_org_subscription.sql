-- ============================================================
-- AVGenix: Organization Subscription (Stripe) — AVGenix Pro
-- ============================================================
-- Subscription is billed per-organization, not per-user — matches
-- org_id already being the scoping unit for all project/equipment
-- data, and matches the existing extended-columns-on-organizations
-- precedent set in migration 011 (billing address, tax, QuickBooks).

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_status text,
    -- Mirrors Stripe Subscription.status verbatim: 'active', 'past_due',
    -- 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused',
    -- 'trialing' (not used by any v1 flow — no trial configured on the
    -- price, kept only so the column tolerates a future manual trial).
    -- NULL = org has never started checkout.
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_org_stripe_customer     ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_org_stripe_subscription ON organizations(stripe_subscription_id);

-- No RLS changes in v1 — enforcement is UI-only, matching the existing
-- activeOrg.role === "owner" pattern used across the app. The existing
-- organizations SELECT policy (migration 001) already lets any org
-- member read these new columns. The checkout and webhook routes both
-- write via the service-role key, which bypasses RLS entirely.
