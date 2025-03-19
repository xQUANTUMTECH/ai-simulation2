/*
  # Inserimento Chiavi API Iniziali

  1. Operazioni
    - Inserisce le chiavi API iniziali nella tabella api_keys
    - Configura chiavi per Groq e OpenRouter
  
  2. Note
    - Queste chiavi sono utilizzate per i servizi AI e TTS
    - La migrazione utilizza la funzione upsert_api_key per gestire correttamente eventuali conflitti
*/

-- Inserimento chiave OpenRouter per servizi AI
SELECT upsert_api_key(
  'openrouter_primary',
  'openrouter',
  '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',
  true,
  NULL,
  1000,  -- Limite di utilizzo giornaliero
  NULL
);

-- Inserimento chiave OpenRouter di fallback
SELECT upsert_api_key(
  'openrouter_fallback',
  'openrouter',
  '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',
  true,
  NULL,
  1000,
  NULL
);

-- Inserimento chiave Groq per TTS
SELECT upsert_api_key(
  'groq_primary',
  'groq',
  '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',
  true,
  NULL,
  5000,  -- Limite di utilizzo giornaliero
  NULL
);

-- Inserimento chiave Groq di fallback
SELECT upsert_api_key(
  'groq_fallback',
  'groq',
  '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',
  true,
  NULL,
  5000,
  NULL
);

-- Configura le chiavi di fallback
UPDATE api_keys 
SET fallback_key_id = (SELECT id FROM api_keys WHERE name = 'openrouter_fallback')
WHERE name = 'openrouter_primary';

UPDATE api_keys 
SET fallback_key_id = (SELECT id FROM api_keys WHERE name = 'groq_fallback')
WHERE name = 'groq_primary';

-- Inserimento log iniziale
INSERT INTO api_key_usage_logs (
  key_name,
  service,
  endpoint,
  timestamp,
  response_time,
  success,
  status_code
)
VALUES (
  'system_init',
  'system',
  'initialization',
  NOW(),
  0,
  true,
  200
);
