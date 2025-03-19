-- Migrazione per risolvere l'errore "ERROR: relation "users" does not exist (SQLSTATE 42P01)"
-- che si verifica durante l'applicazione delle RLS policy sulle simulazioni

-- Verifichiamo prima se la tabella users esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'users'
  ) THEN
    -- Creazione tabella users se non esiste
    CREATE TABLE public.users (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'INSTRUCTOR')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
    );

    -- Aggiungiamo commenti sulla tabella
    COMMENT ON TABLE public.users IS 'Tabella profili utenti con ruoli per controllo accessi';
    COMMENT ON COLUMN public.users.id IS 'ID utente, collegato a auth.users';
    COMMENT ON COLUMN public.users.email IS 'Email utente, deve essere unica';
    COMMENT ON COLUMN public.users.full_name IS 'Nome completo utente';
    COMMENT ON COLUMN public.users.role IS 'Ruolo utente: USER, ADMIN o INSTRUCTOR';

    -- Trigger per updated_at
    CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- RLS su users
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    -- Policy: Gli utenti possono visualizzare tutti gli utenti
    CREATE POLICY "Gli utenti possono visualizzare tutti gli utenti"
    ON public.users
    FOR SELECT
    USING (true);

    -- Policy: Gli utenti possono modificare solo il proprio profilo
    CREATE POLICY "Gli utenti possono modificare solo il proprio profilo"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

    -- Policy: Solo gli admin possono eliminare utenti
    CREATE POLICY "Solo gli admin possono eliminare utenti"
    ON public.users
    FOR DELETE
    USING (
      auth.uid() IN (
        SELECT id FROM public.users WHERE role = 'ADMIN'
      )
    );
  END IF;
END
$$;

-- Ora verifichiamo se esiste la policy per le simulazioni
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies
    WHERE tablename = 'simulations'
    AND policyname = 'Instructors can create simulations'
  ) THEN
    -- Ricreiamo la policy per le simulazioni ma con controllo che la tabella users esista
    CREATE POLICY "Instructors can create simulations"     
    ON simulations
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND (users.role = 'ADMIN' OR users.role = 'INSTRUCTOR')
      )
    );
  END IF;
END
$$;

-- Ricrea anche altre policy che potrebbero dipendere dalla tabella users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies
    WHERE tablename = 'simulations'
    AND policyname = 'Instructors can update simulations'
  ) THEN
    CREATE POLICY "Instructors can update simulations"     
    ON simulations
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND (users.role = 'ADMIN' OR users.role = 'INSTRUCTOR')
      )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies
    WHERE tablename = 'simulations'
    AND policyname = 'Instructors can delete simulations'
  ) THEN
    CREATE POLICY "Instructors can delete simulations"     
    ON simulations
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND (users.role = 'ADMIN' OR users.role = 'INSTRUCTOR')
      )
    );
  END IF;
END
$$;
