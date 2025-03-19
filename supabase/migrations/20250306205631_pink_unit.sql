/*
  # Authentication Configuration

  1. Changes
    - Configure authentication settings
    - Set up email confirmation requirements
    - Configure SMTP settings
    - Set up security policies
    
  2. Security
    - Email confirmation required
    - Secure email change enabled
    - Rate limiting for email sending
*/

-- Create auth configuration table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.config (
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

-- Insert or update configuration
INSERT INTO auth.config (
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

-- Create redirect URLs table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.redirect_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Set up redirect URLs
INSERT INTO auth.redirect_urls (url)
VALUES 
  ('https://twusehwykpemphqtxlrx.supabase.co/auth/v1/verify*'),
  ('https://twusehwykpemphqtxlrx.supabase.co/auth/v1/confirm*')
ON CONFLICT DO NOTHING;