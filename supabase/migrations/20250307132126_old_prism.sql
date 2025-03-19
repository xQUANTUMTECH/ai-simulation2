/*
  # Add Mock Users for Testing

  1. New Users
    - Regular User:
      - Username: demo
      - Email: demo@example.com
      - Password: demo123
    - Admin User:
      - Username: admin
      - Email: admin@example.com
      - Password: admin123

  2. Security
    - Passwords are hashed
    - Users are pre-verified
    - RLS policies apply
*/

DO $$
DECLARE
  demo_user_id UUID := 'a1b2c3d4-e5f6-4321-8765-1a2b3c4d5e6f';
  admin_user_id UUID := 'f9e8d7c6-b5a4-1234-5678-9f8e7d6c5b4a';
BEGIN
  -- Create mock users in auth.users if they don't exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = demo_user_id) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      demo_user_id,
      'authenticated',
      'authenticated',
      'demo@example.com',
      crypt('demo123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Demo User","username":"demo"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = admin_user_id) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      'admin@example.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Admin User","username":"admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Create user profiles if they don't exist
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = demo_user_id) THEN
    INSERT INTO public.users (
      id,
      username,
      email,
      full_name,
      role,
      email_verified,
      terms_accepted,
      account_status
    ) VALUES (
      demo_user_id,
      'demo',
      'demo@example.com',
      'Demo User',
      'USER',
      true,
      true,
      'active'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_user_id) THEN
    INSERT INTO public.users (
      id,
      username,
      email,
      full_name,
      role,
      email_verified,
      terms_accepted,
      account_status
    ) VALUES (
      admin_user_id,
      'admin',
      'admin@example.com',
      'Admin User',
      'ADMIN',
      true,
      true,
      'active'
    );
  END IF;

  -- Create default settings for users if they don't exist
  IF NOT EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = demo_user_id) THEN
    INSERT INTO public.user_settings (
      user_id,
      email_notifications,
      language,
      theme,
      remember_me,
      session_timeout,
      notify_on_login
    ) VALUES (
      demo_user_id,
      true,
      'it',
      'dark',
      true,
      3600,
      true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = admin_user_id) THEN
    INSERT INTO public.user_settings (
      user_id,
      email_notifications,
      language,
      theme,
      remember_me,
      session_timeout,
      notify_on_login
    ) VALUES (
      admin_user_id,
      true,
      'it',
      'dark',
      true,
      3600,
      true
    );
  END IF;
END $$;