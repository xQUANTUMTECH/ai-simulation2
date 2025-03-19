-- Questo file contiene tutte le migrazioni essenziali eccetto quella delle API key

-- Contenuto di 20250314163500_activity_alerts_tables.sql
-- Tabella per il registro delle attività di sistema
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('user', 'course', 'video', 'document', 'certificate', 'alert', 'admin', 'system')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_id TEXT, -- ID generico relativo all'elemento coinvolto
  importance TEXT NOT NULL CHECK (importance IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabella per tracciare le attività lette dagli utenti
CREATE TABLE IF NOT EXISTS public.activity_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  UNIQUE(activity_id, user_id)
);

-- Tabella per gli avvisi di sistema
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  category TEXT NOT NULL CHECK (
    category IN (
      'system', 'security', 'performance', 'storage', 'network',
      'application', 'database', 'user', 'content', 'ai'
    )
  ),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  auto_resolve BOOLEAN NOT NULL DEFAULT false,
  resolve_by TIMESTAMPTZ, -- Data di scadenza per la risoluzione automatica
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT -- Origine dell'avviso (servizio, componente, etc.)
);

-- Indici per migliorare le performance delle query più comuni
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_importance ON public.activities(importance);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at);

CREATE INDEX IF NOT EXISTS idx_activity_reads_user_id ON public.activity_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_reads_read ON public.activity_reads(read);

CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON public.system_alerts(type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_category ON public.system_alerts(category);
CREATE INDEX IF NOT EXISTS idx_system_alerts_priority ON public.system_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON public.system_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved_at ON public.system_alerts(resolved_at);
CREATE INDEX IF NOT EXISTS idx_system_alerts_assigned_to ON public.system_alerts(assigned_to);

-- Funzione per aggiornare il timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per inviare notifiche quando vengono create nuove attività con importanza alta
CREATE OR REPLACE FUNCTION notify_high_importance_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.importance = 'high' THEN
    -- Inserisci logica qui per notifiche (esempio con pg_notify)
    PERFORM pg_notify('high_importance_activity', json_build_object(
      'activity_id', NEW.id, 
      'message', NEW.message,
      'type', NEW.type
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_high_importance_activity ON public.activities;
CREATE TRIGGER trigger_notify_high_importance_activity
AFTER INSERT ON public.activities
FOR EACH ROW
EXECUTE FUNCTION notify_high_importance_activity();

-- Trigger per inviare notifiche quando vengono creati nuovi avvisi critici
CREATE OR REPLACE FUNCTION notify_critical_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.priority IN ('high', 'critical') THEN
    -- Inserisci logica qui per notifiche (esempio con pg_notify)
    PERFORM pg_notify('critical_alert', json_build_object(
      'alert_id', NEW.id, 
      'message', NEW.message,
      'category', NEW.category,
      'priority', NEW.priority
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_critical_alert ON public.system_alerts;
CREATE TRIGGER trigger_notify_critical_alert
AFTER INSERT ON public.system_alerts
FOR EACH ROW
EXECUTE FUNCTION notify_critical_alert();

-- RLS policies per attività
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Solo gli admin possono inserire attività
CREATE POLICY admin_insert_activities ON public.activities
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
  )
);

-- Gli utenti possono vedere solo le attività create da loro o rilevanti per loro
CREATE POLICY read_activities ON public.activities
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  related_id IS NULL OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
  )
);

-- RLS policies per activity_reads
ALTER TABLE public.activity_reads ENABLE ROW LEVEL SECURITY;

-- Gli utenti possono leggere e modificare solo i propri dati di lettura
CREATE POLICY user_activity_reads ON public.activity_reads
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS policies per system_alerts
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Solo gli admin possono inserire avvisi
CREATE POLICY admin_insert_alerts ON public.system_alerts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
  )
);

-- Solo gli admin possono aggiornare avvisi
CREATE POLICY admin_update_alerts ON public.system_alerts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
  )
);

-- Solo gli admin possono vedere avvisi
CREATE POLICY admin_read_alerts ON public.system_alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
  )
);

-- Contenuto di 20250314173000_media_library_schema.sql
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

-- Contenuto di 20250314180000_fix_users_table.sql e 20250314182800_users_role_policy_fix.sql
-- Verifica se la tabella users esiste già
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

-- Ora verifichiamo se esiste la policy per le simulazioni
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'simulations') THEN
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
  END IF;
END
$$;
