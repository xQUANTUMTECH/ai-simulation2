/**
 * Script per testare la connessione al database Supabase
 * Verifica diversi metodi di connessione e diagnostica eventuali problemi
 */

console.log("Avvio test di connessione Supabase...");

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawnSync } from 'child_process';

// Ottieni il percorso corrente del modulo in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurazione
const CONFIG_FILE = path.join(__dirname, '.env');
const LOG_FILE = path.join(__dirname, 'supabase-connection-test.log');

// Credenziali Supabase da SUPABASE_CREDENTIALS.md
const DEFAULT_CREDENTIALS = {
  url: 'https://twusehwykpemphqtxlrx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNjE1NTAsImV4cCI6MjA1NjgzNzU1MH0.iku26hL5irHYwIxOPKNjUlTrTvlvw0a-ZU-uPgepoNk',
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg',
  projectRef: 'twusehwykpemphqtxlrx'
};

console.log("Credenziali caricate:", DEFAULT_CREDENTIALS.url);

// Utility per il logging
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    try {
      fs.appendFileSync(LOG_FILE, logMessage + '\n');
    } catch (err) {
      console.error("Errore di scrittura nel file di log:", err);
    }
  },
  error: (message, error) => {
    const timestamp = new Date().toISOString();
    const errorDetails = error ? `\n${error.stack || error}` : '';
    const logMessage = `[${timestamp}] ERRORE: ${message}${errorDetails}`;
    console.error(logMessage);
    try {
      fs.appendFileSync(LOG_FILE, logMessage + '\n');
    } catch (err) {
      console.error("Errore di scrittura nel file di log:", err);
    }
  },
  success: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ✅ ${message}`;
    console.log('\x1b[32m%s\x1b[0m', logMessage); // verde
    try {
      fs.appendFileSync(LOG_FILE, logMessage + '\n');
    } catch (err) {
      console.error("Errore di scrittura nel file di log:", err);
    }
  },
  warning: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ⚠️ ${message}`;
    console.log('\x1b[33m%s\x1b[0m', logMessage); // giallo
    try {
      fs.appendFileSync(LOG_FILE, logMessage + '\n');
    } catch (err) {
      console.error("Errore di scrittura nel file di log:", err);
    }
  }
};

/**
 * Carica le credenziali dal file .env o utilizza valori predefiniti
 * @returns {Object} - Credenziali Supabase
 */
function loadCredentials() {
  try {
    // Verifica se esiste il file .env
    if (fs.existsSync(CONFIG_FILE)) {
      const envContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      const envVars = envContent.split('\n').reduce((acc, line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          acc[match[1]] = match[2];
        }
        return acc;
      }, {});
      
      return {
        url: envVars.VITE_SUPABASE_URL || DEFAULT_CREDENTIALS.url,
        anonKey: envVars.VITE_SUPABASE_ANON_KEY || DEFAULT_CREDENTIALS.anonKey,
        serviceKey: envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || DEFAULT_CREDENTIALS.serviceKey,
        projectRef: DEFAULT_CREDENTIALS.projectRef // Di solito non incluso in .env
      };
    }
    
    logger.warning('File .env non trovato, utilizzo credenziali predefinite.');
    return DEFAULT_CREDENTIALS;
  } catch (error) {
    logger.error('Errore nel caricamento delle credenziali:', error);
    return DEFAULT_CREDENTIALS;
  }
}

/**
 * Testa la connessione al database Supabase utilizzando il client JavaScript
 * @param {Object} credentials - Credenziali Supabase
 * @returns {Promise<Object>} - Risultato del test
 */
async function testJsClientConnection(credentials) {
  logger.log('Test connessione con client JavaScript...');
  
  try {
    // Crea un client Supabase con chiave anonima
    const supabase = createClient(credentials.url, credentials.anonKey);
    
    // Esegui una query semplice per verificare la connessione
    const startTime = Date.now();
    const { data, error } = await supabase.from('users').select('count').limit(1);
    const endTime = Date.now();
    
    if (error) {
      throw error;
    }
    
    // Test riuscito
    const connectionTime = endTime - startTime;
    logger.success(`Connessione JavaScript riuscita! Tempo di risposta: ${connectionTime}ms`);
    
    return {
      success: true,
      responseTime: connectionTime,
      data
    };
  } catch (error) {
    logger.error('Errore nella connessione JavaScript:', error);
    
    return {
      success: false,
      error: error.message || error
    };
  }
}

/**
 * Testa la connessione privilegiata utilizzando il service role token
 * @param {Object} credentials - Credenziali Supabase
 * @returns {Promise<Object>} - Risultato del test
 */
async function testServiceRoleConnection(credentials) {
  logger.log('Test connessione con Service Role...');
  
  try {
    // Crea un client Supabase con chiave di servizio
    const supabase = createClient(credentials.url, credentials.serviceKey);
    
    // Esegui una query privilegiata per verificare la connessione
    const startTime = Date.now();
    
    // Utilizza una query che richiede privilegi elevati
    const { data, error } = await supabase
      .from('pg_stat_activity')
      .select('count')
      .limit(1)
      .catch(e => ({ error: e }));
    
    const endTime = Date.now();
    
    if (error) {
      throw error;
    }
    
    // Test riuscito
    const connectionTime = endTime - startTime;
    logger.success(`Connessione Service Role riuscita! Tempo di risposta: ${connectionTime}ms`);
    
    return {
      success: true,
      responseTime: connectionTime,
      data
    };
  } catch (error) {
    logger.error('Errore nella connessione Service Role:', error);
    
    // Verifica se il problema è relativo ai permessi
    if (error.message && error.message.includes('permission denied')) {
      logger.warning('La chiave di servizio sembra valida ma non ha i permessi necessari per questa query specifica.');
    }
    
    return {
      success: false,
      error: error.message || error
    };
  }
}

/**
 * Testa la connessione tramite SQL utilizzando psql
 * @param {Object} credentials - Credenziali Supabase
 * @param {string} dbPassword - Password del database (se disponibile)
 * @returns {Promise<Object>} - Risultato del test
 */
function testPsqlConnection(credentials, dbPassword = null) {
  logger.log('Test connessione con psql...');
  
  try {
    // Costruisci il comando psql
    const psqlCommand = [
      'psql',
      `-h ${credentials.url.replace('https://', '')}`,
      '-p 5432',
      '-d postgres',
      `-U postgres`,
      '-c "SELECT version();"'
    ].join(' ');
    
    const env = {...process.env};
    if (dbPassword) {
      env.PGPASSWORD = dbPassword;
    }
    
    // Esegui il comando
    const startTime = Date.now();
    const result = spawnSync(psqlCommand, {
      shell: true,
      env,
      timeout: 10000 // 10 secondi di timeout
    });
    const endTime = Date.now();
    
    // Verifica il risultato
    if (result.error) {
      throw result.error;
    }
    
    if (result.status !== 0) {
      throw new Error(`Comando psql fallito con codice di uscita ${result.status}: ${result.stderr.toString()}`);
    }
    
    // Test riuscito
    const connectionTime = endTime - startTime;
    logger.success(`Connessione psql riuscita! Tempo di risposta: ${connectionTime}ms`);
    
    return {
      success: true,
      responseTime: connectionTime,
      output: result.stdout.toString()
    };
  } catch (error) {
    logger.error('Errore nella connessione psql:', error);
    
    // Verifica se psql è installato
    if (error.code === 'ENOENT') {
      logger.warning('psql non sembra essere installato nel sistema o non è nel PATH.');
    }
    
    return {
      success: false,
      error: error.message || error
    };
  }
}

/**
 * Testa la connessione tramite Supabase CLI
 * @param {Object} credentials - Credenziali Supabase
 * @returns {Promise<Object>} - Risultato del test
 */
function testSupabaseCliConnection(credentials) {
  logger.log('Test connessione con Supabase CLI...');
  
  try {
    // Verifica se la CLI di Supabase è installata
    const versionResult = spawnSync('supabase', ['--version'], {
      shell: true,
      timeout: 5000 // 5 secondi di timeout
    });
    
    if (versionResult.error || versionResult.status !== 0) {
      throw new Error('Supabase CLI non è installato o non è nel PATH.');
    }
    
    // Esegui il comando per verificare lo stato del progetto
    const startTime = Date.now();
    const result = spawnSync('supabase', ['projects', 'list'], {
      shell: true,
      timeout: 20000 // 20 secondi di timeout
    });
    const endTime = Date.now();
    
    // Verifica il risultato
    if (result.error) {
      throw result.error;
    }
    
    if (result.status !== 0) {
      throw new Error(`Comando supabase fallito con codice di uscita ${result.status}: ${result.stderr.toString()}`);
    }
    
    // Verifica se il progetto è presente nell'elenco
    const output = result.stdout.toString();
    const hasProject = output.includes(credentials.projectRef);
    
    // Test riuscito
    const connectionTime = endTime - startTime;
    
    if (hasProject) {
      logger.success(`Connessione Supabase CLI riuscita! Progetto trovato. Tempo di risposta: ${connectionTime}ms`);
    } else {
      logger.warning(`Connessione Supabase CLI riuscita ma il progetto ${credentials.projectRef} non è stato trovato nell'elenco. Potrebbe essere necessario eseguire 'supabase login' con il token appropriato.`);
    }
    
    return {
      success: true,
      projectFound: hasProject,
      responseTime: connectionTime,
      output
    };
  } catch (error) {
    logger.error('Errore nella connessione Supabase CLI:', error);
    
    return {
      success: false,
      error: error.message || error
    };
  }
}

/**
 * Esegue tutti i test di connessione disponibili
 * @param {Object} credentials - Credenziali Supabase
 * @param {string} dbPassword - Password del database (opzionale)
 * @returns {Promise<Object>} - Risultati di tutti i test
 */
async function runAllTests(credentials, dbPassword = null) {
  logger.log('\n=== INIZIO TEST CONNESSIONE SUPABASE ===');
  logger.log(`URL Progetto: ${credentials.url}`);
  logger.log(`Riferimento Progetto: ${credentials.projectRef}`);
  
  // Inizializza il file di log
  fs.writeFileSync(LOG_FILE, `=== TEST CONNESSIONE SUPABASE - ${new Date().toISOString()} ===\n\n`);
  
  // Esegui tutti i test disponibili
  const results = {
    jsClient: await testJsClientConnection(credentials),
    serviceRole: await testServiceRoleConnection(credentials)
  };
  
  // Test che richiedono strumenti esterni (potrebbero fallire se non installati)
  try {
    results.psql = testPsqlConnection(credentials, dbPassword);
  } catch (error) {
    results.psql = { success: false, error: error.message || 'Test psql non eseguito' };
  }
  
  try {
    results.cli = testSupabaseCliConnection(credentials);
  } catch (error) {
    results.cli = { success: false, error: error.message || 'Test CLI non eseguito' };
  }
  
  // Riepilogo dei risultati
  logger.log('\n=== RIEPILOGO TEST CONNESSIONE SUPABASE ===');
  
  let successCount = 0;
  let totalTests = Object.keys(results).length;
  
  for (const [testName, result] of Object.entries(results)) {
    if (result.success) {
      successCount++;
      logger.success(`✅ Test ${testName}: SUPERATO`);
    } else {
      logger.error(`❌ Test ${testName}: FALLITO - ${result.error}`);
    }
  }
  
  logger.log(`\nTest completati: ${successCount}/${totalTests} test riusciti.`);
  logger.log(`Log dettagliato salvato in: ${LOG_FILE}`);
  
  if (successCount === totalTests) {
    logger.success('TUTTI I TEST DI CONNESSIONE SONO RIUSCITI! 🎉');
  } else if (successCount > 0) {
    logger.warning(`ALCUNI TEST SONO FALLITI. ${successCount}/${totalTests} test completati con successo.`);
  } else {
    logger.error('TUTTI I TEST SONO FALLITI. Controlla le credenziali e la connettività.');
  }
  
  return {
    success: successCount > 0,
    successCount,
    totalTests,
    testResults: results,
    timestamp: new Date().toISOString()
  };
}

/**
 * Verifica lo stato di tutte le tabelle importanti del database
 * @param {Object} credentials - Credenziali Supabase
 * @returns {Promise<Object>} - Stato delle tabelle
 */
async function checkDatabaseTables(credentials) {
  logger.log('\n=== VERIFICA STATO TABELLE DATABASE ===');
  
  try {
    // Usa il token di servizio per questa operazione
    const supabase = createClient(credentials.url, credentials.serviceKey);
    
    // Elenco delle tabelle principali da verificare
    const coreTables = [
      'users',
      'documents',
      'courses',
      'quiz_questions',
      'quiz_responses',
      'course_enrollments'
    ];
    
    const results = {};
    
    // Verifica ogni tabella
    for (const tableName of coreTables) {
      try {
        logger.log(`Verifica tabella ${tableName}...`);
        
        // Conta le righe
        const { data, error } = await supabase
          .from(tableName)
          .select('count')
          .limit(1)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            // Tabella vuota
            results[tableName] = { exists: true, count: 0, isEmpty: true };
            logger.log(`Tabella ${tableName} esistente ma vuota.`);
          } else {
            throw error;
          }
        } else {
          // Tabella trovata con almeno una riga
          const rowCount = data ? data.count : 0;
          results[tableName] = { exists: true, count: rowCount, isEmpty: rowCount === 0 };
          logger.success(`Tabella ${tableName} esistente con ${rowCount} righe.`);
        }
      } catch (error) {
        // Verifica se l'errore è dovuto alla mancanza della tabella
        if (error.code === 'PGRST204') {
          results[tableName] = { exists: false, error: 'Tabella non trovata' };
          logger.warning(`Tabella ${tableName} non trovata.`);
        } else {
          results[tableName] = { exists: null, error: error.message };
          logger.error(`Errore nella verifica della tabella ${tableName}:`, error);
        }
      }
    }
    
    return {
      success: true,
      tables: results,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Errore nella verifica delle tabelle:', error);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Funzione principale
async function main() {
  try {
    console.log("Funzione main() iniziata");
    
    // Carica le credenziali
    const credentials = loadCredentials();
    console.log("Credenziali caricate con successo");
    
    // Inizializza il file di log
    try {
      console.log("Inizializzazione file di log:", LOG_FILE);
      fs.writeFileSync(LOG_FILE, `=== TEST CONNESSIONE SUPABASE - ${new Date().toISOString()} ===\n\n`);
      console.log("File di log inizializzato con successo");
    } catch (err) {
      console.error("ERRORE nella creazione del file di log:", err);
    }
    
    // Per debug: testiamo solo la connessione client JavaScript
    console.log("Avvio test di connessione client JavaScript...");
    const jsClientResult = await testJsClientConnection(credentials);
    console.log("Risultato test client JavaScript:", jsClientResult);
    
    return { jsClient: jsClientResult };
  } catch (error) {
    console.error('Errore fatale durante l\'esecuzione dei test:', error);
    return { success: false, error: error.message };
  }
}

// Esporta le funzioni per l'uso in altri moduli
export {
  loadCredentials,
  testJsClientConnection,
  testServiceRoleConnection,
  testPsqlConnection,
  testSupabaseCliConnection,
  runAllTests,
  checkDatabaseTables
};

// Se eseguito direttamente, esegui i test
if (import.meta.url === `file://${__filename}`) {
  console.log("Avvio del test diretto");
  main()
    .then(results => {
      console.log("Test completati, risultati:", JSON.stringify(results, null, 2));
      if (results.jsClient && !results.jsClient.success) {
        console.error("Test fallito con errore:", results.jsClient.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Errore fatale:', error);
      process.exit(1);
    });
}
