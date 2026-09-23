-- AVGenix: stop org owners/admins from self-granting Pro access.
--
-- org_update (001_organizations.sql) only checks role — RLS is row-level,
-- not column-level — so any owner/admin could previously run, straight
-- from the browser:
--   supabase.from('organizations').update({ subscription_status: 'active' })
-- and grant themselves permanent Pro access with no Stripe interaction at
-- all. This is a stricter bypass than the trial-expiry gap fixed in
-- 022/029: it doesn't even require an expired trial.
--
-- Fix: a BEFORE UPDATE trigger that pins every billing column back to its
-- previous value unless the request is running as the service_role key
-- (the Stripe webhook and the checkout route's admin client are the only
-- legitimate writers of these columns; both already use that key).

CREATE OR REPLACE FUNCTION public.protect_org_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.subscription_status               := OLD.subscription_status;
    NEW.subscription_current_period_end   := OLD.subscription_current_period_end;
    NEW.subscription_cancel_at_period_end := OLD.subscription_cancel_at_period_end;
    NEW.stripe_customer_id                := OLD.stripe_customer_id;
    NEW.stripe_subscription_id            := OLD.stripe_subscription_id;
    NEW.trial_started_at                  := OLD.trial_started_at;
    NEW.trial_ends_at                     := OLD.trial_ends_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_org_billing_columns ON public.organizations;
CREATE TRIGGER trg_protect_org_billing_columns
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.protect_org_billing_columns();

COMMENT ON FUNCTION public.protect_org_billing_columns() IS
  'Silently discards client-attempted changes to billing/trial columns on organizations. Only the service_role (Stripe webhook, checkout route admin client) may write them.';
