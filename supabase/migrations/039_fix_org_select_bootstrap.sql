-- ============================================================
-- AVGenix: let a creator read back the org row they just created,
-- before they've been added as its first member.
-- ============================================================
-- org_select (001_organizations.sql) only allows reading an org you're
-- already a member of:
--   EXISTS (SELECT 1 FROM organization_members WHERE org_id = organizations.id AND user_id = auth.uid())
--
-- The real creation flow (app/org/new/page.tsx) is two separate client
-- calls: first INSERT the organizations row (chaining .select().single()
-- to get its generated id), THEN INSERT the creator into
-- organization_members using that id. At the moment the first call's
-- .select() runs, the creator is not a member yet — org_select correctly
-- says no, and the read-back fails, which breaks team creation outright.
--
-- This went unnoticed until now because organizations.relrowsecurity was
-- false for most of this project's history (just fixed a few migrations
-- ago), so org_select was never actually being enforced in practice.
--
-- Fix: also allow the creator (organizations.created_by) to read their
-- own org regardless of current membership — mirrors the same "you can
-- act on the org you created before you're formally in it" bootstrap
-- allowance om_insert already has for the membership row itself.

DROP POLICY IF EXISTS org_select ON organizations;
CREATE POLICY org_select ON organizations FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE org_id = organizations.id AND user_id = auth.uid())
  OR organizations.created_by = auth.uid()
);
