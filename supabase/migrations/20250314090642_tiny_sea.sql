/*
  # Admin Permission System

  1. New Tables
    - `admin_permissions`: Defines available permissions
    - `role_permissions`: Maps permissions to roles
    - `admin_audit_log`: Tracks admin actions

  2. Security
    - Enable RLS
    - Admin-only access
    - Audit logging
*/

-- Create admin_permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('USER', 'ADMIN')), -- Reference roles directly
  permission_id uuid REFERENCES admin_permissions(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  changes jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Only admins can view permissions"
  ON admin_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Only admins can manage role permissions"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Only admins can view audit logs"
  ON admin_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Create indexes
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_admin_audit_log_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_entity ON admin_audit_log(entity_type, entity_id);

-- Insert default permissions
INSERT INTO admin_permissions (name, description, category) VALUES
  ('user.view', 'View user details', 'user'),
  ('user.create', 'Create new users', 'user'),
  ('user.update', 'Update user details', 'user'),
  ('user.delete', 'Delete users', 'user'),
  ('course.view', 'View course details', 'course'),
  ('course.create', 'Create new courses', 'course'),
  ('course.update', 'Update course details', 'course'),
  ('course.delete', 'Delete courses', 'course'),
  ('content.view', 'View content', 'content'),
  ('content.create', 'Create new content', 'content'),
  ('content.update', 'Update content', 'content'),
  ('content.delete', 'Delete content', 'content'),
  ('analytics.view', 'View analytics', 'analytics'),
  ('settings.view', 'View system settings', 'settings'),
  ('settings.update', 'Update system settings', 'settings')
ON CONFLICT (name) DO NOTHING;

-- Grant all permissions to ADMIN role
INSERT INTO role_permissions (role, permission_id)
SELECT 'ADMIN', id FROM admin_permissions
ON CONFLICT (role, permission_id) DO NOTHING;