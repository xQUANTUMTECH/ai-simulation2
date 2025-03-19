/*
  # Auth Settings Migration

  1. New Tables
    - `auth_settings`
      - Stores authentication configuration
      - Includes email templates and domain settings
      - Manages redirect URLs and security settings

  2. Security
    - Enable RLS
    - Add policies for admin access only
*/

-- Create auth_settings table if not exists
CREATE TABLE IF NOT EXISTS auth_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text NOT NULL,
  redirect_urls text[] DEFAULT ARRAY[]::text[],
  email_templates jsonb DEFAULT '{}'::jsonb,
  security_settings jsonb DEFAULT '{
    "minimum_password_length": 8,
    "require_email_confirmation": true,
    "allow_multiple_sessions": true,
    "session_expiry_days": 30,
    "max_failed_attempts": 5,
    "lockout_duration_minutes": 30
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE auth_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Only admins can manage auth settings" ON auth_settings;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create admin-only policy
CREATE POLICY "Only admins can manage auth settings"
  ON auth_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Create trigger for updated_at
DO $$ 
BEGIN
  CREATE TRIGGER update_auth_settings_updated_at
    BEFORE UPDATE ON auth_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;