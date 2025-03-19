-- Script SQL per creare le funzioni RPC necessarie in Supabase
-- Per utilizzare questo script:
-- 1. Accedi a Supabase Dashboard
-- 2. Vai a SQL Editor
-- 3. Crea una nuova query
-- 4. Incolla questo script completo
-- 5. Esegui la query

-- Funzione 1: Verifica che RLS sia abilitato sulle tabelle principali
CREATE OR REPLACE FUNCTION public.check_rls_enabled()
RETURNS BOOLEAN AS $$
DECLARE
  rls_enabled BOOLEAN := TRUE;
BEGIN
  -- Controlla la tabella users
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'users' AND rowsecurity = TRUE
  ) THEN
    rls_enabled := FALSE;
  END IF;
  
  -- Controlla la tabella auth_sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'auth_sessions' AND rowsecurity = TRUE
  ) THEN
    rls_enabled := FALSE;
  END IF;
  
  -- Controlla la tabella failed_login_attempts
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'failed_login_attempts' AND rowsecurity = TRUE
  ) THEN
    rls_enabled := FALSE;
  END IF;
  
  -- Controlla la tabella user_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'user_settings' AND rowsecurity = TRUE
  ) THEN
    rls_enabled := FALSE;
  END IF;
  
  RETURN rls_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione 2: Verifica la consistenza tra gli utenti in auth.users e public.users
CREATE OR REPLACE FUNCTION public.check_users_consistency()
RETURNS BOOLEAN AS $$
DECLARE
  consistent BOOLEAN := TRUE;
BEGIN
  -- Verifica che tutti gli utenti auth.users abbiano un record in public.users
  IF EXISTS (
    SELECT 1 FROM auth.users a
    LEFT JOIN public.users p ON a.id = p.id
    WHERE p.id IS NULL
  ) THEN
    consistent := FALSE;
  END IF;
  
  -- Verifica che non ci siano utenti in public.users senza corrispondenza in auth.users
  IF EXISTS (
    SELECT 1 FROM public.users p
    LEFT JOIN auth.users a ON p.id = a.id
    WHERE a.id IS NULL
  ) THEN
    consistent := FALSE;
  END IF;
  
  RETURN consistent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione 3: Verifica che la tabella users abbia tutti i campi necessari
CREATE OR REPLACE FUNCTION public.test_user_table_fields()
RETURNS BOOLEAN AS $$
DECLARE
  valid BOOLEAN := TRUE;
  required_columns TEXT[] := ARRAY['id', 'email', 'full_name', 'role', 'username', 'account_status', 'created_at'];
  col TEXT;
BEGIN
  -- Verifica che la tabella users abbia tutti i campi necessari
  FOREACH col IN ARRAY required_columns LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = col
    ) THEN
      valid := FALSE;
      RAISE NOTICE 'Colonna mancante: %', col;
    END IF;
  END LOOP;
  
  RETURN valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Esegui le funzioni per verificare che funzionino correttamente
DO $$
BEGIN
  RAISE NOTICE 'Verifica RLS abilitato: %', public.check_rls_enabled();
  RAISE NOTICE 'Verifica consistenza utenti: %', public.check_users_consistency();
  RAISE NOTICE 'Verifica campi tabella users: %', public.test_user_table_fields();
END;
$$;
