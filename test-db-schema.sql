-- Verifica dello schema del database
-- Script SQL per verificare la presenza delle tabelle e dei campi necessari

------ Verifica delle tabelle principali ------

-- Verifica tabella users e suoi campi
DO $$
DECLARE
  users_exists BOOLEAN;
  username_field_exists BOOLEAN;
  account_status_field_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) INTO users_exists;
  
  IF users_exists THEN
    RAISE NOTICE 'Tabella users esistente: OK';
    
    -- Controlla username e account_status
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'username'
    ) INTO username_field_exists;
    
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'account_status'
    ) INTO account_status_field_exists;
    
    IF username_field_exists THEN
      RAISE NOTICE 'Campo username nella tabella users: OK';
    ELSE
      RAISE WARNING 'PROBLEMA: Campo username mancante nella tabella users';
    END IF;
    
    IF account_status_field_exists THEN
      RAISE NOTICE 'Campo account_status nella tabella users: OK';
    ELSE
      RAISE WARNING 'PROBLEMA: Campo account_status mancante nella tabella users';
    END IF;
  ELSE
    RAISE WARNING 'PROBLEMA: Tabella users non trovata';
  END IF;
END
$$;

-- Verifica tabella auth_sessions
DO $$
DECLARE
  auth_sessions_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'auth_sessions'
  ) INTO auth_sessions_exists;
  
  IF auth_sessions_exists THEN
    RAISE NOTICE 'Tabella auth_sessions esistente: OK';
  ELSE
    RAISE WARNING 'PROBLEMA: Tabella auth_sessions non trovata';
  END IF;
END
$$;

-- Verifica tabella failed_login_attempts
DO $$
DECLARE
  failed_login_attempts_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'failed_login_attempts'
  ) INTO failed_login_attempts_exists;
  
  IF failed_login_attempts_exists THEN
    RAISE NOTICE 'Tabella failed_login_attempts esistente: OK';
  ELSE
    RAISE WARNING 'PROBLEMA: Tabella failed_login_attempts non trovata';
  END IF;
END
$$;

-- Verifica tabella user_settings
DO $$
DECLARE
  user_settings_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_settings'
  ) INTO user_settings_exists;
  
  IF user_settings_exists THEN
    RAISE NOTICE 'Tabella user_settings esistente: OK';
  ELSE
    RAISE WARNING 'PROBLEMA: Tabella user_settings non trovata';
  END IF;
END
$$;

------ Verifica delle tabelle di contenuto ------

-- Verifica tabella documents
DO $$
DECLARE
  documents_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'documents'
  ) INTO documents_exists;
  
  IF documents_exists THEN
    RAISE NOTICE 'Tabella documents esistente: OK';
  ELSE
    RAISE WARNING 'PROBLEMA: Tabella documents non trovata';
  END IF;
END
$$;

-- Verifica tabella scenarios
DO $$
DECLARE
  scenarios_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'scenarios'
  ) INTO scenarios_exists;
  
  IF scenarios_exists THEN
    RAISE NOTICE 'Tabella scenarios esistente: OK';
  ELSE
    RAISE WARNING 'PROBLEMA: Tabella scenarios non trovata';
  END IF;
END
$$;

------ Verifica RLS sulle tabelle ------

SELECT
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN 'RLS Abilitato' ELSE 'RLS NON Abilitato - Possibile rischio di sicurezza' END as rls_status
FROM
  pg_tables
WHERE
  schemaname = 'public'
  AND tablename IN ('users', 'auth_sessions', 'failed_login_attempts', 'user_settings', 'documents', 'scenarios')
ORDER BY
  tablename;

------ Verifica Storage Buckets ------

SELECT
  name,
  owner,
  created_at,
  updated_at,
  public
FROM
  storage.buckets
ORDER BY
  name;

------ Riepilogo Struttura Database ------

-- Conteggio tabelle per schema
SELECT
  table_schema,
  COUNT(*) as table_count
FROM
  information_schema.tables
WHERE
  table_schema NOT IN ('pg_catalog', 'information_schema')
GROUP BY
  table_schema
ORDER BY
  table_schema;

-- Verifica relazioni utente tra auth.users e public.users
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM auth.users au
      LEFT JOIN public.users pu ON au.id = pu.id
      WHERE pu.id IS NULL
      LIMIT 1
    ) THEN 'ATTENZIONE: Esistono utenti in auth.users senza profilo corrispondente in public.users'
    ELSE 'OK: Tutti gli utenti in auth.users hanno un profilo corrispondente in public.users'
  END as user_profiles_status;
