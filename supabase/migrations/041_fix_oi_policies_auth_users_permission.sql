-- ============================================================
-- AVGenix: fix "permission denied for table users" on invites.
-- ============================================================
-- oi_select and oi_update (both from 001_organizations.sql, carried
-- forward unchanged by 034_rename_roles_to_superadmin.sql) check "is this
-- invite addressed to the caller's own email" with:
--   organization_invites.email = (SELECT email FROM auth.users WHERE id = auth.uid())
-- That's a direct table read against auth.users. Postgres checks
-- table-level privileges for every table referenced in an RLS policy
-- expression regardless of whether an OR's other branch would already be
-- true — and the `authenticated` role was never granted SELECT on
-- auth.users (Supabase locks that table down deliberately; auth.uid(),
-- auth.email(), and auth.jwt() exist specifically so policies never have
-- to touch it directly). So any query that evaluates these policies at
-- all throws "permission denied for table users".
--
-- This bug has been in the schema since 001 and was never actually hit in
-- practice: reaching oi_select/oi_update requires a query to first pass
-- through organization_members via another policy's EXISTS check, and
-- until 038_fix_organization_members_rls_recursion.sql, that recursed
-- and errored out before ever reaching this clause. Fixing the recursion
-- let queries reach this point for the first time — e.g. sending an
-- invite (POST /api/invite) does `.insert(...).select("token")`, and that
-- read-back now actually evaluates oi_select, surfacing this.
--
-- Fix: use auth.email() — Supabase's built-in helper that reads the
-- email straight out of the caller's JWT claims — instead of querying
-- auth.users directly. Same result, no table grant required.

DROP POLICY IF EXISTS oi_select ON organization_invites;
CREATE POLICY oi_select ON organization_invites FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = organization_invites.org_id AND user_id = auth.uid() AND role IN ('superadmin','admin'))
  OR organization_invites.email = auth.email()
);

DROP POLICY IF EXISTS oi_update ON organization_invites;
CREATE POLICY oi_update ON organization_invites FOR UPDATE USING (
  organization_invites.email = auth.email()
  OR EXISTS (SELECT 1 FROM organization_members WHERE org_id = organization_invites.org_id AND user_id = auth.uid() AND role IN ('superadmin','admin'))
);
