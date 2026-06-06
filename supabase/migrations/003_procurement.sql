-- Procurement data (same pattern as project_management / site_surveys)
CREATE TABLE IF NOT EXISTS procurement (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id)
);

ALTER TABLE procurement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view procurement for their org projects"
  ON procurement FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert procurement for their org projects"
  ON procurement FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update procurement for their org projects"
  ON procurement FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete procurement for their org projects"
  ON procurement FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN organization_members om ON om.org_id = p.org_id
      WHERE om.user_id = auth.uid()
    )
  );
