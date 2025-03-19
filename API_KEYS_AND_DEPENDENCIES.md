# API Keys e Gestione Delle Dipendenze

## Informazioni Supabase

- **Project ID:** twusehwykpemphqtxlrx
- **Project URL:** https://twusehwykpemphqtxlrx.supabase.co
- **Anon Public Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNjE1NTAsImV4cCI6MjA1NjgzNzU1MH0.iku26hL5irHYwIxOPKNjUlTrTvlvw0a-ZU-uPgepoNk
- **Service Role Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg
- **JWT Secret:** uxE191S5KQdeLg5IK8FH5xSUmR8sgfXe/WJD3Mfd2pC3RV2fX30nuRIWYcy2IELmL9FUDNg4BXDIxWF4VYbQ0Q==
- **Access Token:** sbp_54aea3e423c9cd83dc29dd54b646391566b1594a

## API Keys Esterni

### Groq
- **API Key:** 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
- **Usata in:** src/services/ai-service.ts, src/components/simulation/WebRoom.tsx

### OpenRouter
- **API Key:** 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
- **Usata in:** src/services/ai-service.ts

## Gestione Centralizzata delle API Key

### Sistema di Gestione API Key
Il progetto ora include un sistema centralizzato per la gestione delle API key:

- **ApiKeyService** in `src/services/api-key-service.ts`:
  - Gestione centralizzata e sicura delle chiavi API
  - Cache locale per ridurre le chiamate al database
  - Supporto per rotazione chiavi e fallback
  - Monitoraggio utilizzo e limiti
  - Integrazione con Supabase

### Schema Database
È stata creata una migration Supabase per supportare il sistema di gestione delle API key:

```sql
-- Tabella principale per le chiavi API
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  service TEXT NOT NULL,
  key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER,
  current_usage INTEGER NOT NULL DEFAULT 0,
  last_rotated TIMESTAMPTZ NOT NULL DEFAULT now(),
  fallback_key_id UUID REFERENCES public.api_keys(id)
);

-- Tabella per il tracking dell'utilizzo delle chiavi
CREATE TABLE public.api_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL REFERENCES public.api_keys(name) ON DELETE CASCADE,
  service TEXT NOT NULL,
  endpoint TEXT NOT NULL DEFAULT 'default',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_time INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  status_code INTEGER,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_info JSONB
);
```

### Istruzioni per l'Applicazione della Migration
Per applicare la migration e configurare il sistema di gestione delle API key:

1. **Attraverso l'interfaccia Supabase:**
   - Accedi al progetto Supabase (https://app.supabase.com/project/twusehwykpemphqtxlrx)
   - Vai alla sezione SQL Editor
   - Esegui la query contenuta in `supabase/migrations/20250314150100_api_key_management.sql`

2. **Oppure tramite CLI (richiede Docker Desktop):**
   ```bash
   # Imposta il token di accesso Supabase
   export SUPABASE_ACCESS_TOKEN=sbp_54aea3e423c9cd83dc29dd54b646391566b1594a
   
   # Esegui la migration
   npx supabase migration up
   ```

3. **Inizializzazione delle chiavi API nel database:**
   Dopo aver creato le tabelle, aggiungi le chiavi API esistenti:
   
   ```sql
   -- Aggiungi la chiave Groq
   INSERT INTO public.api_keys (name, service, key)
   VALUES ('groq_primary', 'groq', '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');
   
   -- Aggiungi la chiave OpenRouter
   INSERT INTO public.api_keys (name, service, key)
   VALUES ('openrouter_primary', 'openrouter', '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');
   ```

## Gestione Standardizzata degli Errori

È stato implementato un sistema centralizzato per la gestione degli errori in `src/services/api-error-service.ts`:

- Categorizzazione per tipo di errore
- Retry automatico con backoff esponenziale
- Logging centralizzato
- Gestione errori di rete, autenticazione, permessi, etc.

### Utilizzo in Servizi Esistenti
Per completare l'implementazione, è necessario aggiornare i servizi esistenti:

```typescript
// Esempio di utilizzo in ai-service.ts
import { apiKeyService } from './api-key-service';
import { apiErrorService } from './api-error-service';

export class AiService {
  async generateResponse(prompt: string, model: string): Promise<string> {
    try {
      // Ottieni chiave API dal servizio centrale
      const apiKey = await apiKeyService.getApiKey('openrouter');
      if (!apiKey) {
        throw new Error('API key non disponibile');
      }
      
      // Esegui richiesta con retry automatico
      return await apiErrorService.executeWithRetry(
        async () => {
          // Implementazione richiesta API
          // ...
        },
        {
          endpoint: 'generateResponse',
          service: 'openrouter'
        }
      );
    } catch (error) {
      return apiErrorService.handleError(error, 'generateResponse', 'openrouter');
    }
  }
}
```

## Prossimi Passi per l'Integrazione Completa

1. **Applicare la migration del database su Supabase** (come descritto sopra)
2. **Refactoring di servizi esistenti** per utilizzare i nuovi sistemi:
   - `src/services/ai-service.ts`
   - `src/services/voice-service.ts`
   - `src/services/openai.ts`
   - Altri servizi che utilizzano API esterni

3. **Ampliare il monitoraggio e la gestione delle chiavi**:
   - Implementare interfaccia amministrativa per la gestione delle chiavi
   - Aggiungere metriche di utilizzo
   - Configurare alerting per limiti e scadenze
