-- ============================================================
-- AVGenix: fix "Database error saving new user" on signup.
-- ============================================================
-- enforce_trial_once_per_user() (032) is a BEFORE INSERT trigger on
-- organizations, so it can set trial_ends_at on the row before it's
-- saved. Inside that same trigger it also inserts into user_trial_grants,
-- whose org_id column has a foreign key to organizations(id) — but at
-- BEFORE INSERT time, the organizations row doesn't exist in the table
-- yet, so that foreign key check fails immediately with a 23503 error,
-- which aborts the whole signup transaction ("Database error saving new
-- user" from Supabase Auth).
--
-- Fix: make the foreign key check happen at transaction commit instead
-- of immediately. Everything (auth.users, organizations,
-- organization_members, user_trial_grants) commits together as one
-- atomic transaction during signup, so by commit time the organizations
-- row unambiguously exists — deferring the check to commit time is
-- exactly correct here and changes nothing else about the constraint.

ALTER TABLE public.user_trial_grants
  ALTER CONSTRAINT user_trial_grants_org_id_fkey DEFERRABLE INITIALLY DEFERRED;
