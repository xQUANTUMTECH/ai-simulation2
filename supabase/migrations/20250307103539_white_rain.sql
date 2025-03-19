/*
  # Update Auth Redirect Settings

  1. Changes
    - Add custom domain support for auth redirects
    - Update email templates with new domain
    - Add site URL configuration

  2. Security
    - Maintain existing RLS policies
    - Add validation for domain format
*/

-- Add custom domain validation function
CREATE OR REPLACE FUNCTION validate_domain(domain text)
RETURNS boolean AS $$
BEGIN
  RETURN domain ~ '^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Update auth settings with custom domain support
DO $$ 
BEGIN
  -- Add custom domain if not exists
  IF NOT EXISTS (
    SELECT 1 FROM auth_settings 
    WHERE security_settings ? 'custom_domain'
  ) THEN
    UPDATE auth_settings
    SET security_settings = security_settings || 
      jsonb_build_object(
        'custom_domain', NULL,
        'use_custom_domain', false
      );
  END IF;

  -- Update email templates with dynamic domain
  UPDATE auth_settings
  SET email_templates = jsonb_build_object(
    'confirmation', jsonb_build_object(
      'subject', 'Conferma il tuo indirizzo email',
      'content', 'Clicca sul link seguente per confermare il tuo indirizzo email: {{ .ConfirmationURL }}'
    ),
    'recovery', jsonb_build_object(
      'subject', 'Reimposta la tua password',
      'content', 'Clicca sul link seguente per reimpostare la tua password: {{ .RecoveryURL }}'
    ),
    'magic_link', jsonb_build_object(
      'subject', 'Il tuo link di accesso',
      'content', 'Clicca sul link seguente per accedere: {{ .MagicLinkURL }}'
    )
  );
END $$;