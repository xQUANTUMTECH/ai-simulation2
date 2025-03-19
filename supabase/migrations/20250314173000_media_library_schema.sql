-- Migrazione per lo schema della Media Library
-- Crea/aggiorna tabelle e indici necessari per la gestione dei media

-- Aggiunge campi mancanti alla tabella documents se non esistono già
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'documents' 
                  AND column_name = 'status') THEN
        ALTER TABLE public.documents ADD COLUMN status text DEFAULT 'processing' NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'documents' 
                  AND column_name = 'metadata') THEN
        ALTER TABLE public.documents ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    END IF;
END
$$;

-- Aggiunge indici per migliorare le performance delle query sulla Media Library
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_status') THEN
        CREATE INDEX idx_documents_status ON public.documents(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_created_by') THEN
        CREATE INDEX idx_documents_created_by ON public.documents(created_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_academy_videos_status') THEN
        CREATE INDEX idx_academy_videos_status ON public.academy_videos(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_academy_videos_uploaded_by') THEN
        CREATE INDEX idx_academy_videos_uploaded_by ON public.academy_videos(uploaded_by);
    END IF;
END
$$;

-- Aggiunge politiche RLS per controllare l'accesso ai documenti
DO $$
BEGIN
    -- Elimina le policy esistenti per evitare errori durante la creazione
    DROP POLICY IF EXISTS "Admins can read all documents" ON public.documents;
    DROP POLICY IF EXISTS "Users can read own documents" ON public.documents;
    DROP POLICY IF EXISTS "Admins can insert documents" ON public.documents;
    DROP POLICY IF EXISTS "Users can insert documents" ON public.documents;
    DROP POLICY IF EXISTS "Admins can update all documents" ON public.documents;
    DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
    DROP POLICY IF EXISTS "Admins can delete all documents" ON public.documents;
    DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
    
    -- Abilita RLS sulla tabella documents (se non già abilitato)
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
    
    -- Crea nuove policy
    CREATE POLICY "Admins can read all documents" 
        ON public.documents FOR SELECT 
        USING (
            EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid()
                AND auth.users.role = 'ADMIN'
            )
        );
    
    CREATE POLICY "Users can read own documents" 
        ON public.documents FOR SELECT 
        USING (created_by = auth.uid());
    
    CREATE POLICY "Admins can insert documents" 
        ON public.documents FOR INSERT 
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid()
                AND auth.users.role = 'ADMIN'
            )
        );
    
    CREATE POLICY "Users can insert documents" 
        ON public.documents FOR INSERT 
        WITH CHECK (created_by = auth.uid());
    
    CREATE POLICY "Admins can update all documents" 
        ON public.documents FOR UPDATE 
        USING (
            EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid()
                AND auth.users.role = 'ADMIN'
            )
        );
    
    CREATE POLICY "Users can update own documents" 
        ON public.documents FOR UPDATE 
        USING (created_by = auth.uid());
    
    CREATE POLICY "Admins can delete all documents" 
        ON public.documents FOR DELETE 
        USING (
            EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid()
                AND auth.users.role = 'ADMIN'
            )
        );
    
    CREATE POLICY "Users can delete own documents" 
        ON public.documents FOR DELETE 
        USING (created_by = auth.uid());
END
$$;

-- Aggiungi trigger per aggiornare il timestamp updated_at sui documenti
DO $$
BEGIN
    -- Funzione per aggiornare il timestamp
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
           NEW.updated_at = now();
           RETURN NEW;
        END;
        $$ language 'plpgsql';
    END IF;

    -- Crea il trigger se non esiste già
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_documents_updated_at') THEN
        CREATE TRIGGER update_documents_updated_at
        BEFORE UPDATE ON public.documents
        FOR EACH ROW
        EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END
$$;
