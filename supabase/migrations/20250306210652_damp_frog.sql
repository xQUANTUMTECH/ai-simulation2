/*
  # Auth Redirects Configuration

  1. Changes
    - Configure auth redirect settings
    - Set up allowed redirect URLs
    - Enable email confirmations
    
  2. Security
    - Only allow specific redirect patterns
    - Secure email confirmation flow
*/

-- Enable email confirmations
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz,
ADD COLUMN IF NOT EXISTS confirmation_token text,
ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;

-- Create auth redirect settings
CREATE TABLE IF NOT EXISTS auth.redirect_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text NOT NULL,
  redirect_urls text[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert or update redirect settings
INSERT INTO auth.redirect_settings (
  site_url,
  redirect_urls
) VALUES (
  'http://localhost:5173', -- Development URL
  ARRAY[
    'http://localhost:5173/auth/callback',
    'http://localhost:5173/auth/reset-password',
    'http://localhost:5173/auth/verify-email'
  ]
) ON CONFLICT (id) DO UPDATE SET
  site_url = EXCLUDED.site_url,
  redirect_urls = EXCLUDED.redirect_urls,
  updated_at = now();

-- Create function to validate redirect URLs
CREATE OR REPLACE FUNCTION auth.validate_redirect_url(url text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.redirect_settings
    WHERE url = ANY(redirect_urls) OR url LIKE site_url || '%'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;