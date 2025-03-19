-- Migration: Advanced Features for Cafasso AI Academy
-- Date: 2025-03-20

-- 1. Aggiungere campi per permessi utente
ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Assicurati che admin esistenti abbiano i permessi corretti
UPDATE public.profiles 
SET is_admin = true, 
    permissions = '{"can_upload": true, "can_create_course": true, "can_edit_course": true, "can_delete_course": true}'::jsonb
WHERE role = 'admin' OR email = 'direttore@cafasso.edu';

-- 2. Tabella per certificati
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    template_html TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabella per certificati ottenuti dagli utenti
CREATE TABLE IF NOT EXISTS public.user_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    certificate_id UUID REFERENCES public.certificates(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    completion_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    score INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    certificate_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indice per la ricerca veloce
CREATE INDEX IF NOT EXISTS user_certificates_user_id_idx ON public.user_certificates(user_id);
CREATE INDEX IF NOT EXISTS user_certificates_certificate_id_idx ON public.user_certificates(certificate_id);

-- 4. Miglioramento tabella quiz per includere feedback
ALTER TABLE IF EXISTS public.quizzes
ADD COLUMN IF NOT EXISTS feedback_template JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS min_passing_score INTEGER DEFAULT 60;

-- 5. Tabella per risultati dei quiz con feedback dettagliato
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    time_spent INTEGER, -- in seconds
    completion_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    answers JSONB DEFAULT '[]'::jsonb,
    feedback JSONB DEFAULT '{}'::jsonb,
    recommendations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_results_user_id_idx ON public.quiz_results(user_id);
CREATE INDEX IF NOT EXISTS quiz_results_quiz_id_idx ON public.quiz_results(quiz_id);

-- 6. Tabella per relazioni tra documenti e scenari
CREATE TABLE IF NOT EXISTS public.document_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES public.scenarios(id) ON DELETE CASCADE,
    relationship_type TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_scenarios_document_id_idx ON public.document_scenarios(document_id);
CREATE INDEX IF NOT EXISTS document_scenarios_scenario_id_idx ON public.document_scenarios(scenario_id);

-- 7. Tabella per relazioni tra documenti e avatar
CREATE TABLE IF NOT EXISTS public.document_avatars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    avatar_id UUID REFERENCES public.avatars(id) ON DELETE CASCADE,
    relationship_type TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_avatars_document_id_idx ON public.document_avatars(document_id);
CREATE INDEX IF NOT EXISTS document_avatars_avatar_id_idx ON public.document_avatars(avatar_id);

-- 8. Aggiungiamo RLS (Row Level Security) appropriate

-- RLS per certificati
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Certificates are viewable by everyone" 
ON public.certificates FOR SELECT 
USING (true);

CREATE POLICY "Certificates are insertable by admins only" 
ON public.certificates FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

CREATE POLICY "Certificates are updatable by admins only" 
ON public.certificates FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

CREATE POLICY "Certificates are deletable by admins only" 
ON public.certificates FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- RLS per user_certificates
ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certificates" 
ON public.user_certificates FOR SELECT 
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can insert user certificates" 
ON public.user_certificates FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- RLS per quiz_results
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quiz results" 
ON public.quiz_results FOR SELECT 
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

CREATE POLICY "Users can insert their own quiz results" 
ON public.quiz_results FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 9. Funzioni per ottenere i certificati di un utente
CREATE OR REPLACE FUNCTION get_user_certificates(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    course_title TEXT,
    completion_date TIMESTAMP WITH TIME ZONE,
    score INTEGER,
    certificate_url TEXT
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        uc.id,
        c.title,
        c.description,
        courses.title as course_title,
        uc.completion_date,
        uc.score,
        uc.certificate_url
    FROM 
        public.user_certificates uc
    JOIN 
        public.certificates c ON uc.certificate_id = c.id
    LEFT JOIN 
        public.courses ON uc.course_id = courses.id
    WHERE 
        uc.user_id = p_user_id
    ORDER BY 
        uc.completion_date DESC;
$$;

-- 10. Funzione per generare un certificato per un utente
CREATE OR REPLACE FUNCTION generate_user_certificate(
    p_user_id UUID,
    p_certificate_id UUID,
    p_course_id UUID,
    p_score INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_certificate_id UUID;
    v_user_profile RECORD;
BEGIN
    -- Ottieni i dati del profilo dell'utente
    SELECT * INTO v_user_profile FROM public.profiles WHERE id = p_user_id;
    
    -- Inserisci il certificato
    INSERT INTO public.user_certificates(
        user_id,
        certificate_id,
        course_id,
        score,
        metadata,
        certificate_url
    )
    VALUES (
        p_user_id,
        p_certificate_id,
        p_course_id,
        p_score,
        jsonb_build_object(
            'user_name', v_user_profile.full_name,
            'user_email', v_user_profile.email,
            'generation_date', now()
        ),
        -- URL temporaneo, verrebbe generato da un servizio di generazione certificati
        'https://cafassoacademy.org/certificates/' || p_certificate_id || '/' || p_user_id
    )
    RETURNING id INTO v_certificate_id;
    
    RETURN v_certificate_id;
END;
$$;
