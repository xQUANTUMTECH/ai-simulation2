/*
  # Add Authentication Features
  
  1. New Tables
    - `auth_sessions`
      - Tracks user sessions across devices
      - Stores session metadata and device info
    - `failed_login_attempts`
      - Tracks failed login attempts for security
      - Supports account lockout functionality
    - `password_reset_tokens`
      - Manages password reset requests
      - Includes expiration and usage tracking

  2. Changes to Existing Tables
    - Add session management fields to users
    - Add security fields for login attempts
    - Add account management fields

  3. Security
    - Add RLS policies for new tables
    - Update existing policies
*/

-- Create auth_sessions table
CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_info jsonb,
  ip_address text,
  last_active timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_valid boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create failed_login_attempts table
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  attempt_date timestamptz DEFAULT now(),
  attempt_count integer DEFAULT 1
);

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted')),
ADD COLUMN IF NOT EXISTS failed_login_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until timestamptz,
ADD COLUMN IF NOT EXISTS last_password_change timestamptz,
ADD COLUMN IF NOT EXISTS force_password_change boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS accepted_terms boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz,
ADD COLUMN IF NOT EXISTS account_deletion_requested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS account_deletion_requested_at timestamptz;

-- Add fields to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS session_timeout integer DEFAULT 3600, -- 1 hour in seconds
ADD COLUMN IF NOT EXISTS max_sessions integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS notify_on_login boolean DEFAULT true;

-- Create function to handle failed login attempts
CREATE OR REPLACE FUNCTION handle_failed_login()
RETURNS trigger AS $$
BEGIN
  UPDATE users
  SET failed_login_count = failed_login_count + 1,
      locked_until = CASE 
        WHEN failed_login_count >= 5 THEN now() + interval '15 minutes'
        ELSE locked_until
      END
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for failed login attempts
CREATE TRIGGER on_failed_login
  AFTER INSERT ON failed_login_attempts
  FOR EACH ROW
  EXECUTE FUNCTION handle_failed_login();

-- Create function to reset failed login attempts
CREATE OR REPLACE FUNCTION reset_failed_login_attempts()
RETURNS trigger AS $$
BEGIN
  UPDATE users
  SET failed_login_count = 0,
      locked_until = NULL
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to reset failed login attempts on successful login
CREATE TRIGGER on_successful_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION reset_failed_login_attempts();

-- Add RLS policies
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Policies for auth_sessions
CREATE POLICY "Users can view own sessions"
  ON auth_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON auth_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for failed_login_attempts
CREATE POLICY "Only system can insert failed attempts"
  ON failed_login_attempts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policies for password_reset_tokens
CREATE POLICY "Users can view own reset tokens"
  ON password_reset_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_user_id ON failed_login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);