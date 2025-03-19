-- Fix per la tabella documents e i ruoli utente

-- 1. Creazione tabella documents se non esiste
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  size BIGINT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  metadata JSONB DEFAULT '{}'::jsonb,
  associations JSONB DEFAULT '{}'::jsonb
);

-- 2. Creazione indici per la tabella documents
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

-- 3. Abilitazione RLS sulla tabella documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 4. Creazione policy per la tabella documents
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents" 
  ON public.documents 
  FOR SELECT 
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
CREATE POLICY "Users can insert their own documents" 
  ON public.documents 
  FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents" 
  ON public.documents 
  FOR UPDATE 
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete their own documents" 
  ON public.documents 
  FOR DELETE 
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;
CREATE POLICY "Admins can view all documents" 
  ON public.documents 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins can insert all documents" ON public.documents;
CREATE POLICY "Admins can insert all documents" 
  ON public.documents 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins can update all documents" ON public.documents;
CREATE POLICY "Admins can update all documents" 
  ON public.documents 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins can delete all documents" ON public.documents;
CREATE POLICY "Admins can delete all documents" 
  ON public.documents 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  );

-- 5. Correggiamo le impostazioni degli storage buckets
DO $$ 
BEGIN
  -- Assicuriamoci che il bucket 'documents' esista
  BEGIN
    -- Questo è un modo indiretto per verificare se un bucket esiste in Supabase
    PERFORM storage.buckets.check_if_bucket_exists('documents');
    
    EXCEPTION WHEN OTHERS THEN
    -- Se arriviamo qui, il bucket non esiste, quindi lo creiamo
    EXECUTE format('
      INSERT INTO storage.buckets (id, name, public)
      VALUES (''documents'', ''documents'', false)
    ');
  END;
END $$;

-- 6. Aggiungiamo metadati agli utenti admin esistenti se necessario
DO $$ 
BEGIN
  -- Verificare se un utente admin non ha il ruolo corretto nei metadata
  UPDATE auth.users 
  SET raw_user_meta_data = raw_user_meta_data || '{"role": "ADMIN"}'::jsonb
  WHERE 
    id IN (SELECT id FROM public.users WHERE role = 'ADMIN')
    AND (raw_user_meta_data->>'role' IS NULL OR raw_user_meta_data->>'role' != 'ADMIN');
END $$;

-- 7. Fix per la tabella users
DO $$ 
BEGIN
  -- Se manca il campo username, lo aggiungiamo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.users ADD COLUMN username TEXT UNIQUE;
  END IF;
  
  -- Se manca il campo account_status, lo aggiungiamo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.users ADD COLUMN account_status TEXT DEFAULT 'active' NOT NULL;
  END IF;
END $$;

-- 8. Assicuriamoci che gli utenti abbiano il campo nell'auth.users che corrisponde al ruolo nella tabella public.users
DO $$ 
BEGIN
  UPDATE public.users
  SET role = 'ADMIN'
  WHERE id IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'ADMIN'
  )
  AND role != 'ADMIN';
END $$;
