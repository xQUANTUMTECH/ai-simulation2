-- Script per creare le tabelle mancanti identificate nell'analisi
-- Questo script crea tabelle che sono utilizzate nei servizi ma potrebbero non esistere nel database

-- Abilita le estensioni necessarie se non esistono
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crea tabella auth_sessions se non esiste
CREATE TABLE IF NOT EXISTS public.auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_info JSONB,
    ip_address TEXT,
    is_valid BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crea tabella failed_login_attempts se non esiste
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address TEXT,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crea tabella user_settings se non esiste
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    language TEXT DEFAULT 'it',
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Aggiungi i campi mancanti alla tabella users se necessario
DO $$
BEGIN
    -- Aggiungi il campo username se non esiste
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'username') THEN
        ALTER TABLE public.users ADD COLUMN username TEXT;
    END IF;
    
    -- Aggiungi il campo account_status se non esiste
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'users' 
                AND column_name = 'account_status') THEN
        ALTER TABLE public.users ADD COLUMN account_status TEXT DEFAULT 'active';
    END IF;
END
$$;

-- Crea policy RLS per le nuove tabelle
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only view their own sessions" ON public.auth_sessions
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can only insert their own sessions" ON public.auth_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can only update their own sessions" ON public.auth_sessions
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can only delete their own sessions" ON public.auth_sessions
    FOR DELETE USING (auth.uid() = user_id);
    
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
-- Solo gli amministratori possono vedere i tentativi falliti di login
CREATE POLICY "Admins can view failed login attempts" ON public.failed_login_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
    );
    
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view only their settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert only their settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update only their settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Crea indici per migliorare le prestazioni
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON public.auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_user_id ON public.failed_login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
