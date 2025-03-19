/**
 * Script per correggere le policy RLS problematiche tramite terminale
 * Utilizza curl/fetch per interagire direttamente con l'API REST di Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Credenziali Supabase
const SUPABASE_URL = 'https://twusehwykpemphqtxlrx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg';

// URL di base per l'API REST di Supabase
const REST_URL = `${SUPABASE_URL}/rest/v1`;

// Logger per output formattato
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERRORE] ${message}`),
  success: (message) => console.log(`[SUCCESSO] ✅ ${message}`),
  warning: (message) => console.warn(`[AVVISO] ⚠️ ${message}`),
  section: (title) => {
    console.log('\n' + '='.repeat(50));
    console.log(`${title}`);
    console.log('='.repeat(50));
  }
};

// Funzione per eseguire comandi curl
async function executeCurl(query) {
  try {
    // Crea il comando curl
    const curlCmd = `curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
      -H "apikey: ${SUPABASE_SERVICE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"sql": "${query.replace(/"/g, '\\"').replace(/\n/g, ' ')}"}'`;
    
    // Esegui il comando curl
    const { stdout, stderr } = await execAsync(curlCmd);
    
    if (stderr && !stderr.includes('warning')) {
      return { success: false, error: stderr };
    }
    
    return { success: true, data: stdout };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Funzione per creare le funzioni di supporto SQL
async function createHelperFunctions() {
  logger.section('Creazione funzioni di supporto SQL');
  
  const execSqlFunction = `
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
    // Usa l'API Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Crea la funzione helper
    const { error } = await supabase.rpc('', {}, {
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object',
        'Raw-Query': execSqlFunction
      }
    });
    
    if (error && !error.message.includes('already exists')) {
      logger.error(`Errore nella creazione della funzione exec_sql: ${error.message}`);
      
      // Tentativo alternativo con curl
      logger.warning('Tentativo di creazione funzione tramite curl...');
      
      const curlResult = await executeCurl(execSqlFunction);
      
      if (!curlResult.success) {
        logger.error(`Fallito anche il tentativo con curl: ${curlResult.error}`);
        return false;
      }
    }
    
    logger.success('Funzione exec_sql creata o aggiornata con successo!');
    return true;
  } catch (error) {
    logger.error(`Errore imprevisto: ${error.message}`);
    return false;
  }
}

// Funzione per correggere problemi di policy RLS ricorsive
async function fixRecursiveRlsPolicies() {
  logger.section('Correzione policy RLS ricorsive');
  
  try {
    // Client Supabase per operazioni dirette
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // 1. Rimuovi tutte le policy dalla tabella users
    logger.info('Rimozione policy esistenti dalla tabella users...');
    
    const dropPoliciesQuery = `
      DO $$
      DECLARE
        pol RECORD;
      BEGIN
        FOR pol IN
          SELECT policyname
          FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'users'
        LOOP
          EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
          RAISE NOTICE 'Dropped policy %', pol.policyname;
        END LOOP;
      END $$;
    `;
    
    try {
      // Prima prova con l'API
      const { error } = await supabase.rpc('', {}, {
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'params=single-object',
          'Raw-Query': dropPoliciesQuery
        }
      });
      
      if (error) {
        logger.error(`Errore nella rimozione delle policy: ${error.message}`);
        
        // Prova con curl
        logger.warning('Tentativo di rimozione policy tramite curl...');
        
        const curlResult = await executeCurl(dropPoliciesQuery);
        
        if (!curlResult.success) {
          logger.error(`Fallito anche il tentativo con curl: ${curlResult.error}`);
        }
      }
    } catch (error) {
      logger.error(`Errore imprevisto: ${error.message}`);
    }
    
    // 2. Crea nuove policy non ricorsive
    logger.info('Creazione nuove policy non ricorsive...');
    
    // Policy di base per utenti autenticati
    const createPoliciesQuery = `
      -- Enables users to select their own data
      CREATE POLICY "Users can see own data" ON public.users
        FOR SELECT USING (auth.uid() = id);
        
      -- Enables admins to view all users
      CREATE POLICY "Admin view all users" ON public.users
        FOR SELECT 
        USING (
          EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.raw_user_meta_data->>'role')::text = 'ADMIN'
          )
        );
        
      -- Enables users to update own profile
      CREATE POLICY "Users update own data" ON public.users
        FOR UPDATE
        USING (auth.uid() = id);
        
      -- Enable RLS for all relevant tables
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
    `;
    
    try {
      // Prima prova con l'API
      const { error } = await supabase.rpc('', {}, {
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'params=single-object',
          'Raw-Query': createPoliciesQuery
        }
      });
      
      if (error) {
        logger.error(`Errore nella creazione delle nuove policy: ${error.message}`);
        
        // Prova con curl
        logger.warning('Tentativo di creazione policy tramite curl...');
        
        const curlResult = await executeCurl(createPoliciesQuery);
        
        if (!curlResult.success) {
          logger.error(`Fallito anche il tentativo con curl: ${curlResult.error}`);
          return false;
        }
      }
    } catch (error) {
      logger.error(`Errore imprevisto: ${error.message}`);
      return false;
    }
    
    logger.success('Policy ricorsive corrette con successo!');
    return true;
  } catch (error) {
    logger.error(`Errore nella correzione delle policy: ${error.message}`);
    return false;
  }
}

// Esecuzione REST API diretta
async function executeRestCall(path, method, body = null) {
  try {
    const options = {
      method,
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${REST_URL}/${path}`, options);
    
    if (response.status >= 400) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }
    
    const data = await response.json().catch(() => ({}));
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Funzione per testare connessione e permessi
async function testConnection() {
  logger.section('Test connessione e permessi');
  
  try {
    // Test con client JS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Test semplice
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      logger.error(`Errore nel test di connessione: ${error.message}`);
      return false;
    }
    
    // Test per verificare i permessi di amministrazione
    const { data: schemas, error: schemasError } = await supabase
      .from('information_schema.schemata')
      .select('*')
      .limit(1);
    
    if (schemasError) {
      logger.warning(`Permessi limitati: ${schemasError.message}`);
    } else {
      logger.success('Permessi di amministrazione disponibili!');
    }
    
    logger.success('Connessione a Supabase funzionante!');
    return true;
  } catch (error) {
    logger.error(`Errore imprevisto: ${error.message}`);
    return false;
  }
}

// Funzione principale
async function main() {
  logger.section('CORREZIONE DATABASE SUPABASE DA TERMINALE');
  
  // 1. Testa la connessione e i permessi
  if (!await testConnection()) {
    logger.error('Impossibile procedere: test di connessione fallito.');
    return;
  }
  
  // 2. Crea funzioni di supporto
  if (!await createHelperFunctions()) {
    logger.warning('Impossibile creare le funzioni di supporto, ma proseguiamo comunque.');
  }
  
  // 3. Correggi le policy RLS ricorsive
  if (!await fixRecursiveRlsPolicies()) {
    logger.error('Impossibile correggere le policy RLS.');
    logger.warning('Si consiglia di resettare il database e riconfigurarlo correttamente.');
    return;
  }
  
  // 4. Verifica i bucket di storage
  logger.section('Verifica buckets di storage');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      logger.error(`Errore nel recupero dei bucket: ${error.message}`);
    } else {
      logger.success(`Trovati ${buckets.length} bucket: ${buckets.map(b => b.name).join(', ')}`);
    }
  } catch (error) {
    logger.error(`Errore imprevisto: ${error.message}`);
  }
  
  logger.section('RIEPILOGO CORREZIONI');
  logger.success('Applicazione correzioni da terminale completata!');
  logger.info('Eseguire ora i test per verificare che tutto funzioni correttamente.');
  logger.info('Se i problemi persistono, considerare il reset completo del database.');
}

// Esegui la funzione principale
main().catch(error => {
  logger.error(`Errore fatale: ${error.message}`);
});
