/*
  # Custom Domain Configuration
  
  1. Changes
    - Add custom domain settings table
    - Configure allowed domains for auth
    - Update redirect URLs for custom domain
    
  2. Security
    - Validate domain settings
    - Secure domain configurations
*/

-- Create custom domain settings table
CREATE TABLE IF NOT EXISTS auth.domain_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  is_primary boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  verification_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add function to validate domain
CREATE OR REPLACE FUNCTION auth.validate_domain(domain_name text)
RETURNS boolean AS $$
BEGIN
  RETURN domain_name ~ '^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE auth.domain_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow admins to manage domain settings"
  ON auth.domain_settings
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_domain_settings_updated_at
  BEFORE UPDATE ON auth.domain_settings
  FOR EACH ROW
  EXECUTE FUNCTION auth.update_updated_at_column();

-- Function to update redirect URLs for new domain
CREATE OR REPLACE FUNCTION auth.update_domain_redirect_urls(new_domain text)
RETURNS void AS $$
DECLARE
  base_paths text[] := ARRAY['/auth/callback', '/auth/reset-password', '/auth/verify-email'];
  path text;
BEGIN
  -- Delete existing URLs
  DELETE FROM auth.redirect_urls;
  
  -- Insert new URLs with custom domain
  FOREACH path IN ARRAY base_paths LOOP
    INSERT INTO auth.redirect_urls (url)
    VALUES 
      ('http://' || new_domain || path),
      ('https://' || new_domain || path);
  END LOOP;
END;
$$ LANGUAGE plpgsql;