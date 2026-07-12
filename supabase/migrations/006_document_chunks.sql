-- ============================================================
-- AVForge: Document chunks for AI knowledge base (pgvector)
-- ============================================================

-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- voyage-3-lite (used by app/api/chat/route.ts and scripts/ingest-docs.ts)
-- outputs 512-dimension embeddings
CREATE TABLE document_chunks (
  id          bigserial PRIMARY KEY,
  content     text NOT NULL,
  metadata    jsonb DEFAULT '{}',
  embedding   vector(512),
  created_at  timestamptz DEFAULT now()
);

-- Index for fast similarity search
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- Knowledge base is readable by any client (it powers the AI assistant),
-- but only the service role (ingest script) can write.
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_chunks_read" ON document_chunks
  FOR SELECT USING (true);

-- Function to search similar chunks
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(512),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
