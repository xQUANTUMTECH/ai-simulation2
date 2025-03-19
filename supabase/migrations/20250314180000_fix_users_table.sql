-- Migrazione di emergenza per risolvere il problema della tabella users mancante
-- Questo script corregge l'errore "relation "users" does not exist" nelle policy RLS

DO $$
BEGIN
    -- Verifica se la tabella users esiste già
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        -- Crea la tabella users se non esiste
        CREATE TABLE public.users (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT NOT NULL UNIQUE,
            username TEXT UNIQUE,
            full_name TEXT,
            avatar_url TEXT,
            role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'INSTRUCTOR')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            deleted_at TIMESTAMP WITH TIME ZONE,
            company TEXT,
            preferences JSONB DEFAULT '{}'::jsonb
        );

        -- Aggiungi commento alla tabella
        COMMENT ON TABLE public.users IS 'Profili degli utenti dell''applicazione';
        
        -- Configura RLS per la tabella users
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Gli utenti possono leggere i profili pubblici"
            ON public.users
            FOR SELECT
            USING (true);
            
        CREATE POLICY "Gli utenti possono modificare solo il proprio profilo"
            ON public.users
            FOR UPDATE
            USING (auth.uid() = id);
            
        CREATE POLICY "Gli amministratori possono vedere tutti i profili"
            ON public.users
            FOR SELECT
            USING (
                (auth.uid() IN (SELECT id FROM public.users WHERE role = 'ADMIN'))
            );
            
        CREATE POLICY "Gli amministratori possono modificare tutti i profili"
            ON public.users
            FOR UPDATE
            USING (
                (auth.uid() IN (SELECT id FROM public.users WHERE role = 'ADMIN'))
            );

        -- Trigger per aggiornare updated_at
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON public.users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Aggiungi un utente admin di test se non esiste
DO $$
BEGIN
    -- Verifica se l'utente admin è già stato creato
    IF NOT EXISTS (SELECT FROM public.users WHERE email = 'admin@example.com') THEN
        -- Nota: questo utente deve corrispondere a un record in auth.users
        -- In un ambiente di sviluppo, potrebbe essere necessario registrare l'utente manualmente
        INSERT INTO public.users (id, email, username, full_name, role)
        VALUES ('00000000-0000-0000-0000-000000000000', 'admin@example.com', 'admin', 'Admin Utente', 'ADMIN')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END
$$;
