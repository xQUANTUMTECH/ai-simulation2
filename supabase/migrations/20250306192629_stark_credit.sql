/*
  # Add Authentication Features
  
  1. Changes
    - Add remember_me to user_settings
    - Add email_verified to users
    - Add terms_accepted to users
    - Add last_login to users
    - Add session_data to users
    - Add profile_picture to users

  2. Security
    - Add policies for new fields
    - Update existing policies
*/

-- Add new columns to users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS profile_picture text,
ADD COLUMN IF NOT EXISTS last_login timestamptz,
ADD COLUMN IF NOT EXISTS session_data jsonb;

-- Add remember_me to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS remember_me boolean DEFAULT false;

-- Create function to update last_login
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS trigger AS $$
BEGIN
  UPDATE public.users
  SET last_login = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for last_login
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_login();

-- Update RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);