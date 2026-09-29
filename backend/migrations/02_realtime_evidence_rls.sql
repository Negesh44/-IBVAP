-- ==============================================================================
-- IBVAP SQL MIGRATION 02: Supabase Realtime, Private Evidence Storage, & RLS RBAC Policies
-- ==============================================================================

-- 1. Enable Supabase Realtime for Security Tables
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Add tables to realtime publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'cameras'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cameras;
  END IF;
END $$;


-- 2. Configure Private Evidence Storage Bucket
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage Policy: Service Role full access
CREATE POLICY "Service Role Evidence Full Access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'evidence')
WITH CHECK (bucket_id = 'evidence');

-- Storage Policy: Authenticated Personnel Read Access via Signed URLs
CREATE POLICY "Authenticated Personnel Evidence Read Access"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'evidence');


-- 3. Row-Level Security (RLS) & Role-Based Access Control (RBAC) Policies
-- ------------------------------------------------------------------------------

-- Enable RLS across all operational tables
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendly_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to extract user role from user metadata / profiles
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS text AS $$
  SELECT coalesce(
    (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role'),
    'VIEWER'
  );
$$ LANGUAGE sql STABLE;

-- ------------------------------------------------------------------------------
-- A. ALERTS TABLE POLICIES
-- ------------------------------------------------------------------------------
-- Read access: All authenticated users (ADMIN, COMMANDER, OPERATOR, VIEWER)
CREATE POLICY "Alerts Read Access"
ON alerts FOR SELECT
TO authenticated
USING (true);

-- Insert access: ADMIN, COMMANDER, OPERATOR, service_role
CREATE POLICY "Alerts Insert Access"
ON alerts FOR INSERT
TO authenticated, service_role
WITH CHECK (
  auth.get_user_role() IN ('ADMIN', 'COMMANDER', 'OPERATOR')
  OR current_user = 'service_role'
);

-- Update access (Acknowledge / Resolve): ADMIN, COMMANDER, OPERATOR (VIEWER restricted)
CREATE POLICY "Alerts Update Status Access"
ON alerts FOR UPDATE
TO authenticated, service_role
USING (
  auth.get_user_role() IN ('ADMIN', 'COMMANDER', 'OPERATOR')
  OR current_user = 'service_role'
)
WITH CHECK (
  auth.get_user_role() IN ('ADMIN', 'COMMANDER', 'OPERATOR')
  OR current_user = 'service_role'
);

-- ------------------------------------------------------------------------------
-- B. EVENTS TABLE POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Events Read Access"
ON events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Events Insert Access"
ON events FOR INSERT
TO authenticated, service_role
WITH CHECK (
  auth.get_user_role() IN ('ADMIN', 'COMMANDER', 'OPERATOR')
  OR current_user = 'service_role'
);

-- ------------------------------------------------------------------------------
-- C. AUDIT LOGS TABLE POLICIES
-- ------------------------------------------------------------------------------
-- Immutable Audit Trail: Insert allowed, Update & Delete forbidden for all users
CREATE POLICY "Audit Logs Read Access"
ON audit_logs FOR SELECT
TO authenticated
USING (auth.get_user_role() IN ('ADMIN', 'COMMANDER'));

CREATE POLICY "Audit Logs Append Access"
ON audit_logs FOR INSERT
TO authenticated, service_role
WITH CHECK (true);
