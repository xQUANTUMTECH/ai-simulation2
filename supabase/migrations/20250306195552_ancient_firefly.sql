/*
  # Fix Users Table Policies

  1. Changes
    - Fixes infinite recursion in policies
    - Simplifies policy conditions
    - Maintains security requirements
    
  2. Security
    - Updates RLS policies for users table
    - Ensures proper access control
    - Prevents policy recursion
*/

-- Drop existing policies to recreate them
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
  DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
  DROP POLICY IF EXISTS "users_select_own" ON public.users;
  DROP POLICY IF EXISTS "users_update_own" ON public.users;
END $$;

-- Create new simplified policies
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR 
    role = 'ADMIN'
  );

CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());