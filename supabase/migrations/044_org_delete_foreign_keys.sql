-- ============================================================
-- AVGenix: let a Team actually be deleted.
-- ============================================================
-- 001_organizations.sql added three references to organizations(id) with no
-- ON DELETE behaviour (so the default NO ACTION), which made every team
-- delete fail:
--   * user_preferences.active_org_id — the person deleting a team always has
--     it as their active org, so the delete was rejected every single time
--     ("violates foreign key constraint user_preferences_active_org_id_fkey").
--   * projects.org_id / equipment_library.org_id — a team with any projects or
--     library items would fail the same way, contradicting the Danger Zone
--     copy that promises to remove all of the team's projects and data.
--
-- active_org_id is just a UI preference, so it's cleared (OrgProvider already
-- falls back to the user's first org when the stored one is missing). Projects
-- and library items belong to the team, so they go with it; their own child
-- rows already cascade from projects(id).

ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_active_org_id_fkey,
  ADD CONSTRAINT user_preferences_active_org_id_fkey
    FOREIGN KEY (active_org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_org_id_fkey,
  ADD CONSTRAINT projects_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.equipment_library
  DROP CONSTRAINT IF EXISTS equipment_library_org_id_fkey,
  ADD CONSTRAINT equipment_library_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
