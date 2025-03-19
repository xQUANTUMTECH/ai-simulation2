/*
  # Auth Configuration and Email Settings

  1. Changes
    - Configure auth settings for email verification
    - Set up email templates and confirmation settings
    - Add redirect URLs for auth flows
    
  2. Security
    - Email verification required
    - Rate limiting for email sending
    - Secure email change enabled
*/

-- Create auth schema if not exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth settings table if not exists
CREATE TABLE IF NOT EXISTS auth.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text,
  mailer_autoconfirm boolean DEFAULT false,
  mailer_secure_email_change_enabled boolean DEFAULT true,
  smtp_admin_email text,
  smtp_max_frequency integer DEFAULT 60,
  smtp_sender_name text,
  security_confirmations_enabled boolean DEFAULT true,
  security_email_confirmation_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert or update auth settings
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
  'https://twusehwykpemphqtxlrx.supabase.co',
  false,
  true,
  'noreply@twusehwykpemphqtxlrx.supabase.co',
  60,
  'Simulazione AI',
  true,
  true
) ON CONFLICT (id) DO UPDATE SET
  site_url = EXCLUDED.site_url,
  mailer_autoconfirm = EXCLUDED.mailer_autoconfirm,
  mailer_secure_email_change_enabled = EXCLUDED.mailer_secure_email_change_enabled,
  smtp_admin_email = EXCLUDED.smtp_admin_email,
  smtp_max_frequency = EXCLUDED.smtp_max_frequency,
  smtp_sender_name = EXCLUDED.smtp_sender_name,
  security_confirmations_enabled = EXCLUDED.security_confirmations_enabled,
  security_email_confirmation_required = EXCLUDED.security_email_confirmation_required,
  updated_at = now();

-- Create redirect URLs table if not exists
CREATE TABLE IF NOT EXISTS auth.redirect_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert redirect URLs
INSERT INTO auth.redirect_urls (url) VALUES 
  ('https://twusehwykpemphqtxlrx.supabase.co/auth/v1/verify*'),
  ('https://twusehwykpemphqtxlrx.supabase.co/auth/v1/confirm*')
ON CONFLICT DO NOTHING;

-- Add email confirmation columns to auth.users if not exists
DO $$ 
BEGIN
  ALTER TABLE auth.users 
    ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz,
    ADD COLUMN IF NOT EXISTS confirmation_token text,
    ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;