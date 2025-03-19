/*
  # Add Username Support

  1. Changes
    - Add username column to users table if not exists
    - Add unique index for username if not exists
    - Create/update user creation trigger function
    
  2. Security
    - Function runs with SECURITY DEFINER
    - Safe handling of existing data
    
  3. Notes
    - Uses IF NOT EXISTS to avoid conflicts
    - Handles username generation fallback
*/

-- Safely add username column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'username'
  ) THEN
    ALTER TABLE public.users ADD COLUMN username text;
  END IF;
END $$;

-- Safely add unique index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND indexname = 'users_username_idx'
  ) THEN
    CREATE UNIQUE INDEX users_username_idx ON public.users (username);
  END IF;
END $$;

-- Update or create the user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), -- Fallback to email if no username
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'USER'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();