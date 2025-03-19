/*
  # Auth Configuration Setup
  
  1. Changes
    - Create auth schema if not exists
    - Set up auth settings and email templates
    - Configure allowed redirect URLs
    - Add RLS policies for auth tables
    
  2. Security
    - Enable email confirmation
    - Secure email settings
    - Proper redirect handling
*/

-- Create auth schema if not exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth settings table
CREATE TABLE IF NOT EXISTS auth.config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid,
  provider_id uuid,
  provider_type text,
  provider_client_id text,
  provider_client_secret text,
  provider_redirect_uri text,
  provider_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create email templates table
CREATE TABLE IF NOT EXISTS auth.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text NOT NULL,
  subject text NOT NULL,
  content_html text NOT NULL,
  content_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create allowed redirect URLs table
CREATE TABLE IF NOT EXISTS auth.redirect_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default email templates
INSERT INTO auth.email_templates (template_type, subject, content_html, content_text) 
VALUES 
(
  'confirmation',
  'Conferma il tuo indirizzo email',
  '<!DOCTYPE html><html><body><h1>Conferma Email</h1><p>Clicca sul link per confermare il tuo indirizzo email:</p><p><a href="{{ .ConfirmationURL }}">Conferma Email</a></p></body></html>',
  'Conferma il tuo indirizzo email: {{ .ConfirmationURL }}'
),
(
  'recovery',
  'Reset Password',
  '<!DOCTYPE html><html><body><h1>Reset Password</h1><p>Clicca sul link per resettare la tua password:</p><p><a href="{{ .RecoveryURL }}">Reset Password</a></p></body></html>',
  'Reset la tua password: {{ .RecoveryURL }}'
),
(
  'magic_link',
  'Link di accesso',
  '<!DOCTYPE html><html><body><h1>Link di accesso</h1><p>Clicca sul link per accedere:</p><p><a href="{{ .MagicLinkURL }}">Accedi</a></p></body></html>',
  'Accedi con questo link: {{ .MagicLinkURL }}'
)
ON CONFLICT DO NOTHING;

-- Insert default redirect URLs
INSERT INTO auth.redirect_urls (url) 
VALUES 
  ('http://localhost:5173/auth/callback'),
  ('http://localhost:5173/auth/reset-password'),
  ('http://localhost:5173/auth/verify-email')
ON CONFLICT DO NOTHING;

-- Create function to validate redirect URLs
CREATE OR REPLACE FUNCTION auth.is_valid_redirect_url(redirect_url text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.redirect_urls
    WHERE redirect_url LIKE url || '%'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE auth.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.redirect_urls ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access to email templates"
  ON auth.email_templates
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to redirect URLs"
  ON auth.redirect_urls
  FOR SELECT
  TO public
  USING (true);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION auth.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_auth_config_updated_at
  BEFORE UPDATE ON auth.config
  FOR EACH ROW
  EXECUTE FUNCTION auth.update_updated_at_column();

CREATE TRIGGER update_auth_email_templates_updated_at
  BEFORE UPDATE ON auth.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION auth.update_updated_at_column();

CREATE TRIGGER update_auth_redirect_urls_updated_at
  BEFORE UPDATE ON auth.redirect_urls
  FOR EACH ROW
  EXECUTE FUNCTION auth.update_updated_at_column();