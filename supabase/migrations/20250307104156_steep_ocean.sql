/*
  # Setup Email Confirmation

  1. Email Settings
    - Configure email confirmation settings
    - Set up email templates
    - Enable email verification

  2. Security
    - Enable RLS
    - Add admin-only policies
*/

-- Create auth_settings table if not exists
CREATE TABLE IF NOT EXISTS auth_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text NOT NULL,
  redirect_urls text[] DEFAULT ARRAY[]::text[],
  email_templates jsonb DEFAULT '{
    "confirmation": {
      "subject": "Conferma la tua email",
      "content": "Clicca sul link seguente per confermare il tuo account: {confirmation_url}"
    },
    "recovery": {
      "subject": "Reimposta la tua password",
      "content": "Clicca sul link seguente per reimpostare la password: {recovery_url}"
    }
  }'::jsonb,
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

-- Create admin-only policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'auth_settings' 
    AND policyname = 'Only admins can manage auth settings'
  ) THEN
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
  END IF;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_auth_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_auth_settings_updated_at
      BEFORE UPDATE ON auth_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert initial settings if not exists
INSERT INTO auth_settings (site_url, redirect_urls)
SELECT 
  'https://extraordinary-strudel-696753.netlify.app',
  ARRAY[
    'https://extraordinary-strudel-696753.netlify.app',
    'https://extraordinary-strudel-696753.netlify.app/auth/callback',
    'https://extraordinary-strudel-696753.netlify.app/login',
    'https://extraordinary-strudel-696753.netlify.app/register'
  ]
WHERE NOT EXISTS (SELECT 1 FROM auth_settings);