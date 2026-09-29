-- ==============================================================================
-- IBVAP SQL MIGRATION 03: DATABASE SECURITY, RBAC & ROW-LEVEL SECURITY HARDENING
-- Intelligent Border Video Analytics Platform
-- ==============================================================================

-- 1. Enable Row-Level Security on All Core Tables
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.friendly_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to extract user role from auth.jwt()
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'VIEWER'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 2. PROFILES TABLE POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "Profiles read access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles admin all" ON public.profiles;

-- Read: Users can read their own profile, ADMIN and COMMANDER can read all profiles
CREATE POLICY "Profiles read access" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() 
    OR public.get_auth_role() IN ('ADMIN', 'COMMANDER')
  );

-- Update: Normal users can update non-role fields of their own profile
CREATE POLICY "Profiles user self-update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() 
    AND (
      -- Prevent privilege escalation: role cannot be modified by non-admin
      role = (SELECT role FROM public.profiles WHERE id = auth.uid())
      OR public.get_auth_role() = 'ADMIN'
    )
  );

-- Admin Full Access on Profiles
CREATE POLICY "Profiles admin management" ON public.profiles
  FOR ALL TO authenticated
  USING (public.get_auth_role() = 'ADMIN')
  WITH CHECK (public.get_auth_role() = 'ADMIN');

-- Service Role Full Access
CREATE POLICY "Profiles service_role full" ON public.profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- ==============================================================================
-- 3. FRIENDLY PERSONS TABLE POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "Friendly persons select" ON public.friendly_persons;
DROP POLICY IF EXISTS "Friendly persons insert update" ON public.friendly_persons;
DROP POLICY IF EXISTS "Friendly persons delete" ON public.friendly_persons;

-- Read: All authenticated users (ADMIN, COMMANDER, OPERATOR, VIEWER)
CREATE POLICY "Friendly persons select" ON public.friendly_persons
  FOR SELECT TO authenticated
  USING (true);

-- Insert / Update: ADMIN and COMMANDER only
CREATE POLICY "Friendly persons insert update" ON public.friendly_persons
  FOR INSERT TO authenticated
  WITH CHECK (public.get_auth_role() IN ('ADMIN', 'COMMANDER'));

CREATE POLICY "Friendly persons update" ON public.friendly_persons
  FOR UPDATE TO authenticated
  USING (public.get_auth_role() IN ('ADMIN', 'COMMANDER'))
  WITH CHECK (public.get_auth_role() IN ('ADMIN', 'COMMANDER'));

-- Delete: ADMIN only
CREATE POLICY "Friendly persons delete" ON public.friendly_persons
  FOR DELETE TO authenticated
  USING (public.get_auth_role() = 'ADMIN');

-- Service Role
CREATE POLICY "Friendly persons service_role" ON public.friendly_persons
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- ==============================================================================
-- 4. CAMERAS TABLE POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "Cameras select" ON public.cameras;
DROP POLICY IF EXISTS "Cameras write" ON public.cameras;

-- Read: All authenticated roles
CREATE POLICY "Cameras select" ON public.cameras
  FOR SELECT TO authenticated
  USING (true);

-- Configuration: ADMIN and COMMANDER only
CREATE POLICY "Cameras write" ON public.cameras
  FOR ALL TO authenticated
  USING (public.get_auth_role() IN ('ADMIN', 'COMMANDER'))
  WITH CHECK (public.get_auth_role() IN ('ADMIN', 'COMMANDER'));

-- Service Role
CREATE POLICY "Cameras service_role" ON public.cameras
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- ==============================================================================
-- 5. ALERTS TABLE POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "Alerts select" ON public.alerts;
DROP POLICY IF EXISTS "Alerts update status" ON public.alerts;
DROP POLICY IF EXISTS "Alerts delete" ON public.alerts;

-- Read: All authenticated roles
CREATE POLICY "Alerts select" ON public.alerts
  FOR SELECT TO authenticated
  USING (true);

-- Status Update: ADMIN, COMMANDER, and OPERATOR (VIEWER blocked)
CREATE POLICY "Alerts update status" ON public.alerts
  FOR UPDATE TO authenticated
  USING (public.get_auth_role() IN ('ADMIN', 'COMMANDER', 'OPERATOR'))
  WITH CHECK (public.get_auth_role() IN ('ADMIN', 'COMMANDER', 'OPERATOR'));

-- Delete: ADMIN only
CREATE POLICY "Alerts delete" ON public.alerts
  FOR DELETE TO authenticated
  USING (public.get_auth_role() = 'ADMIN');

-- Service Role
CREATE POLICY "Alerts service_role" ON public.alerts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- ==============================================================================
-- 6. EVENTS TABLE POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "Events select" ON public.events;
DROP POLICY IF EXISTS "Events insert" ON public.events;

-- Read: All authenticated roles
CREATE POLICY "Events select" ON public.events
  FOR SELECT TO authenticated
  USING (true);

-- Insert: Service Role & Operational Backends
CREATE POLICY "Events insert" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.get_auth_role() IN ('ADMIN', 'COMMANDER', 'OPERATOR'));

-- Service Role
CREATE POLICY "Events service_role" ON public.events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- ==============================================================================
-- 7. AUDIT LOGS POLICIES (Immutable Ledger)
-- ==============================================================================
DROP POLICY IF EXISTS "Audit logs select" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs insert" ON public.audit_logs;

-- Read: ADMIN and COMMANDER only
CREATE POLICY "Audit logs select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.get_auth_role() IN ('ADMIN', 'COMMANDER'));

-- Insert: All authenticated & service_role
CREATE POLICY "Audit logs insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Service Role
CREATE POLICY "Audit logs service_role" ON public.audit_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Note: UPDATE and DELETE policies intentionally omitted to ensure immutability
