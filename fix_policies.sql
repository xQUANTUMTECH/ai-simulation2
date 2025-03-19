-- Fix per il problema di ricorsione infinita nelle policy RLS
-- Questo script rimuove policy problematiche e le ricrea in modo non ricorsivo

-- ==========================================
-- 1. ANALISI E FIX POLICY PROBLEMATICHE
-- ==========================================

-- Elenco delle policy della tabella users per analisi
SELECT
    pol.policyname,
    tab.relname AS table_name,
    pol.cmd AS command,
    pol.qual AS condition
FROM
    pg_catalog.pg_policy pol
JOIN
    pg_catalog.pg_class tab ON pol.polrelid = tab.oid
JOIN
    pg_catalog.pg_namespace ns ON tab.relnamespace = ns.oid
WHERE
    ns.nspname = 'public'
AND
    tab.relname = 'users';

-- Rimuovi tutte le policy problematiche sulla tabella users
DROP POLICY IF EXISTS "Users can select their own data" ON public.users;
DROP POLICY IF EXISTS "Administrators can view all user data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Administrators can update user data" ON public.users;
DROP POLICY IF EXISTS "Administrators can create users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all" ON public.users;

-- Crea nuove policy non ricorsive per la tabella users
-- Policy 1: Gli utenti possono vedere solo il proprio profilo
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Policy 2: Gli amministratori possono vedere tutti i profili
CREATE POLICY "Admins can view all profiles" ON public.users
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
        )
    );

-- Policy 3: Gli utenti possono aggiornare solo il proprio profilo
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE 
    USING (auth.uid() = id);

-- Policy 4: Gli amministratori possono aggiornare tutti i profili
CREATE POLICY "Admins can update all profiles" ON public.users
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
        )
    );

-- Policy 5: Solo gli amministratori possono inserire nuovi utenti
CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
        )
        OR 
        -- Durante la registrazione, un utente può creare il proprio profilo
        auth.uid() = id
    );

-- ==========================================
-- 2. CORREZIONE DI ALTRE POLICY PROBLEMATICHE
-- ==========================================

-- Policy per auth_sessions senza riferimenti circolari
DROP POLICY IF EXISTS "Users can only view their own sessions" ON public.auth_sessions;
DROP POLICY IF EXISTS "Users can only insert their own sessions" ON public.auth_sessions;
DROP POLICY IF EXISTS "Users can only update their own sessions" ON public.auth_sessions;
DROP POLICY IF EXISTS "Users can only delete their own sessions" ON public.auth_sessions;

CREATE POLICY "Users session select" ON public.auth_sessions
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users session insert" ON public.auth_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users session update" ON public.auth_sessions
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users session delete" ON public.auth_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Policy per failed_login_attempts senza riferimenti circolari
DROP POLICY IF EXISTS "Admins can view failed login attempts" ON public.failed_login_attempts;

CREATE POLICY "Admins view failed logins" ON public.failed_login_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
        )
    );

-- Policy per user_settings senza riferimenti circolari
DROP POLICY IF EXISTS "Users can view only their settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert only their settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update only their settings" ON public.user_settings;

CREATE POLICY "Users settings select" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users settings insert" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users settings update" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- 3. VERIFICA CONFIGURAZIONE RLS
-- ==========================================

-- Assicurati che RLS sia abilitato per tutte le tabelle public
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Query per verificare che RLS sia attivo
SELECT
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN 'RLS Abilitato' ELSE 'RLS NON Abilitato' END as rls_status
FROM
    pg_tables
WHERE
    schemaname = 'public'
    AND tablename IN ('users', 'auth_sessions', 'failed_login_attempts', 'user_settings');
