/*
  # Auth Redirect Settings

  1. Changes
    - Add allowed redirect URLs for authentication callbacks
    - Set site URL for authentication flows
*/

-- Add allowed redirect URLs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.redirect_urls WHERE url = 'http://localhost:5173/auth/callback'
  ) THEN
    INSERT INTO auth.redirect_urls (url)
    VALUES 
      ('http://localhost:5173/auth/callback'),
      ('http://localhost:5173/auth/reset-password'),
      ('https://extraordinary-strudel-696753.netlify.app/auth/callback'),
      ('https://extraordinary-strudel-696753.netlify.app/auth/reset-password');
  END IF;
END $$;

-- Update site URL
DO $$
BEGIN
  UPDATE auth.config SET
    site_url = 'https://extraordinary-strudel-696753.netlify.app';
END $$;