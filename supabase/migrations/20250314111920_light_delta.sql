/*
  # Fix Role Hierarchy System

  1. Changes
    - Drop existing policies and triggers first
    - Recreate tables with new names to avoid conflicts
    - Add updated policies with unique names
    - Add new trigger with unique name
*/

-- Drop existing policies and triggers
DO $$ 
BEGIN
  -- Drop policies
  DROP POLICY IF EXISTS "role_hierarchy_admin_policy" ON role_hierarchy;
  DROP POLICY IF EXISTS "role_assignments_admin_policy" ON role_assignments;
  DROP POLICY IF EXISTS "role_assignments_view_own_policy" ON role_assignments;
  DROP POLICY IF EXISTS "role_requests_create_policy" ON role_assignment_requests;
  DROP POLICY IF EXISTS "role_requests_view_policy" ON role_assignment_requests;
  DROP POLICY IF EXISTS "role_requests_review_policy" ON role_assignment_requests;
  
  -- Drop trigger
  DROP TRIGGER IF EXISTS on_role_assignment ON role_assignments;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create role_hierarchy table if not exists
CREATE TABLE IF NOT EXISTS role_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_role text NOT NULL CHECK (parent_role IN ('USER', 'ADMIN')),
  child_role text NOT NULL CHECK (child_role IN ('USER', 'ADMIN')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_role, child_role),
  CHECK (parent_role != child_role)
);

-- Create role_assignments table if not exists
CREATE TABLE IF NOT EXISTS role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_role text NOT NULL CHECK (assigned_role IN ('USER', 'ADMIN')),
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  reason text,
  metadata jsonb DEFAULT '{}'
);

-- Create role_assignment_requests table if not exists
CREATE TABLE IF NOT EXISTS role_assignment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role text NOT NULL CHECK (requested_role IN ('USER', 'ADMIN')),
  previous_role text NOT NULL CHECK (previous_role IN ('USER', 'ADMIN')),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE role_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignment_requests ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names
CREATE POLICY "role_hierarchy_admin_policy_v3"
  ON role_hierarchy
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "role_assignments_admin_policy_v3"
  ON role_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "role_assignments_view_own_policy_v3"
  ON role_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "role_requests_create_policy_v3"
  ON role_assignment_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "role_requests_view_policy_v3"
  ON role_assignment_requests
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "role_requests_review_policy_v3"
  ON role_assignment_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Create new indexes with unique names
CREATE INDEX IF NOT EXISTS idx_role_assignments_user_v3 ON role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role_v3 ON role_assignments(assigned_role);
CREATE INDEX IF NOT EXISTS idx_role_requests_user_v3 ON role_assignment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_status_v3 ON role_assignment_requests(status);

-- Create function to check inherited permissions
CREATE OR REPLACE FUNCTION check_inherited_permissions_v3(user_role text, required_permission text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    WITH RECURSIVE role_tree AS (
      -- Base case: direct permissions
      SELECT rp.role, ap.name as permission
      FROM role_permissions rp
      JOIN admin_permissions ap ON ap.id = rp.permission_id
      WHERE rp.role = user_role
      
      UNION
      
      -- Recursive case: inherited permissions
      SELECT rh.child_role, rt.permission
      FROM role_hierarchy rh
      JOIN role_tree rt ON rt.role = rh.parent_role
    )
    SELECT 1 FROM role_tree
    WHERE permission = required_permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle role assignment
CREATE OR REPLACE FUNCTION handle_role_assignment_v3()
RETURNS trigger AS $$
BEGIN
  -- Log the role change in audit log
  INSERT INTO admin_audit_log (
    admin_id,
    action,
    entity_type,
    entity_id,
    changes
  ) VALUES (
    NEW.assigned_by,
    'role_assignment',
    'user',
    NEW.user_id,
    jsonb_build_object(
      'old_role', (SELECT role FROM users WHERE id = NEW.user_id),
      'new_role', NEW.assigned_role,
      'reason', NEW.reason
    )
  );

  -- Update user role
  UPDATE users
  SET role = NEW.assigned_role,
      updated_at = now()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger with unique name
CREATE TRIGGER on_role_assignment_v3
  AFTER INSERT ON role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION handle_role_assignment_v3();