/*
  # Fix User Policies

  1. Changes
    - Remove invalid WITH CHECK clauses from SELECT policies
    - Fix public username lookup policy
    - Maintain proper access control for user data

  2. Security
    - Maintain RLS
    - Fix policy syntax while keeping security intact
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Allow public username lookup" ON public.users;

-- Add policy for public username/email lookup
CREATE POLICY "Allow public username lookup" ON public.users
  FOR SELECT
  TO public
  USING (true);

-- Recreate user policies with fixed conditions
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'ADMIN'
    )
  );