/*
  # Auth Configuration

  1. Changes
    - Add email confirmation columns to users table
    - Set up auth settings and email templates
    - Configure allowed redirect URLs
    
  2. Security
    - Enable email confirmation
    - Secure email settings
    - Proper redirect handling
*/

-- Add email confirmation columns to auth.users if they don't exist
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz,
ADD COLUMN IF NOT EXISTS confirmation_token text,
ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS email_change_token text,
ADD COLUMN IF NOT EXISTS email_change_confirm_status smallint DEFAULT 0;

-- Create auth settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text NOT NULL DEFAULT 'http://localhost:5173',
  mailer_autoconfirm boolean DEFAULT false,
  mailer_secure_email_change_enabled boolean DEFAULT true,
  smtp_admin_email text DEFAULT 'noreply@example.com',
  smtp_max_frequency integer DEFAULT 60,
  smtp_sender_name text DEFAULT 'Simulazione AI',
  security_confirmations_enabled boolean DEFAULT true,
  security_email_confirmation_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default settings if not exists
INSERT INTO auth.settings (
  site_url,
  mailer_autoconfirm,
  mailer_secure_email_change_enabled,
  smtp_admin_email,
  smtp_max_frequency,
  smtp_sender_name,
  security_confirmations_enabled,
  security_email_confirmation_required
) VALUES (
  'http://localhost:5173',
  false,
  true,
  'noreply@example.com',
  60,
  'Simulazione AI',
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- Create redirect URLs table
CREATE TABLE IF NOT EXISTS auth.allowed_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert default redirect URLs
INSERT INTO auth.allowed_redirects (url) VALUES 
  ('http://localhost:5173/auth/callback'),
  ('http://localhost:5173/auth/reset-password'),
  ('http://localhost:5173/auth/verify-email')
ON CONFLICT DO NOTHING;

-- Create function to validate redirect URLs
CREATE OR REPLACE FUNCTION auth.is_valid_redirect_url(redirect_url text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.allowed_redirects
    WHERE redirect_url LIKE url || '%'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;