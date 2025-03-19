/*
  # Fix users table constraints and indexes

  1. Changes
    - Update existing usernames to be valid
    - Add check constraint for valid username format
    - Add unique constraints and indexes
    - Add trigger to prevent username/email changes

  2. Security
    - Maintains data integrity
    - Ensures unique usernames and emails
    - Prevents unauthorized changes
*/

-- First, update any invalid usernames to ensure they match the format
UPDATE users 
SET username = REGEXP_REPLACE(
  LOWER(REGEXP_REPLACE(email, '@.*$', '')), -- Take part before @ and lowercase it
  '[^a-z0-9_]', -- Remove any chars that aren't alphanumeric or underscore
  '_' -- Replace with underscore
);

-- Ensure usernames are at least 3 chars
UPDATE users 
SET username = username || '_user'
WHERE LENGTH(username) < 3;

-- Ensure usernames are unique by appending numbers if needed
CREATE OR REPLACE FUNCTION make_usernames_unique() RETURNS void AS $$
DECLARE
    duplicate RECORD;
    affected RECORD;
    new_username TEXT;
    counter INTEGER;
BEGIN
    FOR duplicate IN
        SELECT username, COUNT(*) as cnt
        FROM users
        GROUP BY username
        HAVING COUNT(*) > 1
    LOOP
        counter := 1;
        FOR affected IN
            SELECT id FROM users WHERE username = duplicate.username
        LOOP
            IF counter > 1 THEN  -- Skip first occurrence
                new_username := duplicate.username || counter;
                UPDATE users SET username = new_username WHERE id = affected.id;
            END IF;
            counter := counter + 1;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT make_usernames_unique();

-- Now add the constraints
ALTER TABLE users 
ADD CONSTRAINT users_username_format_check 
CHECK (username ~* '^[a-zA-Z0-9_]{3,30}$');

-- Add unique constraint on email if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_email_unique'
  ) THEN
    ALTER TABLE users 
    ADD CONSTRAINT users_email_unique 
    UNIQUE (email);
  END IF;
END $$;

-- Add unique constraint on username if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_username_unique'
  ) THEN
    ALTER TABLE users 
    ADD CONSTRAINT users_username_unique 
    UNIQUE (username);
  END IF;
END $$;

-- Add index on email if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_users_email'
  ) THEN
    CREATE INDEX idx_users_email ON users (email);
  END IF;
END $$;

-- Add index on username if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_users_username'
  ) THEN
    CREATE INDEX idx_users_username ON users (username);
  END IF;
END $$;

-- Add trigger to prevent username/email changes after account creation
CREATE OR REPLACE FUNCTION prevent_username_email_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.username != NEW.username THEN
    RAISE EXCEPTION 'Username cannot be changed after account creation';
  END IF;
  IF OLD.email != NEW.email THEN
    RAISE EXCEPTION 'Email cannot be changed directly. Use auth.users to change email';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'prevent_username_email_changes_trigger'
  ) THEN
    CREATE TRIGGER prevent_username_email_changes_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_username_email_changes();
  END IF;
END $$;