-- Org-wide project management / resource scheduling (Float-style)
-- Stores people, projects, phases, allocations, time off, time entries, milestones, tasks
CREATE TABLE IF NOT EXISTS org_project_management (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id)
);

-- RLS
ALTER TABLE org_project_management ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org_project_management"
  ON org_project_management FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert org_project_management"
  ON org_project_management FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update org_project_management"
  ON org_project_management FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete org_project_management"
  ON org_project_management FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
