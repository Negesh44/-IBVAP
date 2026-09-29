-- ====================================================================
-- IBVAP Database Migration: 01_face_embeddings.sql
-- Purpose: Schema support for 512-dimensional Biometric Face Embeddings
-- ====================================================================

-- Enable pgvector extension if available (optional for vector search)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Add biometric face metadata to friendly_persons table
ALTER TABLE IF EXISTS friendly_persons 
ADD COLUMN IF NOT EXISTS face_registered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(64) DEFAULT 'facenet-512';

-- 2. Dedicated secure face embeddings table (Server-side Only)
-- Raw vector embeddings are NEVER returned to the React frontend
CREATE TABLE IF NOT EXISTS face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id VARCHAR(64) NOT NULL REFERENCES friendly_persons(id) ON DELETE CASCADE,
    embedding JSONB NOT NULL,  -- 512-dimensional normalized float array
    model_version VARCHAR(64) DEFAULT 'InceptionResnetV1-v1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_person_embedding UNIQUE (person_id)
);

-- Index on person_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_face_embeddings_person_id ON face_embeddings(person_id);

-- RLS Policy: Only service_role can access raw embeddings table
ALTER TABLE face_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service Role Full Access" ON face_embeddings
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
