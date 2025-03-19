/**
 * Script per creare le tabelle mancanti utilizzando l'API Supabase
 * Alternativa a `supabase db execute` quando la CLI non è disponibile
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Logger di utilità
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERRORE] ${message}`),
  success: (message) => console.log(`[SUCCESSO] ✅ ${message}`),
  section: (title) => {
    console.log('\n' + '='.repeat(50));
    console.log(`${title}`);
    console.log('='.repeat(50));
  }
};

// Recupera credenziali
function getSupabaseCredentials() {
  try {
    // Tenta di leggere da SUPABASE_CREDENTIALS.md
    if (fs.existsSync('./SUPABASE_CREDENTIALS.md')) {
      const content = fs.readFileSync('./SUPABASE_CREDENTIALS.md', 'utf8');
      const urlMatch = content.match(/URL[^:]*:\s*([^\s]+)/i);
      const serviceKeyMatch = content.match(/SERVICE[^:]*:\s*([^\s]+)/i);
      
      if (urlMatch && serviceKeyMatch) {
        return {
          url: urlMatch[1],
          serviceKey: serviceKeyMatch[1]
        };
      }
    }
    
    // Fallback a valori predefiniti per test
    return {
      url: 'https://twusehwykpemphqtxlrx.supabase.co',
      serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg'
    };
  } catch (error) {
    logger.error(`Errore nel recupero delle credenziali: ${error.message}`);
    process.exit(1);
  }
}

// Funzione per eseguire query SQL utilizzando l'API Supabase
async function executeSqlQuery(client, query) {
  try {
    const { data, error } = await client.rpc('exec_sql', { sql: query });
    
    if (error) {
      logger.error(`Errore nell'esecuzione della query: ${error.message}`);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error(`Errore imprevisto: ${error.message}`);
    return false;
  }
}

// Funzione per creare funzione SQL di utilità
async function createExecSqlFunction(client) {
  logger.section('Creazione funzione di utilità per eseguire SQL');
  
  const createFunctionQuery = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
      RETURN true;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Errore esecuzione SQL: %', SQLERRM;
      RETURN false;
    END;
    $$;
  `;
  
  try {
    const { error } = await client.rpc('', {}, {
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object',
        'Raw-Query': createFunctionQuery
      }
    });
    
    if (error) {
      // Funzione potrebbe già esistere
      if (error.message.includes('already exists')) {
        logger.info('Funzione exec_sql già esistente.');
        return true;
      }
      
      logger.error(`Errore nella creazione della funzione exec_sql: ${error.message}`);
      return false;
    }
    
    logger.success('Funzione exec_sql creata con successo');
    return true;
  } catch (error) {
    logger.error(`Errore imprevisto: ${error.message}`);
    return false;
  }
}

// Funzione per creare le tabelle mancanti
async function createMissingTables(client) {
  logger.section('Creazione tabelle mancanti');
  
  // Query per verificare se extension uuid-ossp è già installata
  const checkExtensionQuery = `
    SELECT EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
    ) as extension_exists;
  `;
  
  // Query per abilitare l'estensione uuid-ossp
  const enableExtensionQuery = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  `;
  
  // Query per creare la tabella auth_sessions
  const createAuthSessionsQuery = `
    CREATE TABLE IF NOT EXISTS public.auth_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      device_info JSONB,
      ip_address TEXT,
      is_valid BOOLEAN DEFAULT true,
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `;
  
  // Query per creare la tabella failed_login_attempts
  const createFailedLoginAttemptsQuery = `
    CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      ip_address TEXT,
      attempt_time TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `;
  
  // Query per creare la tabella user_settings
  const createUserSettingsQuery = `
    CREATE TABLE IF NOT EXISTS public.user_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      email_notifications BOOLEAN DEFAULT true,
      language TEXT DEFAULT 'it',
      theme TEXT DEFAULT 'light',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `;
  
  // Query per verificare e aggiungere campi mancanti alla tabella users
  const addMissingColumnsQuery = `
    DO $$
    BEGIN
      -- Aggiungi il campo username se non esiste
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'users' 
                  AND column_name = 'username') THEN
          ALTER TABLE public.users ADD COLUMN username TEXT;
      END IF;
      
      -- Aggiungi il campo account_status se non esiste
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'users' 
                  AND column_name = 'account_status') THEN
          ALTER TABLE public.users ADD COLUMN account_status TEXT DEFAULT 'active';
      END IF;
    END
    $$;
  `;
  
  // Query per abilitare RLS e creare policy per auth_sessions
  const authSessionsRlsQuery = `
    ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can only view their own sessions" ON public.auth_sessions;
    CREATE POLICY "Users can only view their own sessions" ON public.auth_sessions
      FOR SELECT USING (auth.uid() = user_id);
      
    DROP POLICY IF EXISTS "Users can only insert their own sessions" ON public.auth_sessions;
    CREATE POLICY "Users can only insert their own sessions" ON public.auth_sessions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
      
    DROP POLICY IF EXISTS "Users can only update their own sessions" ON public.auth_sessions;
    CREATE POLICY "Users can only update their own sessions" ON public.auth_sessions
      FOR UPDATE USING (auth.uid() = user_id);
      
    DROP POLICY IF EXISTS "Users can only delete their own sessions" ON public.auth_sessions;
    CREATE POLICY "Users can only delete their own sessions" ON public.auth_sessions
      FOR DELETE USING (auth.uid() = user_id);
  `;
  
  // Query per abilitare RLS e creare policy per failed_login_attempts
  const failedLoginAttemptsRlsQuery = `
    ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Admins can view failed login attempts" ON public.failed_login_attempts;
    CREATE POLICY "Admins can view failed login attempts" ON public.failed_login_attempts
      FOR SELECT USING (
          EXISTS (
              SELECT 1 FROM public.users
              WHERE users.id = auth.uid() AND users.role = 'ADMIN'
          )
      );
  `;
  
  // Query per abilitare RLS e creare policy per user_settings
  const userSettingsRlsQuery = `
    ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view only their settings" ON public.user_settings;
    CREATE POLICY "Users can view only their settings" ON public.user_settings
      FOR SELECT USING (auth.uid() = user_id);
      
    DROP POLICY IF EXISTS "Users can insert only their settings" ON public.user_settings;
    CREATE POLICY "Users can insert only their settings" ON public.user_settings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
      
    DROP POLICY IF EXISTS "Users can update only their settings" ON public.user_settings;
    CREATE POLICY "Users can update only their settings" ON public.user_settings
      FOR UPDATE USING (auth.uid() = user_id);
  `;
  
  // Query per creare indici
  const createIndicesQuery = `
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON public.auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_user_id ON public.failed_login_attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
  `;
  
  try {
    // 1. Verifica se l'estensione uuid-ossp è installata
    const { data: extensionData, error: extensionCheckError } = await client
      .from('_dummy_table_for_rpc_result')
      .select('*')
      .limit(1)
      .then(() => ({ data: null, error: null }))
      .catch(() => ({ data: null, error: { message: 'Dummy query for RPC' } }));
    
    // 2. Abilita l'estensione uuid-ossp
    logger.info('Abilitazione estensione uuid-ossp...');
    const extensionResult = await executeSqlQuery(client, enableExtensionQuery);
    
    if (!extensionResult) {
      logger.error('Impossibile abilitare l\'estensione uuid-ossp');
      return false;
    }
    
    // 3. Crea tabella auth_sessions
    logger.info('Creazione tabella auth_sessions...');
    const authSessionsResult = await executeSqlQuery(client, createAuthSessionsQuery);
    
    if (!authSessionsResult) {
      logger.error('Impossibile creare la tabella auth_sessions');
      return false;
    }
    
    // 4. Crea tabella failed_login_attempts
    logger.info('Creazione tabella failed_login_attempts...');
    const failedLoginAttemptsResult = await executeSqlQuery(client, createFailedLoginAttemptsQuery);
    
    if (!failedLoginAttemptsResult) {
      logger.error('Impossibile creare la tabella failed_login_attempts');
      return false;
    }
    
    // 5. Crea tabella user_settings
    logger.info('Creazione tabella user_settings...');
    const userSettingsResult = await executeSqlQuery(client, createUserSettingsQuery);
    
    if (!userSettingsResult) {
      logger.error('Impossibile creare la tabella user_settings');
      return false;
    }
    
    // 6. Aggiunge campi mancanti alla tabella users
    logger.info('Aggiunta campi mancanti alla tabella users...');
    const addColumnsResult = await executeSqlQuery(client, addMissingColumnsQuery);
    
    if (!addColumnsResult) {
      logger.error('Impossibile aggiungere campi mancanti alla tabella users');
      return false;
    }
    
    // 7. Configura RLS per auth_sessions
    logger.info('Configurazione RLS per auth_sessions...');
    const authSessionsRlsResult = await executeSqlQuery(client, authSessionsRlsQuery);
    
    if (!authSessionsRlsResult) {
      logger.error('Impossibile configurare RLS per auth_sessions');
      return false;
    }
    
    // 8. Configura RLS per failed_login_attempts
    logger.info('Configurazione RLS per failed_login_attempts...');
    const failedLoginAttemptsRlsResult = await executeSqlQuery(client, failedLoginAttemptsRlsQuery);
    
    if (!failedLoginAttemptsRlsResult) {
      logger.error('Impossibile configurare RLS per failed_login_attempts');
      return false;
    }
    
    // 9. Configura RLS per user_settings
    logger.info('Configurazione RLS per user_settings...');
    const userSettingsRlsResult = await executeSqlQuery(client, userSettingsRlsQuery);
    
    if (!userSettingsRlsResult) {
      logger.error('Impossibile configurare RLS per user_settings');
      return false;
    }
    
    // 10. Crea indici
    logger.info('Creazione indici...');
    const indicesResult = await executeSqlQuery(client, createIndicesQuery);
    
    if (!indicesResult) {
      logger.error('Impossibile creare indici');
      return false;
    }
    
    logger.success('Tutte le tabelle sono state create con successo!');
    return true;
  } catch (error) {
    logger.error(`Errore imprevisto: ${error.message}`);
    return false;
  }
}

// Funzione principale
async function main() {
  logger.section('Creazione tabelle mancanti tramite API Supabase');
  
  // Ottieni credenziali
  const credentials = getSupabaseCredentials();
  logger.info(`URL Supabase: ${credentials.url}`);
  
  // Crea client Supabase con ruolo di servizio
  const supabase = createClient(credentials.url, credentials.serviceKey);
  
  // Crea funzione di utilità
  const functionCreated = await createExecSqlFunction(supabase);
  
  if (!functionCreated) {
    logger.error('Impossibile creare la funzione di utilità. Operazione interrotta.');
    process.exit(1);
  }
  
  // Crea tabelle mancanti
  const tablesCreated = await createMissingTables(supabase);
  
  if (tablesCreated) {
    logger.success('Operazione completata con successo!');
  } else {
    logger.error('Si sono verificati errori durante la creazione delle tabelle.');
    process.exit(1);
  }
}

// Esegui lo script
main();
