-- Migration per la gestione delle chiavi API
-- Creazione tabella api_keys per memorizzare le configurazioni delle chiavi API
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,  -- Nome identificativo unico della chiave
  service TEXT NOT NULL,      -- Servizio associato (groq, openrouter, ecc.)
  key TEXT NOT NULL,          -- Valore della chiave API (dovrebbe essere crittografato)
  is_active BOOLEAN NOT NULL DEFAULT true,  -- Se la chiave è attualmente attiva
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,     -- Data di scadenza opzionale
  usage_limit INTEGER,        -- Limite di utilizzo opzionale
  current_usage INTEGER NOT NULL DEFAULT 0,  -- Utilizzo corrente
  last_rotated TIMESTAMPTZ NOT NULL DEFAULT now(),  -- Ultima data di rotazione
  fallback_key_id UUID REFERENCES public.api_keys(id)  -- ID della chiave di fallback
);

-- Creazione tabella api_key_usage_logs per il tracking dell'utilizzo delle chiavi
CREATE TABLE IF NOT EXISTS public.api_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL REFERENCES public.api_keys(name) ON DELETE CASCADE,  -- Nome della chiave utilizzata
  service TEXT NOT NULL,      -- Servizio utilizzato
  endpoint TEXT NOT NULL DEFAULT 'default',  -- Endpoint specifico chiamato
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),  -- Timestamp della chiamata
  response_time INTEGER NOT NULL DEFAULT 0,  -- Tempo di risposta in ms
  success BOOLEAN NOT NULL DEFAULT true,     -- Se la chiamata ha avuto successo
  error_message TEXT,         -- Messaggio di errore (se presente)
  status_code INTEGER,        -- Codice di stato HTTP
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- ID utente che ha effettuato la chiamata
  client_info JSONB           -- Informazioni aggiuntive sul client
);

-- Indici per migliorare le performance delle query comuni
CREATE INDEX IF NOT EXISTS idx_api_keys_service ON public.api_keys(service);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON public.api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_key_name ON public.api_key_usage_logs(key_name);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_timestamp ON public.api_key_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_service ON public.api_key_usage_logs(service);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_success ON public.api_key_usage_logs(success);

-- Trigger per aggiornare automaticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_api_keys_update_updated_at ON public.api_keys;
CREATE TRIGGER trigger_api_keys_update_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Funzione per incrementare il contatore di utilizzo di una chiave API
CREATE OR REPLACE FUNCTION increment_api_key_usage(key_name TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.api_keys
  SET current_usage = current_usage + 1
  WHERE name = key_name;
END;
$$ LANGUAGE plpgsql;

-- RLS policies per proteggere l'accesso alle tabelle
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_usage_logs ENABLE ROW LEVEL SECURITY;

-- Solo gli amministratori possono accedere alle chiavi API
CREATE POLICY admin_api_keys_policy ON public.api_keys
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND public.users.role = 'ADMIN'
  ));

-- Solo gli amministratori possono accedere ai log di utilizzo
CREATE POLICY admin_api_key_usage_logs_policy ON public.api_key_usage_logs
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND public.users.role = 'ADMIN'
  ));

-- Funzione per aggiungere una chiave API con verifica della duplicazione
CREATE OR REPLACE FUNCTION upsert_api_key(
  p_name TEXT,
  p_service TEXT,
  p_key TEXT,
  p_is_active BOOLEAN DEFAULT true,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_usage_limit INTEGER DEFAULT NULL,
  p_fallback_key_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_fallback_key_id UUID;
  v_result UUID;
BEGIN
  -- Ottieni l'ID della chiave di fallback se fornito
  IF p_fallback_key_name IS NOT NULL THEN
    SELECT id INTO v_fallback_key_id FROM public.api_keys WHERE name = p_fallback_key_name;
  END IF;

  -- Inserisci o aggiorna la chiave API
  INSERT INTO public.api_keys (
    name, 
    service, 
    key, 
    is_active, 
    expires_at, 
    usage_limit, 
    fallback_key_id
  )
  VALUES (
    p_name,
    p_service,
    p_key,
    p_is_active,
    p_expires_at,
    p_usage_limit,
    v_fallback_key_id
  )
  ON CONFLICT (name) DO UPDATE SET
    service = EXCLUDED.service,
    key = EXCLUDED.key,
    is_active = EXCLUDED.is_active,
    expires_at = EXCLUDED.expires_at,
    usage_limit = EXCLUDED.usage_limit,
    fallback_key_id = EXCLUDED.fallback_key_id,
    updated_at = now(),
    last_rotated = CASE WHEN public.api_keys.key <> EXCLUDED.key THEN now() ELSE public.api_keys.last_rotated END
  RETURNING id INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Funzione per ottenere statistiche di utilizzo di una chiave API
CREATE OR REPLACE FUNCTION get_api_key_usage_stats(
  p_key_name TEXT,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_calls BIGINT,
  success_calls BIGINT,
  failure_calls BIGINT,
  success_rate NUMERIC,
  avg_response_time NUMERIC,
  usage_by_day JSONB,
  usage_by_endpoint JSONB
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
BEGIN
  v_start_date := now() - (p_days || ' days')::INTERVAL;

  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE success) AS successes,
      COUNT(*) FILTER (WHERE NOT success) AS failures,
      AVG(response_time) AS avg_resp_time,
      jsonb_object_agg(
        DISTINCT TO_CHAR(timestamp, 'YYYY-MM-DD'),
        (SELECT COUNT(*) FROM public.api_key_usage_logs l2 
         WHERE l2.key_name = l1.key_name AND TO_CHAR(l2.timestamp, 'YYYY-MM-DD') = TO_CHAR(l1.timestamp, 'YYYY-MM-DD'))
      ) AS daily,
      jsonb_object_agg(
        DISTINCT endpoint,
        (SELECT COUNT(*) FROM public.api_key_usage_logs l2 
         WHERE l2.key_name = l1.key_name AND l2.endpoint = l1.endpoint)
      ) AS endpoints
    FROM public.api_key_usage_logs l1
    WHERE key_name = p_key_name
    AND timestamp >= v_start_date
    GROUP BY key_name
  )
  SELECT
    stats.total,
    stats.successes,
    stats.failures,
    CASE WHEN stats.total > 0 THEN (stats.successes::NUMERIC / stats.total) * 100 ELSE 0 END,
    stats.avg_resp_time,
    stats.daily,
    stats.endpoints
  FROM stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.api_keys IS 'Tabella per memorizzare e gestire le chiavi API per servizi esterni';
COMMENT ON TABLE public.api_key_usage_logs IS 'Tabella per tracciare l''utilizzo delle chiavi API';
COMMENT ON FUNCTION increment_api_key_usage IS 'Incrementa il contatore di utilizzo di una chiave API';
COMMENT ON FUNCTION upsert_api_key IS 'Funzione per aggiungere o aggiornare una chiave API';
COMMENT ON FUNCTION get_api_key_usage_stats IS 'Ottiene statistiche di utilizzo per una chiave API';
