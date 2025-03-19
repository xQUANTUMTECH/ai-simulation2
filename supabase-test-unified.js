/**
 * Script di test unificato per Supabase
 * Verifica la connessione, la struttura del database e i bucket di storage
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[AVVISO] ${message}`),
  error: (message) => console.error(`[ERRORE] ${message}`),
  success: (message) => console.log(`[SUCCESSO] ✅ ${message}`),
  section: (title) => {
    console.log('\n' + '='.repeat(50));
    console.log(`${title}`);
    console.log('='.repeat(50));
  }
};

// Recupera credenziali Supabase
function getSupabaseCredentials() {
  try {
    // Tenta di leggere da SUPABASE_CREDENTIALS.md
    if (fs.existsSync('./SUPABASE_CREDENTIALS.md')) {
      const content = fs.readFileSync('./SUPABASE_CREDENTIALS.md', 'utf8');
      const urlMatch = content.match(/URL[^:]*:\s*([^\s]+)/i);
      const keyMatch = content.match(/KEY[^:]*:\s*([^\s]+)/i);
      const serviceKeyMatch = content.match(/SERVICE[^:]*:\s*([^\s]+)/i);
      
      if (urlMatch && (keyMatch || serviceKeyMatch)) {
        return {
          url: urlMatch[1],
          anonKey: keyMatch ? keyMatch[1] : null,
          serviceKey: serviceKeyMatch ? serviceKeyMatch[1] : null
        };
      }
    }
    
    // Fallback a valori predefiniti per test
    return {
      url: 'https://twusehwykpemphqtxlrx.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNjE1NTAsImV4cCI6MjA1NjgzNzU1MH0.iku26hL5irHYwIxOPKNjUlTrTvlvw0a-ZU-uPgepoNk',
      serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg'
    };
  } catch (error) {
    logger.error(`Errore nel recupero delle credenziali: ${error.message}`);
    process.exit(1);
  }
}

// Test connessione base a Supabase
async function testConnection() {
  logger.section('Test Connessione Supabase');
  
  const credentials = getSupabaseCredentials();
  logger.info(`URL Supabase: ${credentials.url}`);
  
  try {
    // Crea client con ruolo anonimo per test di connessione
    const key = credentials.anonKey || credentials.serviceKey;
    if (!key) {
      throw new Error('Nessuna chiave API trovata');
    }
    
    const supabase = createClient(credentials.url, key);
    
    // Test semplice query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    logger.success('Connessione a Supabase riuscita!');
    return { supabase, credentials };
  } catch (error) {
    logger.error(`Connessione fallita: ${error.message}`);
    return null;
  }
}

// Verifica tabelle nel database
async function testDatabaseStructure(supabase) {
  logger.section('Test Struttura Database');
  
  const requiredTables = [
    'users',
    'auth_sessions',
    'failed_login_attempts',
    'user_settings'
  ];
  
  const missingTables = [];
  
  // Verifica l'esistenza di ogni tabella
  for (const tableName of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01') { // tabella non esiste
          logger.warn(`Tabella '${tableName}' non trovata`);
          missingTables.push(tableName);
        } else {
          logger.error(`Errore nella verifica della tabella '${tableName}': ${error.message}`);
        }
      } else {
        logger.success(`Tabella '${tableName}' trovata correttamente`);
      }
    } catch (error) {
      logger.error(`Errore imprevisto per tabella '${tableName}': ${error.message}`);
    }
  }
  
  // Verifica campi specifici nella tabella users
  try {
    const { data, error } = await supabase
      .rpc('test_user_table_fields');
    
    if (error) {
      logger.error(`Errore nella verifica dei campi della tabella 'users': ${error.message}`);
    } else {
      const fields = data || {};
      
      if (fields.has_username) {
        logger.success("Campo 'username' presente nella tabella users");
      } else {
        logger.warn("Campo 'username' MANCANTE nella tabella users");
      }
      
      if (fields.has_account_status) {
        logger.success("Campo 'account_status' presente nella tabella users");
      } else {
        logger.warn("Campo 'account_status' MANCANTE nella tabella users");
      }
    }
  } catch (error) {
    logger.error(`Errore nella verifica dei campi: ${error.message}`);
    logger.info("Esegui prima la funzione RPC 'test_user_table_fields' sul database");
  }
  
  return missingTables.length === 0;
}

// Verifica bucket di storage
async function testStorageBuckets(supabase) {
  logger.section('Test Bucket Storage');
  
  const requiredBuckets = [
    'documents',
    'videos', 
    'uploads',
    'storage',
    'simulations',
    'training'
  ];
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      logger.error(`Errore nel recupero dei bucket: ${error.message}`);
      return false;
    }
    
    const existingBucketNames = buckets.map(b => b.name);
    logger.info(`Bucket trovati: ${existingBucketNames.join(', ')}`);
    
    const missingBuckets = [];
    
    for (const bucketName of requiredBuckets) {
      if (existingBucketNames.includes(bucketName)) {
        logger.success(`Bucket '${bucketName}' trovato`);
      } else {
        logger.warn(`Bucket '${bucketName}' MANCANTE`);
        missingBuckets.push(bucketName);
      }
    }
    
    return missingBuckets.length === 0;
  } catch (error) {
    logger.error(`Errore imprevisto nei test dei bucket: ${error.message}`);
    return false;
  }
}

// Verifica coerenza utenti tra auth.users e public.users
async function testUserConsistency(supabase, credentials) {
  logger.section('Test Coerenza Utenti');
  
  try {
    // Per questo test serve il ruolo di servizio
    if (!credentials.serviceKey) {
      logger.warn('Chiave di servizio mancante, impossibile verificare la coerenza degli utenti');
      return null;
    }
    
    // Crea client con ruolo di servizio
    const serviceClient = createClient(credentials.url, credentials.serviceKey);
    
    // Query per verificare utenti non sincronizzati
    const { data, error } = await serviceClient.rpc('check_users_consistency');
    
    if (error) {
      logger.error(`Errore nella verifica coerenza utenti: ${error.message}`);
      logger.info("Esegui prima la funzione RPC 'check_users_consistency' sul database");
      return null;
    }
    
    const result = data || {};
    
    if (result.inconsistent_users_count === 0) {
      logger.success('Tutti gli utenti sono correttamente sincronizzati tra auth.users e public.users');
      return true;
    } else {
      logger.warn(`Trovati ${result.inconsistent_users_count} utenti non sincronizzati tra auth.users e public.users`);
      return false;
    }
  } catch (error) {
    logger.error(`Errore imprevisto nel test coerenza utenti: ${error.message}`);
    return null;
  }
}

// Test RLS (Row Level Security)
async function testRLS(supabase, credentials) {
  logger.section('Test Row Level Security (RLS)');
  
  try {
    // Per questo test serve il ruolo di servizio
    if (!credentials.serviceKey) {
      logger.warn('Chiave di servizio mancante, impossibile verificare RLS');
      return null;
    }
    
    // Crea client con ruolo di servizio
    const serviceClient = createClient(credentials.url, credentials.serviceKey);
    
    // Query per verificare le tabelle con/senza RLS
    const { data, error } = await serviceClient.rpc('check_rls_enabled');
    
    if (error) {
      logger.error(`Errore nella verifica RLS: ${error.message}`);
      logger.info("Esegui prima la funzione RPC 'check_rls_enabled' sul database");
      return null;
    }
    
    const tablesWithoutRLS = data?.tables_without_rls || [];
    
    if (tablesWithoutRLS.length === 0) {
      logger.success('RLS attivo su tutte le tabelle pubbliche');
      return true;
    } else {
      logger.warn(`RLS DISATTIVATO sulle seguenti tabelle: ${tablesWithoutRLS.join(', ')}`);
      logger.warn('Queste tabelle potrebbero essere esposte a rischi di sicurezza');
      return false;
    }
  } catch (error) {
    logger.error(`Errore imprevisto nel test RLS: ${error.message}`);
    return null;
  }
}

// Test registrazione e autenticazione
async function testAuthFlow(supabase) {
  logger.section('Test Flusso Autenticazione');
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  
  try {
    // 1. Registrazione
    logger.info(`Tentativo registrazione utente di test: ${testEmail}`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (signUpError) {
      logger.error(`Registrazione fallita: ${signUpError.message}`);
      return false;
    }
    
    if (signUpData?.user) {
      logger.success('Registrazione utente di test riuscita');
      logger.info(`ID utente: ${signUpData.user.id}`);
      
      // 2. Login
      logger.info('Tentativo login con utente di test');
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (signInError) {
        logger.error(`Login fallito: ${signInError.message}`);
        return false;
      }
      
      if (signInData?.session) {
        logger.success('Login riuscito');
        
        // 3. Logout
        const { error: signOutError } = await supabase.auth.signOut();
        
        if (signOutError) {
          logger.error(`Logout fallito: ${signOutError.message}`);
        } else {
          logger.success('Logout riuscito');
        }
        
        return true;
      }
    } else {
      logger.warn('Registrazione completata ma nessun utente restituito');
      return false;
    }
  } catch (error) {
    logger.error(`Errore imprevisto nel test autenticazione: ${error.message}`);
    return false;
  }
}

// Funzione per applicare migrations rimaste in sospeso
async function applyMigrations() {
  logger.section('Applicazione Migrations');
  
  try {
    // Esegui il comando di migrazione
    const { spawnSync } = await import('child_process');
    
    const result = spawnSync('supabase', ['migration', 'up'], {
      shell: true,
      stdio: 'inherit'
    });
    
    if (result.error) {
      logger.error(`Errore nell'esecuzione delle migrazioni: ${result.error.message}`);
      return false;
    }
    
    if (result.status !== 0) {
      logger.error(`Migrazioni fallite con codice di uscita ${result.status}`);
      return false;
    }
    
    logger.success('Migrazioni applicate con successo');
    return true;
  } catch (error) {
    logger.error(`Errore imprevisto nell'applicazione delle migrazioni: ${error.message}`);
    return false;
  }
}

// Funzione per verificare la presenza della tabella e dei campi
async function createTestFunctions(supabase, credentials) {
  logger.section('Creazione Funzioni RPC di Test');
  
  try {
    // Per questo test serve il ruolo di servizio
    if (!credentials.serviceKey) {
      logger.warn('Chiave di servizio mancante, impossibile creare funzioni RPC');
      return false;
    }
    
    // Crea client con ruolo di servizio
    const serviceClient = createClient(credentials.url, credentials.serviceKey);
    
    // Funzione per verificare i campi della tabella users
    const userFieldsQuery = `
      CREATE OR REPLACE FUNCTION test_user_table_fields()
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result json;
      BEGIN
        SELECT json_build_object(
          'has_username', EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'username'
          ),
          'has_account_status', EXISTS(
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'account_status'
          )
        ) INTO result;
        
        RETURN result;
      END;
      $$;
    `;
    
    // Funzione per verificare la coerenza degli utenti
    const userConsistencyQuery = `
      CREATE OR REPLACE FUNCTION check_users_consistency()
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        inconsistent_count integer;
        result json;
      BEGIN
        SELECT COUNT(*)
        INTO inconsistent_count
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL;
        
        SELECT json_build_object(
          'inconsistent_users_count', inconsistent_count
        ) INTO result;
        
        RETURN result;
      END;
      $$;
    `;
    
    // Funzione per verificare RLS
    const rlsCheckQuery = `
      CREATE OR REPLACE FUNCTION check_rls_enabled()
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        tables_without_rls text[];
        result json;
      BEGIN
        SELECT array_agg(tablename::text)
        INTO tables_without_rls
        FROM pg_tables
        WHERE 
          schemaname = 'public' AND 
          tablename NOT IN ('spatial_ref_sys') AND 
          NOT rowsecurity;
        
        SELECT json_build_object(
          'tables_without_rls', COALESCE(tables_without_rls, ARRAY[]::text[])
        ) INTO result;
        
        RETURN result;
      END;
      $$;
    `;
    
    // Esegui le query per creare le funzioni
    const { error: error1 } = await serviceClient.rpc('', {}, {
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object',
        'Raw-Query': userFieldsQuery
      }
    });
    
    const { error: error2 } = await serviceClient.rpc('', {}, {
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object',
        'Raw-Query': userConsistencyQuery
      }
    });
    
    const { error: error3 } = await serviceClient.rpc('', {}, {
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object',
        'Raw-Query': rlsCheckQuery
      }
    });
    
    if (error1 || error2 || error3) {
      logger.error(`Errore nella creazione delle funzioni RPC: ${error1?.message || error2?.message || error3?.message}`);
      logger.info('Per eseguire le verifiche, crea manualmente le funzioni SQL nel database');
      return false;
    }
    
    logger.success('Funzioni RPC create con successo');
    return true;
  } catch (error) {
    logger.error(`Errore imprevisto nella creazione delle funzioni: ${error.message}`);
    return false;
  }
}

// Funzione principale per eseguire tutti i test
async function runAllTests() {
  try {
    // Test connessione iniziale
    const connectionResult = await testConnection();
    if (!connectionResult) {
      logger.error('Test di connessione fallito, impossibile procedere');
      process.exit(1);
    }
    
    const { supabase, credentials } = connectionResult;
    
    // Crea funzioni di test necessarie
    await createTestFunctions(supabase, credentials);
    
    // Esegui tutti i test
    const dbStructureOk = await testDatabaseStructure(supabase);
    const storageBucketsOk = await testStorageBuckets(supabase);
    const userConsistencyOk = await testUserConsistency(supabase, credentials);
    const rlsOk = await testRLS(supabase, credentials);
    const authFlowOk = await testAuthFlow(supabase);
    
    // Riepilogo finale
    logger.section('RIEPILOGO DEI TEST');
    
    logger.info(`Connessione Supabase: ✅ OK`);
    logger.info(`Struttura Database: ${dbStructureOk ? '✅ OK' : '❌ Problemi rilevati'}`);
    logger.info(`Bucket Storage: ${storageBucketsOk ? '✅ OK' : '❌ Problemi rilevati'}`);
    logger.info(`Coerenza Utenti: ${userConsistencyOk === true ? '✅ OK' : userConsistencyOk === false ? '❌ Problemi rilevati' : '⚠️ Non verificato'}`);
    logger.info(`RLS: ${rlsOk === true ? '✅ OK' : rlsOk === false ? '❌ Problemi rilevati' : '⚠️ Non verificato'}`);
    logger.info(`Flusso Autenticazione: ${authFlowOk ? '✅ OK' : '❌ Problemi rilevati'}`);
    
    // Suggerimenti in base ai problemi rilevati
    if (!dbStructureOk || !storageBucketsOk || userConsistencyOk === false || rlsOk === false) {
      logger.section('AZIONI CONSIGLIATE');
      
      if (!dbStructureOk) {
        logger.info('1. Esegui lo script fix_missing_tables.sql per aggiungere le tabelle mancanti');
      }
      
      if (!storageBucketsOk) {
        logger.info('2. Esegui lo script setup_all_buckets.js per creare i bucket di storage mancanti');
      }
      
      if (userConsistencyOk === false) {
        logger.info('3. Esegui lo script di creazione degli utenti per sincronizzare auth.users e public.users');
      }
      
      if (rlsOk === false) {
        logger.info('4. Attiva RLS sulle tabelle pubbliche mancanti per garantire la sicurezza dei dati');
      }
      
      logger.info('\nSegui le istruzioni in ISTRUZIONI_APPLICAZIONE_CORREZIONI.md per risolvere i problemi');
    }
  } catch (error) {
    logger.error(`Errore durante l'esecuzione dei test: ${error.message}`);
    process.exit(1);
  }
}

// Esegui tutti i test quando chiamato direttamente
runAllTests();

// Esporta le funzioni per l'uso in altri moduli
export {
  testConnection,
  testDatabaseStructure,
  testStorageBuckets,
  testUserConsistency,
  testRLS,
  testAuthFlow,
  applyMigrations
};
