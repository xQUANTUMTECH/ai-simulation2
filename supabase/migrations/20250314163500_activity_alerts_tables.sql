-- Migrazione per creazione tabelle activities e system_alerts
-- Implementazione database per activity feed e system alerts dashboard

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

-- Commenti per documentazione
COMMENT ON TABLE public.activities IS 'Registro delle attività e degli eventi di sistema';
COMMENT ON TABLE public.activity_reads IS 'Traccia quali attività sono state lette dagli utenti';
COMMENT ON TABLE public.system_alerts IS 'Avvisi di sistema per dashboard di amministrazione';

COMMENT ON COLUMN public.activities.type IS 'Tipo di attività (user, course, video, document, certificate, alert, admin, system)';
COMMENT ON COLUMN public.activities.importance IS 'Livello di importanza dell''attività (low, medium, high)';
COMMENT ON COLUMN public.activities.related_id IS 'ID dell''elemento correlato all''attività';

COMMENT ON COLUMN public.system_alerts.type IS 'Tipo di avviso (info, warning, error, success)';
COMMENT ON COLUMN public.system_alerts.category IS 'Categoria dell''avviso (system, security, performance, etc.)';
COMMENT ON COLUMN public.system_alerts.priority IS 'Priorità dell''avviso (low, medium, high, critical)';
COMMENT ON COLUMN public.system_alerts.auto_resolve IS 'Se l''avviso deve essere risolto automaticamente dopo un certo periodo';
