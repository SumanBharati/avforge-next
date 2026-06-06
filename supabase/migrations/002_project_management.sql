-- Project Management data (mirrors site_surveys / proposals pattern)
CREATE TABLE IF NOT EXISTS project_management (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id)
);

-- RLS
ALTER TABLE project_management ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project_management for their org projects"
  ON project_management FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project_management for their org projects"
  ON project_management FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project_management for their org projects"
  ON project_management FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project_management for their org projects"
  ON project_management FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );
