/*
  # Fix Users Table Setup

  1. Tables
    - Creates users table with all required fields
    - Adds proper constraints and indexes
    - Fixes unique constraints

  2. Security
    - Enables RLS
    - Sets up access policies
    - Configures user management trigger

  3. Changes
    - Removes duplicate trigger
    - Maintains existing functionality
*/

-- Create users table if not exists
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  email text NOT NULL,
  full_name text,
  department text,
  role text NOT NULL DEFAULT 'USER'::text CHECK (role IN ('USER', 'ADMIN')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now(),
  email_verified boolean DEFAULT false,
  terms_accepted boolean DEFAULT false,
  terms_accepted_at timestamptz,
  profile_picture text,
  last_login timestamptz,
  session_data jsonb,
  account_status text DEFAULT 'active'::text CHECK (account_status IN ('active', 'suspended', 'deleted')),
  failed_login_count integer DEFAULT 0,
  locked_until timestamptz,
  last_password_change timestamptz,
  force_password_change boolean DEFAULT false,
  account_deletion_requested boolean DEFAULT false,
  account_deletion_requested_at timestamptz
);

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON public.users(username);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create or replace the function to handle new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id,
    username,
    email,
    full_name,
    role
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'USER'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create policies
DO $$ BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
  DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
END $$;

-- Create new policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );